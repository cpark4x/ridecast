# Asset Inventory — 02 Home Empty State

> Extracted from: `ui-studio/frames/02-home-empty.png`

---

## Icons

Icon library search per `icon-finding` skill — topology-first matching against Lucide library.

| Name | Description | Library | Component | Size |
|------|-------------|---------|-----------|------|
| tab-home-filled | Solid filled house silhouette: pitched roof, central rectangular opening for door/arch. Filled (solid, not outline) — active state. | Lucide | HomeTabIcon | 24px |
| tab-library-outline | Three stacked book spines shown as vertical rectangles slightly fanned/offset. Outline stroke, not filled — inactive state. | Lucide | LibraryTabIcon | 24px |

**Lucide component names:**
- `tab-home-filled` → `<House />` (Lucide, filled variant via `fill="currentColor"`)
- `tab-library-outline` → `<Library />` (Lucide, stroke/outline)

---

## Images

| Name | Compositing | Layered-over | Dimensions | Aspect Ratio | Content Description | File |
|------|-------------|--------------|------------|--------------|---------------------|------|
| headphone-empty-state | overlay | #0F0F1A | 360x360px | 1:1 | White over-ear headphones with an orange audio waveform symbol between the earcups. Soft orange radial glow (#FF6B35, ~45% peak opacity) emanates from behind the headphones and fades to transparent at edges. 3D illustration style, clean and modern. | assets/headphone-empty-state.png |

---

## Backgrounds

| Name | Type | Value | Component | File |
|------|------|-------|-----------|------|
| screen-bg | solid | `#0F0F1A` | ScreenBackground | — |
| atmospheric-glow | radial-gradient | `radial-gradient(circle at center, rgba(255,107,53,0.45) 0%, rgba(15,15,26,0) 70%)` — ~300px diameter | AtmosphericGlow | — |
| tabbar-surface | solid | `#1A1A2E` | BottomTabBar | — |
| tabbar-top-border | solid | `rgba(255,255,255,0.06)` 1px | TabBarTopBorder | — |

---

## Generation Notes

- **headphone-empty-state**: Generated at 360×360px with transparent background (alpha channel). Composites over `#0F0F1A` via CSS `position: absolute` or `background-image`. The orange glow is baked into the asset (fades to transparent at edges, so it blends naturally with the screen background).
- **atmospheric-glow**: Expressed as a CSS `radial-gradient` — no asset file needed. Render as a `::before` pseudo-element or `<div>` with the gradient, positioned centered behind `IllustrationContainer`, ~300px wide and tall.
- **Icons**: Fetch from Lucide. Do not generate icon images. Use SVG with `stroke="currentColor"` (or `fill="currentColor"` for filled variant) for CSS color control.
