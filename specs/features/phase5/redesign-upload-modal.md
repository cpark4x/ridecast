# F-P5-UI-05: Upload Modal + Duration Picker Redesign

## 1. Overview

**Module:** `native/components/UploadModal.tsx` · `native/components/DurationPicker.tsx`
**Phase:** 3 — Upload + Processing Refresh
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

**This is a theme pass, not a structural redesign.** The Upload Modal's existing three-section layout (URL input → OR divider → file picker → OR divider → paste-text input) is kept exactly as-is. The paste-text `TextInput` and DOCX/PDF file picker (`expo-document-picker`) features shipped in the previous batch are explicitly preserved. The blueprint (03-upload-modal) shows a simplified two-section layout — this spec does NOT restructure the modal to match the blueprint. Only color tokens change.

The Upload Modal is currently a white-background bottom sheet with light-gray inputs, a white file drop zone, and a gray-bordered duration picker. This spec converts it to the dark bottom sheet system: `#1A1A2E` sheet, `#242438` elevated inputs, `rgba(255,255,255,0.12)` dashed drop zone, `#3A3A4E` drag handle, and `#FF6B35`-selected duration chips — applied to the EXISTING component tree.

**Source material:** `ui-studio/blueprints/03-upload-modal/component-spec.md` · `ui-studio/blueprints/03-upload-modal/tokens.json` · `ui-studio/blueprints/04-duration-picker/component-spec.md` · `ui-studio/blueprints/04-duration-picker/tokens.json`

---

## 2. Requirements

### Interfaces

No prop changes. `UploadModal` props (`visible`, `onDismiss`) are unchanged. `DurationPicker` props (`value`, `onChange`) are unchanged. `findActivePreset` exported pure function is unchanged. No layout or structural changes.

**Preserved features (do not remove):**
- Paste-text `TextInput` section (raw article text input)
- DOCX/PDF file picker (`expo-document-picker` trigger button)
- "Use This Text" button (appears when paste-text has ≥100 chars)
- "Use different content" reset link
- All three OR-divider sections
- Word count hint below paste-text input
- Offline banner (`OfflineModalBanner`)
- Truncation warning banner
- Content preview card with badges
- `DurationPicker` with horizontal chip scroll + slider

### Behavior

All token swaps below apply to the EXISTING component tree. Layout, logic, state, and functionality are unchanged.

#### `native/components/UploadModal.tsx`

