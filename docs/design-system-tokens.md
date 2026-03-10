# Design System Token Reference
*Ridecast v2 — Light Mode + Amber-Orange + Geist Sans*
*Generated: 2026-03-10 | Post-migration reference*

---

## Overview

All design tokens are CSS custom properties defined in `src/app/globals.css` and scoped to `:root`. Components consume them via:
- **Tailwind arbitrary values:** `bg-[var(--accent)]` or shorthand `bg-[--accent]`
- **Inline styles:** `style={{ color: 'var(--accent)' }}`
- **Plain CSS:** `color: var(--text);`

Do not hardcode hex values or Tailwind named colors (`indigo-500`, `violet-400`, etc.) in components.

---

## Canvas & Surfaces

| Token | Value | Intended Use |
|-------|-------|--------------|
| `--bg` | `#F7F6F3` | Warm off-white page canvas — `html`, `body`, `AppShell` |
| `--surface` | `#FFFFFF` | Cards, modals, elevated containers |
| `--surface-2` | `#F0EEE9` | Recessed areas, input backgrounds, secondary panels |
| `--border` | `rgba(0,0,0,0.07)` | Subtle dividers, section separators |
| `--border-md` | `rgba(0,0,0,0.11)` | Input outlines, active card borders |

### Usage examples
```tsx
// Page canvas
<div className="bg-[--bg] min-h-screen" />

// Card
<div className="bg-[--surface] border border-[--border] rounded-[14px]" />

// Input
<input className="bg-[--surface-2] border border-[--border-md] rounded-[10px]" />
```

---

## Text

| Token | Value | Intended Use |
|-------|-------|--------------|
| `--text` | `#18181A` | Primary — headings, labels, all main body copy |
| `--text-mid` | `rgba(24,24,26,0.50)` | Secondary — supporting text, subtitles, descriptions |
| `--text-dim` | `rgba(24,24,26,0.30)` | Tertiary — captions, placeholders, metadata |

### Usage examples
```tsx
// Primary heading
<h1 className="text-[--text] text-2xl font-bold" />

// Supporting label
<p className="text-[--text-mid] text-sm" />

// Placeholder / caption
<span className="text-[--text-dim] text-xs" />
```

---

## Brand Accent — Amber-Orange

| Token | Value | Intended Use |
|-------|-------|--------------|
| `--accent` | `#EA580C` | Primary CTAs, active states, progress bars, focus rings |
| `--accent-text` | `#C2410C` | Accent-colored text on light backgrounds (darker for contrast) |
| `--accent-light` | `rgba(234,88,12,0.10)` | Active card tint, badge backgrounds, selected state fill |
| `--accent-pale` | `rgba(234,88,12,0.06)` | Subtle hover state, very light selected background |

The brand gradient (`#EA580C → #F97316 → #FCD34D`) is **not a token** — it is used only in episode artwork and hero moments as a `background` value directly.

### Usage examples
```tsx
// Primary CTA button
<button className="bg-[--accent] text-white rounded-[14px] px-6 py-4 font-semibold" />

// Active nav item
<span className="text-[--accent-text]" />

// Badge / chip
<div className="bg-[--accent-light] text-[--accent-text] rounded-full px-2.5 py-1 text-xs font-semibold" />

// Hover state
<div className="hover:bg-[--accent-pale] transition-colors" />

// Episode artwork gradient (inline only — hero moments)
<div style={{ background: 'linear-gradient(135deg, #EA580C, #F97316, #FCD34D)' }} />
```

---

## Status Colors — Functional Only, Never Decorative

| Token | Value | Intended Use |
|-------|-------|--------------|
| `--green` | `#16A34A` | Ready / complete state text or icons |
| `--green-dim` | `rgba(22,163,74,0.10)` | "Ready" badge background |
| `--amber` | `#D97706` | Processing / in-progress state text or icons |
| `--amber-dim` | `rgba(217,119,6,0.10)` | "Processing" badge background |

> **Rule:** Status colors communicate state, not brand. They do not appear in gradients, hover states, or decorative elements.

### Usage examples
```tsx
// Ready badge
<span className="bg-[--green-dim] text-[--green] rounded-full px-2.5 py-1 text-xs font-semibold">
  Ready
</span>

// Processing badge
<span className="bg-[--amber-dim] text-[--amber] rounded-full px-2.5 py-1 text-xs font-semibold">
  Processing
</span>
```

---

## Misc

| Token | Value | Intended Use |
|-------|-------|--------------|
| `--radius` | `14px` | Default border radius — cards, modals, primary buttons |
| `--radius-sm` | `10px` | Small radius — secondary buttons, inputs, chips |
| `--radius-xs` | `8px` | Extra small — tight UI elements, small badges |
| `--shadow` | `0 2px 12px rgba(0,0,0,0.08)` | Subtle card elevation, floating panels |
| `--transition` | `0.3s cubic-bezier(0.4, 0, 0.2, 1)` | Default animation easing for interactive elements |

