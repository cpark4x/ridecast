# F-P5-UI-12: Source Detail Screen

## 1. Overview

**Module:** `native/app/source-detail.tsx` (CREATE)
**Phase:** 6 — Source Detail — New Screen
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `redesign-library` (F-P5-UI-08)

A new screen accessible from the Library (tapping a source domain filter or a future "browse by source" entry point) and from the Discover feed (tapping a source row). Shows a source header with logo, name, episode count, and a "Play Unplayed" CTA; followed by a scrollable list of all episodes from that source with playback state indicators.

**Source material:** `ui-studio/blueprints/10b-source-detail/component-spec.md` · `ui-studio/blueprints/10b-source-detail/tokens.json`

---

## 2. Requirements

### Interfaces

```typescript
// Route params:
// sourceDomain: string       — e.g. "mittr.com"
// sourceName: string         — e.g. "MIT Technology Review"
// sourceLogoColor?: string   — optional hex color for logo block background

// Exported: default function SourceDetailScreen(): JSX.Element

// Data types:
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
const [isLoading, setIsLoading]  = useState(true);
const { sourceDomain, sourceName, sourceLogoColor } = useLocalSearchParams<{...}>();
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
    // Query local SQLite for episodes matching sourceDomain
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
SafeAreaView (bg: backgroundScreen, flex:1)
  NavBar (flexRow, alignItems:center, px:20, py:14)
    BackButton (flexRow, gap:4)
      Ionicons "chevron-back" size:24, textSecondary
      Text "Library"  17px/400, textSecondary  ← back label uses parent route name
    Spacer (flex:1)
    NavActionButton
      bg:surfaceElevated, r:9999, w:36, h:36, items:center, justify:center
      Ionicons "ellipsis-horizontal-circle-outline" size:20, textSecondary
  
  ScrollView (showsVerticalScrollIndicator:false, contentContainerStyle:{paddingBottom:180})
    SourceHeader (px:20, pt:8, pb:24)
      SourceLogoRow (flexRow, alignItems:center, gap:16, mb:16)
        SourceLogoBlock (64×64, r:12, bg:sourceLogoColor||surface)
          ShortLabel (derived: first 3 chars of sourceName uppercased, 13px/700, white, centered)
          OR Image if thumbnailUrl available
        SourceInfoGroup (flex:1)
          SourceTitle (22px/600, textPrimary, numberOfLines:1)
          SourceMeta  (13px/400, textSecondary, mt:4)
            "{episodes.length} episodes · {unplayedEpisodes.length} unplayed"
      PlayUnplayedButton (bg:accentPrimary, r:10, h:48, px:20, flexRow, gap:8, alignItems:center)
        Ionicons "play" size:16, textPrimary
        Text "{Play Unplayed · {unplayedMinutes} min}"  17px/600, textPrimary
        [no unplayed] disabled opacity 0.4, same layout
    
    EpisodeList (px:20)
      [isLoading] SkeletonList (3 rows)
      [episodes.length === 0 && !isLoading]
        EmptyState icon:"library-outline" title:"No episodes" subtitle:"No episodes found from this source"
      [each episode, index]
        EpisodeRow (flexRow, alignItems:center, py:12, gap:12, minHeight:76)
          Thumbnail (56×56, r:8, bg:surfaceElevated)
            OR Image if thumbnailUrl
          TextColumn (flex:1)
            EpisodeTitle  (15px/600, textPrimary, numberOfLines:2)
            MetaLine      (13px/400, textSecondary, mt:2) "{durationMin} min · {format}"
            StatusArea (mt:4)
              [status='played']      Text "Played ✓"  11px/400, statusSuccess (#16A34A)
              [status='in_progress'] ProgressBar (h:3, r:3, track:surfaceElevated, fill:accentPrimary, width:progressPct+'%')
              [status='new']         Pill bg:accentPrimary/15%, text:accentPrimary, "New" 11px/400, r:9999
              [status='unplayed']    nothing (no badge)
          MoreButton (Ionicons "ellipsis-horizontal" size:20, textSecondary, p:4)
        [index < episodes.length-1] Divider (h:1, bg:borderDivider)
```

#### NavBar back label
The blueprint shows "‹ Library" as the back button. The back label should reflect the parent route. Use `router.back()` on press. For simplicity, hardcode the label as the `sourceName` route param or use "Library" as default (since this screen is currently only accessible from Library).

#### Play Unplayed button
- Press: `player.playQueue(unplayedEpisodes.map(e => toPlayableItem(e)))`
- Disabled (no unplayed): render button with `opacity: 0.4`, no `onPress`

#### Episode row press
- Tap episode row body: play that episode via `player.play(toPlayableItem(episode))`
- Tap MoreButton: iOS ActionSheet with "Rename" / "Delete" / "Cancel" (same pattern as EpisodeCard)

---

## 3. Acceptance Criteria

- [ ] Screen background: `#0F0F1A`
- [ ] NavBar: "‹ Library" back label in `#9CA3AF` (textSecondary), ellipsis action button in `#242438` bg
- [ ] Source logo block: 64×64, 12px radius, derived short label in white (or source color bg)
- [ ] Source title: white, 22px/600
- [ ] Source meta: `#9CA3AF`, 13px, shows episode count + unplayed count
- [ ] "Play Unplayed" button: `#FF6B35`, 48px height, 10px radius, play icon + label
- [ ] Episode rows: 56×56 thumbnail placeholder, title/meta text, status indicator, ellipsis button
- [ ] "Played ✓" status: `#16A34A` (statusSuccess)
- [ ] "New" badge: `#FF6B35` tint bg, `#FF6B35` text
- [ ] In-progress: thin 3px progress bar `#FF6B35` fill on `#242438` track
- [ ] Row dividers: `rgba(255,255,255,0.06)` (borderDivider) between rows
- [ ] Empty state visible when source has no episodes
- [ ] `paddingBottom: 180` clears mini player + tab bar

