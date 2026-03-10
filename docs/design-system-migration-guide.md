# Design System v2 — Developer Migration Guide
*Ridecast — dark mode + indigo → light mode + amber-orange + Geist Sans*
*Last updated: 2026-03-10*

---

## 1. What Changed

| Dimension | Before (v1) | After (v2) |
|-----------|-------------|------------|
| **Theme** | Dark mode (`--bg: #0a0a0f`) | Light mode (`--bg: #F7F6F3`) |
| **Accent** | Indigo → Violet (`#6366f1` → `#8b5cf6`) | Amber-orange (`#EA580C`) |
| **Typography** | Inter (`--font-inter`) | Geist Sans (`--font-sans`) |
| **Text color** | Near-white (`#f5f5f5`) | Near-black (`#18181A`) |
| **Borders** | Light on dark (`rgba(255,255,255,0.08)`) | Dark on light (`rgba(0,0,0,0.07)`) |
| **Shadows** | Heavy (`0 8px 32px rgba(0,0,0,0.4)`) | Subtle (`0 2px 12px rgba(0,0,0,0.08)`) |
| **Status green** | `#22c55e` | `#16A34A` |
| **Status amber** | `#f59e0b` | `#D97706` |

**Files changed:** 16 component/page files, `src/app/globals.css`, `src/app/layout.tsx`

**Breaking changes:** None. CSS-only migration — no API, data model, or logic changes.

---

## 2. Token Names — Where to Find Them, How to Use Them

All tokens live in `src/app/globals.css` as CSS custom properties on `:root`.

```css
/* Full token list — src/app/globals.css */
:root {
  --bg              /* Page canvas */
  --surface         /* Cards */
  --surface-2       /* Inputs, recessed areas */
  --border          /* Dividers */
  --border-md       /* Input outlines */
  --text            /* Primary text */
  --text-mid        /* Secondary text */
  --text-dim        /* Captions, placeholders */
  --accent          /* Primary CTAs, active states */
  --accent-text     /* Accent text on light bg */
  --accent-light    /* 10% accent tint */
  --accent-pale     /* 6% accent tint (hover) */
  --green / --green-dim   /* Ready state */
  --amber / --amber-dim   /* Processing state */
  --radius / --radius-sm / --radius-xs
  --shadow
  --transition
}
```

### Using tokens in Tailwind

```tsx
// Background
className="bg-[--bg]"
className="bg-[--surface]"
className="bg-[--accent]"

// Text
className="text-[--text]"
className="text-[--text-mid]"
className="text-[--accent-text]"

// Border
className="border border-[--border]"
className="border border-[--border-md]"

// In inline styles (when Tailwind won't do)
style={{ background: 'var(--accent)', borderRadius: 'var(--radius)' }}
```

### Tailwind v4 note

Both syntaxes work for solid tokens. For pre-baked alpha values, use the `--accent-light` / `--accent-pale` tokens directly rather than trying opacity modifiers on the raw `--accent` token.

```tsx
// ✅ Use pre-baked alpha tokens
className="bg-[--accent-light]"    // rgba(234,88,12,0.10)
className="bg-[--accent-pale]"     // rgba(234,88,12,0.06)

// ⚠️  Opacity modifier on var() may not resolve reliably in all contexts
className="bg-[--accent]/10"
```

---

## 3. Color Replacement Map

These are the 8 most common patterns replaced across the codebase:

| Old class / value | New class / value | Context |
|-------------------|-------------------|---------|
| `from-indigo-500 to-violet-500` | `from-[#EA580C] to-[#F97316]` | Gradient fills (artwork, play btn) |
| `bg-indigo-500` | `bg-[--accent]` | Solid accent backgrounds |
| `bg-indigo-500/15` | `bg-[--accent-light]` | Tinted badge / card backgrounds |
| `text-indigo-300` / `text-violet-400` | `text-[--accent-text]` | Accent text on light background |
| `border-indigo-500` | `border-[--accent]` | Accent-colored borders |
| `stroke-violet-400` / `stroke-indigo-400` | `stroke-[--accent]` | SVG icon strokes |
| `linear-gradient(#6366f1, #8b5cf6)` | `linear-gradient(var(--accent), #F97316)` | Inline gradient styles |
| `themeColor: "#6366f1"` | `themeColor: "#EA580C"` | Next.js metadata |

**Old dark-mode surface classes that must not return:**

| Retired | Replaced by |
|---------|-------------|
| `bg-black` / `bg-[#0a0a0f]` | `bg-[--bg]` |
| `bg-white/[0.04]` / `bg-white/[0.06]` | `bg-[--surface]` or `bg-[--surface-2]` |
| `border-white/[0.08]` | `border-[--border]` |
| `text-white` | `text-[--text]` |
| `text-white/30` | `text-[--text-dim]` |
| `placeholder-white/30` | `placeholder-[--text-dim]` |

---

## 4. Typography

### Font loading

Geist Sans is loaded once in `src/app/layout.tsx`:

```ts
import { Geist } from 'next/font/google'
const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
```

The `--font-sans` CSS variable is wired to Tailwind's `font-sans` utility via `@theme inline` in `globals.css`. Use `font-sans` — it just works.

### Weight guide

| Usage | Weight | Tailwind class |
|-------|--------|----------------|
| Wordmark / hero | 900 | `font-black` |
| Screen title | 800 | `font-extrabold` |
| Card title / section head | 700 | `font-bold` |
| Body copy | 400–500 | `font-normal` / `font-medium` |
| Section label (uppercase) | 700 | `font-bold uppercase tracking-[0.12em]` |
| Caption / timestamp | 400 | `font-normal` |

**Rule: skip 600.** `font-semibold` sits in the uncanny valley between bold and regular. Use `font-bold` or `font-medium` instead.

