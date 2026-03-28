# F-P5-UI-06: Processing Screen Redesign

## 1. Overview

**Module:** `native/app/processing.tsx`
**Phase:** 3 — Upload + Processing Refresh
**Priority:** P1
**Size:** S — 1pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

The processing screen is currently white (`bg-white` via `SafeAreaView`) with a light gray stage list container (`bg-gray-50`), light-mode error states, and the wrong accent color (`#EA580C`) on active stage indicators. This spec applies the dark theme with no structural logic changes: dark background, dark stage list, correct token-based stage colors, and a thin progress bar that matches the blueprint.

**Source material:** `ui-studio/blueprints/05-processing/component-spec.md` · `ui-studio/blueprints/05-processing/tokens.json`

---

## 2. Requirements

### Interfaces

No API or logic changes. All existing state (`stage`, `errorMsg`, `audioError`), refs (`scriptIdRef`, `audioIdRef`, `abortRef`), and handler functions (`runPipeline`, `handleCancel`, `handleTryAgain`, `handleRetryAudio`) remain unchanged. Only style values change.

### Behavior

#### `SafeAreaView` root
- `className="flex-1 bg-white"` → `style={{ flex: 1, backgroundColor: colors.backgroundScreen }}`

#### Cancel button
- `className="text-sm text-gray-400"` → `color: colors.textSecondary` (#9CA3AF), `fontSize: 14`

#### Screen center layout (`View className="flex-1 items-center justify-center px-8"`)
- No layout change — keep `items-center justify-center`

#### Title "Creating Episode"
- `className="text-2xl font-bold text-gray-900 mb-2"` → `color: colors.textPrimary`, `fontSize: 24`, `fontWeight: '700'`

#### Subtitle "This usually takes 30–60 seconds"
- `className="text-sm text-gray-500 mb-10 text-center"` → `color: colors.textSecondary`, `fontSize: 13`

#### Stage list container (`View className="w-full bg-gray-50 rounded-2xl px-5 py-2 mb-8"`)
- `bg-gray-50` → `backgroundColor: colors.surface` (#1A1A2E)
- `rounded-2xl` → `borderRadius: borderRadius.card` (10px)

#### `StageRow` sub-component — icon colors
- `"complete"` stage: `iconColor = "#16A34A"` — unchanged value, now via `colors.statusSuccess`
- `"active"` stage: `iconColor = "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- `"upcoming"` stage: `iconColor = "#D1D5DB"` → `colors.textTertiary` (#6B7280) (previously too light)

#### `StageRow` sub-component — label text colors (Tailwind className)
- `"complete"` labelColor: `"text-green-700"` — change to inline `color: colors.statusSuccess`
- `"active"` labelColor: `"text-brand"` → inline `color: colors.accentPrimary`
- `"upcoming"` labelColor: `"text-gray-400"` → inline `color: colors.textTertiary`

#### `StageRow` copy text (active stage subtitle)
- `className="text-xs text-gray-500 mt-0.5"` → `color: colors.textTertiary`, `fontSize: 12`

#### `ActivityIndicator` (active stage spinner)
- `color="#EA580C"` → `color={colors.accentPrimary}`

#### Progress bar (NEW — from blueprint `ProgressBarSection`)
The blueprint shows a thin progress bar below the stage list. Add this element:
- Position: below the stage list container (`mb-8` block), above any error state
- Width: full (via `width: '100%'`)
- Height: 6px (`size-progress-bar-height` from blueprint)
- Track: `backgroundColor: colors.surfaceElevated` (#242438), `borderRadius: 3`
- Fill: `backgroundColor: colors.accentPrimary`, `borderRadius: 3`
- Fill width: computed from `getStageIndex(stage) / (STAGE_LABELS.length - 1) * 100 + '%'`
  - `analyzing` = 0%, `scripting` = 33%, `generating` = 66%, `ready` = 100%
- Wrap in a `View` with the track, position fill via absolute inside track or use flexbox

#### Error state container
- `className="bg-red-50 border-red-200 rounded-xl"` → `backgroundColor: 'rgba(239,68,68,0.12)'`, `borderColor: 'rgba(239,68,68,0.3)'`, `borderWidth: 1`, `borderRadius: borderRadius.card`
- Error text: `className="text-sm text-red-700 text-center"` → `color: colors.statusError`

#### "Retry Audio" button
- `className="flex-1 bg-brand py-3 rounded-xl items-center"` → `backgroundColor: colors.accentPrimary`, `borderRadius: borderRadius.card`
- Text: `text-white` → `color: colors.textPrimary`

#### "Start Over" button
- `className="flex-1 border border-gray-300 py-3 rounded-xl items-center"` → `borderColor: colors.borderInput`, `borderWidth: 1`, `borderRadius: borderRadius.card`
- Text: `text-gray-700` → `color: colors.textSecondary`

#### "Try Again" button (single button variant)
- `className="bg-brand py-3 px-8 rounded-xl items-center w-full"` → `backgroundColor: colors.accentPrimary`, `borderRadius: borderRadius.card`

---

## 3. Acceptance Criteria

- [ ] Screen background is `#0F0F1A` (was white)
- [ ] Stage list container background is `#1A1A2E`, 10px radius (was gray-50, rounded-2xl ≈ 16px)
- [ ] Active stage icon is `#FF6B35` (was `#EA580C`)
- [ ] Active stage label uses `colors.accentPrimary` inline (was `text-brand` = `#EA580C`)
- [ ] Complete stage icon is `#16A34A` (value unchanged)
- [ ] Upcoming stage icon is `#6B7280` (was `#D1D5DB` — too light on dark bg)
- [ ] Active stage `ActivityIndicator` is `#FF6B35` (was `#EA580C`)
- [ ] Progress bar present below stage list: 6px height, `#242438` track, `#FF6B35` fill
- [ ] Progress bar fill advances: analyzing→0%, scripting→33%, generating→66%, ready→100%
- [ ] Error card: dark red tint bg, `#EF4444` text (was red-50 bg / red-700 text)
- [ ] "Retry Audio" button: `#FF6B35` bg (was `bg-brand` = `#EA580C`)
- [ ] "Start Over" button: `rgba(255,255,255,0.08)` border (was gray-300)
- [ ] Cancel text: `#9CA3AF` (was gray-400 ≈ `#9CA3AF` — unchanged value)
- [ ] Title "Creating Episode": white, 24px (was gray-900)

---

## 4. Edge Cases

- **Progress bar at 0% (analyzing stage):** The fill `View` will have `width: '0%'` — ensure `minWidth: 0` is set so it collapses correctly and doesn't render a sliver
- **Upcoming icon contrast:** `#D1D5DB` (old value) on `#1A1A2E` (new dark surface) has near-zero contrast. `#6B7280` (textTertiary) provides ~3.8:1 — acceptable for decorative icons
- **Long stage copy text:** `STAGE_COPY` strings can be up to ~60 chars; `fontSize: 12` within the card padding should wrap cleanly at full width minus `px-5` padding
- **Progress bar on error:** If `errorMsg` is set, the progress bar still renders at the current `stage` value — it does NOT reset to 0. This is intentional (shows how far processing got before failure)

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/processing.tsx` | Dark theme pass: background, stage colors, error states. Add progress bar element. |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card` |

---

## 7. Notes

- The blueprint shows `ArticleInfoSection` (title + meta above the stage list) and `ThumbnailSection` (featured 335px image). The current implementation does not show article info or a thumbnail on the processing screen — it only has title text at the top. This spec does NOT add the article info section or featured thumbnail; those are beyond the "color/token pass" scope. The progress bar is the only additive element.
- `STAGE_LABELS` and `STAGE_COPY` live in `native/lib/constants.ts`. No changes needed there.
- `getStageIndex(stage)` returns 0–3. For progress bar computation: `progress = getStageIndex(stage) / (STAGE_LABELS.length - 1)`. When `STAGE_LABELS.length === 4`, this yields 0, 0.33, 0.66, 1.0.
- The existing `StageRow` uses `className` strings extensively. Replace all `className` style strings with inline `style` objects referencing `colors.*` tokens. The component is small enough to convert fully.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
processing.tsx
├── SafeAreaView (bg: backgroundScreen)
│   ├── CancelButton (textSecondary)
│   └── CenterView (flex:1, items-center, justify-center)
│       ├── Title (textPrimary, 24/700)
│       ├── Subtitle (textSecondary, 13)
│       ├── StageListContainer (surface, r:10)
│       │   └── StageRow × 4
│       │       ├── Icon/Spinner (accentPrimary active, statusSuccess done, textTertiary pending)
│       │       ├── LabelText (accentPrimary / statusSuccess / textTertiary)
│       │       └── [active] CopyText (textTertiary, 12)
│       ├── ProgressBar (NEW)
│       │   └── Track (surfaceElevated, h:6, r:3)
│       │       └── Fill (accentPrimary, computed width%)
│       └── [errorMsg] ErrorBlock
│           ├── ErrorCard (rgba(239,68,68,0.12) bg)
│           │   └── ErrorText (statusError)
│           ├── [audioError] RetryAudioButton (accentPrimary)
│           ├── [audioError] StartOverButton (borderInput border)
│           └── [!audioError] TryAgainButton (accentPrimary)
```
