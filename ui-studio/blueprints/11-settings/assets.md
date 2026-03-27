# Asset Inventory — Settings Screen (11-settings)

> **No photographic or illustrative assets.** The Settings screen is purely compositional — flat surfaces, text, icons, and a CSS-rendered avatar. All backgrounds are solid colors expressed as tokens. No asset files need to be generated for this screen.

---

## Icons

All icons sourced from **Lucide**. Settings is a list-heavy screen with three icon archetypes: back navigation, row-end chevrons, and a sparkle smart indicator.

| Name | Description | Library | Component | Size | Lucide Name |
|------|-------------|---------|-----------|------|-------------|
| icon-chevron-left | Left-pointing chevron — two line segments meeting at a vertex pointing left | Lucide | BackButton | 18px | `ChevronLeft` |
| icon-chevron-right | Right-pointing chevron — two line segments meeting at a vertex pointing right | Lucide | AccountChevron, DefaultSpeedChevron, SkipForwardChevron, SkipBackChevron, DefaultDurationChevron, DefaultVoiceChevron, OpenAIChevron | 16px | `ChevronRight` |
| icon-sparkle | Four-pointed star — concave diamond shape with four tapering points at N/S/E/W compass positions | Lucide | SparkleIcon | 16px | `Sparkles` |

### Icon Topology Notes

- **ChevronLeft / ChevronRight:** Pure directional affordance — visually two joined strokes forming a V pointing in the navigation direction. No semantic ambiguity. Standard iOS back/disclosure pattern.
- **Sparkles:** Four-pointed star with concave sides. Used here as an AI-powered / "smart mode" indicator on the Default Duration row. The ✦ glyph in the screen description maps to this shape. Lucide's `Sparkles` renders as 3 stars (large center + 2 small corner stars); if the single diamond star variant is needed, `Zap` or a custom SVG may be preferable. Use `Sparkles` as first choice, validate against approved screen.

---

## Images

None. No photographic thumbnails, hero images, or illustrations are present on this screen.

---

## Backgrounds

| Name | Type | Value | Component | File |
|------|------|-------|-----------|------|
| screen-bg | solid | `#0F0F1A` | SettingsScreen, ScrollableContent | — |
| card-surface | solid | `#1A1A2E` | AccountCard, PlaybackGroup, ProcessingGroup, ApiKeyGroup | — |
| avatar-bg | solid | `#313244` | AvatarCircle | — |
| toggle-track-on | solid | `#FF6B35` | AutoPlayToggle (ON state) | — |
| toggle-track-off | solid | `#242438` | AutoPlayToggle (OFF state) | — |
| toggle-thumb | solid | `#FFFFFF` | AutoPlayToggle thumb | — |

All backgrounds are CSS solid fills. No files to generate.

---

## Below-Fold Sections — Expected Assets

These sections are not visible in the approved frame but are described as part of the scrollable content. They follow the same icon and background pattern — no additional icon types expected.

| Section | Expected Icons |
|---------|---------------|
| Notifications | `ChevronRight` (row navigation), possibly `Bell` |
| Storage | `ChevronRight`, possibly `HardDrive` or `Database` |
| About | `ChevronRight` |
| Sign Out | No icon — text-only destructive button |
| Delete Account | No icon — text-only destructive button in `color-destructive` |
