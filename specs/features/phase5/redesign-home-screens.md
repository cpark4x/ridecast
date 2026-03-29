# F-P5-UI-04: Home Screens Redesign (Empty + Daily Driver)

## 1. Overview

**Module:** `native/app/(tabs)/index.tsx` · `native/components/EpisodeCard.tsx` · `native/components/GreetingHeader.tsx` · `native/components/NewUserEmptyState.tsx` · `native/components/AllCaughtUpEmptyState.tsx`
**Phase:** 2 — Core Screens Refresh
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `nav-shell-redesign` (F-P5-UI-02)

The Home screen currently has a white/light-gray (`#f2f2f7`) background, an orange-from-the-wrong-shade Play All button (`#EA580C` not `#FF6B35`), white episode cards with shadows, and light-mode typography. This spec updates **both** home states to the dark theme system:

- **Empty state** (02-home-empty blueprint): redesigned dark empty state with atmospheric illustration and CTA
- **Daily driver** (06-home-daily blueprint): dark content screen with header "+" button, correct accent, dark cards

The `EpisodeCard` component also requires a dark-mode overhaul: white card → `colors.surface`, light pills → dark variants, typography → white/secondary palette. `EpisodeCard` is shared with `LibraryScreen` so changes here carry forward.

**This is a theme pass. Keep current card structure.** Preserve all functional features: swipe-to-delete, long-press action sheet, `isAnonymous` italic, DurationPill, VersionsBadge, ShimmerPill.

**Source material:** `ui-studio/blueprints/02-home-empty/component-spec.md` · `ui-studio/blueprints/02-home-empty/tokens.json` · `ui-studio/blueprints/06-home-daily/component-spec.md` · `ui-studio/blueprints/06-home-daily/tokens.json`

---

## 2. Requirements

### Interfaces

No new exported props or types. All existing props on `EpisodeCard` are unchanged. All existing props on `GreetingHeader`, `NewUserEmptyState`, `AllCaughtUpEmptyState` are unchanged.

### Behavior

#### `native/app/(tabs)/index.tsx` — HomeScreen

