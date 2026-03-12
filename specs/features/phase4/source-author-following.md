# Feature: Source & Author Following

> Follow your favorite sources and authors — get a dedicated "Following" feed in the library and a management screen to see what you're tracking.

## Motivation

Users have favorite sources (ESPN, NYT, specific blogs) and authors they trust. Right now there's no way to filter by who made the content or to signal interest. A following system turns Ridecast from a passive document player into a personalized listening feed — and enables future features like "auto-create when new article drops from followed source."

**Mockup references:**
- Source/author card bottom sheet: `docs/mockups/source-author-card.html`
- Following management screen: `docs/mockups/following-screen.html`

## Changes

### 1. New SQLite tables

Add two new tables in `native/lib/db.ts` `migrate()`:

```typescript
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS followed_sources (
    source_domain  TEXT PRIMARY KEY,   -- e.g. "espn.com" or "pdf" for non-URL types
    source_name    TEXT NOT NULL,      -- e.g. "ESPN" (display name)
    brand_color    TEXT,               -- e.g. "#D00" (optional, for UI tinting)
    followed_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS followed_authors (
    author_name    TEXT PRIMARY KEY,   -- e.g. "Paul Graham"
    primary_source TEXT,               -- domain of most common source
    followed_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
```

### 2. DB helpers for following (`native/lib/db.ts`)

```typescript
// --- Following ---

export async function followSource(domain: string, name: string, brandColor?: string) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO followed_sources (source_domain, source_name, brand_color) VALUES (?, ?, ?)`,
    domain, name, brandColor ?? null
  );
}

export async function unfollowSource(domain: string) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM followed_sources WHERE source_domain = ?`, domain);
}

export async function isSourceFollowed(domain: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ source_domain: string }>(
    `SELECT source_domain FROM followed_sources WHERE source_domain = ?`, domain
  );
  return !!row;
}

export async function getAllFollowedSources(): Promise<FollowedSource[]> {
  const db = await getDb();
  return db.getAllAsync<FollowedSource>(`SELECT * FROM followed_sources ORDER BY followed_at DESC`);
}

export async function followAuthor(name: string, primarySource?: string) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO followed_authors (author_name, primary_source) VALUES (?, ?)`,
    name, primarySource ?? null
  );
}

export async function unfollowAuthor(name: string) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM followed_authors WHERE author_name = ?`, name);
}

export async function isAuthorFollowed(name: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ author_name: string }>(
    `SELECT author_name FROM followed_authors WHERE author_name = ?`, name
  );
  return !!row;
}

export async function getAllFollowedAuthors(): Promise<FollowedAuthor[]> {
  const db = await getDb();
  return db.getAllAsync<FollowedAuthor>(`SELECT * FROM followed_authors ORDER BY followed_at DESC`);
}
```

### 3. Add `FollowedSource` and `FollowedAuthor` types (`native/lib/types.ts`)

```typescript
export interface FollowedSource {
  source_domain: string;
  source_name: string;
  brand_color: string | null;
  followed_at: string;
}

export interface FollowedAuthor {
  author_name: string;
  primary_source: string | null;
  followed_at: string;
}
```

### 4. SourceCard bottom sheet (`native/components/SourceCard.tsx` — new)

Triggered when user taps the `SourceIcon` on any episode card. Slides up as a bottom sheet (use `Modal` with `transparent + slide` animation, or `@gorhom/bottom-sheet` if already a dependency).

```typescript
interface SourceCardProps {
  visible: boolean;
  onDismiss: () => void;
  sourceDomain: string;     // e.g. "espn.com"
  sourceName: string;       // display name
  sourceType: string;       // "url", "pdf", etc.
  episodes: LibraryItem[];  // all episodes from this source
  onViewAuthor: (author: string) => void;
}
```

**Content:**
```
┌──────────────────────────────────┐
│  [SourceIcon]  ESPN              │
│  espn.com · 12 episodes          │
│  [★ Follow]  (or [✓ Following]) │
├──────────────────────────────────┤
│  Authors                         │
│  John Smith (8 episodes) →       │
│  Jane Doe   (4 episodes) →       │
├──────────────────────────────────┤
│  Recent Episodes                 │
│  [compact episode list, 3 items] │
│  View All (12) →                 │
└──────────────────────────────────┘
```

```typescript
export default function SourceCard({ visible, onDismiss, sourceDomain, sourceName, episodes, onViewAuthor }: SourceCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    isSourceFollowed(sourceDomain).then(setIsFollowing);
  }, [sourceDomain]);

  async function handleFollow() {
    if (isFollowing) {
      await unfollowSource(sourceDomain);
      setIsFollowing(false);
    } else {
      await followSource(sourceDomain, sourceName);
      setIsFollowing(true);
      void Haptics.success();
    }
  }

  // Compute stats
  const episodeCount = episodes.length;
  const authors = Object.entries(
    episodes.reduce((acc, e) => { if (e.author) acc[e.author] = (acc[e.author] ?? 0) + 1; return acc; }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <TouchableOpacity className="flex-1 bg-black/40" onPress={onDismiss} activeOpacity={1} />
      <View className="bg-white rounded-t-3xl px-5 pt-4 pb-8">
        {/* Drag handle */}
        <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-4" />

        {/* Source header */}
        <View className="flex-row items-center gap-3 mb-4">
          <SourceIcon sourceType={sourceType} size="lg" />
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900">{sourceName}</Text>
            <Text className="text-sm text-gray-500">{sourceDomain} · {episodeCount} episodes</Text>
          </View>
          <TouchableOpacity
            onPress={handleFollow}
            className={`px-4 py-2 rounded-full ${isFollowing ? "bg-brand" : "border border-gray-200"}`}
          >
            <Text className={`text-sm font-semibold ${isFollowing ? "text-white" : "text-gray-700"}`}>
              {isFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Authors list */}
        {authors.length > 0 && (
          <>
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Authors</Text>
            {authors.slice(0, 3).map(([author, count]) => (
              <TouchableOpacity key={author} onPress={() => onViewAuthor(author)} className="flex-row items-center justify-between py-2">
                <Text className="text-base text-gray-900">{author}</Text>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm text-gray-400">{count} episodes</Text>
                  <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Recent episodes */}
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Recent</Text>
        {episodes.slice(0, 3).map(episode => (
          <Text key={episode.id} className="text-sm text-gray-700 py-1" numberOfLines={1}>{episode.title}</Text>
        ))}
        {episodeCount > 3 && (
          <TouchableOpacity onPress={onDismiss} className="mt-2">
            <Text className="text-sm text-brand font-semibold">View all {episodeCount} episodes →</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}
```