### Usage examples
```tsx
// Card with shadow
<div className="rounded-[--radius] shadow-[--shadow]" />

// Interactive element
<button className="transition-[background,opacity] duration-[--transition]" />

// Or in inline style
<div style={{ borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }} />
```

---

## Using Tokens in Tailwind

Tailwind v4 supports CSS variable arbitrary values natively. Two syntaxes work:

```tsx
// Full var() syntax — explicit, recommended for readability
className="bg-[var(--accent)] text-[var(--text)]"

// Shorthand — Tailwind v4 resolves the CSS var automatically
className="bg-[--accent] text-[--text]"
```

For opacity modifiers, use the full `var()` form:
```tsx
// Doesn't work with shorthand + opacity
className="bg-[--accent]/10"       // ❌ may not resolve

// Use the pre-defined dim token instead
className="bg-[--accent-light]"    // ✅ rgba already baked in

// Or use explicit RGB with opacity
className="bg-[rgba(234,88,12,0.10)]"  // ✅ explicit
```

---

## What Was Replaced: Indigo/Violet → Amber-Orange Mapping

These are the 8 most common patterns that were migrated across 16 files (53 individual references):

| Old (dark mode / indigo-violet) | New (light mode / amber-orange) | Notes |
|--------------------------------|--------------------------------|-------|
| `from-indigo-500 to-violet-500` | `from-[#EA580C] to-[#F97316]` | Gradient — used on artwork, play buttons |
| `bg-indigo-500` | `bg-[--accent]` | Solid accent fill |
| `bg-indigo-500/15` | `bg-[--accent-light]` | Tinted background (10% alpha) |
| `text-indigo-300` / `text-violet-400` | `text-[--accent-text]` | Accent-colored text on light bg |
| `border-indigo-500` | `border-[--accent]` | Accent border |
| `stroke-violet-400` / `stroke-indigo-400` | `stroke-[--accent]` | SVG icon strokes |
| `linear-gradient(#6366f1, #8b5cf6)` (inline) | `linear-gradient(var(--accent), #F97316)` | Inline gradient style |
| `themeColor: "#6366f1"` (metadata) | `themeColor: "#EA580C"` | PWA/browser theme color |

Old dark-mode canvas tokens (`--bg: #0a0a0f`, `--bg-card: rgba(255,255,255,0.04)`) are fully retired. Never reference them.

---

## Typography: Geist Sans

### Font loading (`src/app/layout.tsx`)
```ts
import { Geist } from 'next/font/google'
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
```
The CSS variable `--font-sans` is picked up by Tailwind's `font-sans` utility class via `@theme inline` in `globals.css`.

### Wordmark
- **Weight:** 800–900
- **Tracking:** −3% (`tracking-[-0.03em]`)
- **Color:** `--text` (#18181A) on light backgrounds

### Type Scale

| Role | Size | Weight | Tracking | Tailwind Classes |
|------|------|--------|----------|-----------------|
| Hero / wordmark | 52–84px | 900 | −4% | `text-6xl font-black tracking-[-0.04em]` |
| Screen title | 26–28px | 800 | −3% | `text-2xl font-extrabold tracking-[-0.03em]` |
| Card title | 16–20px | 700 | −2% | `text-lg font-bold tracking-[-0.02em]` |
| Body / detail | 13–15px | 400–500 | 0 | `text-sm font-normal` or `font-medium` |
| Section label | 10–11px | 700 | +12%, uppercase | `text-[10px] font-bold tracking-[0.12em] uppercase` |
| Caption / time | 11px | 400 | 0 | `text-[11px] font-normal` |

### Typography rules
1. **Headings: heavy and tight.** Use 700–900 weight with negative tracking.
2. **Body: light and spacious.** Use 400–500 weight, normal tracking.
3. **Skip 600 weight.** Go bold or go regular — 600 sits in the uncanny valley.
4. **Tabular nums on all time displays.** Add `[font-variant-numeric:tabular-nums]` to durations and timestamps.
5. **Antialiasing globally.** Already set on `html, body` via `-webkit-font-smoothing: antialiased` in `globals.css`.

---

## Keyframe Animations (from `globals.css`)

| Name | Usage | Duration |
|------|-------|----------|
| `gradientShift` | Episode artwork background-position loop | 9s infinite |
| `slideUp` | Content entrance from `translateY(12px)` | 260ms |
| `pulseDot` | Active pipeline step glow | ~1.5s infinite |

Apply via Tailwind `animate-[name_duration_easing]` or CSS `animation` property directly.

---

*Source of truth: `src/app/globals.css` and `docs/plans/2026-03-09-design-brief.md`*
*Last updated: 2026-03-10*
