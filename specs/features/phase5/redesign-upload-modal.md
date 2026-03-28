# F-P5-UI-05: Upload Modal + Duration Picker Redesign

## 1. Overview

**Module:** `native/components/UploadModal.tsx` · `native/components/DurationPicker.tsx`
**Phase:** 3 — Upload + Processing Refresh
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

The Upload Modal is currently a white-background bottom sheet with light-gray inputs, a white file drop zone, and a gray-bordered duration picker. This spec converts it to the dark bottom sheet system: `#1A1A2E` sheet, `#242438` elevated inputs, `rgba(255,255,255,0.12)` dashed drop zone, `#3A3A4E` drag handle, and `#FF6B35`-selected duration chips.

**Source material:** `ui-studio/blueprints/03-upload-modal/component-spec.md` · `ui-studio/blueprints/03-upload-modal/tokens.json` · `ui-studio/blueprints/04-duration-picker/component-spec.md` · `ui-studio/blueprints/04-duration-picker/tokens.json`

---

## 2. Requirements

### Interfaces

No prop changes. `UploadModal` props (`visible`, `onDismiss`) are unchanged. `DurationPicker` props (`value`, `onChange`) are unchanged. `findActivePreset` exported pure function is unchanged.

### Behavior

#### `native/components/UploadModal.tsx`

