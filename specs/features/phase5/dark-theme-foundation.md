# F-P5-UI-01: Dark Theme Foundation

## 1. Overview

**Module:** `native/lib` (new) · `native/app` (modify)
**Priority:** P0
**Size:** M — 2pt
**Depends on:** None — this is the foundation all Phase 1 UI specs build on

Every screen in the app currently hardcodes color values inline or uses leftover light-mode defaults (`StatusBar style="dark"`, `backgroundColor: "#1c1c1e"`). This spec establishes a single source of truth for all design tokens — colors, typography, spacing, border radii, and component sizes — then applies the two root-level changes that unlock the dark theme globally: flipping the status bar to `light` and setting the root View background to `#0F0F1A`.

**Source material:** `ui-studio/moodboard/aesthetic-brief.md` · `ui-studio/storyboards/nav-shell.md`

---

## 2. Requirements

### Interfaces

Create `native/lib/theme.ts` exporting five typed `as const` objects. No default export; named exports only. This is a pure data module — no React, no context, no side effects.

```typescript
// native/lib/theme.ts

export const colors = {
  // Backgrounds — 3-tier elevation model (no shadows, color only)
  backgroundScreen:  '#0F0F1A',   // base — every screen background
  backgroundOled:    '#000000',   // car mode only, no other use

  // Surfaces
  surface:           '#1A1A2E',   // cards, tab bar, bottom sheets, grouped lists
  surfaceElevated:   '#242438',   // inputs, mini player, active segments

  // Accent — the only interactive accent in the system
  accentPrimary:     '#FF6B35',   // CTAs, active tab, toggles, progress, selected chips

  // Text
  textPrimary:       '#FFFFFF',
  textSecondary:     '#9CA3AF',   // metadata, descriptions, inactive icons
  textTertiary:      '#6B7280',   // placeholders, inactive tab labels

  // Content-type category colors (for thumbnails and labels, NOT interactive)
  contentTech:       '#2563EB',
  contentBusiness:   '#EA580C',
  contentScience:    '#0D9488',
  contentFiction:    '#7C3AED',
  contentNews:       '#DB2777',
  contentBiography:  '#059669',

  // Status
  statusSuccess:     '#16A34A',   // played, downloaded
  statusError:       '#EF4444',   // destructive, error

  // Borders (rgba — never opaque)
  borderDivider:     'rgba(255,255,255,0.06)',   // horizontal dividers, tab bar top
  borderInput:       'rgba(255,255,255,0.08)',   // input field borders
  borderDropzone:    'rgba(255,255,255,0.12)',   // dashed drop zones
} as const;

export const typography = {
  sizes: {
    display: 28,   // screen titles, greeting
    h1:      22,   // section titles, source names
    h2:      18,   // section headers ("Up Next", "For You")
    body:    15,   // card titles, row labels
    caption: 13,   // metadata, timestamps
    micro:   11,   // badges, topic pills
  },
  weights: {
    regular:  '400' as const,
    medium:   '500' as const,
    semibold: '600' as const,
    bold:     '700' as const,
  },
} as const;

export const spacing = {
  xs:           4,
  sm:           8,
  md:           12,
  lg:           16,
  xl:           20,
  screenMargin: 20,   // left/right padding for all screen content
  sectionGap:   32,   // vertical gap between sections
  cardGap:      12,   // vertical gap between cards in a list
} as const;

export const borderRadius = {
  card:       10,     // cards, groups, buttons, inputs
  thumbnail:  8,      // episode artwork thumbnails
  full:       9999,   // pill tags, status badges
  miniPlayer: 14,     // mini player bar
  sheet:      14,     // bottom sheet top corners
} as const;

export const sizes = {
  thumbnail:   64,   // episode card artwork (standard list card)
  cardHeight:  76,   // standard list card height
  playButton:  36,   // play icon button tap target
  iconNav:     24,   // navigation bar icons
  buttonHeight: 52,  // primary action buttons
  tabBarHeight: 56,  // bottom tab bar
} as const;

// Convenience re-export for consumers that want a single import
export const theme = { colors, typography, spacing, borderRadius, sizes } as const;
```

The `_layout.tsx` root changes are minimal surgical edits — no structural changes:

```typescript
// native/app/_layout.tsx  (two changes only)

// Change 1: line containing <StatusBar style="dark" />
<StatusBar style="light" />   // dark background needs light (white) status bar content

// Change 2: AppShell root View
<View style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>
  // import { colors } from '../lib/theme';
```

