# F-P5-UI-06: Processing Screen Redesign

## 1. Overview

**Module:** `native/app/processing.tsx`
**Phase:** 3 — Upload + Processing Refresh
**Priority:** P1
**Size:** S — 1pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

The processing screen is currently white (`bg-white` via `SafeAreaView`) with a light gray stage list container (`bg-gray-50`), light-mode error states, and the wrong accent color (`#EA580C`) on active stage indicators. This spec applies the dark theme with no structural logic changes: dark background, dark stage list, correct token-based stage colors, and a thin progress bar that matches the blueprint.

**This is a theme pass on the existing screen structure.** The progress bar is the only additive visual element. Do NOT add `ArticleInfoSection` or `ThumbnailSection` — these are shown in the blueprint but are not in the current implementation and would require backend changes. All state, refs, handler functions (`runPipeline`, `handleCancel`, `handleTryAgain`, `handleRetryAudio`), and `STAGE_LABELS`/`STAGE_COPY` constants are unchanged.

**Source material:** `ui-studio/blueprints/05-processing/component-spec.md` · `ui-studio/blueprints/05-processing/tokens.json`

---

## 2. Requirements

### Interfaces

No API or logic changes. All existing state (`stage`, `errorMsg`, `audioError`), refs (`scriptIdRef`, `audioIdRef`, `abortRef`), and handler functions remain unchanged. Only style values change, plus one new visual element (progress bar).

### Behavior

**Token swaps — exact old value → new value:**

#### `SafeAreaView` root
- Old `className="flex-1 bg-white"` → `style={{ flex: 1, backgroundColor: colors.backgroundScreen }}`

