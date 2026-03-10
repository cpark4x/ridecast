# Design System Audit
*Generated: 2026-03-09 | Pre-migration baseline*

---

## Summary

The current codebase is a **dark-mode-only app** using an **indigo/violet accent palette** with **Inter** typography. Design tokens are defined in `globals.css` as CSS custom properties, but **components do not consume them** — they hardcode Tailwind color classes and hex values directly. The migration must both swap token values and normalize all 16 affected files to use tokens consistently.

---

## 1. Current Architecture

| Dimension | Current State |
|-----------|---------------|
| Theme | Dark mode only (`--bg: #0a0a0f`) |
| Accent | Indigo → Violet (`#6366f1` → `#8b5cf6`) |
| Typography | Inter (via `next/font/google`) |
| CSS stack | Tailwind v4 + CSS custom properties in `globals.css` |
| Token adoption | **Zero** — components bypass tokens entirely |
| Styling method | Mix of Tailwind utility classes + inline `style={{}}` |

---

## 2. Current Token Inventory (`src/app/globals.css`)

### Background & Surface
| Token | Value | Role |
|-------|-------|------|
| `--bg` | `#0a0a0f` | Near-black page canvas |
| `--bg-card` | `rgba(255,255,255,0.04)` | Card background |
| `--bg-glass` | `rgba(255,255,255,0.06)` | Glass surfaces |
| `--bg-glass-hover` | `rgba(255,255,255,0.10)` | Glass hover state |

### Accent (retiring)
| Token | Value | Role |
|-------|-------|------|
| `--accent` | `#6366f1` | Indigo — primary CTA |
| `--accent2` | `#8b5cf6` | Violet — gradient end |
| `--accent3` | `#a78bfa` | Violet light — text |

### Text
| Token | Value | Role |
|-------|-------|------|
| `--text` | `#f5f5f5` | Primary |
| `--text-secondary` | `rgba(245,245,245,0.55)` | Secondary |
| `--text-tertiary` | `rgba(245,245,245,0.30)` | Tertiary |

### Status
| Token | Value | Role |
|-------|-------|------|
| `--green` | `#22c55e` | Ready/complete |
| `--green-dim` | `rgba(34,197,94,0.15)` | Badge background |
| `--amber` | `#f59e0b` | Processing/in-progress |
| `--amber-dim` | `rgba(245,158,11,0.15)` | Badge background |

### Misc
| Token | Value | Role |
|-------|-------|------|
| `--border` | `rgba(255,255,255,0.08)` | Subtle dividers |
| `--radius` | `14px` | Default border radius |
| `--radius-sm` | `10px` | Small radius |
| `--radius-xs` | `8px` | Extra small radius |
| `--shadow` | `0 8px 32px rgba(0,0,0,0.4)` | Card shadow |
| `--transition` | `0.3s cubic-bezier(0.4,0,0.2,1)` | Default easing |

---

## 3. Typography

| Property | Current | Target |
|----------|---------|--------|
| Font | Inter | Geist Sans |
| Import | `next/font/google` — `Inter` | `next/font/google` — `Geist` |
| CSS var | `--font-inter` | `--font-sans` |
| Layout | `src/app/layout.tsx:2` | Same file |
| Tailwind | `var(--font-inter)` | `var(--font-sans)` |

---

## 4. Hardcoded Color References — Migration Scope

**16 files** contain hardcoded indigo/violet references that must be updated in Phase 3.

### App Pages

| File | Ref Count | Examples |
|------|-----------|---------|
| `src/app/layout.tsx` | 1 | `themeColor: "#6366f1"` |
| `src/app/pocket/page.tsx` | 10 | `from-indigo-500 to-violet-500`, `bg-indigo-500`, `text-indigo-300` |
| `src/app/pocket/BookmarkletLink.tsx` | 1 | `text-indigo-300` |
| `src/app/save/page.tsx` | 2 | `from-indigo-500 to-violet-500`, `bg-indigo-500` |
| `src/app/upgrade/page.tsx` | 1 | `from-indigo-500 to-violet-500` |

