# F-P5-UI-12: Source Detail Screen

## 1. Overview

**Module:** `native/app/(tabs)/source-detail.tsx` (CREATE)
**Phase:** 6 — Source Detail — New Screen
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `redesign-library` (F-P5-UI-08)

A new screen accessible from both Library (tapping a source domain filter or source entry point) and from the Discover feed (tapping a source row). Shows a source header with logo, name, episode count, and a "Play Unplayed" CTA; followed by a scrollable list of all episodes from that source with playback state indicators.

**Route placement:** This file lives at `native/app/(tabs)/source-detail.tsx` (inside `(tabs)/`, NOT top-level). This keeps the tab bar and mini player visible when navigating into this screen — it is a drill-down from Library or Discover, not a fullscreen takeover. Register it as a hidden tab with `href: null` in `native/app/(tabs)/_layout.tsx`.

**Source material:** `ui-studio/blueprints/10b-source-detail/component-spec.md` · `ui-studio/blueprints/10b-source-detail/tokens.json`

---

## 2. Requirements

### Interfaces

```typescript
// Route params:
// sourceDomain: string       — e.g. "mittr.com"
// sourceName: string         — e.g. "MIT Technology Review"
// sourceLogoColor?: string   — optional hex color for logo block background
// backLabel?: string         — optional: name of the calling screen ("Library" or "Discover")

// Exported: default function SourceDetailScreen(): JSX.Element

interface SourceEpisode {
  id: string;
  title: string;
  durationMin: number;
  format: string;             // e.g. "Standard"
  status: 'new' | 'in_progress' | 'played' | 'unplayed';
  progressPct?: number;       // for in_progress
  thumbnailUrl?: string;
  audioUrl?: string;
  audioId?: string;
}

// State:
const [episodes, setEpisodes] = useState<SourceEpisode[]>([]);
const [isLoading, setIsLoading] = useState(true);
const { sourceDomain, sourceName, sourceLogoColor, backLabel } =
  useLocalSearchParams<{ sourceDomain: string; sourceName: string; sourceLogoColor?: string; backLabel?: string }>();
```

#### `native/app/(tabs)/_layout.tsx` changes required by this spec

```typescript
// Add hidden Tabs.Screen for source-detail.
// "href: null" hides it from the tab bar while keeping it in the tab shell.
<Tabs.Screen
  name="source-detail"
  options={{ href: null, headerShown: false }}
/>
```

### Behavior

#### Data loading

```typescript
useEffect(() => {
  loadSourceEpisodes();
}, [sourceDomain]);

async function loadSourceEpisodes() {
  setIsLoading(true);
  try {
    const allEpisodes = await getAllEpisodes();
    const filtered = allEpisodes.filter(item =>
      item.sourceDomain === sourceDomain || item.sourceName === sourceName
    );
    setEpisodes(filtered.map(itemToSourceEpisode));
  } catch (err) {
    console.warn('[source-detail] load error:', err);
  } finally {
    setIsLoading(false);
  }
}

// itemToSourceEpisode: maps LibraryItem → SourceEpisode
// Derive status from: versions[0].completed → 'played', versions[0].position > 0 → 'in_progress', else → 'new'/'unplayed'
```

**Unplayed count:**
```typescript
const unplayedEpisodes = episodes.filter(e => e.status === 'new' || e.status === 'unplayed');
const unplayedMinutes = unplayedEpisodes.reduce((sum, e) => sum + e.durationMin, 0);
```

#### Screen layout