#### Cancel button
- Old `className="text-sm text-gray-400"` → `color: colors.textSecondary` (#9CA3AF), `fontSize: 14`

#### Title "Creating Episode"
- Old `className="text-2xl font-bold text-gray-900 mb-2"` → `color: colors.textPrimary`, `fontSize: 24`, `fontWeight: '700'`

#### Subtitle "This usually takes 30–60 seconds"
- Old `className="text-sm text-gray-500 mb-10 text-center"` → `color: colors.textSecondary`, `fontSize: 13`

#### Stage list container (`View className="w-full bg-gray-50 rounded-2xl px-5 py-2 mb-8"`)
- Old `bg-gray-50` → `backgroundColor: colors.surface` (#1A1A2E)
- Old `rounded-2xl` → `borderRadius: borderRadius.card` (10px)

#### `StageRow` sub-component — icon colors
- `"complete"` stage: old `iconColor = "#16A34A"` — unchanged value, now via `colors.statusSuccess`
- `"active"` stage: old `iconColor = "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- `"upcoming"` stage: old `iconColor = "#D1D5DB"` → `colors.textTertiary` (#6B7280) — was too light on dark surface

#### `StageRow` sub-component — label text colors
- `"complete"` labelColor: old `"text-green-700"` → inline `color: colors.statusSuccess`
- `"active"` labelColor: old `"text-brand"` → inline `color: colors.accentPrimary`
- `"upcoming"` labelColor: old `"text-gray-400"` → inline `color: colors.textTertiary`

#### `StageRow` copy text (active stage subtitle)
- Old `className="text-xs text-gray-500 mt-0.5"` → `color: colors.textTertiary`, `fontSize: 12`

#### `ActivityIndicator` (active stage spinner)
- Old `color="#EA580C"` → `color={colors.accentPrimary}`

#### Progress bar (NEW — from blueprint `ProgressBarSection`)
Add below the stage list container (`mb-8` block), above any error state:
- Track `View`: `width: '100%'`, `height: 6`, `backgroundColor: colors.surfaceElevated` (#242438), `borderRadius: 3`
- Fill `View` (inside track, absolute or flex): `backgroundColor: colors.accentPrimary`, `height: 6`, `borderRadius: 3`
- Fill width computed from stage: `getStageIndex(stage) / (STAGE_LABELS.length - 1) * 100 + '%'`
  - `analyzing` → 0%, `scripting` → 33%, `generating` → 66%, `ready` → 100%
- At 0% fill (`analyzing` stage): `width: '0%'` with `minWidth: 0` so it collapses and doesn't render a sliver

#### Error state container
- Old `className="bg-red-50 border-red-200 rounded-xl"` → `backgroundColor: 'rgba(239,68,68,0.12)'`, `borderColor: 'rgba(239,68,68,0.3)'`, `borderWidth: 1`, `borderRadius: borderRadius.card`
- Error text: old `className="text-sm text-red-700 text-center"` → `color: colors.statusError`

#### "Retry Audio" button
- Old `className="flex-1 bg-brand py-3 rounded-xl items-center"` → `backgroundColor: colors.accentPrimary`, `borderRadius: borderRadius.card`
- Text: old `text-white` → `color: colors.textPrimary`

#### "Start Over" button
- Old `className="flex-1 border border-gray-300 py-3 rounded-xl items-center"` → `borderColor: colors.borderInput`, `borderWidth: 1`, `borderRadius: borderRadius.card`
- Text: old `text-gray-700` → `color: colors.textSecondary`

#### "Try Again" button (single button variant)
- Old `className="bg-brand py-3 px-8 rounded-xl items-center w-full"` → `backgroundColor: colors.accentPrimary`, `borderRadius: borderRadius.card`

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Screen background is `#0F0F1A` (was white) | Visual |
| AC-2 | Stage list container background is `#1A1A2E`, 10px radius (was gray-50, rounded-2xl ≈ 16px) | Visual + code review |
| AC-3 | Active stage icon is `#FF6B35` (was `#EA580C`) | Visual |
| AC-4 | Active stage label uses `colors.accentPrimary` inline (was `text-brand` = `#EA580C`) | Code review: no `text-brand` className remaining |
| AC-5 | Complete stage icon is `#16A34A` (value unchanged, now references `colors.statusSuccess`) | Code review |
| AC-6 | Upcoming stage icon is `#6B7280` (was `#D1D5DB` — too light on dark bg) | Code review |
| AC-7 | Active stage `ActivityIndicator` is `#FF6B35` (was `#EA580C`) | Code review |
| AC-8 | Progress bar present below stage list: 6px height, `#242438` track, `#FF6B35` fill | Visual: open processing screen and observe thin orange bar |
| AC-9 | Progress bar fill width advances: analyzing→0%, scripting→33%, generating→66%, ready→100% | Manual: observe fill advancing through stages |
| AC-10 | Progress bar at 0% has `minWidth: 0` (no sliver artifact) | Code review |
| AC-11 | Error card: dark red tint bg `rgba(239,68,68,0.12)`, `#EF4444` text (was red-50 bg / red-700 text) | Visual: trigger error state |
| AC-12 | "Retry Audio" button: `#FF6B35` bg (was `bg-brand` = `#EA580C`) | Visual + code review |
| AC-13 | "Start Over" button: `rgba(255,255,255,0.08)` border (was gray-300) | Code review |
| AC-14 | Cancel text: `#9CA3AF`, 14px | Code review |
| AC-15 | Title "Creating Episode": white, 24px/700 (was gray-900) | Visual + code review |
| AC-16 | No `ArticleInfoSection` or `ThumbnailSection` added | Code review: no such components in `processing.tsx` |
| AC-17 | No `className` strings referencing light-mode colors remain | `rg 'text-gray|bg-gray|bg-white|bg-red|text-red|text-brand|bg-brand' native/app/processing.tsx` — returns nothing |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Progress bar at 0% (analyzing stage) | Fill `View` has `width: '0%'` and `minWidth: 0` — collapses to nothing, no sliver rendered |
| Upcoming icon contrast on dark surface | Old `#D1D5DB` had near-zero contrast on `#1A1A2E`. New `#6B7280` provides ~3.8:1 — acceptable for decorative icons |
| Long stage copy text | `STAGE_COPY` strings up to ~60 chars; `fontSize: 12` within `px-5` card padding wraps cleanly |
| Progress bar on error | If `errorMsg` is set, progress bar renders at the current `stage` value — does NOT reset to 0. Shows how far processing got before failure. |
| `ArticleInfoSection` requested by product | Not in scope — would require displaying processed article metadata before processing completes, which needs backend changes. Defer to a future spec. |
| `ThumbnailSection` requested by product | Not in scope — same reasoning as above. Defer to a future spec. |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/processing.tsx` | Dark theme token pass: background, stage colors, error states. Add progress bar element. No logic or structure changes. |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card` |

---

## 7. Notes

- **This is a theme pass.** Only colors change. All logic, state, and component structure is preserved. The only additive element is the progress bar view.
- **Do NOT add `ArticleInfoSection` or `ThumbnailSection`.** The blueprint shows these above the stage list. They are NOT in the current implementation and would require backend changes (returning article metadata before processing completes). These are out of scope for the dark theme pass. Do not add them.
- **Progress bar is the only new element.** It is a purely presentational `View` — no new state, no new hooks. It reads the existing `stage` value and maps it to a percentage.
- **Replace all `className` strings with inline `style` objects.** `StageRow` uses `className` extensively. Replace all `className` style strings with inline `style` objects referencing `colors.*` tokens. The component is small enough to convert fully in one pass.
- **`STAGE_LABELS` and `STAGE_COPY` live in `native/lib/constants.ts`.** No changes needed there.
- **`getStageIndex(stage)` returns 0–3.** Progress bar computation: `progress = getStageIndex(stage) / (STAGE_LABELS.length - 1)`. When `STAGE_LABELS.length === 4`: 0, 0.33, 0.66, 1.0.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
processing.tsx (layout unchanged, token pass + progress bar added)
├── SafeAreaView (bg: backgroundScreen)
│   ├── CancelButton (textSecondary, 14px)
│   └── CenterView (flex:1, items-center, justify-center, px:8)
│       ├── Title (textPrimary, 24/700)
│       ├── Subtitle (textSecondary, 13)
│       ├── StageListContainer (surface #1A1A2E, r:10)
│       │   └── StageRow × 4
│       │       ├── [complete] Icon (statusSuccess #16A34A) + Label (statusSuccess)
│       │       ├── [active] Spinner (accentPrimary) + Label (accentPrimary) + CopyText (textTertiary, 12)
│       │       └── [upcoming] Icon (textTertiary #6B7280) + Label (textTertiary)
│       ├── ProgressBar (NEW — purely presentational)
│       │   └── Track (surfaceElevated #242438, h:6, r:3, w:100%)
│       │       └── Fill (accentPrimary #FF6B35, h:6, r:3, computed width%, minWidth:0)
│       └── [errorMsg] ErrorBlock
│           ├── ErrorCard (rgba(239,68,68,0.12) bg, rgba(239,68,68,0.3) border, r:10)
│           │   └── ErrorText (statusError #EF4444)
│           ├── [audioError] RetryAudioButton (accentPrimary, r:10)
│           ├── [audioError] StartOverButton (borderInput border, r:10)
│           └── [!audioError] TryAgainButton (accentPrimary, r:10)
```