**KeyboardAvoidingView root**
- `backgroundColor: "white"` → `colors.surface` (#1A1A2E)

**Drag handle**
- `backgroundColor: "#D1D5DB"` → `#3A3A4E` (the blueprint `color-handle: #3A3A4E`)
- Width: 40px, height 4px, borderRadius 2px — no change needed

**Title**
- `className="text-xl font-bold text-gray-900 mt-3 mb-5"` → `color: colors.textPrimary`, `fontSize: 22`, `fontWeight: '600'`

**Offline banner** (`OfflineModalBanner`)
- `bg-amber-50 border-amber-200` → `backgroundColor: 'rgba(217,119,6,0.15)'`, `borderColor: 'rgba(217,119,6,0.3)'`
- Text: `text-amber-700` → `color: '#D97706'`
- Icon: keep `color="#D97706"`

**URL input** (`TextInput` — urlInputRef)
- `className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"` →
  - `backgroundColor: colors.surfaceElevated` (#242438)
  - `borderWidth: 1`, `borderColor: colors.borderInput` (rgba(255,255,255,0.08))
  - `borderRadius: borderRadius.card` (10px)
  - `color: colors.textPrimary`
  - `placeholderTextColor: colors.textSecondary`

**Inline error row**
- `text-red-500` → `color: colors.statusError`
- Ionicons `color="#EF4444"` — same value, now references `colors.statusError`

**Fetch URL button** (conditionally shown when urlText has content)
- `className="mt-3 bg-brand py-3 rounded-xl items-center"` → `backgroundColor: colors.accentPrimary`, `borderRadius: borderRadius.card`
- `ActivityIndicator color="white"` — unchanged
- Button label: `text-white` → `colors.textPrimary`

**OR dividers** (both URL and text-paste)
- `bg-gray-200` (divider lines) → `backgroundColor: colors.borderDivider`
- `text-gray-400` (label text) → `color: colors.textSecondary`

**File drop zone** (`TouchableOpacity` — file picker)
- Border: `border-dashed border-gray-300` → `borderStyle: 'dashed'`, `borderColor: colors.borderDropzone` (rgba(255,255,255,0.12)), `borderWidth: 1`
- Background: transparent (keep)
- Icon: `color: offline ? "#D1D5DB" : "#6B7280"` → `color: offline ? colors.textTertiary : colors.textSecondary`
- Primary text: `text-gray-600` → `color: colors.textPrimary` (white)
- Secondary text: `text-gray-400` → `color: colors.textSecondary`
- Disabled state (offline): icon `colors.textTertiary`, text stays semi-muted via opacity

**Text paste input** (`TextInput` — raw text)
- Same token changes as URL input above

**Word count hint**
- `text-gray-400` → `color: colors.textSecondary`

**"Use This Text" button**
- Same as Fetch URL button: `accentPrimary` bg, `borderRadius.card`, white text

**File loading indicator**
- `ActivityIndicator size="large" color="#EA580C"` → `color: colors.accentPrimary`
- Label: `text-gray-500` → `colors.textSecondary`

**Truncation warning** (shown when `uploadResult.truncationWarning`)
- `bg-amber-50 border-amber-200` → same dark amber treatment as offline banner

**Content preview card** (`bg-gray-50 rounded-2xl p-4`)
- `bg-gray-50` → `backgroundColor: colors.surfaceElevated` (#242438)
- `rounded-2xl` → `borderRadius: borderRadius.card` (10px)
- Title: `text-gray-900` → `color: colors.textPrimary`
- Author: `text-gray-500` → `color: colors.textSecondary`
- Word count / read time badges: `bg-white border-gray-200` → `backgroundColor: colors.surface`, `borderColor: colors.borderInput`
- Badge text: `text-gray-600` → `color: colors.textSecondary`
- Source type badge: `bg-orange-100` → `rgba(255,107,53,0.15)`, text `text-orange-700` → `colors.accentPrimary`

**"Episode Length" label**
- `text-gray-700` → `color: colors.textPrimary` (it's a section label, should be primary)

**"Create Episode" CTA button**
- `bg-brand` → `colors.accentPrimary`; disabled: `bg-gray-300` → `colors.surface`
- Disabled text: `text-gray-500` → `colors.textTertiary`
- Active text: keep white

**"Use different content" link**
- `text-gray-400` → `color: colors.textSecondary`

---

#### `native/components/DurationPicker.tsx`

**Duration preset chips** (`TouchableOpacity` per preset)
- Active chip: `bg-brand` → `backgroundColor: colors.accentPrimary` (#FF6B35)
- Inactive chip: `bg-gray-100` → `backgroundColor: colors.surfaceElevated` (#242438) with `borderWidth: 1`, `borderColor: colors.borderInput`
- Active text: `text-white` → `color: colors.textPrimary`
- Inactive text: `text-gray-700` → `color: colors.textSecondary`

**Slider** (`@react-native-community/slider`)
- `minimumTrackTintColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- `maximumTrackTintColor: "#E5E7EB"` → `colors.surfaceElevated` (#242438)
- `thumbTintColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)

**Duration label below slider**
- `text-gray-600` → `color: colors.textSecondary`

---

## 3. Acceptance Criteria

- [ ] Modal sheet background is `#1A1A2E` (was white)
- [ ] Drag handle is `#3A3A4E` (was `#D1D5DB`)
- [ ] Title "Add Content" is white, 22px/600 (was gray-900, ~20px bold)
- [ ] URL input: `#242438` bg, `rgba(255,255,255,0.08)` border, white text, 10px radius (was gray-50, gray-200 border)
- [ ] OR divider lines: `rgba(255,255,255,0.06)` (was gray-200)
- [ ] File drop zone: dashed `rgba(255,255,255,0.12)` border (was dashed gray-300)
- [ ] Fetch URL / Use This Text buttons: `#FF6B35` bg (was `#EA580C` via `bg-brand`)
- [ ] Content preview: `#242438` bg, 10px radius (was gray-50, rounded-2xl)
- [ ] DurationPicker active chip: `#FF6B35` (was `#EA580C` via bg-brand)
- [ ] DurationPicker inactive chip: `#242438` bg, input border (was gray-100)
- [ ] Slider colors: `#FF6B35` / `#242438` / `#FF6B35` (was `#EA580C` / `#E5E7EB` / `#EA580C`)
- [ ] All secondary text: `#9CA3AF` (was various gray shades)
- [ ] Error states: `#EF4444` (value unchanged, references statusError)
- [ ] Create Episode CTA: `#FF6B35` bg (was `bg-brand` = `#EA580C`)

---

## 4. Edge Cases

- **Offline banner dark contrast:** The amber tone on `#1A1A2E` needs enough contrast. Use `rgba(217,119,6,0.15)` background (semi-transparent amber) so it reads as a warning band without using a light background color.
- **Text area min-height:** Raw text `TextInput` has `minHeight: 100` — ensure this renders correctly inside the dark `surfaceElevated` background without clipping
- **Truncation warning nested warning:** Same amber dark treatment as offline banner
- **Keyboard avoidance:** `KeyboardAvoidingView` root now has dark background — ensure no flash of white during sheet animation on iOS. Set `backgroundColor` on both `KeyboardAvoidingView` and the inner `ScrollView` container.
- **DurationPicker borderColor on active chip:** Active chip (`accentPrimary` fill) should have NO border — `borderWidth: 0` or omit border props. Only inactive chips have the `borderInput` border.

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/UploadModal.tsx` | Full dark theme pass on all visual styles |
| `native/components/DurationPicker.tsx` | Chip and slider dark theme tokens |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card` |

---

## 7. Notes

- The blueprint (03-upload-modal) shows a simplified two-section layout: URL input row + drop zone. The current implementation has a richer layout (URL + OR + file + OR + paste text). This spec does NOT change the layout — only colors. Keep the existing three-section layout as-is.
- Blueprint (04-duration-picker) shows large pill-shaped chips with "5 min" big number + "Standard" label below. Current implementation uses horizontal scrollable chips with a slider below. This spec does NOT restructure the chip layout — the slider + scrollable chips pattern is kept, only colors change.
- The `bg-brand` Tailwind class refers to `#EA580C` in the current tailwind config. After this spec, it will be replaced with inline `colors.accentPrimary` (#FF6B35). Do not change the tailwind config — replace `bg-brand` inline style references individually.
- `borderRadius.card` = 10 from theme. The current code uses `rounded-xl` (12px) and `rounded-2xl` (16px). Replace both with the explicit 10px value.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
UploadModal.tsx
├── Modal
│   └── KeyboardAvoidingView (bg: surface)
│       ├── DragHandle (bg: #3A3A4E)
│       └── ScrollView
│           ├── Title (textPrimary, 22/600)
│           ├── [offline] OfflineBanner (amber dark)
│           ├── [!uploadResult]
│           │   ├── URLInput (surfaceElevated, borderInput)
│           │   ├── [error] ErrorRow (statusError)
│           │   ├── [urlText] FetchButton (accentPrimary)
│           │   ├── ORDivider (borderDivider lines, textSecondary label)
│           │   ├── FilePicker (dashed borderDropzone)
│           │   ├── ORDivider (same)
│           │   ├── TextInput (surfaceElevated, borderInput)
│           │   └── [≥100 chars] UseThisTextButton (accentPrimary)
│           └── [uploadResult]
│               ├── PreviewCard (surfaceElevated, r:10)
│               ├── "Episode Length" label (textPrimary)
│               ├── DurationPicker (dark tokens)
│               ├── CreateEpisodeButton (accentPrimary)
│               └── UseDifferentContent (textSecondary)

DurationPicker.tsx
├── ChipScrollView
│   └── [each preset] Chip
│       ├── [active] bg: accentPrimary, text: textPrimary, no border
│       └── [inactive] bg: surfaceElevated, text: textSecondary, border: borderInput
└── Slider (accentPrimary fill, surfaceElevated track, accentPrimary thumb)
    └── ValueLabel (textSecondary)
```
