# Asset Inventory — 06 Home Daily Driver

## Icons

All icons sourced from [Lucide](https://lucide.dev/) — SVG, scalable, CSS color-controllable via `stroke="currentColor"` or `fill="currentColor"`.

| Name | Description | Shape / Topology | Library | Component Name | Size | Usage |
|------|-------------|-----------------|---------|----------------|------|-------|
| icon-house | House silhouette with peaked roof and rectangular base | Single-path house outline | Lucide | `house` | 24px | HomeTabIcon (active: filled orange, inactive: outline gray) |
| icon-compass | Circle with rotating dial / directional arrow inside | Circle with crosshair or directional pointer | Lucide | `compass` | 24px | DiscoverTabIcon (inactive gray) |
| icon-library | Stack of books / three vertical rectangles | Three standing vertical rectangles resembling book spines | Lucide | `library` | 24px | LibraryTabIcon (inactive gray) |
| icon-plus | Cross shape — two intersecting perpendicular lines | Horizontal + vertical bar cross | Lucide | `plus` | 20px | AddButton in HeaderSection |
| icon-play | Right-pointing solid triangle | Filled equilateral triangle pointing right | Lucide | `play` | 20px | PlayAllIcon + Card1/2/3PlayButton |

**Active vs Inactive tab states:**
- Active (Home tab): icon filled `#FF6B35`, label `#FF6B35`
- Inactive (Discover, Library tabs): icon outline `#6B7280`, label `#6B7280`

**SVG CDN paths:**
```
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/house.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/compass.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/library.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/plus.svg
https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/play.svg
```

---

## Images

Episode thumbnails — square artwork shown on the left side of each episode card. Generated at 256×256px (2× retina for 128px display size).

| Name | Compositing | Layered-over | Dimensions | Aspect Ratio | Content Description | File |
|------|-------------|--------------|------------|--------------|---------------------|------|
| thumb-crispr | standalone | — | 256×256px | 1:1 | Dark tech illustration of a blue/teal DNA double helix with scissors cutting a strand; "CRISPR" text label; deep dark background | assets/thumb-crispr.png |
| thumb-remote-work | standalone | — | 256×256px | 1:1 | Editorial photograph of a man in a blue shirt working on a laptop at a home office desk; warm professional lighting | assets/thumb-remote-work.png |
| thumb-ai | standalone | — | 256×256px | 1:1 | Dark sci-fi illustration of a futuristic humanoid robot with glowing blue/cyan circuitry and neural patterns; "AI" text label; deep dark background | assets/thumb-ai.png |

**Display usage:** Each thumbnail renders at 64×64px logical (128×128px @2x) inside episode cards with `radius-thumbnail: 8px` applied.

---

## Backgrounds

Solid colors only — all expressed as CSS values, no image files needed.

| Name | Type | Value | Component | File |
|------|------|-------|-----------|------|
| screen-bg | solid | #0F0F1A | ScreenBackground | — |
| surface-card | solid | #1A1A2E | EpisodeCard1, EpisodeCard2, EpisodeCard3, BottomTabBar | — |
| surface-elevated | solid | #242438 | Card1PlayButton, Card2PlayButton, Card3PlayButton | — |
| accent-cta | solid | #FF6B35 | PlayAllButton | — |
| divider-top | rgba | rgba(255,255,255,0.06) | BottomTabBar top border | — |

---

## Asset Notes

- **No overlay assets** — this screen has no decorative graphic elements placed on top of colored surfaces. All images are standalone content thumbnails.
- **Episode thumbnails are placeholder-class assets** — in production these are fetched dynamically from episode metadata (podcast RSS feed artwork). The generated files represent the design intent for the 3 sample episodes shown in the approved screen.
- **Card accent borders** — The colored left-edge border on episode cards (tech blue `#2563EB`, business orange `#EA580C`) is a CSS styling detail, not an image asset. Applied as a `border-left: 3px solid {color-content-type}` rule.
