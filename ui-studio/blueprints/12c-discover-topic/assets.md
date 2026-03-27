# Asset Inventory — 12c Discover Topic (Science)

## Icons

All icons sourced from Lucide (https://lucide.dev). Use `stroke="currentColor"` for CSS color control.

| Name | Description | Library | Lucide Component | Size | Component |
|------|-------------|---------|-----------------|------|-----------|
| icon-chevron-left | Left-pointing angle bracket chevron | Lucide | `chevron-left` | 24px | BackNavChevron |
| icon-sliders | Horizontal slider lines (filter/sort) | Lucide | `sliders-horizontal` | 24px | FilterIcon |
| icon-plus-circle | Circle with plus sign inside | Lucide | `circle-plus` | 32px | ArticleAddButton1–5 |
| icon-pause | Two vertical parallel bars | Lucide | `pause` | 24px | MiniPlayerPlayPause |
| icon-tab-home | House outline with roof and door | Lucide | `house` | 24px | TabHomeIcon |
| icon-tab-discover | Compass circle with rotating needle | Lucide | `compass` | 24px | TabDiscoverIcon (active: #FF6B35 filled) |
| icon-tab-library | Stack of books / bookmark-multiple | Lucide | `library` | 24px | TabLibraryIcon |

### Icon Color States
- **Inactive tabs (Home, Library):** `stroke="#6B7280"` / `fill="none"`
- **Active tab (Discover):** `stroke="#FF6B35"` / `fill="#FF6B35"` (filled variant)
- **Navigation icons (back chevron, filter):** `stroke="#9CA3AF"` / `fill="none"`
- **Add buttons:** `stroke="#9CA3AF"` / `fill="none"` (circle-plus outline)
- **Mini player pause:** `stroke="#FFFFFF"` / `fill="none"`

---

## Images

Standalone article thumbnails — fully opaque, rendered as `<img>` or CSS `background-image` at 72×72px display size. Generate at 144×144px (2× retina).

| Name | Compositing | Layered-over | Dimensions | Aspect Ratio | Content Description | File |
|------|-------------|--------------|------------|--------------|---------------------|------|
| article-thumb-gene-therapy | standalone | — | 144×144 | 1:1 | Close-up of a blue luminescent DNA double helix on dark background, scientific photography style | assets/article-thumb-gene-therapy.png |
| article-thumb-deep-sea | standalone | — | 144×144 | 1:1 | Deep ocean floor with blue-green water, sunlight rays filtering down from surface, mysterious depth | assets/article-thumb-deep-sea.png |
| article-thumb-jwst | standalone | — | 144×144 | 1:1 | James Webb Space Telescope in space against dark starfield, gold honeycomb mirror panels visible | assets/article-thumb-jwst.png |
| article-thumb-memory | standalone | — | 144×144 | 1:1 | Human brain profile silhouette with glowing orange-red neural network lighting effects, dark background | assets/article-thumb-memory.png |
| article-thumb-crispr | standalone | — | 144×144 | 1:1 | Blue glowing DNA helix with gene scissors/edit metaphor, CRISPR concept, dark lab background | assets/article-thumb-crispr.png |

### Mini Player Thumbnail
The mini player uses `article-thumb-crispr` — same asset as ArticleCard5 thumbnail (the currently playing episode). No separate file needed.

---

## Backgrounds

| Name | Type | Value | Component | File |
|------|------|-------|-----------|------|
| screen-background | solid | `#0F0F1A` | DiscoverTopicScreen | — |
| card-surface | solid | `#1A1A2E` | ArticleCard1–5 | — |
| mini-player-surface | solid | `#242438` | MiniPlayer | — |
| tab-bar-surface | solid | `#1A1A2E` | BottomTabBar | — |
| tab-bar-border-top | solid | `rgba(255,255,255,0.06)` | BottomTabBar top edge | — |
| topic-accent-line | solid | `#0D9488` | TopicAccentLine | — |
| progress-track | solid | `#3A3A4E` | MiniPlayerProgressTrack | — |
| progress-fill | solid | `#FF6B35` | MiniPlayerProgressFill | — |

---

## Token Overlay Notes

- Token overlay generated at `token-overlay.png` — verified clean (UI unmodified in center, labels in margins, color swatches filled)
- Minor VLM misread: the `[ICN] icon-tab-discover` callout describes it as orange-active; the tab IS active at `#FF6B35` in the approved screen
- `[SHD]` group intentionally absent — Ridecast uses zero box-shadows (elevation by surface color only, per aesthetic-brief anti-slop notes)
- `width-accent-underline` refers to the teal horizontal line below TopicStats, not a tab indicator