### Behavior

- `theme.ts` exports exactly five named constants: `colors`, `typography`, `spacing`, `borderRadius`, `sizes`. All are typed `as const` — values are narrowed to their literal types.
- A convenience `theme` re-export bundles all five objects for callers that prefer a single import.
- No value in any exported object is `undefined` or `null`.
- `colors.accentPrimary` equals `'#FF6B35'` (not `#EA580C` — the old accent used in `_layout.tsx` tab bar and `PlayerBar.tsx` progress bar).
- `StatusBar style` in `native/app/_layout.tsx` is changed from `"dark"` to `"light"`. The status bar renders light-colored (white) icons/text on the dark background.
- The `AppShell` root `<View>` in `native/app/_layout.tsx` receives `backgroundColor: colors.backgroundScreen` (`#0F0F1A`). Previously it was transparent, causing the system background to show during transitions.
- `theme.ts` has no imports from React or React Native. It is a pure data module importable in any context (tests, non-component files).
- `theme.ts` does not wrap tokens in a Context Provider. Consumers import directly: `import { colors } from '../lib/theme'`.

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `theme.ts` exports `colors`, `typography`, `spacing`, `borderRadius`, `sizes`, and `theme` | `native/__tests__/theme.test.ts` — verify each named export is defined and is an object |
| AC-2 | `colors.accentPrimary` is `'#FF6B35'` | Unit test: `expect(colors.accentPrimary).toBe('#FF6B35')` |
| AC-3 | `colors.backgroundScreen` is `'#0F0F1A'` | Unit test: `expect(colors.backgroundScreen).toBe('#0F0F1A')` |
| AC-4 | `colors.surface` is `'#1A1A2E'` and `colors.surfaceElevated` is `'#242438'` | Unit test: exact value assertions |
| AC-5 | No value in any exported object is `undefined` | Unit test: iterate all keys with `Object.values`, assert none are `undefined` |
| AC-6 | `typography.sizes` has all 6 scale entries (display, h1, h2, body, caption, micro) | Unit test: `expect(Object.keys(typography.sizes)).toHaveLength(6)` |
| AC-7 | `typography.weights.regular` is the string `'400'` (not number `400`) | Unit test: `expect(typeof typography.weights.regular).toBe('string')` |
| AC-8 | All 6 content-type color keys are present in `colors` | Unit test: assert `colors.contentTech`, `contentBusiness`, `contentScience`, `contentFiction`, `contentNews`, `contentBiography` are defined |
| AC-9 | `StatusBar` in `_layout.tsx` uses `style="light"` | Code review / grep: `rg 'StatusBar' native/app/_layout.tsx` shows `style="light"` |
| AC-10 | Root View in `AppShell` has `backgroundColor` set to the `#0F0F1A` token | Code review: `AppShell` View style includes `backgroundColor: colors.backgroundScreen` |
| AC-11 | `theme.ts` has zero imports from `react` or `react-native` | Unit test or lint: importing `theme.ts` in a plain Node test context does not throw |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Consumer imports `theme` convenience bundle | `theme.colors`, `theme.typography`, `theme.spacing`, `theme.borderRadius`, `theme.sizes` all resolve correctly — same objects as direct named imports |
| TypeScript consumers use dot-notation on `colors` | All keys are narrowed to literal types via `as const`, enabling autocompletion and preventing typos at the call site |
| A future token is added to `theme.ts` | The test file's "no undefined values" sweep catches any accidental `undefined` assignment automatically |
| `_layout.tsx` renders on a device with a white status bar | `style="light"` forces white icons/text, which remain legible on `#0F0F1A` — no contrast issue |
| `backgroundOled` token is used outside car mode | No enforcement in this spec — `backgroundOled` (`#000000`) should only be applied in the car mode screen; misuse is a future linting concern |
| Two tokens have the same hex value (`accentPrimary` and `contentBusiness` are close but distinct: `#FF6B35` vs `#EA580C`) | Values are distinct. The old `#EA580C` must not appear as `accentPrimary` — it was the incorrect pre-redesign accent. |

---

## 5. Files to Create/Modify

