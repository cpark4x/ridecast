# Feature: Empty States

> Three context-aware empty states that meet users where they are — new user onboarding, all-caught-up celebration, and a stale-library nudge.

## Motivation

A single generic "No episodes yet" empty state serves none of three distinct situations: a brand new user who needs hand-holding, a power user who's finished their queue and deserves a celebration, and a lapsed user whose newest content is a week old. Each state has a different emotional context and a different next action. Getting this right converts confusion into engagement.

**Mockup references:**
- New user: `docs/mockups/empty-state-new-user.html`
- All caught up: `docs/mockups/empty-state-caught-up.html`
- Stale nudge: inline card in existing list

## Changes

### 1. Detect which empty state to show

Add a helper to `native/lib/libraryHelpers.ts`:

```typescript
export type LibraryContext =
  | "new_user"        // no episodes at all (ever)
  | "all_caught_up"   // episodes exist but all completed
  | "stale"           // has active episodes but newest is >7 days old
  | "normal";         // active content, nothing special

export function getLibraryContext(items: LibraryItem[]): LibraryContext {
  if (items.length === 0) return "new_user";

  const allCompleted = items.every((item) =>
    item.versions.length > 0 && item.versions.every((v) => v.completed)
  );
  if (allCompleted) return "all_caught_up";

  const newest = items
    .map((i) => new Date(i.createdAt).getTime())
    .reduce((a, b) => Math.max(a, b), 0);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (newest < sevenDaysAgo) return "stale";

  return "normal";
}
```

### 2. NewUserEmptyState component (`native/components/empty-states/NewUserEmptyState.tsx` — new)

Features from mockup:
- Animated waveform illustration (3 bars, CSS-like pulse using `Animated.sequence`)
- 3-step flow: "Paste a URL → Generate episode → Listen on the go"
- "Create Your First Episode" CTA button
- Suggestion pills: "Try ESPN", "Try NYT", "Try a podcast transcript"

```typescript
export default function NewUserEmptyState({ onCreateEpisode }: { onCreateEpisode: () => void }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <View className="flex-1 items-center px-6 pt-8">
      {/* Animated waveform */}
      <View className="flex-row items-end gap-1.5 mb-8 h-12">
        {[0.6, 1, 0.8, 1, 0.6].map((scale, i) => (
          <Animated.View
            key={i}
            className="w-2 bg-brand rounded-full"
            style={{ height: 32 * scale, transform: [{ scaleY: i === 2 ? pulse : 1 }] }}
          />
        ))}
      </View>

      <Text className="text-xl font-bold text-gray-900 text-center mb-2">
        Your Daily Drive awaits
      </Text>
      <Text className="text-sm text-gray-500 text-center mb-8 leading-5">
        Turn any article, PDF, or URL into a podcast episode in seconds.
      </Text>

      {/* 3-step flow */}
      <View className="w-full mb-8 gap-3">
        {[
          { num: "1", text: "Paste a URL or upload a file" },
          { num: "2", text: "Ridecast generates your episode" },
          { num: "3", text: "Listen on the go" },
        ].map(({ num, text }) => (
          <View key={num} className="flex-row items-center gap-3">
            <View className="w-7 h-7 rounded-full bg-brand items-center justify-center">
              <Text className="text-xs font-bold text-white">{num}</Text>
            </View>
            <Text className="text-sm text-gray-700 flex-1">{text}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        onPress={onCreateEpisode}
        className="w-full bg-brand py-4 rounded-2xl items-center mb-6"
      >
        <Text className="text-base font-bold text-white">Create Your First Episode</Text>
      </TouchableOpacity>

      {/* Suggestion pills */}
      <Text className="text-xs text-gray-400 mb-2">Popular sources to try</Text>
      <View className="flex-row gap-2 flex-wrap justify-center">
        {["espn.com", "nytimes.com", "paulgraham.com"].map((site) => (
          <TouchableOpacity key={site} className="bg-gray-100 px-3 py-1.5 rounded-full">
            <Text className="text-xs text-gray-600">{site}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
```

### 3. AllCaughtUpEmptyState component (`native/components/empty-states/AllCaughtUpEmptyState.tsx` — new)

Features from mockup:
- Celebratory checkmark icon (large, green)
- Stats bar: total episodes listened, total hours
- Suggestion cards: "Add something new from your sources"
- "Add Something New" CTA

```typescript
export default function AllCaughtUpEmptyState({
  stats,
  onAddNew,
}: {
  stats: { episodeCount: number; totalHours: number };
  onAddNew: () => void;
}) {
  return (
    <View className="flex-1 items-center px-6 pt-8">
      {/* Checkmark */}
      <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-6">
        <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
      </View>

      <Text className="text-xl font-bold text-gray-900 text-center mb-2">All caught up!</Text>
      <Text className="text-sm text-gray-500 text-center mb-6 leading-5">
        You've listened to everything in your library. Time to add more.
      </Text>

      {/* Stats bar */}
      <View className="flex-row w-full bg-gray-50 rounded-2xl p-4 mb-6 justify-around">
        <View className="items-center">
          <Text className="text-2xl font-bold text-gray-900">{stats.episodeCount}</Text>
          <Text className="text-xs text-gray-500">Episodes</Text>
        </View>
        <View className="w-px bg-gray-200" />
        <View className="items-center">
          <Text className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}</Text>
          <Text className="text-xs text-gray-500">Hours listened</Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity onPress={onAddNew} className="w-full bg-brand py-4 rounded-2xl items-center">
        <Text className="text-base font-bold text-white">Add Something New</Text>
      </TouchableOpacity>
    </View>
  );
}

// Compute stats from items:
// episodeCount = items with all versions completed
// totalHours = sum of completed version durationSecs / 3600
```

