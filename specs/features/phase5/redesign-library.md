# F-P5-UI-08: Library Screen Redesign

## 1. Overview

**Module:** `native/app/(tabs)/library.tsx`
**Phase:** 4 — Player + Library + Settings Refresh
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `nav-shell-redesign` (F-P5-UI-02)

**Keep current library IA. This is a theme pass.** The existing filter information architecture — search bar, filter chips (All/Unplayed/In Progress), Sources dropdown, Topics dropdown, sort control, and time-grouped SectionList — is kept exactly as-is. Do NOT simplify to match the blueprint's simpler IA (the blueprint shows a segmented control instead of chips; the current chip layout is correct and is kept).

The Library screen is currently white (`bg-white`), uses a gray search bar (`bg-gray-100`), light filter chips, and a circular FAB. This spec applies dark tokens: `#0F0F1A` background, `#1A1A2E` search bar and surfaces, `#FF6B35` active filters, time-grouped section headers in `textTertiary`, and moves the "+" action to the navigation header per the design system rules (no FAB).

**Source material:** `ui-studio/blueprints/10-library/component-spec.md` · `ui-studio/blueprints/10-library/tokens.json`

---

## 2. Requirements

### Interfaces

No prop or type changes. All existing state, filter logic, sort logic, and async handlers are unchanged.

### Behavior

**Token swaps — exact old value → new value:**

