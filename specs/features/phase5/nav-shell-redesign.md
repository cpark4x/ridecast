# F-P5-UI-02: Navigation Shell Redesign

## 1. Overview

**Module:** `native/app/(tabs)` · `native/components` · `native/app`
**Priority:** P0
**Size:** L — 3pt
**Depends on:** F-P5-UI-01 (`dark-theme-foundation`) — requires `native/lib/theme.ts` tokens

The current navigation shell has the wrong accent color (`#EA580C` instead of `#FF6B35`), wrong inactive color (`#9CA3AF` instead of `#6B7280`), a transparent tab bar background, only 2 tabs (missing Discover), and a `PlayerBar` that uses wrong colors, wrong corner radius, wrong sizes, and has shadow elevation that violates the design system. This spec replaces the entire tab layout, scaffolds the Discover tab, visually refreshes the `PlayerBar` to match the mini player blueprint spec exactly, and adds route-aware visibility logic so the PlayerBar hides on exempt fullscreen screens.

**Source material:** `ui-studio/moodboard/aesthetic-brief.md` · `ui-studio/storyboards/nav-shell.md` · `ui-studio/blueprints/07-mini-player/component-spec.md`

---

## 2. Requirements

### Interfaces

#### Tab Layout (`native/app/(tabs)/_layout.tsx`) — complete rewrite

```typescript
// No new exported types. The file exports a default TabLayout component.
// Key screenOptions shape (for reference):

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor:   colors.accentPrimary,    // '#FF6B35'
  tabBarInactiveTintColor: colors.textTertiary,     // '#6B7280'
  tabBarStyle: {
    backgroundColor: colors.surface,               // '#1A1A2E'
    borderTopColor:  colors.borderDivider,          // 'rgba(255,255,255,0.06)'
    borderTopWidth:  1,
    height:          sizes.tabBarHeight,            // 56
  },
  lazy: true,
};

// Tab icon signature (all three tabs follow this pattern):
// ({ color, focused }: { color: string; focused: boolean; size: number }) => JSX
// focused → filled Ionicons variant; unfocused → outline Ionicons variant
```

#### Discover Screen (`native/app/(tabs)/discover.tsx`) — new scaffold

```typescript
// Minimal placeholder screen. Will be fully implemented in a later phase spec.
export default function DiscoverScreen(): JSX.Element
// - SafeAreaView with backgroundColor: colors.backgroundScreen
// - Centered <Text> "Discover" in colors.textPrimary, typography.sizes.h1
// - No other content
```

#### PlayerBar (`native/components/PlayerBar.tsx`) — visual refresh only

Props and context hooks are unchanged. Only style values change. No logic changes.

```typescript
// Blueprint-exact token values for mini player (from 07-mini-player/component-spec.md):
//
//   Container borderRadius:    16  →  14  (borderRadius.miniPlayer = 14)
//   Container backgroundColor: '#1c1c1e' → colors.surfaceElevated ('#242438')
//   Container shadow props:    REMOVE ALL — shadowColor, shadowOffset, shadowOpacity,
//                              shadowRadius, elevation are ALL deleted (anti-slop rule)
//   Container marginHorizontal: 8  (8px side margins — unchanged)
//
//   Thumbnail size:     36  →  40  (blueprint: size-mini-player-thumbnail = 40)
//   Thumbnail radius:   (any existing value) → 8  (borderRadius.thumbnail = 8)
//
//   Title fontSize:     13  →  14  (blueprint: font-size-mini-player-title = 14)
//   Title fontWeight:   '600' → '500' (blueprint: font-weight-mini-player-title = medium)
//   Title color:        '#fff' → '#F5F5F5' (blueprint: color-mini-player-title = #F5F5F5)
//
//   Caption fontSize:   11  →  12  (blueprint: font-size-mini-player-caption = 12)
//   Caption color:      'rgba(255,255,255,0.5)' → colors.textSecondary ('#9CA3AF')
//
//   Progress bar fill:  '#EA580C' → colors.accentPrimary ('#FF6B35')
//   Play/pause icon:    22px → 24px (sizes.iconNav = 24)
//
//   Skip controls (rewind-15, skip-30): REMOVE — mini player blueprint shows play/pause only

// Style values that are unchanged:
//   paddingHorizontal: 14
//   paddingVertical: 10
//   gap: 10
//   Progress track height: 2
//   Play/pause icon color: white
```