**Root container**
- `SafeAreaView`: `bg-[#f2f2f7]` → `backgroundColor: colors.backgroundScreen` (#0F0F1A)
- `ScrollView` `refreshControl` tintColor: `#EA580C` → `colors.accentPrimary` (#FF6B35)
- `ScrollView` `refreshControl` `colors` (Android): add `colors={[colors.accentPrimary]}` prop

**Header block** — token changes only, no structural changes
- Remove the wrapping `View style={{ backgroundColor: "#fff", paddingBottom: 8 }}` — background is now `backgroundScreen`, no separate white block
- Header row background: transparent (inherits `backgroundScreen` from root)

**Header "+" button** (06-home-daily blueprint `HeaderPlusButton`)
- The current implementation has a "+" trigger for UploadModal in the header. Apply dark styling:
  - Container: `View` with `backgroundColor: colors.surface` (#1A1A2E), `borderRadius: borderRadius.card` (10px), `width: 36`, `height: 36`, `alignItems: 'center'`, `justifyContent: 'center'`
  - Icon: `<Ionicons name="add" size={24} color={colors.textSecondary} />`
  - Old style: likely transparent or `#f2f2f7` background with dark icon
  - `onPress`: unchanged — triggers `setUploadModalVisible(true)`

**`GreetingHeader` component** (update in `GreetingHeader.tsx`)
- Greeting title: dark-mode primary color → `colors.textPrimary` (#FFFFFF)
- Greeting subtitle / date string: → `colors.textSecondary` (#9CA3AF)
- Any hardcoded `#000`, `text-gray-900`, `text-gray-800`, or similar light-mode colors → `colors.textPrimary`
- Any hardcoded `#6d6d72`, `text-gray-500`, or similar → `colors.textSecondary`

**Play All button** (rendered when `episodeCount > 0`)
- `backgroundColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- `borderRadius: 14` → `borderRadius.card` (10px)
- Episode count label: `color: "rgba(255,255,255,0.7)"` — unchanged
- Play icon: `color: "white"` — unchanged

**"Up Next" section label**
- `color: "#000"` → `colors.textPrimary` (#FFFFFF)
- Count badge text `color: "#8e8e93"` → `colors.textTertiary` (#6B7280)

**SkeletonList**: skeleton shimmer colors — `#F3F4F6`/`#E5E7EB` → `colors.surface`/`colors.surfaceElevated`. If `SkeletonLoader.tsx` is a separate file, update it there.

---

#### Empty State Redesign (02-home-empty blueprint) — **NOT deferred**

The empty state is redesigned in this spec. Update `NewUserEmptyState` and `AllCaughtUpEmptyState` components with dark theme tokens. Empty states must look intentional on `#0F0F1A`, not broken.

**`NewUserEmptyState` component** (shown when user has 0 episodes ever)

Token swaps (old → new):
- Root container background: any light `#fff`/`#f2f2f7` → transparent (inherits `backgroundScreen` from parent)
- Illustration area / icon container: `backgroundColor: "#f2f2f7"` or similar → `colors.surface` (#1A1A2E), `borderRadius: 40` (large rounded square for illustration block)
- Icon inside illustration: old color → `colors.accentPrimary` (#FF6B35)
- Title text: `color: "#000"` / `text-gray-900` → `colors.textPrimary`
- Subtitle/description text: `color: "#8e8e93"` / `text-gray-500` → `colors.textSecondary`
- CTA button ("Add your first article"): `backgroundColor: old brand` → `colors.accentPrimary`; `borderRadius` → `borderRadius.card` (10px); text → `colors.textPrimary`

**`AllCaughtUpEmptyState` component** (shown when feed is empty / all consumed)

Token swaps:
- Root background: transparent (no white card)
- Checkmark/icon container: → `colors.surface` (#1A1A2E), large `borderRadius`
- Icon: → `colors.statusSuccess` (#16A34A)
- Title: → `colors.textPrimary`
- Subtitle: → `colors.textSecondary`
- Any CTA button: → `colors.accentPrimary`

---

#### `native/components/EpisodeCard.tsx` — dark mode overhaul (keep current structure)

**What changes:** token swaps only. **What does NOT change:** swipe-to-delete gesture, long-press action sheet, `isAnonymous` italic logic, DurationPill layout, VersionsBadge layout, ShimmerPill animation, `renderRightActions`.

**Card container** (`TouchableOpacity` outermost style)
- `backgroundColor: "#fff"` → `colors.surface` (#1A1A2E)
- `borderRadius: 16` → `borderRadius.card` (10px)
- `marginHorizontal: 16` → `marginHorizontal: 20` (matches `spacing.screenMargin`)
- `marginBottom: 8` → `marginBottom: 12` (matches `spacing.cardGap`)
- Remove: `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation` — **delete all shadow props, no replacement**

**Title text** (center column)
- `color: isAnonymous ? "#6d6d72" : "#000"` → `color: isAnonymous ? colors.textTertiary : colors.textPrimary`

**Meta line text** (domain · contentType)
- `color: "#8e8e93"` → `colors.textSecondary` (#9CA3AF)

**DurationPill** sub-component
- `backgroundColor: "#f2f2f7"` → `colors.surfaceElevated` (#242438)
- Clock icon color: `"#3c3c43"` → `colors.textSecondary` (#9CA3AF)
- Text: `color: "#3c3c43"` → `colors.textSecondary` (#9CA3AF)

**VersionsBadge** sub-component
- `backgroundColor: "rgba(234,88,12,0.1)"` → `'rgba(255,107,53,0.15)'`
- Text: `color: "#EA580C"` → `colors.accentPrimary` (#FF6B35)

**ShimmerPill** sub-component
- `outputRange: ["#F3F4F6", "#E5E7EB"]` → `[colors.surface, colors.surfaceElevated]`

**Swipe-delete action** (`renderRightActions`)
- `className="bg-red-500 mr-4 mb-3 rounded-2xl px-5"` → keep `bg-red-500` (statusError is `#EF4444`), change `rounded-2xl` → explicit `borderRadius: borderRadius.card` (10px)

**Long-press action sheet** — logic unchanged, no visual change needed

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Home screen background is `#0F0F1A` (was `#f2f2f7`) | Visual: no light background visible |
| AC-2 | Pull-to-refresh tint is `#FF6B35` (was `#EA580C`) on iOS; `colors={[accentPrimary]}` on Android | Code review: `RefreshControl tintColor` and `colors` props |
| AC-3 | Play All button is `#FF6B35`, `borderRadius` 10px (was `#EA580C`, 14px) | Visual + code review |
| AC-4 | Header "+" button: `#1A1A2E` bg, 36×36, 10px radius, `#9CA3AF` icon (was transparent/light) | Visual + code review |
| AC-5 | "Up Next" label is white (was black) | Code review: `color: colors.textPrimary` |
| AC-6 | Episode cards have `#1A1A2E` background, 10px radius, **no shadow** (was white, 16px, shadowed) | `rg 'shadowColor\|elevation' native/components/EpisodeCard.tsx` — returns nothing |
| AC-7 | Card margins: 20px horizontal, 12px bottom (was 16px horizontal, 8px bottom) | Code review |
| AC-8 | Title text on card: white for titled episodes, `#6B7280` italic for anonymous (was black/#6d6d72) | Visual: both states visible |
| AC-9 | Meta line text is `#9CA3AF` (was `#8e8e93`) | Code review |
| AC-10 | DurationPill: `#242438` bg, `#9CA3AF` text+icon (was `#f2f2f7` bg, `#3c3c43` text) | Visual + code review |
| AC-11 | VersionsBadge: rgba(255,107,53,0.15) bg, `#FF6B35` text (was rgba(234,88,12,0.1) / `#EA580C`) | Visual + code review |
| AC-12 | Swipe delete action: 10px border radius (was `rounded-2xl` ≈ 16px) | Code review |
| AC-13 | ShimmerPill: animates between `#1A1A2E` and `#242438` (was `#F3F4F6` / `#E5E7EB`) | Code review: `outputRange` values |
| AC-14 | `NewUserEmptyState`: dark surface icon container, `#FF6B35` icon, white title, `#9CA3AF` subtitle | Visual on dark background |
| AC-15 | `AllCaughtUpEmptyState`: dark surface icon container, `#16A34A` checkmark, white title, `#9CA3AF` subtitle | Visual on dark background |
| AC-16 | `GreetingHeader`: white greeting title, `#9CA3AF` subtitle — no hardcoded light colors | Code review + visual |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| `EpisodeCard` used in `LibraryScreen` | Changes to `EpisodeCard.tsx` apply to both Home and Library screens. The Library redesign spec assumes these card-level token changes are already in place. |
| `isAnonymous` italic style | Italic + `colors.textTertiary` (#6B7280) on `#1A1A2E` surface — contrast ratio ~4.5:1 for large text, acceptable. |
| `GreetingHeader` has its own internal light-mode colors | Update `GreetingHeader.tsx` as a required side effect of this spec. Both title and subtitle text must use dark tokens. |
| `RefreshControl` on Android | `tintColor` is iOS only. Android uses `colors` prop array. Set `colors={[colors.accentPrimary]}` for Android. |
| Empty state CTA button triggers UploadModal | `onPress` handler unchanged — still calls `setUploadModalVisible(true)`. Only visual styles change. |
| `AllCaughtUpEmptyState` has a "stale library nudge" variant | Apply same dark token pattern: transparent background, `colors.textPrimary` title, `colors.textSecondary` subtitle, `colors.accentPrimary` CTA. |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/(tabs)/index.tsx` | Root bg, Play All button color/radius, header "+" button dark styling, "Up Next" label color, RefreshControl tint |
| `native/components/EpisodeCard.tsx` | Card surface, border radius, **all shadow props deleted**, all sub-component dark tokens — keep current structure |
| `native/components/GreetingHeader.tsx` | Typography colors to `textPrimary`/`textSecondary` (required side-effect) |
| `native/components/NewUserEmptyState.tsx` | Dark surface icon container, `accentPrimary` icon, `textPrimary` title, `textSecondary` subtitle, `accentPrimary` CTA |
| `native/components/AllCaughtUpEmptyState.tsx` | Dark surface icon container, `statusSuccess` checkmark, `textPrimary` title, `textSecondary` subtitle |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card`, `spacing.screenMargin`, `spacing.cardGap` |
| `nav-shell-redesign` | Tab bar and mini player already dark — this spec only touches screen content |

---

## 7. Notes

- **This is a theme pass — keep current card structure.** The functional features (swipe-to-delete, long-press action sheet, isAnonymous italic, DurationPill, VersionsBadge, ShimmerPill) are preserved unchanged. Only color and spacing tokens change.
- **Empty state redesign is NOT deferred.** Both `NewUserEmptyState` and `AllCaughtUpEmptyState` are updated in this spec. They must look intentional on a dark background, not broken.
- **No left-accent borders on cards.** The blueprint (06-home-daily) shows episode cards with a left-edge color accent for content type. This is explicitly excluded by the anti-slop notes in `aesthetic-brief.md`: "No left-accent borders on cards." Do NOT implement left border accents.
- **No shadows anywhere.** `EpisodeCard` currently has shadow props — delete all of them (`shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation`). No replacement. Depth is from color tiers.
- **Header "+" button:** The Home screen already has a "+" trigger in the header for UploadModal. This spec applies dark theme styling to it (dark surface bg, `textSecondary` icon). The handler is unchanged.
- **`PlayAllLabel` content unchanged.** The blueprint shows `"Play All · 15 min"`. The current implementation shows episode count text. Keep the existing label structure — only colors change.
- **`EpisodeCard` does not receive a `theme` prop.** It reads tokens directly from `native/lib/theme.ts`. Import and destructure the theme at the top of the file.
- **`borderRadius.card` = 10.** Current code uses `16` (rounded-3xl) and `8` — replace all card-level radii with 10.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
index.tsx
├── SafeAreaView (bg: backgroundScreen)
│   ├── ScrollView (refreshControl: accentPrimary)
│   │   ├── HeaderRow
│   │   │   ├── GreetingHeader (textPrimary title, textSecondary subtitle)
│   │   │   └── HeaderPlusButton (surface bg, r:10, 36×36, textSecondary icon)
│   │   ├── [isLoading] SkeletonList (dark shimmer: surface → surfaceElevated)
│   │   ├── [episodeCount > 0] PlayAllButton (accentPrimary, r:10)
│   │   ├── UpNextLabel (textPrimary)
│   │   └── EpisodeCard[] (dark surface, no shadow)
│   ├── [episodeCount === 0, newUser] NewUserEmptyState (dark tokens)
│   ├── [episodeCount === 0, returning] AllCaughtUpEmptyState (dark tokens)
│   └── UploadModal

EpisodeCard.tsx (keep structure, theme pass only)
├── Swipeable
│   ├── renderRightActions → Delete (statusError, r:10)
│   └── TouchableOpacity (surface #1A1A2E, r:10, no shadow, mx:20, mb:12)
│       ├── SourceThumbnail
│       ├── Title (textPrimary / textTertiary italic)
│       ├── MetaLine (textSecondary)
│       └── Footer
│           ├── [isGenerating] ShimmerPill (surface→surfaceElevated)
│           ├── DurationPill (surfaceElevated bg, textSecondary icon+text)
│           └── VersionsBadge (rgba(255,107,53,0.15), accentPrimary text)

NewUserEmptyState.tsx
├── View (transparent bg)
│   ├── IconContainer (surface, large borderRadius)
│   │   └── Icon (accentPrimary)
│   ├── Title (textPrimary)
│   ├── Subtitle (textSecondary)
│   └── CTAButton (accentPrimary, r:10)

AllCaughtUpEmptyState.tsx
├── View (transparent bg)
│   ├── IconContainer (surface, large borderRadius)
│   │   └── CheckIcon (statusSuccess)
│   ├── Title (textPrimary)
│   └── Subtitle (textSecondary)
```