```
SafeAreaView (bg: backgroundScreen #0F0F1A, flex:1)
  NavBar (flexRow, alignItems:center, px:20, py:14)
    BackButton (flexRow, gap:4, onPress: router.back())
      Ionicons "chevron-back" size:24, textSecondary (#9CA3AF)
      Text {backLabel ?? "Library"}  17px/400, textSecondary  ← dynamic back label
    NavTitle (flex:1, textAlign:'center')
      Text {sourceName}  15px/600, textPrimary  ← per blueprint nav bar
    NavActionButton (bg:surfaceElevated, r:9999, w:36, h:36, items:center, justify:center)
      Ionicons "ellipsis-horizontal-circle-outline" size:20, textSecondary

  ScrollView (showsVerticalScrollIndicator:false, contentContainerStyle:{paddingBottom:180})
    SourceHeader (px:20, pt:8, pb:24)
      SourceLogoRow (flexRow, alignItems:center, gap:16, mb:16)
        SourceThumbnail  ← USE existing SourceThumbnail component (already in codebase)
          Pass: size={64}, borderRadius={12}
          If sourceLogoColor provided: use as background
          If thumbnailUrl available: render image
          Otherwise: show derived short label initials
        SourceInfoGroup (flex:1)
          SourceTitle (22px/600, textPrimary, numberOfLines:1)
          SourceMeta  (13px/400, textSecondary, mt:4)
            "{episodes.length} episodes · {unplayedEpisodes.length} unplayed"
      PlayUnplayedButton (bg:accentPrimary, r:10, h:48, px:20, flexRow, gap:8, alignItems:center)
        [unplayedEpisodes.length > 0]:
          Ionicons "play" size:16, textPrimary
          Text "Play Unplayed · {unplayedMinutes} min"  17px/600, textPrimary
          onPress: player.playQueue(unplayedEpisodes.map(e => toPlayableItem(e)))
        [unplayedEpisodes.length === 0]:
          same layout, opacity: 0.4, no onPress

    EpisodeList (px:20)
      [isLoading] SkeletonList (3 rows)
      [episodes.length === 0 && !isLoading]
        EmptyState icon:"library-outline" title:"No episodes" subtitle:"No episodes found from this source"
      [each episode, index]
        EpisodeRow (flexRow, alignItems:center, py:12, gap:12, minHeight:76)
          Thumbnail (56×56, r:8, bg:surfaceElevated, OR Image if thumbnailUrl)
          TextColumn (flex:1)
            EpisodeTitle  (15px/600, textPrimary, numberOfLines:2)
            MetaLine      (13px/400, textSecondary, mt:2) "{durationMin} min · {format}"
            StatusArea (mt:4)
              [status='played']      Text "Played ✓"  11px/400, statusSuccess (#16A34A)
              [status='in_progress'] ProgressBar (h:3, r:3, track:surfaceElevated, fill:accentPrimary, width:progressPct+'%')
              [status='new']         Pill (bg:rgba(255,107,53,0.15), text:accentPrimary, "New" 11px/400, r:9999, px:8, py:2)
              [status='unplayed']    nothing (no badge)
          MoreButton (Ionicons "ellipsis-horizontal" size:20, textSecondary, p:4)
            onPress: iOS ActionSheet "Rename" / "Delete" / "Cancel"
        [index < episodes.length-1] Divider (h:1, bg:borderDivider)
```

#### NavBar back label — dynamic

The back label reflects the calling screen. Pass `backLabel` as a route param when navigating to this screen:
- From Library: `router.push({ pathname: '/(tabs)/source-detail', params: { sourceDomain, sourceName, backLabel: 'Library' } })`
- From Discover: `router.push({ pathname: '/(tabs)/source-detail', params: { sourceDomain, sourceName, backLabel: 'Discover' } })`
- If `backLabel` not provided: default to `"Library"`

#### NavTitle

Display `sourceName` centered in the nav bar per the blueprint. This is a text element with `flex:1`, `textAlign: 'center'`, truncated to 1 line. Position between BackButton and NavActionButton.

#### SourceThumbnail component

Use the existing `SourceThumbnail` component (already exists in the codebase at `native/components/SourceThumbnail.tsx`). Do NOT build a custom logo block from scratch. Pass `size={64}` and `borderRadius={12}`. The component already handles:
- Image rendering if `thumbnailUrl` is provided
- Short label initials fallback
- Background color customization

If `sourceLogoColor` is provided as a route param, pass it to `SourceThumbnail` via the appropriate prop (check current SourceThumbnail prop API).