| File | Action | Contents |
|------|--------|----------|
| `native/lib/theme.ts` | **Create** | All design tokens as typed `as const` exports: `colors`, `typography`, `spacing`, `borderRadius`, `sizes`, `theme`. ~80 LOC. |
| `native/__tests__/theme.test.ts` | **Create** | Unit tests covering: all 6 exports defined, key color values exact, `typography.weights` are strings, all content-type colors present, no undefined values in any exported object, pure Node import (no RN deps). ~60 LOC. |
| `native/app/_layout.tsx` | **Modify** | Two targeted changes: (1) `StatusBar style="dark"` → `style="light"`; (2) `AppShell` root `<View style={{ flex: 1 }}>` → add `backgroundColor: colors.backgroundScreen`. Add `import { colors } from '../lib/theme'` at top. |

---

## 6. Dependencies

- No new npm packages required.
- `native/lib/theme.ts` is a pure TypeScript module — no React, no React Native, no Expo.
- `native/app/_layout.tsx` gains one new import: `import { colors } from '../lib/theme'`.

---

## 7. Notes

- **Anti-slop enforcement:** The `colors` object contains no gradients, no `rgba` accent variants, and no shadow values. Elevation is communicated entirely via the three surface colors. See `ui-studio/moodboard/aesthetic-brief.md` → Anti-Slop Notes.
- **`#EA580C` is not the accent.** The current codebase uses `#EA580C` in `_layout.tsx` (`tabBarActiveTintColor`) and `PlayerBar.tsx` (progress bar). This is wrong — it is `colors.contentBusiness`. The correct accent is `#FF6B35`. Those call sites are corrected in F-P5-UI-02 (`nav-shell-redesign`), not here.
- **No context provider.** Theme tokens are static constants. A React context adds indirection with zero benefit for static data. All consumers import directly from `'../lib/theme'` (or `'../../lib/theme'` from deeper paths).
- **`typography.weights` are strings, not numbers.** React Native's `fontWeight` prop accepts `'400'` (string) not `400` (number). The `as const` assertion narrows them to the correct string literal types.
- **Deferred:** Geist font loading is not part of this spec. The tokens define the intended weights; font loading will be addressed when screens are actively restyled in later specs.
- **`backgroundOled`** is included for completeness (car mode uses it) but is not applied anywhere in this spec.

---

## 8. Implementation Map

> ⚠️ **REQUIRED: Fill this table BEFORE writing any implementation code.**
> This section must be completed during Platform Grounding (step 3 of working-session-instructions.md).
> Do not begin coding until every requirement row has a verified mapping to actual codebase types/APIs.

| Requirement | Implementation File + Function | Types/APIs Used | Notes |
|-------------|-------------------------------|-----------------|-------|
| Create `theme.ts` with `colors` export | `native/lib/theme.ts` — new file, module scope | TypeScript `as const` assertion | Verify no existing `native/lib/theme.ts` before creating |
| Create `theme.ts` with `typography` export | `native/lib/theme.ts` — module scope | `fontWeight` values must be string literals for RN compatibility | |
| Create `theme.ts` with `spacing` export | `native/lib/theme.ts` — module scope | Plain number values | |
| Create `theme.ts` with `borderRadius` export | `native/lib/theme.ts` — module scope | Plain number values | |
| Create `theme.ts` with `sizes` export | `native/lib/theme.ts` — module scope | Plain number values | |
| Change `StatusBar style` to `"light"` | `native/app/_layout.tsx` — `RootLayout` component, line containing `<StatusBar style="dark" />` | `expo-status-bar` `StatusBar` component; `style` prop accepts `"light" \| "dark" \| "auto" \| "inverted"` | Verify current value is `"dark"` before editing |
| Add `backgroundColor` to root `View` in `AppShell` | `native/app/_layout.tsx` — `AppShell` component, `<View style={{ flex: 1 }}>` | `View` from `react-native`; `StyleSheet` or inline style | Confirm the View at line ~87 is the correct root View |
| Add `colors` import to `_layout.tsx` | `native/app/_layout.tsx` — import block at top | Named import from `'../lib/theme'` | Path is `../lib/theme` from `app/` directory |
| Theme test: all exports defined | `native/__tests__/theme.test.ts` — new file | Jest `expect().toBeDefined()` | |
| Theme test: key color exact values | `native/__tests__/theme.test.ts` | Jest `expect().toBe()` | Cover: `accentPrimary`, `backgroundScreen`, `surface`, `surfaceElevated`, `textPrimary` |
| Theme test: no undefined values | `native/__tests__/theme.test.ts` | `Object.values()` + `forEach` | |
