# F-P5-UI-04: Home Screens Redesign (Empty + Daily Driver)

## 1. Overview

**Module:** `native/app/(tabs)/index.tsx` · `native/components/EpisodeCard.tsx`
**Phase:** 2 — Core Screens Refresh
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `nav-shell-redesign` (F-P5-UI-02)

The Home screen currently has a white/light-gray (`#f2f2f7`) background, an orange-from-the-wrong-shade Play All button (`#EA580C` not `#FF6B35`), white episode cards with shadows, and light-mode typography. This spec updates the two home states (empty: 02-home-empty; with content: 06-home-daily) to the dark theme system.

The `EpisodeCard` component also requires a dark-mode overhaul: white card → `colors.surface`, light pills → dark variants, typography → all white/secondary palette. `EpisodeCard` is shared with `LibraryScreen` so changes here carry forward.

**Source material:** `ui-studio/blueprints/02-home-empty/component-spec.md` · `ui-studio/blueprints/02-home-empty/tokens.json` · `ui-studio/blueprints/06-home-daily/component-spec.md` · `ui-studio/blueprints/06-home-daily/tokens.json`

---

## 2. Requirements

### Interfaces

No new exported props or types. All existing props on `EpisodeCard` are unchanged.

### Behavior

#### `native/app/(tabs)/index.tsx` — HomeScreen

