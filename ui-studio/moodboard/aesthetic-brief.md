# Aesthetic Brief — Ridecast

> Generated from 16 approved high-fidelity frames + design system spec. This brief formalizes the existing visual language for downstream stages.

## Palette

Extracted colors confirmed across 16 frames:

### Backgrounds
- `#0F0F1A` — primary dark (deep navy-black, used on every screen)
- `#000000` — car mode only (pure black for OLED, no other use)

### Surfaces
- `#1A1A2E` — cards, bottom sheets, tab bar, grouped lists
- `#242438` — elevated surfaces: inputs, mini player, active segments

### Accent
- `#FF6B35` — orange (CTAs, active tab, toggles, progress bars, selected chips)

### Content-Type Colors
- `#0D9488` teal (science)
- `#EA580C` orange (business)
- `#2563EB` blue (tech)
- `#7C3AED` purple (fiction/culture)
- `#DB2777` pink (news)
- `#059669` green (biography)

### Text
- `#FFFFFF` — primary text (titles, headings, body)
- `#9CA3AF` — secondary text (metadata, descriptions, inactive icons)
- `#6B7280` — tertiary text (placeholders, inactive tab labels)

### Status
- `#16A34A` — success / played
- `#EF4444` — destructive / error
- `#FF6B35` — new / in-progress (reuses accent)

### Borders
- `rgba(255,255,255,0.06)` — dividers
- `rgba(255,255,255,0.08)` — input borders
- `rgba(255,255,255,0.12)` — dashed drop-zone borders

## Typography

- **Face:** Geist (sans-serif)
- **Style:** geometric sans-serif with humanist touches — clean, technical, modern
- **Weight character:** semibold-dominant for headings, regular for body — creates clear hierarchy without heaviness
- **Density:** compact but not cramped — 8pt grid keeps things tight and systematic

### Scale
| Role | Size | Weight | Usage |
|------|------|--------|-------|
| Display | 28px | Bold | Screen titles, greeting ("Good evening, Chris") |
| H1 | 22–24px | Semibold | Section titles, source names |
| H2 | 18px | Semibold | Section headers ("For You", "Up Next") |
| Body | 14–15px | Regular/Semibold | Card titles, row labels, descriptions |
| Caption | 12–13px | Regular | Metadata, timestamps, source info |
| Micro | 11px | Regular | Badges ("New", "Played ✓"), topic pills |

## Composition Character

- **Spatial rhythm:** tight — 8pt grid with 20px screen margins, 12px card gaps, 24–32px section breaks
- **Structural tendency:** systematic and layered — cards on surfaces on backgrounds, three elevation tiers
- **Visual weight:** dense but breathable — information-rich screens with clear section breaks preventing overwhelm
- **Grid:** single-column mobile layout, content fills edge-to-edge within 20px margins
- **Elevation model:** `#0F0F1A` (base) → `#1A1A2E` (card) → `#242438` (elevated element) — 3 tiers, no shadows, differentiation by color only

## Spacing

| Element | Value |
|---------|-------|
| Screen margins | 20px |
| Card padding | 12–16px |
| Between cards | 12px |
| Between sections | 24–32px |
| Tab bar height | 56px |
| Mini player height | 60px |
| Button height | 48–52px |
| List card height | 72–76px |
| Discovery card height | 96px |

## Border Radius

| Element | Radius |
|---------|--------|
| Cards, groups, buttons, inputs | 10px |
| Chips/pills (large) | 10px |
| Small tags, status badges | 9999px (full pill) |
| Thumbnails | 6–8px |
| Mini player | 14px |
| Bottom sheet top corners | 14px |

## Components