### 5. AuthorCard bottom sheet (`native/components/AuthorCard.tsx` — new)

Same pattern as SourceCard but for authors. Triggered from SourceCard's author list.

```typescript
interface AuthorCardProps {
  visible: boolean;
  onDismiss: () => void;
  authorName: string;
  primarySource: string | null;
  episodes: LibraryItem[];
}
```

Content: author name + episode count, follow button, all episodes from this author.

### 6. "Following" filter in library (`native/lib/types.ts` + `libraryHelpers.ts`)

Add `"following"` to `LibraryFilter`:

```typescript
export type LibraryFilter = "active" | "all" | "following" | "in_progress" | "completed" | "generating";
```

Add case to `filterEpisodes()`:

```typescript
case "following":
  // Show episodes from followed sources OR followed authors
  return items.filter((item) => {
    const domain = item.sourceUrl ? new URL(item.sourceUrl).hostname.replace(/^www\./, "") : item.sourceType;
    // followedDomains and followedAuthors are passed as extra params or accessed from context
    return followedDomains.has(domain) || (item.author && followedAuthors.has(item.author));
  });
```

`filterEpisodes` needs to accept an optional `{ followedDomains: Set<string>; followedAuthors: Set<string> }` context parameter.

### 7. Following management screen (`native/app/following.tsx` — new)

Accessible from library header (new icon) or settings.

```
Library header:  [Library]  [sort icon] [following icon ♡] [settings icon]
```

Screen:
```
┌──────────────────────────────────┐
│  Following                       │
├──────────────────────────────────┤
│  SOURCES (3)                     │
│  [ESPN]  espn.com  [Unfollow]    │
│  [NYT]   nytimes.com [Unfollow]  │
│  [PDF]   Local Files [Unfollow]  │
├──────────────────────────────────┤
│  AUTHORS (2)                     │
│  Paul Graham        [Unfollow]   │
│  Matt Levine        [Unfollow]   │
└──────────────────────────────────┘
```

Registered as `native/app/following.tsx` (modal route `router.push("/following")`).

### 8. Wire SourceIcon tap to SourceCard

In `EpisodeCard.tsx`, wrap `SourceIcon` in a `TouchableOpacity`:

```typescript
<TouchableOpacity
  onPress={() => onSourceTap?.(item)}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <SourceIcon sourceType={item.sourceType} size="md" />
</TouchableOpacity>
```

Pass `onSourceTap` prop through `EpisodeCardProps`. Library and Home screens handle it:

```typescript
function handleSourceTap(item: LibraryItem) {
  setSourceCardItem(item);
}
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/lib/db.ts` | New tables: `followed_sources`, `followed_authors`; CRUD helpers |
| `native/lib/types.ts` | Add `FollowedSource`, `FollowedAuthor`, `"following"` to `LibraryFilter` |
| `native/lib/libraryHelpers.ts` | Add `"following"` case to `filterEpisodes()` with context param |
| `native/components/SourceCard.tsx` | New — source bottom sheet with follow, authors, recent episodes |
| `native/components/AuthorCard.tsx` | New — author bottom sheet with follow, all episodes |
| `native/components/EpisodeCard.tsx` | Add `onSourceTap` prop, wrap SourceIcon in TouchableOpacity |
| `native/app/following.tsx` | New — following management screen |
| `native/app/(tabs)/library.tsx` | Add "Following" chip to filters, following icon in header, wire SourceCard |
| `native/app/(tabs)/index.tsx` | Wire SourceCard on episode tap |

## Tests

- [ ] Follow a source → appears in Following screen
- [ ] Unfollow a source → removed from Following screen and "Following" filter
- [ ] "Following" chip in library shows only episodes from followed sources/authors
- [ ] Tapping SourceIcon opens SourceCard bottom sheet
- [ ] SourceCard "Follow" button toggles correctly, fires success haptic
- [ ] AuthorCard accessible from SourceCard authors list
- [ ] Following management screen reachable from library header

## Success Criteria

```bash
cd native && npx tsc --noEmit
```

- New tables created without migration errors
- SourceCard/AuthorCard slide up correctly, dismiss on backdrop tap
- Follow state persists between app sessions (stored in SQLite)

## Scope

- **No** push notifications for new content from followed sources — that's a future feature
- **No** server-side following sync — purely local SQLite
- **No** suggested sources/authors to follow — manual only via episode interaction
- **No** follower counts or social features
