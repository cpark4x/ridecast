# F-P5-UI-08: Library Screen Redesign

## 1. Overview

**Module:** `native/app/(tabs)/library.tsx`
**Phase:** 4 — Player + Library + Settings Refresh
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `nav-shell-redesign` (F-P5-UI-02)

The Library screen is currently white (`bg-white`), uses a gray search bar (`bg-gray-100`), light filter chips, and a circular FAB. The redesign applies dark tokens: `#0F0F1A` background, `#1A1A2E` search bar and surfaces, `#FF6B35` active filters, time-grouped section headers in `textTertiary`, and moves the "+" action to the navigation header per the design system rules (no FAB).

**Source material:** `ui-studio/blueprints/10-library/component-spec.md` · `ui-studio/blueprints/10-library/tokens.json`

---

## 2. Requirements

### Interfaces

No prop or type changes. All existing state, filter logic, sort logic, and async handlers are unchanged.

### Behavior

#### Root `SafeAreaView`
- `className="flex-1 bg-white"` → `backgroundColor: colors.backgroundScreen` (#0F0F1A)

#### Header row
- "Library" title: `className="text-2xl font-bold text-gray-900"` → `color: colors.textPrimary`, `fontSize: 28`, `fontWeight: '700'`
- Sort button: `backgroundColor: "#f2f2f7"` → `colors.surface` (#1A1A2E), `borderRadius: borderRadius.card` (10px)
- Sort icon: `color="#3c3c43"` → `colors.textSecondary`
- Settings icon: `color="#374151"` → `colors.textSecondary`

#### Search bar
- `className="mx-4 mb-3 flex-row items-center bg-gray-100 rounded-xl px-3 py-2 gap-2"` →
  - `backgroundColor: colors.surface` (#1A1A2E)
  - `borderRadius: borderRadius.card` (10px)
  - `borderWidth: 1`, `borderColor: colors.borderInput`
- Search icon: `color="#9CA3AF"` — same value but now via `colors.textSecondary`
- Placeholder text: `placeholderTextColor="#9CA3AF"` — same value
- Input text: `className="flex-1 text-base text-gray-900"` → `color: colors.textPrimary`

#### Filter chips (horizontal scroll row)
- Active filter chip: `backgroundColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- Inactive filter chip: `backgroundColor: "rgba(116,116,128,0.12)"` → `colors.surfaceElevated` (#242438) with `borderWidth: 1, borderColor: colors.borderInput`
- Active text: `color: "#fff"` — unchanged (white on accentPrimary)
- Inactive text: `color: "#3c3c43"` → `colors.textSecondary` (#9CA3AF)

#### Sources / Topics dropdown chips
- Active (filter applied): `backgroundColor: "#EA580C"` → `colors.accentPrimary`; `borderColor: "#EA580C"` → `colors.accentPrimary`; text white
- Inactive: `backgroundColor: "rgba(116,116,128,0.1)"` → `colors.surfaceElevated`; `borderColor: "rgba(0,0,0,0.08)"` → `colors.borderInput`; text `"#3c3c43"` → `colors.textSecondary`
- Chevron/close icon: inactive `"#9CA3AF"` → `colors.textSecondary`; active `"white"` — unchanged

#### Section headers (time-period groups)
- Section title text: `color: "#8e8e93"` → `colors.textTertiary` (#6B7280)
- Count badge: `backgroundColor: "rgba(116,116,128,0.12)"` → `colors.surfaceElevated`; text `color: "#8e8e93"` → `colors.textTertiary`

#### Sort order badge (active sort indicator)
- `className="bg-orange-100 px-3 py-1 rounded-full"` → `backgroundColor: 'rgba(255,107,53,0.15)'`, `borderRadius: 9999`
- Text: `text-orange-700` → `colors.accentPrimary`
- Close icon: `color="#C2410C"` → `colors.accentPrimary`

#### FAB → Header "+" button
The current FAB (`absolute bottom-8 right-6 bg-brand rounded-full`) violates the design system. **Remove the FAB** and move the "+" action to the header row:
- Remove the `TouchableOpacity` with `absolute bottom-8 right-6` positioning
- Add a `TouchableOpacity` in the header `View` (alongside sort + settings icons):
  - `onPress`: same handler as FAB (`dismissOnboardingHint` + `setUploadModalVisible(true)`)
  - Icon: `<Ionicons name="add" size={24} color={colors.textSecondary} />`
  - Sizing: 36×36 `View`, `borderRadius: borderRadius.card`, `backgroundColor: colors.surface`
  - Position: leftmost icon in the header right-side group (before sort)

#### Onboarding tooltip
- `className="bg-gray-900 rounded-2xl px-4 py-3"` → `backgroundColor: colors.surface`, `borderRadius: borderRadius.card`
- Title text: `text-white font-medium` → `color: colors.textPrimary`
- Subtitle text: `text-gray-400` → `color: colors.textSecondary`
- Arrow nub: `className="bg-gray-900"` → `backgroundColor: colors.surface`
- Tooltip is now anchored below the header "+" icon instead of above the FAB. Update `absolute` positioning accordingly: `top: 52, right: 8` (below header area, near "+" icon)

#### Empty states (`EmptyState` component)
- Any hardcoded white or light backgrounds in the `EmptyState` component must be audited. The component receives `icon`, `title`, `subtitle`, `actionLabel`, `onAction`. If `EmptyState.tsx` uses light-mode styles, update it as a side effect of this spec. Required outcome: text must be `textPrimary`/`textSecondary`, any card bg must be `surface`.

#### `StaleLibraryNudge`, `NewUserEmptyState`, `AllCaughtUpEmptyState`
- Same consideration as above — if these hardcode light backgrounds they will need updates. Add to Files to Modify section as needed.

#### `SkeletonList` (imported as `SkeletonList` from `../../components/SkeletonList`)
- Note: This is a different import than home screen's `SkeletonLoader`. Update skeleton shimmer colors here if `SkeletonList.tsx` uses light-mode values: `#F3F4F6`/`#E5E7EB` → `colors.surface`/`colors.surfaceElevated`

---

## 3. Acceptance Criteria

- [ ] Screen background is `#0F0F1A` (was white)
- [ ] "Library" title is white, 28px/700 (was gray-900)
- [ ] Search bar: `#1A1A2E` bg, `rgba(255,255,255,0.08)` border, 10px radius (was gray-100)
- [ ] Active filter chip: `#FF6B35` (was `#EA580C`)
- [ ] Inactive filter chip: `#242438` bg, input border, `#9CA3AF` text (was rgba(116,116,128,0.12), `#3c3c43`)
- [ ] Section headers: `#6B7280` uppercase text, count badge on `#242438` (was `#8e8e93`)
- [ ] Sort order badge: `rgba(255,107,53,0.15)` bg, `#FF6B35` text (was orange-100 bg / orange-700 text)
- [ ] FAB removed — no floating button in bottom-right
- [ ] "+" icon in header row, `#1A1A2E` bg, 36×36 (new element)
- [ ] Onboarding tooltip: `#1A1A2E` bg, repositioned below header (was gray-900, above FAB)
- [ ] EpisodeCard dark styles applied (from `redesign-home-screens` which modifies `EpisodeCard.tsx`)
- [ ] Settings icon: `#9CA3AF` (was `#374151`)

---

## 4. Edge Cases

- **FAB removal and onboarding hint:** The `showOnboardingHint` state is tied to the FAB's position. After moving "+" to header, the tooltip anchor must also change. Ensure the tooltip's `absolute` position correctly points toward the header "+" button.
- **Dismiss on scroll:** The current `keyboardDismissMode="on-drag"` on the `SectionList` — keep this. It works correctly in dark mode.
- **Empty filter state vs. new user state:** When `filtered.length === 0` but `episodes.length > 0`, the `EmptyState` "No episodes match" renders. On dark background it must be legible.
- **Sort by source on dark cards:** `groupByTimePeriod` produces section keys like "Today", "This Week", etc. with dark `#6B7280` headers — sufficient contrast on `#0F0F1A`.
- **NewVersionSheet:** `NewVersionSheet` is a separate bottom sheet modal component. If it has light-mode hardcoded styles, it needs a parallel dark theme pass (not in this spec scope but flag it).

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/(tabs)/library.tsx` | Full dark theme pass, FAB → header "+" move, filter chip tokens |
| `native/components/EmptyState.tsx` | Dark text and surface colors (required side-effect) |
| `native/components/SkeletonList.tsx` | Dark shimmer colors (if light-mode hardcoded) |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card` |
| `nav-shell-redesign` | Tab bar + mini player already dark |
| `redesign-home-screens` | `EpisodeCard.tsx` dark overhaul already done |

---

## 7. Notes

- Blueprint (10-library) shows episode cards rendered directly on `color-background-screen` (no card container/surface wrapping the list). Current implementation uses `EpisodeCard` with its own `#1A1A2E` surface. This is aligned with the design system — episode cards sit on the screen background as `color-surface` (#1A1A2E) elements.
- Blueprint shows filter tabs as a segmented control (`TabAll`/`TabUnplayed`/`TabInProgress` with an active `surfaceElevated` segment). Current implementation uses a horizontal scrollable chip row. The chip row is kept — no layout restructure.
- "Sources" and "Topics" dropdown chips currently open iOS ActionSheet. This pattern is kept — no UI change for the picker itself.
- Removing the FAB means removing the `onPress` handler that calls `dismissOnboardingHint`. Move this same call to the header "+" button's `onPress`.
- `borderRadius.card` = 10. Current `rounded-xl` = 12 and `rounded-full` = 9999. Replace `rounded-xl` with explicit 10px where applicable.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
library.tsx
├── SafeAreaView (bg: backgroundScreen)
│   ├── HeaderRow
│   │   ├── "Library" title (textPrimary, 28/700)
│   │   └── HeaderIcons (right side)
│   │       ├── AddButton (surface, r:10, textSecondary icon) ← NEW, was FAB
│   │       ├── SortButton (surface, r:10, textSecondary icon)
│   │       └── SettingsButton (textSecondary icon)
│   ├── SearchBar (surface, borderInput, r:10)
│   ├── FilterChips (horizontal scroll)
│   │   ├── [TOGGLE_FILTERS] Chip (accentPrimary/surfaceElevated+borderInput)
│   │   ├── Separator
│   │   ├── SourcesDropdown (accentPrimary/surfaceElevated)
│   │   └── TopicsDropdown (accentPrimary/surfaceElevated)
│   ├── [sortOrder≠default] SortBadge (rgba orange tint, accentPrimary text)
│   ├── [stale] StaleNudge
│   ├── SectionList (dark EpisodeCard items)
│   │   └── SectionHeader (textTertiary title, surfaceElevated count badge)
│   ├── UploadModal
│   ├── NewVersionSheet
│   └── [showOnboardingHint] Tooltip (surface bg, below header "+")
```