#### Root Layout PlayerBar Visibility (`native/app/_layout.tsx`)

```typescript
// EXEMPT_SEGMENTS is exported so later specs (discover-ftue) can import and extend it
// without re-declaring the array.
export const EXEMPT_SEGMENTS = ['sign-in', 'processing', 'settings'] as const;
// NOTE: discover-ftue-topics and discover-ftue-sources are top-level Stack routes
// added by the discover-ftue spec. They are NOT tabs so they don't need href:null —
// they simply don't render the tab bar naturally. The PlayerBar exemption for those
// routes is handled by the discover-ftue spec updating this EXEMPT_SEGMENTS list.
// NOTE: discover-topic and source-detail are (tabs)/ drill-down screens added by
// later specs with href:null in the Tabs config. The tab bar (and thus mini player)
// remains visible on those screens by design — they are tab-shell screens.

// Add useSegments() call inside AppShell component.
// Render condition (replaces unconditional <PlayerBar />):
const isExemptScreen = EXEMPT_SEGMENTS.some(s => segments[0] === s);
// ...
{!isExemptScreen && <PlayerBar />}

// useSegments already imported in AuthGate — AppShell needs its own call.
// No changes to AuthGate, PlayerProvider, TelemetryProvider, or Stack screens.
```

### Behavior

#### Tab Bar

- Renders exactly 3 tabs in this order: **Home** (index 0), **Discover** (index 1), **Library** (index 2).
- Active tab: icon filled + label in `#FF6B35`. Inactive tab: icon outline + label in `#6B7280`.
- Icon names: Home → `home` / `home-outline`; Discover → `compass` / `compass-outline`; Library → `library` / `library-outline`. Focused prop drives the choice: `focused ? filledName : outlineName`.
- Tab bar background is `#1A1A2E` (opaque). Top border is 1px `rgba(255,255,255,0.06)`.
- Tab bar height is `56` px (from `sizes.tabBarHeight`).
- Haptic feedback fires on every tab press (existing `Haptics.light()` in `screenListeners` is retained).
- `lazy: true` is retained (Discover screen is not pre-rendered until first visit).

#### Discover Placeholder Screen

- Renders a full-screen dark background (`#0F0F1A`) with centered "Discover" text.
- No scroll, no list content, no empty-state illustration — it is a pure scaffold that will be replaced.
- Uses `SafeAreaView` to respect notch/home indicator insets.

#### Mini Player Bar (PlayerBar)

- Container: `#242438` background, `14px` corner radius, `8px` horizontal margin from screen edges. **No shadow or elevation props of any kind** — `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation` are all deleted from the component.
- Thumbnail: `40px` square rendered via `<SourceThumbnail size={40} borderRadius={8} ... />` (8px radius per blueprint token `size-mini-player-thumbnail-radius`).
- Title: single-line truncated, `14px`, weight `'500'`, color `'#F5F5F5'`.
- Caption (time remaining): `12px`, color `#9CA3AF`.
- Controls: **play/pause only**. The rewind-15 and skip-30 `TouchableOpacity` blocks are removed. The play/pause icon is `24px`, white.
- Progress bar: `#FF6B35` fill (was `#EA580C`), `2px` height at the bottom of the bar.
- Tapping the body still opens the expanded player (`setExpandedPlayerVisible(true)`).
- Returns `null` when `!currentItem` (existing guard is unchanged).

#### PlayerBar Visibility

