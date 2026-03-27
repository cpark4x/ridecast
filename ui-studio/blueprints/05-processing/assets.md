# Asset Inventory — 05-Processing

---

## Icons

All icons sourced from **Lucide** (lucide.dev). SVG, `stroke="currentColor"`, no fill unless noted.

| Name | Description | Library | Icon Name | Size | Component |
|------|-------------|---------|-----------|------|-----------|
| icon-close | Two diagonal lines forming an X mark | Lucide | `x` | 16px | CloseButton |
| icon-check-circle-filled | Solid circle with a V-shaped checkmark stroke | Lucide | `circle-check` | 24px | Stage1Icon, Stage2Icon |
| icon-circle-filled-active | Small solid filled dot inside a circle ring | Lucide | `circle-dot` | 24px | Stage3Icon (active state, colored #FF6B35) |
| icon-circle-outline-pending | Empty circular ring outline, no fill | Lucide | `circle` | 24px | Stage4Icon (pending state, colored #2C2C3A with #6B7280 border) |

**Icon integration notes:**
- `icon-close` lives inside the CloseButton container which supplies a 32px circular background of `rgba(255,255,255,0.10)`
- `icon-check-circle-filled`: render with `stroke="currentColor"` where currentColor = `#16A34A` (color-status-success)
- `icon-circle-filled-active`: render with `fill="currentColor"` AND `stroke="currentColor"` where currentColor = `#FF6B35`
- `icon-circle-outline-pending`: render with `stroke="currentColor"` where currentColor = `#6B7280`, no fill

---

## Images

| Name | Compositing | Layered-over | Dimensions (display) | Dimensions (file 2×) | Aspect Ratio | Content Description | File |
|------|-------------|--------------|----------------------|----------------------|--------------|---------------------|------|
| processing-thumbnail-crispr | standalone | — | 335×335px | 670×670px | 1:1 | Stylized DNA double helix illustration in teal/cyan tone (#0D9488 palette) on a dark navy background; glowing nodes along the helix strands; scientific/bioluminescent aesthetic | assets/processing-thumbnail-crispr.png |

---

## Backgrounds

| Name | Type | Value | Component | File |
|------|------|-------|-----------|------|
| screen-bg | solid | `#0F0F1A` | ProcessingScreen | — |
| progress-track-bg | solid | `#242438` | ProgressTrackBg | — |
| close-button-bg | solid | `rgba(255,255,255,0.10)` | CloseButton | — |
| stage-pending-bg | solid | `#2C2C3A` | Stage4Icon circle background | — |
| connector-line | solid | `rgba(255,255,255,0.12)` | Stage1Connector, Stage2Connector, Stage3Connector | — |

---

## Notes

- The screen background (`#0F0F1A`) may have a very subtle fine-grained texture or noise visible at high zoom — this is treated as a CSS background-color token; no generated asset needed.
- A soft drop shadow (`0px 8px 24px rgba(0,0,0,0.20)`) appears beneath the `processing-thumbnail-crispr` image — this is a CSS shadow token (`shadow-thumbnail`), not a separate asset.
- All icon states (completed / active / pending) are controlled via CSS `currentColor` — no separate icon asset files needed per state.