---

## 4. Edge Cases

- **`sourceLogoColor` not provided:** Default logo block bg to `colors.surface` (#1A1A2E). Short label still visible in white.
- **Source name very short (1–2 chars):** ShortLabel uses `sourceName.substring(0, 3).toUpperCase()` — safe for all lengths.
- **All episodes played:** `unplayedEpisodes.length === 0`. Play button renders with `opacity: 0.4`, no press handler. SourceMeta shows "N episodes · 0 unplayed".
- **Episode with no audio yet (generating):** Set `status: 'unplayed'` and show no badge. Tapping plays nothing (check `audioId` before calling `player.play`). Show a toast or "Still generating" if tapped.
- **Long episode title:** `numberOfLines={2}` on title. `EpisodeRow` has `minHeight: 76` but grows to fit 2-line titles. Use `alignItems: 'flex-start'` on the row to handle variable height rows cleanly.
- **Back navigation from nested route:** This screen is at `native/app/source-detail.tsx` (top-level route). It may be pushed from Library or Discover. `router.back()` returns to whichever screen pushed it. The back label "Library" is hardcoded — acceptable for now; could be made dynamic via route params in a follow-up.

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/source-detail.tsx` | CREATE — full source detail screen |
| `native/lib/libraryHelpers.ts` | ADD `itemToSourceEpisode(item: LibraryItem): SourceEpisode` helper function |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card`, `typography.*` |
| `redesign-library` | `EpisodeCard` dark styles already in place; `getAllEpisodes` query reused |
| `expo-router` | `useLocalSearchParams`, `useRouter` |
| `native/lib/db` | `getAllEpisodes()` |
| `native/lib/usePlayer` | `player.play()`, `player.playQueue()` for episode playback |
| `native/lib/haptics` | `Haptics.light()` for row taps and more button |

---

## 7. Notes

- `SourceDetail` is a modal-style push route (`expo-router` stack push from Library or Discover). It does NOT appear in the tab bar. It receives `sourceDomain` and `sourceName` as route params.
- The source short label derivation: `sourceName.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase()`. E.g. "MIT Technology Review" → "MIT", "Ars Technica" → "ARS", "The Gradient" → "THE". This is a best-effort fallback; a real implementation would use `sourceName` or `sourceDomain` favicon lookup.
- `toPlayableItem(episode: SourceEpisode): PlayableItem` — adapts `SourceEpisode` to `PlayableItem`. Requires `audioId` and `audioUrl` to be non-null. Handle null case by returning early.
- The blueprint shows 5 episodes from a single source. In production this list is dynamically populated from the local SQLite DB filtered by `sourceDomain`. No pagination is needed for a typical user's source (rarely more than 30 episodes per source).
- Anti-slop: Episode rows sit directly on `#0F0F1A` background — no card container wrapping the whole list. Individual row items don't have their own surface container; the list is borderDivider-separated on the base background. This matches the blueprint (EpisodeList tokens use `color-background-screen`, not `color-surface`).
- The NavActionButton (ellipsis in top-right) is a placeholder for "Edit Source" or "Unfollow Source" functionality. In this phase it's rendered but tapping shows no action (no-op or a stub ActionSheet).

---

## 8. Implementation Map

_To be filled by implementing agent._

```
source-detail.tsx
├── SafeAreaView (bg: backgroundScreen)
│   ├── NavBar (px:20, py:14)
│   │   ├── BackButton (chevron + "Library", textSecondary)
│   │   └── NavActionButton (surfaceElevated, r:9999, ellipsis icon)
│   └── ScrollView (pb:180)
│       ├── SourceHeader (px:20)
│       │   ├── SourceLogoRow
│       │   │   ├── LogoBlock (64×64, r:12, logoColor/surface bg)
│       │   │   │   └── ShortLabel (13/700, white)
│       │   │   └── SourceInfoGroup
│       │   │       ├── SourceTitle (22/600, textPrimary)
│       │   │       └── SourceMeta (13/400, textSecondary)
│       │   └── PlayUnplayedButton (accentPrimary, h:48, r:10)
│       │       ├── PlayIcon (16, textPrimary)
│       │       └── Label (17/600, textPrimary)
│       └── EpisodeList (px:20)
│           [isLoading] SkeletonList
│           [empty] EmptyState
│           [each episode]
│               EpisodeRow (flexRow, py:12, gap:12, minH:76)
│               ├── Thumbnail (56×56, r:8, surfaceElevated)
│               ├── TextColumn (flex:1)
│               │   ├── Title (15/600, 2 lines)
│               │   ├── Meta (13/400, textSecondary)
│               │   └── Status
│               │       ├── [played]       "Played ✓" (statusSuccess)
│               │       ├── [in_progress]  ProgressBar (3px, accentPrimary)
│               │       └── [new]          "New" pill (accentPrimary tint)
│               └── MoreButton (ellipsis, textSecondary)
│               [+ Divider borderDivider]

libraryHelpers.ts additions:
  itemToSourceEpisode(item: LibraryItem): SourceEpisode
  toPlayableItem(episode: SourceEpisode): PlayableItem | null
```