#### Root `SafeAreaView`
- Old `className="flex-1 bg-white"` → `backgroundColor: colors.backgroundScreen` (#0F0F1A)

#### Header row
- "Library" title: old `className="text-2xl font-bold text-gray-900"` → `color: colors.textPrimary`, `fontSize: 28`, `fontWeight: '700'`
- Sort button: old `backgroundColor: "#f2f2f7"` → `colors.surface` (#1A1A2E), `borderRadius: borderRadius.card` (10px)
- Sort icon: old `color="#3c3c43"` → `colors.textSecondary`
- Settings icon: old `color="#374151"` → `colors.textSecondary`

#### FAB → Header "+" button migration
The current circular FAB (`absolute bottom-8 right-6 bg-brand rounded-full`) violates the design system. **Remove the FAB** and move the "+" action to the header:
- **Remove:** `TouchableOpacity` with `absolute bottom-8 right-6` absolute positioning — delete entirely
- **Add** to header row (leftmost icon in the right-side icon group, before sort):
  - `onPress`: same handler as FAB (`dismissOnboardingHint` + `setUploadModalVisible(true)`)
  - Icon: `<Ionicons name="add" size={24} color={colors.textSecondary} />`
  - Container: `View` with `backgroundColor: colors.surface` (#1A1A2E), `borderRadius: borderRadius.card` (10px), `width: 36`, `height: 36`, `alignItems: 'center'`, `justifyContent: 'center'`

#### Search bar
- Old `className="mx-4 mb-3 flex-row items-center bg-gray-100 rounded-xl px-3 py-2 gap-2"` →
  - `backgroundColor: colors.surface` (#1A1A2E)
  - `borderRadius: borderRadius.card` (10px)
  - `borderWidth: 1`, `borderColor: colors.borderInput`
  - `marginHorizontal: 20` (was `mx-4` = 16px → now `spacing.screenMargin`)
- Search icon: old `color="#9CA3AF"` — same value, now via `colors.textSecondary`
- Placeholder: `placeholderTextColor="#9CA3AF"` — same value, now via `colors.textSecondary`
- Input text: old `className="flex-1 text-base text-gray-900"` → `color: colors.textPrimary`

#### Filter chips (horizontal scroll row — KEEP current chip structure)
- Active filter chip: old `backgroundColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- Inactive filter chip: old `backgroundColor: "rgba(116,116,128,0.12)"` → `colors.surfaceElevated` (#242438) with `borderWidth: 1, borderColor: colors.borderInput`
- Active text: old `color: "#fff"` — unchanged (white on accentPrimary)
- Inactive text: old `color: "#3c3c43"` → `colors.textSecondary` (#9CA3AF)

#### Sources / Topics dropdown chips (KEEP current dropdown structure)
- Active (filter applied): old `backgroundColor: "#EA580C"` → `colors.accentPrimary`; old `borderColor: "#EA580C"` → `colors.accentPrimary`; text white
- Inactive: old `backgroundColor: "rgba(116,116,128,0.1)"` → `colors.surfaceElevated`; old `borderColor: "rgba(0,0,0,0.08)"` → `colors.borderInput`; text old `"#3c3c43"` → `colors.textSecondary`
- Chevron/close icon: inactive old `"#9CA3AF"` → `colors.textSecondary`; active `"white"` — unchanged

#### Section headers (time-period groups — KEEP current section structure)
- Section title text: old `color: "#8e8e93"` → `colors.textTertiary` (#6B7280)
- Count badge: old `backgroundColor: "rgba(116,116,128,0.12)"` → `colors.surfaceElevated`; text old `color: "#8e8e93"` → `colors.textTertiary`

#### Sort order badge (active sort indicator)
- Old `className="bg-orange-100 px-3 py-1 rounded-full"` → `backgroundColor: 'rgba(255,107,53,0.15)'`, `borderRadius: 9999`
- Text: old `text-orange-700` → `colors.accentPrimary`
- Close icon: old `color="#C2410C"` → `colors.accentPrimary`

#### Onboarding tooltip
- Old `className="bg-gray-900 rounded-2xl px-4 py-3"` → `backgroundColor: colors.surface`, `borderRadius: borderRadius.card`
- Title text: old `text-white font-medium` → `color: colors.textPrimary`
- Subtitle text: old `text-gray-400` → `color: colors.textSecondary`
- Arrow nub: old `className="bg-gray-900"` → `backgroundColor: colors.surface`
- Tooltip anchor: update `absolute` positioning to `top: 52, right: 8` (below header area, near new "+" icon position instead of above removed FAB)

#### `EmptyState` component
Any hardcoded white or light backgrounds in the `EmptyState` component must be audited. Required outcome: text uses `textPrimary`/`textSecondary`, any card bg uses `surface`.

#### `SkeletonList` (from `../../components/SkeletonList`)
If `SkeletonList.tsx` uses light-mode shimmer values, update: old `#F3F4F6`/`#E5E7EB` → `colors.surface`/`colors.surfaceElevated`.

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Screen background is `#0F0F1A` (was white) | Visual |
| AC-2 | "Library" title is white, 28px/700 (was gray-900) | Code review |
| AC-3 | Search bar: `#1A1A2E` bg, `rgba(255,255,255,0.08)` border, 10px radius, white input text (was gray-100) | Visual + code review |
| AC-4 | Active filter chip: `#FF6B35` (was `#EA580C`) | Visual |
| AC-5 | Inactive filter chip: `#242438` bg, input border, `#9CA3AF` text (was rgba(116,116,128,0.12), `#3c3c43`) | Visual |
| AC-6 | Sources/Topics dropdown chips: `#FF6B35` when filter active, `#242438` when inactive | Visual: apply and remove a source filter |
| AC-7 | Section headers: `#6B7280` text, `#242438` count badge (was `#8e8e93`) | Visual |
| AC-8 | Sort order badge: `rgba(255,107,53,0.15)` bg, `#FF6B35` text (was orange-100 bg / orange-700 text) | Visual: apply non-default sort |
| AC-9 | FAB removed — no floating button in bottom-right | Visual: scroll to bottom, no FAB visible |
| AC-10 | "+" icon in header row: `#1A1A2E` bg, 36×36, 10px radius, `#9CA3AF` icon | Visual |
| AC-11 | "+" icon in header triggers UploadModal (same behavior as removed FAB) | Manual: tap "+", modal opens |
| AC-12 | Onboarding tooltip: `#1A1A2E` bg, repositioned below header "+" (was gray-900, above FAB) | Visual: trigger hint display |
| AC-13 | `EpisodeCard` dark styles applied (from `redesign-home-screens` which modifies `EpisodeCard.tsx`) | Visual: cards are dark-surfaced |
| AC-14 | Settings icon: `#9CA3AF` (was `#374151`) | Code review |
| AC-15 | Current library IA intact: search bar, filter chips, Sources dropdown, Topics dropdown, sort control, time-grouped sections | Manual: verify all filter controls present and functional |
| AC-16 | No shadow props on any Library screen element | `rg 'shadowColor\|elevation' native/app/(tabs)/library.tsx` — returns nothing |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| FAB removal and onboarding hint | `showOnboardingHint` state was tied to the FAB's position. After moving "+" to header, the tooltip anchor `absolute` position changes to `top: 52, right: 8` to point near the header "+" button. |
| Dismiss on scroll | `keyboardDismissMode="on-drag"` on the `SectionList` is kept — no change needed. |
| Empty filter state | When `filtered.length === 0` but `episodes.length > 0`, `EmptyState` renders "No episodes match" — must be legible on dark background after `EmptyState` dark token update. |
| FAB `onPress` handler | FAB called `dismissOnboardingHint()` then `setUploadModalVisible(true)`. Header "+" button must call the same two functions in the same order. |
| `NewVersionSheet` | Separate bottom sheet modal component. If it has light-mode hardcoded styles, flag it for a parallel dark theme pass (not in this spec scope). |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/(tabs)/library.tsx` | Full dark theme pass, FAB → header "+" move, filter chip tokens, tooltip repositioning |
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

- **Keep current library IA. This is a theme pass.** The existing filter structure (search bar, filter chips for All/Unplayed/In Progress, Sources dropdown, Topics dropdown, sort control, time-grouped sections) is the correct production IA. The blueprint shows a simpler segmented control instead of chips — the blueprint is used as a color reference only, not for IA restructuring.
- **No FAB.** The circular FAB violates the design system anti-slop rule: "No floating action buttons." The "+" action moves to the header. The handler logic is identical.
- **`borderRadius.card` = 10.** Current `rounded-xl` = 12px and `rounded-full` = 9999. Replace `rounded-xl` with 10 where applicable.
- **EpisodeCard dark styles come from `redesign-home-screens`.** The library card list automatically uses the dark-tokened `EpisodeCard` once that spec is applied. No card changes needed here.
- **Sources/Topics dropdowns open iOS ActionSheet.** This pattern is kept — no UI change for the picker itself.
- **Search margin:** `mx-4` (16px) → 20px to align with `spacing.screenMargin`.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
library.tsx (layout unchanged, theme pass + FAB→header migration)
├── SafeAreaView (bg: backgroundScreen)
│   ├── HeaderRow
│   │   ├── "Library" title (textPrimary, 28/700)
│   │   └── HeaderIcons (right side)
│   │       ├── AddButton (surface #1A1A2E, r:10, 36×36, textSecondary icon) ← NEW, was FAB
│   │       ├── SortButton (surface, r:10, textSecondary icon)
│   │       └── SettingsButton (textSecondary icon)
│   ├── SearchBar (surface #1A1A2E, borderInput, r:10, mx:20)
│   ├── FilterChips (horizontal scroll — keep existing structure)
│   │   ├── [TOGGLE_FILTERS] Chip (accentPrimary/surfaceElevated+borderInput)
│   │   ├── Separator
│   │   ├── SourcesDropdown (accentPrimary active/surfaceElevated inactive)
│   │   └── TopicsDropdown (accentPrimary active/surfaceElevated inactive)
│   ├── [sortOrder≠default] SortBadge (rgba orange tint, accentPrimary text+icon)
│   ├── [stale] StaleNudge
│   ├── SectionList (dark EpisodeCard items)
│   │   └── SectionHeader (textTertiary title, surfaceElevated count badge)
│   ├── UploadModal
│   ├── NewVersionSheet
│   └── [showOnboardingHint] Tooltip (surface bg, top:52 right:8 — near header "+")
```