**KeyboardAvoidingView root**
- Old `backgroundColor: "white"` → `colors.surface` (#1A1A2E)
- Set `backgroundColor` on both `KeyboardAvoidingView` and inner `ScrollView` container to prevent white flash during sheet animation on iOS.

**Drag handle**
- Old `backgroundColor: "#D1D5DB"` → `#3A3A4E` (blueprint `color-handle: #3A3A4E`)
- Width: 40px, height 4px, borderRadius 2px — no change

**Title** ("Add Content")
- Old `className="text-xl font-bold text-gray-900 mt-3 mb-5"` → `color: colors.textPrimary`, `fontSize: 22`, `fontWeight: '600'`

**Offline banner** (`OfflineModalBanner`)
- Old `bg-amber-50 border-amber-200` → `backgroundColor: 'rgba(217,119,6,0.15)'`, `borderColor: 'rgba(217,119,6,0.3)'`
- Text: old `text-amber-700` → `color: '#D97706'`
- Icon: keep `color="#D97706"`

**URL input** (`TextInput` — urlInputRef)
- Old `className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"` →
  - `backgroundColor: colors.surfaceElevated` (#242438)
  - `borderWidth: 1`, `borderColor: colors.borderInput` (rgba(255,255,255,0.08))
  - `borderRadius: borderRadius.card` (10px)
  - `color: colors.textPrimary`
  - `placeholderTextColor: colors.textSecondary`

**Inline error row**
- Old `text-red-500` → `color: colors.statusError`
- Old Ionicons `color="#EF4444"` — same value, now references `colors.statusError`

**Fetch URL button** (conditionally shown when urlText has content)
- Old `className="mt-3 bg-brand py-3 rounded-xl items-center"` → `backgroundColor: colors.accentPrimary`, `borderRadius: borderRadius.card`
- `ActivityIndicator color="white"` — unchanged
- Button label: old `text-white` → `colors.textPrimary`

**OR dividers** (appear after URL section and after file picker section)
- Old `bg-gray-200` (divider lines) → `backgroundColor: colors.borderDivider`
- Old `text-gray-400` (label text) → `color: colors.textSecondary`

**File drop zone** (`TouchableOpacity` — DOCX/PDF file picker — PRESERVE this feature)
- Border: old `border-dashed border-gray-300` → `borderStyle: 'dashed'`, `borderColor: colors.borderDropzone` (rgba(255,255,255,0.12)), `borderWidth: 1`
- Background: transparent (keep)
- Icon: old `color: offline ? "#D1D5DB" : "#6B7280"` → `color: offline ? colors.textTertiary : colors.textSecondary`
- Primary text: old `text-gray-600` → `color: colors.textPrimary`
- Secondary text: old `text-gray-400` → `color: colors.textSecondary`
- Disabled state (offline): icon `colors.textTertiary`, text stays semi-muted
- **The file picker functionality (expo-document-picker, DOCX/PDF support) is unchanged**

**Paste-text input** (`TextInput` — raw text — PRESERVE this feature)
- Same token changes as URL input: `surfaceElevated` bg, `borderInput` border, `borderRadius.card`, `textPrimary` color, `textSecondary` placeholder
- `minHeight: 100` — unchanged (do not remove)

**Word count hint**
- Old `text-gray-400` → `color: colors.textSecondary`

**"Use This Text" button** (shown when paste-text ≥100 chars — PRESERVE)
- Same as Fetch URL button: `accentPrimary` bg, `borderRadius.card`, white text

**File loading indicator** (shown when loading a picked document)
- Old `ActivityIndicator size="large" color="#EA580C"` → `color: colors.accentPrimary`
- Label: old `text-gray-500` → `colors.textSecondary`

**Truncation warning** (shown when `uploadResult.truncationWarning`)
- Old `bg-amber-50 border-amber-200` → same dark amber treatment as offline banner: `rgba(217,119,6,0.15)` bg, `rgba(217,119,6,0.3)` border

**Content preview card** (`bg-gray-50 rounded-2xl p-4`)
- Old `bg-gray-50` → `backgroundColor: colors.surfaceElevated` (#242438)
- Old `rounded-2xl` → `borderRadius: borderRadius.card` (10px)
- Title: old `text-gray-900` → `color: colors.textPrimary`
- Author: old `text-gray-500` → `color: colors.textSecondary`
- Word count / read time badges: old `bg-white border-gray-200` → `backgroundColor: colors.surface`, `borderColor: colors.borderInput`
- Badge text: old `text-gray-600` → `color: colors.textSecondary`
- Source type badge: old `bg-orange-100` → `rgba(255,107,53,0.15)`, text old `text-orange-700` → `colors.accentPrimary`

**"Episode Length" label**
- Old `text-gray-700` → `color: colors.textPrimary`

**"Create Episode" CTA button**
- Old `bg-brand` → `colors.accentPrimary`; disabled: old `bg-gray-300` → `colors.surface`
- Disabled text: old `text-gray-500` → `colors.textTertiary`
- Active text: keep white

**"Use different content" link**
- Old `text-gray-400` → `color: colors.textSecondary`

---

#### `native/components/DurationPicker.tsx`

**Duration preset chips** (`TouchableOpacity` per preset — horizontal scroll, PRESERVE layout)
- Active chip: old `bg-brand` → `backgroundColor: colors.accentPrimary` (#FF6B35); no border
- Inactive chip: old `bg-gray-100` → `backgroundColor: colors.surfaceElevated` (#242438) with `borderWidth: 1`, `borderColor: colors.borderInput`
- Active text: old `text-white` → `color: colors.textPrimary`
- Inactive text: old `text-gray-700` → `color: colors.textSecondary`

**Slider** (`@react-native-community/slider` — PRESERVE this layout)
- Old `minimumTrackTintColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- Old `maximumTrackTintColor: "#E5E7EB"` → `colors.surfaceElevated` (#242438)
- Old `thumbTintColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)

**Duration label below slider**
- Old `text-gray-600` → `color: colors.textSecondary`

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Modal sheet background is `#1A1A2E` (was white) | Visual: open modal on dark screen, no white background visible |
| AC-2 | Drag handle is `#3A3A4E` (was `#D1D5DB`) | Code review: `backgroundColor: '#3A3A4E'` |
| AC-3 | Title "Add Content" is white, 22px/600 (was gray-900, ~20px bold) | Code review + visual |
| AC-4 | URL input: `#242438` bg, `rgba(255,255,255,0.08)` border, white text, 10px radius | Visual + code review |
| AC-5 | OR divider lines: `rgba(255,255,255,0.06)` (was gray-200) | Code review |
| AC-6 | File drop zone: dashed `rgba(255,255,255,0.12)` border (was dashed gray-300) | Visual + code review |
| AC-7 | Paste-text input present and functional (preserved from previous batch) | Manual: open modal, type in paste-text area, "Use This Text" button appears |
| AC-8 | DOCX/PDF file picker button present and functional (preserved) | Manual: open modal, tap file picker, document picker opens |
| AC-9 | Fetch URL / "Use This Text" buttons: `#FF6B35` bg (was `bg-brand` = `#EA580C`) | Visual + code review |
| AC-10 | Content preview card: `#242438` bg, 10px radius (was gray-50, rounded-2xl) | Visual + code review |
| AC-11 | DurationPicker active chip: `#FF6B35` (was `#EA580C` via bg-brand) | Visual + code review |
| AC-12 | DurationPicker inactive chip: `#242438` bg with border (was gray-100) | Visual + code review |
| AC-13 | Slider colors: `#FF6B35` minimum / `#242438` maximum / `#FF6B35` thumb | Code review: `minimumTrackTintColor`, `maximumTrackTintColor`, `thumbTintColor` |
| AC-14 | All secondary text: `#9CA3AF` (was various gray shades) | Code review |
| AC-15 | Error states: `#EF4444` (value unchanged, references `colors.statusError`) | Code review |
| AC-16 | Create Episode CTA: `#FF6B35` bg active, `#1A1A2E` bg disabled (was `bg-brand` / `bg-gray-300`) | Visual: both states |
| AC-17 | No structural layout changes — three-section modal structure intact | Manual: verify URL → OR → file picker → OR → paste-text sections all present |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Offline banner dark contrast | Amber tone on `#1A1A2E`: `rgba(217,119,6,0.15)` background is sufficient contrast without using a light background color |
| Paste-text `minHeight: 100` | Renders correctly inside `surfaceElevated` (#242438) background without clipping |
| Truncation warning nested warning | Same dark amber treatment as offline banner |
| Keyboard avoidance white flash | Set `backgroundColor` on both `KeyboardAvoidingView` AND the inner `ScrollView` container to `colors.surface` |
| Active chip has no border | Active chip (`accentPrimary` fill) must have NO border — `borderWidth: 0` or omit border props. Only inactive chips have `borderInput` border. |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/UploadModal.tsx` | Dark theme token pass on ALL visual styles. No layout or structure changes. Preserve paste-text input and DOCX/PDF file picker. |
| `native/components/DurationPicker.tsx` | Chip and slider dark theme tokens only. Keep horizontal chip scroll + slider layout. |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card` |

---

## 7. Notes

- **Keep current modal structure and layout. This is a theme pass, not a structural redesign.** The blueprint (03-upload-modal) shows a simplified two-section layout (URL + drop zone). The current implementation has a richer layout (URL + OR + file + OR + paste text). This spec does NOT restructure to match the blueprint.
- **Preserve the paste-text input and DOCX/PDF file picker features.** These were shipped in the previous batch. Any spec changes that accidentally remove these UI sections are bugs.
- **All `bg-brand` references replaced individually.** The `bg-brand` Tailwind class resolves to `#EA580C` in the current tailwind config. Replace each instance with inline `backgroundColor: colors.accentPrimary` (#FF6B35). Do not change the tailwind config.
- **`borderRadius.card` = 10.** Current code uses `rounded-xl` (12px) and `rounded-2xl` (16px). Replace both with explicit `10` value from `borderRadius.card`.
- **Blueprint (04-duration-picker) shows large pill-shaped chips** with "5 min" big number + "Standard" label below. Current implementation uses horizontal scrollable chips with a slider below. This spec does NOT restructure the chip layout — the slider + scrollable chips pattern is kept, only colors change.
- **Anti-slop:** No gradients, no shadows, no blur on any modal element. Depth is from color tiers (`surface` → `surfaceElevated`).

---

## 8. Implementation Map

_To be filled by implementing agent._

```
UploadModal.tsx (layout unchanged, token pass only)
├── Modal
│   └── KeyboardAvoidingView (bg: surface #1A1A2E)
│       ├── DragHandle (bg: #3A3A4E)
│       └── ScrollView (bg: surface)
│           ├── Title (textPrimary, 22/600)
│           ├── [offline] OfflineBanner (dark amber)
│           ├── [!uploadResult]
│           │   ├── URLInput (surfaceElevated, borderInput, r:10)
│           │   ├── [error] ErrorRow (statusError)
│           │   ├── [urlText] FetchButton (accentPrimary, r:10)
│           │   ├── ORDivider (borderDivider lines, textSecondary label)
│           │   ├── FilePicker (dashed borderDropzone) ← PRESERVE
│           │   ├── ORDivider (same)
│           │   ├── PasteTextInput (surfaceElevated, borderInput) ← PRESERVE
│           │   ├── WordCountHint (textSecondary)
│           │   └── [≥100 chars] UseThisTextButton (accentPrimary) ← PRESERVE
│           └── [uploadResult]
│               ├── [truncationWarning] TruncationBanner (dark amber)
│               ├── PreviewCard (surfaceElevated, r:10)
│               ├── "Episode Length" label (textPrimary)
│               ├── DurationPicker (dark tokens)
│               ├── CreateEpisodeButton (accentPrimary / surface disabled)
│               └── UseDifferentContent (textSecondary)

DurationPicker.tsx (layout unchanged, token pass only)
├── ChipScrollView (horizontal, keep layout)
│   └── [each preset] Chip
│       ├── [active] bg: accentPrimary, text: textPrimary, no border
│       └── [inactive] bg: surfaceElevated, text: textSecondary, border: borderInput
└── Slider (accentPrimary min, surfaceElevated max, accentPrimary thumb)
    └── ValueLabel (textSecondary)
```
