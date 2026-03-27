# Asset Inventory — 08 Expanded Player

## Icons

| Name | Description | Library | Component | Size |
|------|-------------|---------|-----------|------|
| icon-collapse-chevron | Single downward-pointing chevron, thin stroke | Lucide: `chevron-down` | CollapseChevron | 24px |
| icon-share | Square with upward-pointing arrow emerging from top center | Lucide: `share-2` | ShareIcon | 24px |
| icon-heart-outline | Heart outline shape | Lucide: `heart` | FavoriteButton | 20px |
| icon-rewind-15 | Circular counter-clockwise arrow with "15" numeral | Lucide: `rotate-ccw` + text overlay "15" | RewindButton | 44px |
| icon-pause | Two vertical rectangle bars (pause state); or single right-pointing triangle (play state) | Lucide: `pause` / `play` | PlayPauseButton | 32px inside 64px circle |
| icon-forward-30 | Circular clockwise arrow with "30" numeral | Lucide: `rotate-cw` + text overlay "30" | ForwardButton | 44px |
| icon-sleep-timer | Crescent moon shape | Lucide: `moon` | SleepButton | 24px |
| icon-car-mode | Steering wheel — circle with cross-bars and inner ring | Lucide: `steering-wheel` | CarModeButton | 24px |
| icon-read-along | Document with horizontal text lines + small speaker/audio element | Lucide: `book-audio` | ReadAlongButton | 24px |
| icon-airplay | Rectangle (screen) with upward-pointing triangle below center | Lucide: `airplay` | AirPlayButton | 24px |

## Images

| Name | Compositing | Layered-over | Dimensions | Aspect Ratio | Content Description | File |
|------|-------------|--------------|------------|--------------|---------------------|------|
| artwork-crispr-episode | standalone | — | 560×560 | 1:1 | Science podcast artwork — blue double-helix DNA structure with red-orange CRISPR cut-point markers against a deep teal (#0D9488) background; scientific diagram style, bold typography overlay | assets/artwork-crispr-episode.png |
| chapter-thumbnail-1 | standalone | — | 96×96 | 1:1 | Small podcast artwork thumbnail — same DNA/teal visual at reduced scale for chapter list row | assets/chapter-thumbnail-1.png |
| chapter-thumbnail-2 | standalone | — | 96×96 | 1:1 | Small podcast artwork thumbnail — same DNA/teal visual at reduced scale for chapter list row | assets/chapter-thumbnail-2.png |
| chapter-thumbnail-3 | standalone | — | 96×96 | 1:1 | Small podcast artwork thumbnail — same DNA/teal visual at reduced scale for chapter list row | assets/chapter-thumbnail-3.png |

## Backgrounds

| Name | Type | Value | File |
|------|------|-------|------|
| color-background-screen | solid | #0F0F1A | — |
| color-surface-sections | solid | #1A1A2E | — |
| color-surface-chapter-active | solid | #242438 | — |
| bg-atmospheric-teal-glow | effect | `box-shadow: 0 0 160px 80px rgba(13, 148, 136, 0.10)` applied to ArtworkCard container via radial overflow | — |
| color-scrubber-track | solid | #2C303E | — |
| color-scrubber-filled | solid | #FF6B35 | — |

---

## Icon Library Notes

All icons sourced from **Lucide** (https://lucide.dev) — ISC licensed, SVG format.

- `rotate-ccw` and `rotate-cw` are base icons; the "15" and "30" numeral labels are rendered as `<text>` overlaid on the icon in code (not part of the SVG asset itself)
- `steering-wheel` is available in Lucide v0.300+ — verify library version
- `book-audio` available in Lucide v0.350+ — alternative: `file-audio` if version is older
- PlayPauseButton toggles between `pause` and `play` icons based on playback state; the icon sits inside a `#FFFFFF` filled circle container

## Atmospheric Effect Notes

The teal atmospheric glow is a **CSS effect only** — no image file required:
- Applied as `box-shadow` (outward glow) on the ArtworkSection container
- Color: `rgba(13, 148, 136, 0.10)` — 10% opacity teal per aesthetic brief spec
- Radius: ~160px blur, ~80px spread
- The effect bleeds the podcast artwork's dominant teal color into the surrounding `#0F0F1A` background
- Per aesthetic brief: "dominant color extracted from podcast artwork bleeds into background at 8–10% opacity"
