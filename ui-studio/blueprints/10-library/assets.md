# Asset Inventory — Library Screen (10-library)

> Extracted from approved screen: `ui-studio/frames/10-library.png`

---

## Icons

All icons sourced from **Lucide** (ISC license). Use `stroke="currentColor"` for CSS color control.

| Name | Description | Topology | Library | Component | Size | Color Token |
|------|-------------|----------|---------|-----------|------|-------------|
| icon-filter | Three horizontal lines of decreasing length (funnel filter) | Parallel strokes, top longest → bottom shortest | Lucide `ListFilter` | FilterIcon | 24px | color-text-secondary |
| icon-plus | Two perpendicular lines crossing at center (plus sign) | Horizontal + vertical stroke intersection | Lucide `Plus` | AddIcon | 24px | color-text-secondary |
| icon-search | Circle with short diagonal line extending from lower-right (magnifying glass) | Closed circle + attached line segment | Lucide `Search` | SearchIcon | 16px | color-text-tertiary |
| icon-more-horizontal | Three small filled circles arranged in a horizontal row | Equidistant dots, same diameter | Lucide `MoreHorizontal` | Card*MenuIcon | 16px | color-accent |
| icon-pause | Two parallel vertical rectangles (pause symbol) | Two equal-height vertical bars, small gap between | Lucide `Pause` | MiniPlayerPauseIcon | 24px | color-accent |
| icon-tab-home | Peaked triangular roof above a rectangular base, small door cutout at bottom center | House silhouette — triangle + rectangle topology | Lucide `House` | TabHomeIcon | 24px | color-text-tertiary (inactive) |
| icon-tab-library | Three vertical rectangles of slightly varying heights standing upright side by side (books on shelf) | Stacked-books topology — 3 vertical rects with slight height variation | Lucide `Library` | TabLibraryIcon | 24px | color-accent (active) |

---

## Images (Episode Thumbnails)

All thumbnails are **standalone** assets — fully opaque, fill their own bounded region, not composited over another surface.

| Name | Compositing | Layered-over | Dimensions (display) | Aspect Ratio | Content Description | File |
|------|-------------|--------------|----------------------|--------------|---------------------|------|
| img-episode-crispr-thumb | standalone | — | 56×56px | 1:1 | Blue/white DNA double helix illustration with "CRISPR" text; science podcast cover art | assets/img-episode-crispr-thumb.png |
| img-episode-remotework-thumb | standalone | — | 56×56px | 1:1 | Two people at a desk with laptops and speech/chat bubbles; business podcast cover art | assets/img-episode-remotework-thumb.png |
| img-episode-ai2026-thumb | standalone | — | 56×56px | 1:1 | Blue digital circuit board trace pattern with bold "AI" text centered; tech podcast cover art | assets/img-episode-ai2026-thumb.png |
| img-episode-quantum-thumb | standalone | — | 56×56px | 1:1 | Abstract cosmic energy sphere — glowing orb with colored light trails and particles on dark background; science podcast cover art | assets/img-episode-quantum-thumb.png |
| img-episode-placeholder-thumb | standalone | — | 56×56px | 1:1 | Generic episode placeholder (partially visible in Card5) — reuses img-episode-crispr-thumb per screen analysis | assets/img-episode-crispr-thumb.png |

---

## Backgrounds

| Name | Type | Value | File |
|------|------|-------|------|
| screen-bg | solid | #0F0F1A | — |
| surface-bg | solid | #1A1A2E | — |
| surface-elevated-bg | solid | #242438 | — |
| progress-track | solid | #3E404B | — |
| divider-line | solid | rgba(255,255,255,0.06) | — |

---

## Generated Asset Files

```
ui-studio/blueprints/10-library/assets/
├── img-episode-crispr-thumb.png       (112×112px, 2× retina, CRISPR/DNA cover art)
├── img-episode-remotework-thumb.png   (112×112px, 2× retina, Remote Work cover art)
├── img-episode-ai2026-thumb.png       (112×112px, 2× retina, AI 2026 cover art)
└── img-episode-quantum-thumb.png      (112×112px, 2× retina, Quantum Computing cover art)
```

All thumbnail assets generated at 2× display resolution (112×112px) for retina rendering at 56×56px display size.

---

## Icon SVG URLs (Lucide)

Fetch at build time from Lucide GitHub CDN:

```
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/list-filter.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/plus.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/search.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/more-horizontal.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/pause.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/house.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/library.svg
```

Use `stroke="currentColor"` + CSS `color` property to apply color-accent / color-text-secondary / color-text-tertiary tokens per active/inactive state.
