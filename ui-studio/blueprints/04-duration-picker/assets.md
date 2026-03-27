# Asset Inventory — 04 Duration Picker

## Icons

| Name | Description | Library | Component | Size |
|------|-------------|---------|-----------|------|
| icon-sparkle | Single 4-pointed diamond star / sparkle (✦ shape) | Lucide: `Sparkle` | SparkleIcon | 16px |
| icon-home | House silhouette with triangular roof, rectangular door, filled/solid state (active) | Lucide: `House` | HomeTabIcon | 24px |
| icon-library | Three books standing upright side-by-side, outlined state (inactive) | Lucide: `Library` | LibraryTabIcon | 24px |

### Icon Notes
- `icon-home` is rendered in filled/active state (`#FF6B35`). Lucide `House` supports both outline and fill via `fill` prop.
- `icon-library` is rendered in outline/inactive state (`#6B7280`).
- `icon-sparkle` renders white (`#FFFFFF`) inside the orange `StandardChip`. Lucide `Sparkle` is a single 4-pointed star, matching the ✦ mark in the design.
- NEVER use emoji (✦) for these icons — always SVG from Lucide.

---

## Images

| Name | Compositing | Layered-over | Dimensions | Aspect Ratio | Content Description | File |
|------|-------------|--------------|------------|--------------|---------------------|------|
| article-thumbnail | standalone | — | 56×56px (112×112px @2×) | 1:1 | Dark background with "MIT Technology Review" text stacked in white, small serif font — looks like a publication logo tile | ui-studio/blueprints/04-duration-picker/assets/article-thumbnail.png |

### Image Notes
- `article-thumbnail` is a content image inside `ArticlePreviewCard`. It functions as a publication avatar / source logo tile.
- At 2× retina: generate at 112×112px.

---

## Backgrounds

| Name | Type | Value | Component | File |
|------|------|-------|-----------|------|
| color-background-screen | solid | `#0F0F1A` | DimmedHomeBackground | — |
| color-dim-overlay | color | `rgba(0,0,0,0.6)` | DimOverlay | — |
| color-background-sheet | solid | `#1A1A2E` | BottomSheetModal, BottomNavBar | — |
| color-background-card | solid | `#242438` | ArticlePreviewCard, SummaryChip, ReadAloudChip | — |
| color-accent-primary | solid | `#FF6B35` | StandardChip, CreateEpisodeCTA | — |

### Background Notes
- All backgrounds are solid CSS colors or `rgba()` values — no image assets needed.
- The blurred home screen behind the sheet is a runtime effect (CSS `blur()` or React Native `<BlurView>`), not a static asset. It renders whatever the underlying Home route currently displays.
- No gradients, textures, or photographic backgrounds on this screen.