**Root container**
- `SafeAreaView`: `bg-[#f2f2f7]` → `backgroundColor: colors.backgroundScreen` (#0F0F1A)
- `ScrollView` `refreshControl` tintColor: `#EA580C` → `colors.accentPrimary` (#FF6B35)

**Header block** (white block wrapping greeting + Play All)
- Remove the wrapping `View style={{ backgroundColor: "#fff", paddingBottom: 8 }}` — background is now `colors.backgroundScreen`, no separate white block needed
- `GreetingHeader` component: the component currently renders its own text; ensure it uses `colors.textPrimary` for the greeting title and `colors.textSecondary` for the subtitle. (See notes — `GreetingHeader` is a separate component file, update it there or override via props if possible. Its internal styles are not read for this spec but the dark outcome is required.)

**Play All button** (rendered when `episodeCount > 0`)
- `backgroundColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- `borderRadius: 14` → `borderRadius.card` (10px from theme)
- Episode count label: `color: "rgba(255,255,255,0.7)"` — unchanged (already semi-transparent white)

**"Up Next" section label**
- `color: "#000"` → `colors.textPrimary` (#FFFFFF)
- `color: "#8e8e93"` (count badge) → `colors.textTertiary` (#6B7280)

**Empty states** (`NewUserEmptyState`, `AllCaughtUpEmptyState`, `StaleLibraryNudge`)
- These are separate components; this spec does not redesign their internals. They must not break on a dark background. If they have hardcoded white backgrounds they will need their own follow-up spec. Noted here as a known gap.

**SkeletonList**: skeleton shimmer colors need dark equivalents — `#F3F4F6`/`#E5E7EB` → `colors.surface`/`colors.surfaceElevated`. Applied in the skeleton component, not index.tsx directly. Note as a follow-on if skeleton is a separate file.

---

#### `native/components/EpisodeCard.tsx` — dark mode overhaul

**Card container** (`TouchableOpacity` outermost style)
- `backgroundColor: "#fff"` → `colors.surface` (#1A1A2E)
- `borderRadius: 16` → `borderRadius.card` (10px)
- `marginHorizontal: 16` → `marginHorizontal: 20` (matches `spacing.screenMargin`)
- `marginBottom: 8` → `marginBottom: 12` (matches `spacing.cardGap`)
- Remove: `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation` — no shadows in this design system

**Title text** (center column)
- `color: isAnonymous ? "#6d6d72" : "#000"` → `color: isAnonymous ? colors.textTertiary : colors.textPrimary`

**Meta line text** (domain · contentType)
- `color: "#8e8e93"` → `colors.textSecondary` (#9CA3AF)

**DurationPill** sub-component
- `backgroundColor: "#f2f2f7"` → `colors.surfaceElevated` (#242438)
- Clock icon color: `"#3c3c43"` → `colors.textSecondary` (#9CA3AF)
- Text: `color: "#3c3c43"` → `colors.textSecondary` (#9CA3AF)

**VersionsBadge** sub-component
- `backgroundColor: "rgba(234,88,12,0.1)"` → `rgba(255,107,53,0.15)` (slightly lighter tint on dark bg)
- Text: `color: "#EA580C"` → `colors.accentPrimary` (#FF6B35)

**ShimmerPill** sub-component
- `outputRange: ["#F3F4F6", "#E5E7EB"]` → `[colors.surface, colors.surfaceElevated]`

**Swipe-delete action** (`renderRightActions`)
- `className="bg-red-500 mr-4 mb-3 rounded-2xl px-5"` → keep `bg-red-500` (statusError is the same #EF4444), change `rounded-2xl` → explicit `borderRadius: borderRadius.card` (10px)

**Long-press action sheet** — logic unchanged, no visual change needed

---

## 3. Acceptance Criteria

- [ ] Home screen background is `#0F0F1A` (was `#f2f2f7`)
- [ ] Pull-to-refresh tint is `#FF6B35` (was `#EA580C`)
- [ ] Play All button is `#FF6B35`, `borderRadius` 10px (was `#EA580C`, 14px)
- [ ] "Up Next" label is white (was black)
- [ ] Episode cards have `#1A1A2E` background, 10px radius, no shadow (was white, 16px, shadowed)
- [ ] Card margins: 20px horizontal, 12px bottom (was 16px horizontal, 8px bottom)
- [ ] Title text on card: white for titled episodes, `#6B7280` italic for anonymous (was black/#6d6d72)
- [ ] Meta line text is `#9CA3AF` (was `#8e8e93`)
- [ ] DurationPill: `#242438` bg, `#9CA3AF` text+icon (was `#f2f2f7` bg, `#3c3c43` text)
- [ ] VersionsBadge: rgba(255,107,53,0.15) bg, `#FF6B35` text (was rgba(234,88,12,0.1) / `#EA580C`)
- [ ] Swipe delete action: 10px border radius (was `rounded-2xl` ≈ 16px)
- [ ] ShimmerPill: animates between `#1A1A2E` and `#242438` (was `#F3F4F6` / `#E5E7EB`)

---

## 4. Edge Cases

- **EpisodeCard used in LibraryScreen:** Changes to `EpisodeCard.tsx` apply to both Home and Library screens. The Library redesign spec (`redesign-library.md`) assumes these card-level token changes are already in place.
- **isAnonymous italic style:** Italic + `colors.textTertiary` (#6B7280) gives sufficient contrast on `#1A1A2E` surface — verified by contrast ratio (~4.5:1 for large text).
- **Missing GreetingHeader internals:** `GreetingHeader` is a separate component file (`native/components/GreetingHeader.tsx`). If it hardcodes light-mode colors, it will appear broken on the dark background. This spec requires the greeting to display with white primary and secondary palette — update `GreetingHeader.tsx` as part of this work even though it is not listed in the blueprint scope.
- **RefreshControl on Android:** `tintColor` is iOS only; Android uses `colors` prop array. Set `colors={[colors.accentPrimary]}` on Android as well.

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/(tabs)/index.tsx` | Root bg, Play All button color/radius, "Up Next" label color, RefreshControl tint |
| `native/components/EpisodeCard.tsx` | Card surface, border radius, shadows removed, all sub-component dark tokens |
| `native/components/GreetingHeader.tsx` | Typography colors to textPrimary/textSecondary (required side-effect) |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card`, `spacing.screenMargin`, `spacing.cardGap` |
| `nav-shell-redesign` | Tab bar and mini player already dark — this spec only touches screen content |

---

## 7. Notes

- The blueprint (06-home-daily) shows episode cards with a left-edge color accent for content type (`color-content-tech`, `color-content-business`). This feature is **explicitly excluded by the anti-slop notes** in `aesthetic-brief.md`: "No left-accent borders on cards." Do NOT implement left border accents.
- The blueprint shows `PlayAllLabel` content as `"Play All · 15 min"`. The current implementation already shows episode count text. Keep the existing label structure — do not change the label content, only colors.
- No floating action buttons. The Home screen currently has no FAB — it uses an "+" header button via `UploadModal` trigger. This is already correct per the design system.
- `EpisodeCard` does not receive a `theme` prop — it reads tokens directly from `native/lib/theme.ts`. Import and destructure the theme at the top of the file.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
index.tsx
├── SafeAreaView (bg: backgroundScreen)
│   ├── ScrollView (refreshControl: accentPrimary)
│   │   ├── [isLoading] SkeletonList (dark shimmer)
│   │   ├── GreetingHeader (white/secondary text)
│   │   ├── [episodeCount > 0] PlayAllButton (accentPrimary, r:10)
│   │   ├── UpNextLabel (textPrimary)
│   │   └── EpisodeCard[] (dark surface)
│   └── UploadModal

EpisodeCard.tsx
├── Swipeable
│   ├── renderRightActions → Delete (statusError, r:10)
│   └── TouchableOpacity (surface, r:10, no shadow)
│       ├── SourceThumbnail
│       ├── Title (textPrimary / textTertiary italic)
│       ├── MetaLine (textSecondary)
│       └── Footer
│           ├── [isGenerating] ShimmerPill (surface→surfaceElevated)
│           ├── DurationPill (surfaceElevated bg, textSecondary icon+text)
│           └── VersionsBadge (rgba(255,107,53,0.15), accentPrimary text)
```