#### Episode row press
- Tap row body: play that episode via `player.play(toPlayableItem(episode))`
- Guard: check `audioId` is non-null before calling `player.play`. Show a brief toast if no audio yet.
- Tap MoreButton: iOS ActionSheet with "Rename" / "Delete" / "Cancel" (same pattern as EpisodeCard)

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `source-detail.tsx` located at `native/app/(tabs)/source-detail.tsx` (NOT top-level) | File path verification |
| AC-2 | `(tabs)/_layout.tsx` has `<Tabs.Screen name="source-detail" options={{ href: null }} />` | Code review: `rg 'source-detail' native/app/(tabs)/_layout.tsx` |
| AC-3 | Tab bar and mini player remain visible when navigating to source-detail | Manual: navigate from Library to a source — tab bar and mini player still shown |
| AC-4 | Screen background: `#0F0F1A` | Visual |
| AC-5 | NavBar: back button with dynamic label (backLabel param or "Library" default), textSecondary | Manual: navigate from Library (shows "Library"), from Discover (shows "Discover") |
| AC-6 | NavTitle shows source name centered in nav bar (15px/600, textPrimary) | Visual + code review |
| AC-7 | NavActionButton (ellipsis): `#242438` bg, `#9CA3AF` icon, 36×36, pill shape | Visual |
| AC-8 | Source logo uses existing `SourceThumbnail` component at `size={64}`, `borderRadius={12}` | Code review: `<SourceThumbnail` present in file, no custom logo View built from scratch |
| AC-9 | Source title: white, 22px/600 | Visual |
| AC-10 | Source meta: `#9CA3AF`, 13px, shows episode count + unplayed count | Visual |
| AC-11 | "Play Unplayed" button: `#FF6B35`, 48px height, 10px radius, play icon + label | Visual |
| AC-12 | "Play Unplayed" button: opacity 0.4 when no unplayed episodes, no `onPress` | Visual: state with all episodes played |
| AC-13 | Episode rows: 56×56 thumbnail placeholder, title/meta text, status indicator, ellipsis button | Visual |
| AC-14 | "Played ✓" status: `#16A34A` (statusSuccess) | Visual |
| AC-15 | "New" badge: rgba(255,107,53,0.15) bg, `#FF6B35` text | Visual |
| AC-16 | In-progress: thin 3px progress bar `#FF6B35` fill on `#242438` track | Visual |
| AC-17 | Row dividers: `rgba(255,255,255,0.06)` (borderDivider) between rows | Visual |
| AC-18 | Empty state visible when source has no episodes | Manual: navigate to a source with no episodes |
| AC-19 | `paddingBottom: 180` clears mini player + tab bar | Code review |
| AC-20 | Screen reachable from Library with backLabel "Library" | Manual: tap a source from Library |
| AC-21 | Screen reachable from Discover with backLabel "Discover" | Manual: tap a source from Discover |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| `sourceLogoColor` not provided | `SourceThumbnail` falls back to its default background (likely `colors.surface`). Short label still visible in white. |
| Source name very short (1–2 chars) | `SourceThumbnail` handles initials derivation internally |
| All episodes played | `unplayedEpisodes.length === 0`. Play button renders with `opacity: 0.4`, no `onPress`. SourceMeta shows "N episodes · 0 unplayed". |
| Episode with no audio yet (generating) | Set `status: 'unplayed'`, no badge. Tapping plays nothing — guard on `audioId` before calling `player.play`. Show a brief toast. |
| Long episode title | `numberOfLines={2}` on title. `EpisodeRow` has `minHeight: 76` but grows to fit 2-line titles. Use `alignItems: 'flex-start'` on the row. |
| Back navigation | This is a `(tabs)/` screen. `router.back()` returns to whichever screen pushed it (Library or Discover). The `backLabel` param makes the back button label accurate. |
| `SourceThumbnail` prop API mismatch | Read `native/components/SourceThumbnail.tsx` to verify the exact prop names for `size`, `borderRadius`, and background color before implementing. |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/(tabs)/source-detail.tsx` | CREATE — full source detail screen using SourceThumbnail component |
| `native/app/(tabs)/_layout.tsx` | ADD `<Tabs.Screen name="source-detail" options={{ href: null, headerShown: false }} />` |
| `native/lib/libraryHelpers.ts` | ADD `itemToSourceEpisode(item: LibraryItem): SourceEpisode` and `toPlayableItem(episode: SourceEpisode): PlayableItem | null` helper functions |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card`, `typography.*` |
| `redesign-library` | `EpisodeCard` dark styles already in place; `getAllEpisodes` query reused |
| `expo-router` | `useLocalSearchParams`, `useRouter` |
| `native/lib/db` | `getAllEpisodes()` |
| `native/lib/usePlayer` | `player.play()`, `player.playQueue()` for episode playback |
| `native/components/SourceThumbnail` | Existing component — use directly for source logo rendering |
| `native/lib/haptics` | `Haptics.light()` for row taps and more button |

---

## 7. Notes