### Components

| File | Ref Count | Examples |
|------|-----------|---------|
| `src/components/UploadScreen.tsx` | 10 | `border-indigo-500`, `stroke-violet-400`, `linear-gradient(#6366f1, #8b5cf6)` |
| `src/components/PocketImportScreen.tsx` | 8 | `from-indigo-500 to-violet-500`, `border-indigo-500`, `stroke-indigo-400` |
| `src/components/HomeScreen.tsx` | 4 | `from-indigo-500 to-violet-500`, `from-indigo-500/20 to-violet-500/15` |
| `src/components/ProcessingScreen.tsx` | 5 | `linear-gradient(#6366f1,#8b5cf6,#c084fc)`, `border-indigo-500`, `text-indigo-400` |
| `src/components/ExpandedPlayer.tsx` | 3 | `linear-gradient(#6366f1,#8b5cf6,#c084fc)`, `bg-indigo-500/15 text-violet-400`, progress bar |
| `src/components/PlayerBar.tsx` | 3 | `border-indigo-500/20`, `from-indigo-500 to-violet-500`, progress bar |
| `src/components/SettingsScreen.tsx` | 2 | `text-violet-400`, `focus:border-indigo-500` |
| `src/components/LibraryScreen.tsx` | 1 | `from-indigo-500 to-violet-500` gradient array |
| `src/components/BottomNav.tsx` | 1 | `text-violet-400` active state |
| `src/components/CarMode.tsx` | 1 | `from-indigo-500 to-violet-500` play button |

**Total: ~53 individual references across 16 files**

### Reference Taxonomy

| Pattern | Count | Migration |
|---------|-------|-----------|
| `from-indigo-500 to-violet-500` (gradient) | ~18 | → `from-[#EA580C] to-[#F97316]` or CSS var |
| `bg-indigo-500` / `bg-indigo-500/{opacity}` | ~8 | → `bg-[#EA580C]` / `bg-[--accent]` |
| `text-indigo-*` / `text-violet-*` | ~8 | → `text-[--accent-text]` |
| `border-indigo-*` | ~5 | → `border-[--accent]/{opacity}` |
| `stroke-violet-*` | ~3 | → `stroke-[--accent]` |
| `linear-gradient(#6366f1, #8b5cf6)` inline | ~4 | → `linear-gradient(var(--accent), var(--accent2))` |
| `linear-gradient(#6366f1,#8b5cf6,#c084fc)` inline | ~2 | → brand gradient CSS var |
| `themeColor: "#6366f1"` metadata | 1 | → `"#EA580C"` |

---

## 5. Token Adoption Gap

Components do **not** consume `--accent`, `--text`, or other CSS variables. All Tailwind classes are hardcoded to specific color names (`indigo-500`, `violet-400`). This means:

1. Simply changing `--accent` in `globals.css` will **not** update components.
2. Phase 3 must **explicitly rewrite** every hardcoded reference in all 16 files.
3. Post-migration, components should use either:
   - Tailwind arbitrary values: `bg-[var(--accent)]`
   - CSS `var()` in inline styles: `style={{ color: 'var(--accent)' }}`

---

## 6. Files NOT Requiring Color Updates

These files are clean of indigo/violet references:

- `src/components/AppShell.tsx`
- `src/components/LibraryScreen.tsx` *(1 gradient array — see above)*
- All `src/lib/**` files
- All `src/hooks/**` files
- All API routes

---

## 7. Target State (from `docs/plans/2026-03-09-design-brief.md`)

| Dimension | Target |
|-----------|--------|
| Theme | Light mode (`--bg: #F7F6F3`) |
| Accent | Amber-orange (`--accent: #EA580C`) |
| Typography | Geist Sans |
| Token adoption | All components use CSS vars |
| Status: amber | `#D97706` (not brand) |

See `docs/plans/2026-03-09-design-brief.md` for complete token spec (approved).

---

*Audit complete. Ready for Phase 1 implementation (Tasks 2–5).*
