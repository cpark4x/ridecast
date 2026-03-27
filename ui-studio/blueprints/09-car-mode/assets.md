
# Asset Inventory — 09 Car Mode

> **Screen character:** Pure OLED black (#000000) fullscreen interface with zero photographic or illustrative content. No images. No backgrounds beyond flat solid color. Asset list is icons only.

---

## Icons

| Name | Visual Description | Library | Component | Size |
|------|--------------------|---------|-----------|------|
| icon-close | Two straight white lines crossing at their midpoints at 45°, forming an × shape | Lucide | CloseButtonIcon | 24×24px |
| icon-pause | Two identical parallel vertical rectangles with rounded ends, side-by-side with a small gap between them, white fill | Lucide | PauseIcon | 32×32px |

### Icon Library Mapping

**icon-close → Lucide `X`**
- Topology: Two diagonal strokes, equal length, crossing at center
- Semantic: dismiss, close, exit — matches "close car mode" action ✓
- Source: `lucide-react` → `<X />`

**icon-pause → Lucide `Pause`**
- Topology: Two parallel vertical filled rectangles (standard pause symbol)
- Semantic: pause playback — direct match ✓
- Source: `lucide-react` → `<Pause />`

---

## Images

*None.* Car Mode contains no photographic, illustrative, or raster image assets. All visuals are pure CSS (solid colors, circles, text).

---

## Backgrounds

| Name | Type | Value | File |
|------|------|-------|------|
| screen-bg | solid | #000000 | — |
| button-secondary-fill | solid | #1A1A2E | — |
| button-primary-fill | solid | #FF6B35 | — |
| progress-track-fill | solid | #1A1A2E | — |
| progress-fill-orange | solid | #FF6B35 | — |

> All background values are CSS color tokens — no image files required.