- **Route is inside `(tabs)/` with `href: null`.** This is the correct pattern for drill-down screens that should preserve the tab shell (tab bar + mini player). The `nav-shell-redesign` spec notes this pattern: "drill-down screens (discover-topic, source-detail) will be added to `_layout.tsx` with `href: null` by later specs."
- **Use existing `SourceThumbnail` component.** The `SourceThumbnail` component already handles source logo rendering including image fallback and initials. Do NOT build a custom `View`-based logo block from scratch. Read `native/components/SourceThumbnail.tsx` to learn its props before implementing.
- **Back label is dynamic.** Pass `backLabel` as a route param. From Library: `'Library'`. From Discover: `'Discover'`. Fallback if not provided: `'Library'`. This gives users a clear mental model of where they came from.
- **NavTitle in the nav bar.** The blueprint includes the source name centered in the nav bar. This is in addition to the large `SourceTitle` in the header below. The NavTitle is a compact reference while the user scrolls — it should be 15px/600, textPrimary, single line with truncation.
- **Episode rows sit directly on `#0F0F1A` background** — no card container wrapping the list. Individual row items don't have their own surface container. The list is `borderDivider`-separated on the base background. This matches the blueprint (`EpisodeList` tokens use `color-background-screen`).
- **`toPlayableItem` must guard null `audioId`/`audioUrl`.** If the episode has no audio yet, return `null` and prevent calling `player.play(null)`. Show a brief toast "Still generating..." if the user taps an episode without audio.
- **The NavActionButton (ellipsis) is a placeholder** for future "Edit Source" / "Unfollow Source" functionality. In this phase it renders but shows no action (no-op or a stub ActionSheet).
- **Anti-slop:** No shadow on any element. Episode list on raw `backgroundScreen` — not wrapped in a card container.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
(tabs)/_layout.tsx change:
  Add <Tabs.Screen name="source-detail" options={{ href: null, headerShown: false }} />

source-detail.tsx (inside (tabs)/)
├── SafeAreaView (bg: backgroundScreen)
│   ├── NavBar (px:20, py:14, flexRow, alignItems:center)
│   │   ├── BackButton (flexRow, gap:4, onPress:router.back())
│   │   │   ├── Ionicons "chevron-back" (24, textSecondary)
│   │   │   └── Text {backLabel ?? "Library"} (17/400, textSecondary)
│   │   ├── NavTitle (flex:1, textAlign:center)
│   │   │   └── Text {sourceName} (15/600, textPrimary, 1 line)
│   │   └── NavActionButton (surfaceElevated, r:9999, 36×36, ellipsis icon)
│   └── ScrollView (pb:180)
│       ├── SourceHeader (px:20, pt:8, pb:24)
│       │   ├── SourceLogoRow (flexRow, gap:16, mb:16)
│       │   │   ├── SourceThumbnail (size:64, borderRadius:12, sourceLogoColor)
│       │   │   └── SourceInfoGroup (flex:1)
│       │   │       ├── SourceTitle (22/600, textPrimary, 1 line)
│       │   │       └── SourceMeta (13/400, textSecondary, mt:4)
│       │   └── PlayUnplayedButton (accentPrimary, h:48, r:10)
│       │       ├── PlayIcon (16, textPrimary)
│       │       └── Label (17/600, textPrimary)
│       └── EpisodeList (px:20)
│           [isLoading] SkeletonList (3 rows)
│           [empty] EmptyState
│           [each episode]
│             EpisodeRow (flexRow, py:12, gap:12, minH:76, alignItems:flex-start)
│             ├── Thumbnail (56×56, r:8, surfaceElevated)
│             ├── TextColumn (flex:1)
│             │   ├── Title (15/600, 2 lines)
│             │   ├── Meta (13/400, textSecondary)
│             │   └── Status
│             │       ├── [played]       "Played ✓" (statusSuccess #16A34A)
│             │       ├── [in_progress]  ProgressBar (3px, accentPrimary fill)
│             │       └── [new]          "New" pill (accentPrimary tint)
│             └── MoreButton (ellipsis, textSecondary)
│             [+ Divider borderDivider between rows]

libraryHelpers.ts additions:
  itemToSourceEpisode(item: LibraryItem): SourceEpisode
  toPlayableItem(episode: SourceEpisode): PlayableItem | null  (guards null audioId)
```