### Tracking (letter-spacing)

```tsx
// Headings — tight and confident
className="tracking-[-0.03em]"   // screen title
className="tracking-[-0.02em]"   // card title

// Section labels — wide and uppercase
className="tracking-[0.12em] uppercase"

// Body / default — no modification needed (0)
```

### Tabular numbers for all time displays

```tsx
className="[font-variant-numeric:tabular-nums]"
// or
style={{ fontVariantNumeric: 'tabular-nums' }}
```

---

## 5. Common Patterns

### Primary CTA button

```tsx
<button className="
  w-full py-4 
  bg-[--accent] text-white 
  rounded-[--radius] 
  text-[15px] font-bold tracking-[-0.01em]
  shadow-[0_4px_20px_rgba(234,88,12,0.30)]
  hover:shadow-[0_6px_28px_rgba(234,88,12,0.45)]
  active:scale-[0.97]
  transition-all
">
  Play
</button>
```

### Active nav / tab state

```tsx
// Active tab: accent text + accent background dot or underline
className={activeTab === id 
  ? "text-[--accent-text] font-bold" 
  : "text-[--text-dim]"
}
```

### Status badge

```tsx
// Ready
<span className="bg-[--green-dim] text-[--green] rounded-full px-2.5 py-1 text-[11px] font-bold">
  Ready
</span>

// Processing
<span className="bg-[--amber-dim] text-[--amber] rounded-full px-2.5 py-1 text-[11px] font-bold">
  Processing
</span>

// Accent chip
<span className="bg-[--accent-light] text-[--accent-text] rounded-full px-2.5 py-1 text-[11px] font-bold">
  New
</span>
```

### Progress bar

```tsx
<div className="w-full h-1 bg-[--surface-2] rounded-full overflow-hidden">
  <div 
    className="h-full bg-[--accent] rounded-full transition-all"
    style={{ width: `${progress}%` }}
  />
</div>
```

### Card (elevated surface)

```tsx
<div className="
  bg-[--surface] 
  border border-[--border] 
  rounded-[--radius] 
  shadow-[--shadow]
  p-4
">
  {/* content */}
</div>
```

### Text input

```tsx
<input className="
  w-full
  bg-[--surface-2] border border-[--border-md]
  rounded-[--radius-sm]
  px-4 py-3
  text-sm text-[--text] placeholder:text-[--text-dim]
  outline-none
  focus:border-[--accent] focus:bg-[--accent-pale]
  transition-colors
" />
```

---

## 6. What NOT To Do

### ❌ Don't hardcode hex values

```tsx
// Bad — bypasses the token system, breaks future theming
style={{ backgroundColor: '#EA580C' }}
className="bg-[#EA580C]"

// Good
className="bg-[--accent]"
style={{ backgroundColor: 'var(--accent)' }}
```

### ❌ Don't use retired indigo/violet Tailwind classes

```tsx
// Bad — these are retired
className="from-indigo-500 to-violet-500"
className="text-violet-400"
className="bg-indigo-500/15"
className="border-indigo-500"
className="stroke-violet-400"

// Good — use tokens
className="from-[#EA580C] to-[#F97316]"
className="text-[--accent-text]"
className="bg-[--accent-light]"
className="border-[--accent]"
className="stroke-[--accent]"
```

### ❌ Don't use dark-mode surface classes

```tsx
// Bad — dark mode surfaces, retired
className="bg-white/[0.04]"
className="bg-white/[0.06]"
className="text-white/50"
className="border-white/[0.08]"

// Good
className="bg-[--surface]"
className="bg-[--surface-2]"
className="text-[--text-mid]"
className="border-[--border]"
```

### ❌ Don't use status colors decoratively

```tsx
// Bad — green/amber are for state communication only
className="text-[--green] font-bold"   // on a CTA button?  No.
className="bg-[--amber]"               // as a decorative accent? No.

// Good — use accent for brand, status for state
className="bg-[--accent]"             // CTA
className="bg-[--green-dim] text-[--green]"   // "Ready" badge only
```

### ❌ Don't use font-semibold (600 weight)

```tsx
// Bad — 600 is the uncanny valley
className="font-semibold"

// Good — go bold or regular
className="font-bold"     // headings, labels, CTAs
className="font-medium"   // slightly emphasized body
className="font-normal"   // body copy
```

### ❌ Don't add color where opacity will do

```tsx
// Unnecessary color — a subtle divider doesn't need a token
className="bg-[--border]"   // as a tint overlay? Probably too heavy

// Often sufficient
className="bg-black/5"      // slight recess on white/near-white surface
```

---

## 7. Checking Your Work

After editing any component:

```bash
# Run component tests — should be 151 passing, 7 skipped
cd /path/to/worktree && npm test

# Quick visual check — inspect body background (should be rgb(247,246,243))
# In browser DevTools: getComputedStyle(document.body).backgroundColor

# Grep for retired patterns
grep -r "indigo-\|violet-\|from-indigo\|text-violet\|bg-white/\[0.0" src/
```

Any `indigo` or `violet` Tailwind class is a migration gap. Any `bg-white/[0.0x]` surface is a dark-mode remnant.

---

## 8. Reference Files

| File | What it is |
|------|-----------|
| `src/app/globals.css` | All CSS custom property values |
| `src/app/layout.tsx` | Font loading (Geist Sans) |
| `docs/design-system-tokens.md` | Full token reference with usage examples |
| `docs/plans/2026-03-09-design-brief.md` | Design decisions and rationale |
| `docs/design-system-audit.md` | Pre-migration baseline, what was replaced |

---

*Questions? The token reference at `docs/design-system-tokens.md` is the first stop. The design brief at `docs/plans/2026-03-09-design-brief.md` explains the why behind each decision.*