- **Tab bar:** 3 tabs (Home / Discover / Library), `#1A1A2E` background, active = `#FF6B35` fill icon + label, inactive = `#6B7280` outline icon
- **Mini player:** floating 60px bar above tab bar, `#242438`, 14px radius, thumbnail + title + play/pause + thin progress bar
- **Cards:** `#1A1A2E` on `#0F0F1A`, consistent height per type, left thumbnail + middle text + right action
- **Bottom sheets:** `#1A1A2E`, `#3A3A4E` drag handle, 14px top radius
- **Segmented control:** `#242438` active segment, transparent inactive, within a subtle border container
- **Chips:** `#FF6B35` fill when selected, `#242438` + border when unselected, 10px radius
- **Toggles:** iOS-style, `#FF6B35` when ON
- **"+" button:** always in navigation header (never a floating action button), `#9CA3AF` icon color
- **Back navigation:** "‹ [Parent]" text pattern, not a bare chevron

## Atmospheric Effects

- **Sign In:** layered radial glows — orange (`#FF6B35` at ~15% opacity) and teal (`#0D9488` at ~12% opacity) behind the logo, creating depth on the `#0F0F1A` background
- **Expanded Player:** dominant color extracted from podcast artwork bleeds into background at 8–10% opacity — creates unique atmosphere per episode
- **Car Mode:** pure `#000000`, zero effects, zero decoration — maximum contrast for safety

## Mood Keywords

atmospheric · immersive · cinematic · precise · nocturnal · systematic · warm-on-dark · content-forward

## Reference Summary

The 16 frames establish a disciplined dark-mode design system built on three elevation tiers of navy-black surfaces. Orange (`#FF6B35`) is the sole interactive accent — used for CTAs, active states, progress, and toggles — giving the app a warm, focused identity against the cool dark canvas. Six content-type colors provide category recognition without competing with the primary accent. The system is compact and information-dense (8pt grid, 20px margins, 12px gaps) but avoids claustrophobia through clear section breaks and a consistent card rhythm. Atmospheric effects are reserved for two specific contexts (sign-in branding and expanded player immersion), while the rest of the app stays flat and systematic. Typography is uniform Geist at a tight scale, relying on weight and size variation rather than multiple faces.

## Anti-Slop Notes

Patterns to actively avoid in downstream stages:

- **No gradient backgrounds.** Every background in this system is a flat solid (`#0F0F1A`, `#1A1A2E`, `#242438`, `#000000`). Never introduce purple-to-blue, orange-to-pink, or any gradient as a surface fill. The only gradients are the atmospheric radial glows on Sign In and Expanded Player — and those are specific, intentional, and subtle.
- **No shadow elevation.** This system differentiates depth by surface color, not drop shadows. Do not add `box-shadow` to cards, sheets, or buttons. The three-tier color model (`#0F0F1A` → `#1A1A2E` → `#242438`) IS the elevation system.
- **No border-radius inflation.** Cards are 10px, not 16px or 20px. The system has a tight, precise feel — inflated radii would make it look toylike. Match the scale exactly.
- **No left-accent borders on cards.** The cards use uniform `#1A1A2E` fill with no border accents. Content-type color appears on thumbnails and category labels, never as a card edge stripe.
- **No floating action buttons.** The "+" action lives in the header bar, always. Never generate a circular FAB in the bottom-right corner.
- **No blur/glassmorphism.** Bottom sheets and the tab bar are solid `#1A1A2E`. No `backdrop-filter: blur()`. The system is opaque and precise.
- **Orange is singular.** `#FF6B35` is the only accent. Do not introduce a second accent color for buttons or highlights. Content-type colors are categorical, not interactive accents.
- **Car mode is OLED black.** `#000000` with zero surface layers, zero decoration. Do not add `#1A1A2E` cards or any visual ornamentation in car mode.

## For /storyboard
> Dark-mode audio app on deep navy-black (#0F0F1A) with three flat elevation tiers, warm orange (#FF6B35) as the sole interactive accent, Geist sans-serif at a compact 8pt grid, atmospheric color bleed reserved for player and sign-in only — precise, immersive, content-forward.