- `PlayerBar` does **not** render when the active route segment is `sign-in`, `processing`, or `settings`.
- `PlayerBar` **does** render on all `(tabs)` screens (Home, Discover, Library), subject to the existing `!currentItem` guard inside `PlayerBar` itself.
- The `isExemptScreen` check lives in `AppShell` in `_layout.tsx`. `AppShell` gains a `useSegments()` call. No other component is modified.
- `EXEMPT_SEGMENTS` is exported from `_layout.tsx` so the `discover-ftue` spec can extend it.

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Tab bar renders 3 tabs: Home, Discover, Library in that order | `native/__tests__/TabLayout.test.tsx` — render `<TabLayout>`, assert 3 tab screens registered with correct names |
| AC-2 | Active tab tint is `#FF6B35`, inactive is `#6B7280` | `native/__tests__/TabLayout.test.tsx` — inspect `tabBarActiveTintColor` and `tabBarInactiveTintColor` in `screenOptions` |
| AC-3 | Tab bar background is `#1A1A2E` | `native/__tests__/TabLayout.test.tsx` — inspect `tabBarStyle.backgroundColor` |
| AC-4 | Tab bar top border is `rgba(255,255,255,0.06)` | `native/__tests__/TabLayout.test.tsx` — inspect `tabBarStyle.borderTopColor` |
| AC-5 | Tab bar height is `56` | `native/__tests__/TabLayout.test.tsx` — inspect `tabBarStyle.height` |
| AC-6 | Home tab uses `home-outline` icon when unfocused, `home` when focused | `native/__tests__/TabLayout.test.tsx` — render icon function with `focused: false` and `focused: true`, assert Ionicons name |
| AC-7 | Discover tab uses `compass-outline` / `compass` icons | Same pattern as AC-6 for discover tab |
| AC-8 | Library tab uses `library-outline` / `library` icons | Same pattern as AC-6 for library tab |
| AC-9 | `discover.tsx` renders a `View` with `backgroundColor: '#0F0F1A'` and a centered "Discover" text | Manual: navigate to Discover tab, see dark screen with "Discover" label. Unit: render `<DiscoverScreen>`, assert text content |
| AC-10 | `PlayerBar` container `backgroundColor` is `#242438` | `native/__tests__/PlayerBar.test.tsx` — render `<PlayerBar>` with mock currentItem, inspect container View style |
| AC-11 | `PlayerBar` container `borderRadius` is `14` | `native/__tests__/PlayerBar.test.tsx` — inspect container View style |
| AC-12 | `PlayerBar` has **no** shadow props (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`) | `native/__tests__/PlayerBar.test.tsx` — assert container View style does NOT include any shadow property. Also: `rg 'shadowColor\|elevation' native/components/PlayerBar.tsx` returns nothing |
| AC-13 | `PlayerBar` thumbnail is rendered at `size={40}` with `borderRadius={8}` (or equivalent 8px radius prop) | `native/__tests__/PlayerBar.test.tsx` — inspect `SourceThumbnail` props `size` and `borderRadius` |
| AC-14 | `PlayerBar` title is `14px`, weight `'500'`, color `'#F5F5F5'` | `native/__tests__/PlayerBar.test.tsx` — inspect title Text style |
| AC-15 | `PlayerBar` caption is `12px`, color `#9CA3AF` | `native/__tests__/PlayerBar.test.tsx` — inspect caption Text style |
| AC-16 | `PlayerBar` progress bar fill is `#FF6B35` | `native/__tests__/PlayerBar.test.tsx` — inspect progress fill View style backgroundColor |
| AC-17 | `PlayerBar` play/pause icon is `24px` | `native/__tests__/PlayerBar.test.tsx` — inspect Ionicons `size` prop |
| AC-18 | `PlayerBar` renders no rewind or skip-forward buttons | `native/__tests__/PlayerBar.test.tsx` — assert no `accessibilityLabel` matching "Rewind" or "Skip" in render output |
| AC-19 | `PlayerBar` is not rendered when `segments[0]` is `'sign-in'` | `native/__tests__/PlayerBar.test.tsx` or integration: mock `useSegments` returning `['sign-in']`, assert `PlayerBar` is not in tree |
| AC-20 | `PlayerBar` is not rendered when `segments[0]` is `'processing'` | Same as AC-19 but with `['processing']` |
| AC-21 | `PlayerBar` is rendered when `segments[0]` is `'(tabs)'` and `currentItem` is set | Integration: mock `useSegments` returning `['(tabs)']`, assert `PlayerBar` is in tree |
| AC-22 | `EXEMPT_SEGMENTS` is exported from `native/app/_layout.tsx` | `rg 'export const EXEMPT_SEGMENTS' native/app/_layout.tsx` returns a match |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| `currentItem` is `null` on a tab screen | `PlayerBar` internal `!currentItem` guard returns `null` — no mini player shown. The `isExemptScreen` check never fires because `PlayerBar` already renders nothing. |
| User deep-links directly to `settings` screen | `segments[0]` is `'settings'`, `isExemptScreen` is `true`, `PlayerBar` is hidden. Audio playback state is unaffected. |
| User is on `processing` screen while audio is playing | `PlayerBar` hidden. Playback continues in the background. When the user is returned to `(tabs)`, `PlayerBar` re-appears. |
| `segments` is empty (app initializing) | `EXEMPT_SEGMENTS.some(s => segments[0] === s)` evaluates to `false` on undefined — `PlayerBar` renders. Acceptable: auth gate handles redirect before any content is shown anyway. |
| Discover tab pressed for the first time (`lazy: true`) | Expo Router instantiates `DiscoverScreen` on first press. The placeholder renders immediately (no async loading). |
| `PlayerBar` tapped while on Library tab | `setExpandedPlayerVisible(true)` fires normally — expanded player is managed by root layout, not the tab bar. |
| Tab bar height collides with home indicator inset | Expo Router's tab bar handles safe area automatically via `react-native-safe-area-context`. The `height: 56` is the visible tab bar content height, not the total hit area. |
| Removing skip controls breaks other tests | `native/__tests__/PlayerBar.test.tsx` will be the canonical skip-controls test. If any other test file asserts on rewind/skip in `PlayerBar`, those assertions must be removed as part of this spec. |
| User navigates to `discover-topic` or `source-detail` drill-down | These are `(tabs)/` screens registered with `href: null` (added by later specs). The tab bar stays visible. The mini player also stays visible. No exemption needed. |

---

## 5. Files to Create/Modify

| File | Action | Contents |
|------|--------|----------|
| `native/app/(tabs)/_layout.tsx` | **Modify** (complete rewrite) | 3-tab `Tabs` layout using theme tokens. `screenOptions` with correct colors, surface background, `borderTopColor`, height `56`. Icon function with focused/unfocused Ionicons variants for each tab. Retain `screenListeners` haptic. ~45 LOC. |
| `native/app/(tabs)/discover.tsx` | **Create** | Scaffold `DiscoverScreen`. `SafeAreaView` + centered `Text "Discover"`. Uses `colors.backgroundScreen` and `colors.textPrimary`. ~20 LOC. |
| `native/components/PlayerBar.tsx` | **Modify** (visual refresh) | Apply new style values per §2 Interfaces. Delete `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation` — all removed with zero substitution. Remove rewind-15 and skip-30 `TouchableOpacity` blocks. Change thumbnail `size` to 40, add `borderRadius={8}`. Update text and color values. ~30 LOC net change. |
| `native/app/_layout.tsx` | **Modify** | Export `EXEMPT_SEGMENTS` (change `const` to `export const`). Add `useSegments()` call inside `AppShell`. Wrap `<PlayerBar />` with `{!isExemptScreen && <PlayerBar />}`. Import `useSegments` (already imported in file via `expo-router`). ~8 LOC net change. |
| `native/__tests__/TabLayout.test.tsx` | **Create** | Tests for AC-1 through AC-8. Render tab layout, inspect `screenOptions`, icon functions. ~70 LOC. |
| `native/__tests__/PlayerBar.test.tsx` | **Create** | Tests for AC-10 through AC-22. Mock `usePlayer` with a `currentItem`, mock `useSegments`. Assert style props and absence of skip controls. ~80 LOC. |

---

## 6. Dependencies

- No new npm packages required.
- `@expo/vector-icons` (Ionicons) — already installed; `compass-outline` / `compass` glyphs are present in Ionicons 5.
- `expo-router` — `useSegments` is already imported in `_layout.tsx`.
- `react-native-safe-area-context` — `SafeAreaView` used in `discover.tsx`; already installed (used in `PlayerBar.tsx` and others).
- F-P5-UI-01 (`dark-theme-foundation`) must be merged and `native/lib/theme.ts` must exist before this spec is implemented.

---

## 7. Notes

- **No shadows anywhere.** The aesthetic brief explicitly forbids shadow elevation. `PlayerBar` currently has `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, and `elevation` — **all must be deleted with no replacement**. Depth is communicated by `#242438` (surfaceElevated) floating above `#0F0F1A` (backgroundScreen). See `aesthetic-brief.md` → Anti-Slop Notes.
- **Blueprint-exact mini player tokens.** The `07-mini-player/component-spec.md` blueprint is the canonical source for mini player dimensions. The values in §2 (thumbnail 40px/8px radius, title 14px/500/#F5F5F5, caption 12px/#9CA3AF) are taken directly from that blueprint. Do not deviate.
- **Removing skip controls is a functional change.** The rewind-15 and skip-30 buttons are dropped from the mini player to match the nav-shell spec. These functions remain accessible in the expanded player. If the product owner wants to retain them in the mini player, this spec should be revised before implementation — not patched after.
- **`EXEMPT_SEGMENTS` is exported for extensibility.** The `discover-ftue` spec imports and extends this array to add FTUE route names. Export it at the module level so it can be imported: `import { EXEMPT_SEGMENTS } from './_layout'` (or equivalent relative path).
- **Drill-down screens (`discover-topic`, `source-detail`) stay inside the tab shell.** These screens are registered as `(tabs)/discover-topic.tsx` and `(tabs)/source-detail.tsx` with `href: null` by later specs. They are not exempt from the tab shell — the mini player and tab bar remain visible when navigating into them. Do NOT add these routes to `EXEMPT_SEGMENTS`.
- **Nav-shell.md lists 2 tabs; aesthetic-brief.md lists 3.** The aesthetic brief is the authoritative source. The 3-tab layout (Home / Discover / Library) is correct per `aesthetic-brief.md` line 95.
- **`discover.tsx` is a placeholder only.** The full Discover screen (topic picker, source cards, search) is specced separately. Do not add any list content or logic here.
- **`tabBarStyle.height: 56` is the rendered bar height.** Expo Router adds `paddingBottom` to account for the home indicator safe area on top of this value. Do not add manual `paddingBottom` to `tabBarStyle`.
- **Icon size** in tab bar icons: the `size` parameter from expo-router's tab bar callback is used as-is. Do not hardcode `24` — use the provided `size` parameter. Only the `name` and `color` props need to be controlled.

---

## 8. Implementation Map

> ⚠️ **REQUIRED: Fill this table BEFORE writing any implementation code.**
> This section must be completed during Platform Grounding (step 3 of working-session-instructions.md).
> Do not begin coding until every requirement row has a verified mapping to actual codebase types/APIs.

| Requirement | Implementation File + Function | Types/APIs Used | Notes |
|-------------|-------------------------------|-----------------|-------|
| Replace tab layout with 3-tab dark config | `native/app/(tabs)/_layout.tsx` — `TabLayout` default export | `Tabs`, `Tabs.Screen` from `expo-router`; `Ionicons` from `@expo/vector-icons`; `colors`, `sizes` from `../lib/theme` | Verify `Ionicons` import is not already present in file before adding |
| Add Discover tab screen registration | `native/app/(tabs)/_layout.tsx` — `<Tabs.Screen name="discover" ...>` | `Tabs.Screen` `options.tabBarIcon` callback with `focused` param | Verify expo-router discovers `discover.tsx` by filename convention |
| Create Discover scaffold screen | `native/app/(tabs)/discover.tsx` — new `DiscoverScreen` component | `SafeAreaView` from `react-native-safe-area-context`; `View`, `Text` from `react-native`; `colors`, `typography` from `../../lib/theme` | Path depth: `(tabs)/` is 2 levels from `lib/` |
| Remove ALL shadow props from PlayerBar container | `native/components/PlayerBar.tsx` — outer `<View style={{...}}>` | Delete keys: `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation` — no replacement | Grep current file to confirm exact keys before removing |
| Update PlayerBar container background + radius | `native/components/PlayerBar.tsx` — outer `<View>` style | `colors.surfaceElevated` (`#242438`), `borderRadius.miniPlayer` (`14`) from `../../lib/theme` | Path: `../lib/theme` from `components/` |
| Update PlayerBar thumbnail size and radius | `native/components/PlayerBar.tsx` — `<SourceThumbnail size={...}>` | `size={40}`, `borderRadius={8}` (or equivalent prop name on SourceThumbnail) | Confirm `SourceThumbnail` prop name for radius |
| Update PlayerBar title styles | `native/components/PlayerBar.tsx` — title `<Text style={{...}}>` | `fontSize: 14`, `fontWeight: '500'`, `color: '#F5F5F5'` | Was: `fontSize: 13`, `fontWeight: '600'`, `color: '#fff'` |
| Update PlayerBar caption styles | `native/components/PlayerBar.tsx` — caption `<Text style={{...}}>` | `fontSize: 12`, `color: colors.textSecondary` | Was: `fontSize: 11`, `color: 'rgba(255,255,255,0.5)'` |
| Update PlayerBar progress bar fill color | `native/components/PlayerBar.tsx` — inner progress fill `<View>` | `backgroundColor: colors.accentPrimary` (`#FF6B35`) | Was: `#EA580C` |
| Update play/pause icon size to 24 | `native/components/PlayerBar.tsx` — play/pause `<Ionicons size={...}>` | `size={24}` (was `22`) | Apply `sizes.iconNav` or hardcode `24` |
| Remove rewind-15 button | `native/components/PlayerBar.tsx` — `TouchableOpacity` with `accessibilityLabel="Rewind 15 seconds"` | Delete entire `TouchableOpacity` block | Confirm `skipBack` import from `usePlayer` can remain (used elsewhere? — check if tree-shaken) |
| Remove skip-30 button | `native/components/PlayerBar.tsx` — `TouchableOpacity` with `accessibilityLabel="Skip 30 seconds"` | Delete entire `TouchableOpacity` block | Confirm `skipForward` import from `usePlayer` can remain |
| Export `EXEMPT_SEGMENTS` from `_layout.tsx` | `native/app/_layout.tsx` — change `const EXEMPT_SEGMENTS` to `export const EXEMPT_SEGMENTS` | TypeScript `as const` array | Verify no circular import risk — `_layout.tsx` exports only this constant |
| Add `useSegments` to `AppShell` | `native/app/_layout.tsx` — `AppShell` component body | `useSegments` from `expo-router` — already imported at file top; no new import needed | Verify `useSegments` is in the existing import statement |
| Wrap PlayerBar with exempt-screen guard | `native/app/_layout.tsx` — `AppShell` JSX, `<PlayerBar />` line | `segments[0]` string comparison against `EXEMPT_SEGMENTS` array | Confirm `segments` type is `string[]` — `useSegments()` return type |
