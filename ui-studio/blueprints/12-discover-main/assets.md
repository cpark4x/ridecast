# Asset Inventory — Discover Main (Screen 12)

> Source: `ui-studio/frames/12-discover-main.png`

---

## Icons

All icons from **Lucide** library. Use SVG inline with `stroke="currentColor"` for CSS color control.

| Name | Description (mechanical topology) | Lucide Component | Component(s) | Size |
|------|-----------------------------------|-----------------|--------------|------|
| icon-search | Circle with short diagonal line handle extending from bottom-right | `Search` | SearchBar → SearchIcon | 20px |
| icon-plus | Two equal-length perpendicular lines crossing at center, enclosed in a circle | `PlusCircle` | Card1AddButton, Card2AddButton | 20px |
| icon-chevron-right | Single right-pointing V shape formed by two joined diagonal lines | `ChevronRight` | SeeAllChevron | 16px |
| icon-pause | Two equal-height vertical rectangular bars standing parallel | `Pause` | MiniPlayerPlayPause | 22px |
| icon-home | Pentagon-roof shape atop a rectangle with small door cutout | `House` | Tab1Icon | 24px |
| icon-discover | Circle containing four-pointed diamond/star compass rose | `Compass` | Tab2Icon (active, orange) | 24px |
| icon-library | Three vertical rectangles of varying heights grouped as books on shelf | `Library` | Tab3Icon | 24px |
| icon-rocket | Pointed nose cone body with swept tail fins and circular exhaust port | `Rocket` | Chip1Icon (Science) | 18px |
| icon-bot | Square head shape with two circular eye cutouts and rectangular ears | `Bot` | Chip2Icon (AI & Tech) | 18px |
| icon-brain | Two rounded hemisphere lobes connected at center with surface fold lines | `Brain` | Chip3Icon (Psychology) | 18px |

---

## Images

| Name | Compositing | Layered-over | Dimensions | Aspect Ratio | Content Description | File |
|------|-------------|--------------|------------|--------------|---------------------|------|
| crispr-card-image | standalone | — | 260×180px | 13:9 | CRISPR DNA double helix with teal/blue microscopy-style background, "CRISPR" text overlay, CAS9 molecular graphic | assets/crispr-card-image.png |
| ai-robot-card-image | standalone | — | 260×180px | 13:9 | White humanoid robot head and shoulders with luminous blue accent eyes, neutral white surface | assets/ai-robot-card-image.png |
| psychology-card-image | standalone | — | 260×180px | 13:9 | Side silhouette of human head with glowing purple neural network brain pattern | assets/psychology-card-image.png |
| mini-player-artwork | standalone | — | 40×40px | 1:1 | Miniature version of crispr-card-image cropped to square | assets/mini-player-artwork.png |
| nature-logo | standalone | — | 44×44px | 1:1 | Deep green rounded square with white capital "N", serif letterform | assets/nature-logo.png |
| the-gradient-logo | standalone | — | 44×44px | 1:1 | Orange-to-pink gradient rounded square with white capital "G", sans-serif letterform | assets/the-gradient-logo.png |

---

## Backgrounds

| Name | Type | Value | File |
|------|------|-------|------|
| screen-bg | solid | #0F0F1A | — |
| surface-card | solid | #1A1A2E | — |
| surface-elevated | solid | #242438 | — |
| category-badge-teal | solid | #0D9488 | — |
| category-badge-blue | solid | #2563EB | — |
| category-badge-purple | solid | #7C3AED | — |
| follow-button-bg | solid | #242438 | — |
| tab-bar-bg | solid | #1A1A2E | — |
| mini-player-bg | solid | #242438 | — |

---

## Asset Generation Notes

### Article Card Images (crispr, ai-robot, psychology)
- Generate at 2× retina: **520×360px** each
- Style: high-quality editorial photography / photo-realistic renders
- Dark, cinematic tone to match the #0F0F1A app palette
- crispr: microscopy/scientific visualization — teal + deep blue
- ai-robot: clean white humanoid robot — studio lighting, neutral BG
- psychology: purple neural/mind visualization — dark background

### Source Logos (nature, the-gradient)
- Generate at 2×: **88×88px** each
- Flat icon style with rounded rectangle container
- nature-logo: `#065F46` green background, white "N" in clean serif
- the-gradient-logo: orange-to-coral gradient background, white "G" in geometric sans-serif

### Mini Player Artwork
- Reuse crispr-card-image cropped to 1:1 center square (80×80px at 2×)
- No separate generation needed — use CSS `object-fit: cover`