### 4. StaleLibraryNudge — subtle top card (`native/components/empty-states/StaleLibraryNudge.tsx` — new)

This is **not** a full empty state — it appears at the top of the episode list when content is present but stale. It's a dismissible card, not a full-screen replacement.

```typescript
interface StaleLibraryNudgeProps {
  daysSinceNewest: number;
  topSourceDomain: string | null; // e.g. "espn.com" — most common source in library
  onDismiss: () => void;
  onAddNew: () => void;
}

export default function StaleLibraryNudge({ daysSinceNewest, topSourceDomain, onDismiss, onAddNew }: StaleLibraryNudgeProps) {
  return (
    <View className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-semibold text-amber-900 mb-1">
            Your newest content is {daysSinceNewest} days old
          </Text>
          <Text className="text-xs text-amber-700">
            {topSourceDomain
              ? `Check ${topSourceDomain} for new articles to add`
              : "Paste a URL to create a new episode"}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color="#92400E" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onAddNew} className="mt-3 bg-amber-500 py-2 rounded-xl items-center">
        <Text className="text-xs font-bold text-white">Add Episode</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**Stale nudge logic** in `native/app/(tabs)/library.tsx`:

```typescript
const [staleDismissed, setStaleDismissed] = useState(false);
const context = getLibraryContext(episodes);

// Compute topSourceDomain
const topSource = Object.entries(
  episodes.reduce((acc, item) => {
    const domain = item.sourceUrl ? new URL(item.sourceUrl).hostname.replace(/^www\./, "") : null;
    if (domain) acc[domain] = (acc[domain] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>)
).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

// In FlatList ListHeaderComponent (above filter chips):
{context === "stale" && !staleDismissed && (
  <StaleLibraryNudge
    daysSinceNewest={daysSinceNewest}
    topSourceDomain={topSource}
    onDismiss={() => setStaleDismissed(true)}
    onAddNew={() => setUploadModalVisible(true)}
  />
)}
```

### 5. Wire contexts into screens

**Library screen** — replace the single `EmptyState` with context-aware rendering:

```typescript
ListEmptyComponent={
  context === "new_user" ? (
    <NewUserEmptyState onCreateEpisode={() => setUploadModalVisible(true)} />
  ) : context === "all_caught_up" ? (
    <AllCaughtUpEmptyState stats={computedStats} onAddNew={() => setUploadModalVisible(true)} />
  ) : (
    <EmptyState icon="search" title="No matches" subtitle="Try a different search or filter" />
  )
}
```

**Home screen** — same pattern for its empty state.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/empty-states/NewUserEmptyState.tsx` | New — animated onboarding empty state |
| `native/components/empty-states/AllCaughtUpEmptyState.tsx` | New — celebratory completion state with stats |
| `native/components/empty-states/StaleLibraryNudge.tsx` | New — dismissible stale-content nudge card |
| `native/lib/libraryHelpers.ts` | Add `getLibraryContext()` + `LibraryContext` type |
| `native/app/(tabs)/library.tsx` | Wire context detection, render appropriate empty state, stale nudge |
| `native/app/(tabs)/index.tsx` | Wire context detection for home screen empty state |

## Tests

**`native/lib/libraryHelpers.test.ts`**:

```typescript
describe("getLibraryContext", () => {
  it("returns new_user when no items", () => {
    expect(getLibraryContext([])).toBe("new_user");
  });
  it("returns all_caught_up when all versions completed", () => {
    expect(getLibraryContext([completedItem])).toBe("all_caught_up");
  });
  it("returns stale when newest item > 7 days old", () => {
    const oldItem = { ...baseItem, createdAt: new Date(Date.now() - 8 * 86400000).toISOString() };
    expect(getLibraryContext([oldItem])).toBe("stale");
  });
  it("returns normal otherwise", () => {
    expect(getLibraryContext([freshActiveItem])).toBe("normal");
  });
});
```

## Success Criteria

- [ ] Brand new user (empty DB): sees NewUserEmptyState with waveform, 3-step, CTA
- [ ] All episodes completed: sees AllCaughtUpEmptyState with stats bar
- [ ] Active episodes but all >7 days old: sees StaleLibraryNudge card above the list
- [ ] Normal state: no nudge card, list as usual
- [ ] Dismissing stale nudge hides it for the session (no persistence needed)
- [ ] CTA buttons open UploadModal correctly

## Scope

- **No** persistent dismissal of stale nudge (session-only)
- **No** "personalized suggestions" beyond top source domain — no ML/recommendation engine
- **No** email/push notification integration for the stale state
- Stale threshold is hardcoded at 7 days — not user-configurable in this spec
