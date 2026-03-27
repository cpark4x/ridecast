# Component Spec — 12c Discover Topic (Science)

Screen: `DiscoverTopicScreen` — Discover Topic Feed for "Science"
Nav shell reference: `ui-studio/storyboards/nav-shell.md`
Design system: `ui-studio/moodboard/aesthetic-brief.md`

---

## BottomTabBar

- **Type:** container
- **Parent:** DiscoverTopicScreen
- **Children:** TabHome, TabDiscover, TabLibrary
- **Tokens:** color-surface-card, border-top-subtle, height-tab-bar
- **Content:** —
- **Scope:** app-shell

---

## TabHome

- **Type:** button
- **Parent:** BottomTabBar
- **Children:** TabHomeIcon, TabHomeLabel
- **Tokens:** color-tab-inactive, font-size-tab-label, font-weight-medium
- **Content:** "Home"
- **Asset:** icon-tab-home

---

## TabHomeIcon

- **Type:** icon
- **Parent:** TabHome
- **Children:** none
- **Tokens:** color-tab-inactive
- **Asset:** icon-tab-home

---

## TabHomeLabel

- **Type:** text
- **Parent:** TabHome
- **Children:** none
- **Tokens:** color-tab-inactive, font-size-tab-label, font-weight-medium
- **Content:** "Home"

---

## TabDiscover

- **Type:** button
- **Parent:** BottomTabBar
- **Children:** TabDiscoverIcon, TabDiscoverLabel
- **Tokens:** color-tab-active, font-size-tab-label, font-weight-medium
- **Content:** "Discover"
- **Asset:** icon-tab-discover

---

## TabDiscoverIcon

- **Type:** icon
- **Parent:** TabDiscover
- **Children:** none
- **Tokens:** color-tab-active
- **Asset:** icon-tab-discover

---

## TabDiscoverLabel

- **Type:** text
- **Parent:** TabDiscover
- **Children:** none
- **Tokens:** color-tab-active, font-size-tab-label, font-weight-medium
- **Content:** "Discover"

---

## TabLibrary

- **Type:** button
- **Parent:** BottomTabBar
- **Children:** TabLibraryIcon, TabLibraryLabel
- **Tokens:** color-tab-inactive, font-size-tab-label, font-weight-medium
- **Content:** "Library"
- **Asset:** icon-tab-library

---

## TabLibraryIcon

- **Type:** icon
- **Parent:** TabLibrary
- **Children:** none
- **Tokens:** color-tab-inactive
- **Asset:** icon-tab-library

---

## TabLibraryLabel

- **Type:** text
- **Parent:** TabLibrary
- **Children:** none
- **Tokens:** color-tab-inactive, font-size-tab-label, font-weight-medium
- **Content:** "Library"

---

## MiniPlayer

- **Type:** container
- **Parent:** DiscoverTopicScreen
- **Children:** MiniPlayerThumb, MiniPlayerInfo, MiniPlayerPlayPause, MiniPlayerProgressBar
- **Tokens:** color-surface-elevated, radius-mini-player, height-mini-player, spacing-screen-margin
- **Content:** —
- **Asset:** —
- **Scope:** app-shell

---

## MiniPlayerThumb

- **Type:** image
- **Parent:** MiniPlayer
- **Children:** none
- **Tokens:** radius-thumbnail, width-thumbnail-mini, height-thumbnail-mini
- **Content:** [dynamic — current episode artwork]
- **Asset:** article-thumb-crispr (current playing episode)

---

## MiniPlayerInfo

- **Type:** container
- **Parent:** MiniPlayer
- **Children:** MiniPlayerTitle, MiniPlayerProgressPercent
- **Tokens:** spacing-xs
- **Content:** —

---

## MiniPlayerTitle

- **Type:** text
- **Parent:** MiniPlayerInfo
- **Children:** none
- **Tokens:** color-text-primary, font-size-mini-player-title, font-weight-semibold
- **Content:** [dynamic — "The Future of CRISPR Gene Editing"]

---

## MiniPlayerProgressPercent

- **Type:** text
- **Parent:** MiniPlayerInfo
- **Children:** none
- **Tokens:** color-text-secondary, font-size-mini-player-percent, font-weight-regular
- **Content:** [dynamic — "35%"]

---

## MiniPlayerPlayPause

- **Type:** button
- **Parent:** MiniPlayer
- **Children:** none
- **Tokens:** color-text-primary, size-player-icon
- **Content:** —
- **Asset:** icon-pause

---

## MiniPlayerProgressBar

- **Type:** container
- **Parent:** MiniPlayer
- **Children:** MiniPlayerProgressTrack, MiniPlayerProgressFill
- **Tokens:** height-progress-bar, radius-pill
- **Content:** —

---

## MiniPlayerProgressTrack

- **Type:** background
- **Parent:** MiniPlayerProgressBar
- **Children:** none
- **Tokens:** color-progress-track, height-progress-bar, radius-pill
- **Content:** —

---

## MiniPlayerProgressFill

- **Type:** background
- **Parent:** MiniPlayerProgressBar
- **Children:** none
- **Tokens:** color-accent-primary, height-progress-bar, radius-pill
- **Content:** [dynamic — width driven by playback percentage]

---

## DiscoverTopicScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** BackNavBar, TopicHeader, ArticleList, MiniPlayer, BottomTabBar
- **Tokens:** color-background-screen
- **Content:** —
- **Scope:** local

---

## BackNavBar

- **Type:** container
- **Parent:** DiscoverTopicScreen
- **Children:** BackNavChevron, BackNavLabel, FilterIcon
- **Tokens:** color-background-screen, height-back-nav-bar, spacing-screen-margin
- **Content:** —
- **Scope:** local

---

## BackNavChevron

- **Type:** icon
- **Parent:** BackNavBar
- **Children:** none
- **Tokens:** color-text-secondary, size-nav-icon
- **Content:** —
- **Asset:** icon-chevron-left

---

## BackNavLabel

- **Type:** text
- **Parent:** BackNavBar
- **Children:** none
- **Tokens:** color-text-secondary, font-size-back-nav, font-weight-regular
- **Content:** "Discover"

---

## FilterIcon

- **Type:** button
- **Parent:** BackNavBar
- **Children:** none
- **Tokens:** color-text-secondary, size-nav-icon
- **Content:** —
- **Asset:** icon-sliders

---

## TopicHeader

- **Type:** container
- **Parent:** DiscoverTopicScreen
- **Children:** TopicHeadingRow, TopicStats, TopicAccentLine
- **Tokens:** color-background-screen, spacing-screen-margin, spacing-section-gap
- **Content:** —
- **Scope:** local

---

## TopicHeadingRow

- **Type:** container
- **Parent:** TopicHeader
- **Children:** TopicEmoji, TopicTitle
- **Tokens:** spacing-xs
- **Content:** —

---

## TopicEmoji

- **Type:** text
- **Parent:** TopicHeadingRow
- **Children:** none
- **Tokens:** font-size-topic-title
- **Content:** "🧬"
- **Note:** Rendered as Unicode emoji text glyph inline with the heading — not an SVG icon per design; acceptable as emoji inside non-chrome content text

---

## TopicTitle

- **Type:** text
- **Parent:** TopicHeadingRow
- **Children:** none
- **Tokens:** color-text-primary, font-size-topic-title, font-weight-bold
- **Content:** "Science"

---

## TopicStats

- **Type:** text
- **Parent:** TopicHeader
- **Children:** none
- **Tokens:** color-text-secondary, font-size-topic-stats, font-weight-regular
- **Content:** "24 articles · 8 sources"

---

## TopicAccentLine

- **Type:** background
- **Parent:** TopicHeader
- **Children:** none
- **Tokens:** color-accent-science, width-accent-underline, height-accent-underline, radius-pill
- **Content:** —

---

## ArticleList

- **Type:** list
- **Parent:** DiscoverTopicScreen
- **Children:** ArticleCard1, ArticleCard2, ArticleCard3, ArticleCard4, ArticleCard5
- **Tokens:** color-background-screen, spacing-screen-margin, spacing-card-gap
- **Content:** [dynamic — scrollable list of articles]
- **Scope:** local

---

## ArticleCard1

- **Type:** container
- **Parent:** ArticleList
- **Children:** ArticleThumb1, ArticleCardBody1, ArticleAddButton1
- **Tokens:** color-surface-card, radius-card, spacing-card-padding-v, spacing-card-padding-h, height-article-card
- **Content:** —

---

## ArticleThumb1

- **Type:** image
- **Parent:** ArticleCard1
- **Children:** none
- **Tokens:** width-thumbnail, height-thumbnail, radius-thumbnail
- **Content:** [dynamic — DNA helix photo]
- **Asset:** article-thumb-gene-therapy

---

## ArticleCardBody1

- **Type:** container
- **Parent:** ArticleCard1
- **Children:** ArticleTitle1, ArticleMeta1
- **Tokens:** spacing-xs
- **Content:** —

---

## ArticleTitle1

- **Type:** text
- **Parent:** ArticleCardBody1
- **Children:** none
- **Tokens:** color-text-primary, font-size-article-title, font-weight-semibold
- **Content:** "New Gene Therapy Reverses Aging in Mice"

---

## ArticleMeta1

- **Type:** text
- **Parent:** ArticleCardBody1
- **Children:** none
- **Tokens:** color-text-secondary, font-size-article-meta, font-weight-regular
- **Content:** "MIT Technology Review · 8 min read"

---

## ArticleAddButton1

- **Type:** button
- **Parent:** ArticleCard1
- **Children:** none
- **Tokens:** color-text-secondary, size-add-button, radius-add-button, color-surface-elevated
- **Content:** —
- **Asset:** icon-plus

---

## ArticleCard2

- **Type:** container
- **Parent:** ArticleList
- **Children:** ArticleThumb2, ArticleCardBody2, ArticleAddButton2
- **Tokens:** color-surface-card, radius-card, spacing-card-padding-v, spacing-card-padding-h, height-article-card
- **Content:** —

---

## ArticleThumb2

- **Type:** image
- **Parent:** ArticleCard2
- **Children:** none
- **Tokens:** width-thumbnail, height-thumbnail, radius-thumbnail
- **Content:** [dynamic — ocean/seabed photo]
- **Asset:** article-thumb-deep-sea

---

## ArticleCardBody2

- **Type:** container
- **Parent:** ArticleCard2
- **Children:** ArticleTitle2, ArticleMeta2
- **Tokens:** spacing-xs
- **Content:** —

---

## ArticleTitle2

- **Type:** text
- **Parent:** ArticleCardBody2
- **Children:** none
- **Tokens:** color-text-primary, font-size-article-title, font-weight-semibold
- **Content:** "Deep Sea Mining: The Hidden Cost"

---

## ArticleMeta2

- **Type:** text
- **Parent:** ArticleCardBody2
- **Children:** none
- **Tokens:** color-text-secondary, font-size-article-meta, font-weight-regular
- **Content:** "Nature · 15 min read"

---

## ArticleAddButton2

- **Type:** button
- **Parent:** ArticleCard2
- **Children:** none
- **Tokens:** color-text-secondary, size-add-button, radius-add-button, color-surface-elevated
- **Content:** —
- **Asset:** icon-plus

---

## ArticleCard3

- **Type:** container
- **Parent:** ArticleList
- **Children:** ArticleThumb3, ArticleCardBody3, ArticleAddButton3
- **Tokens:** color-surface-card, radius-card, spacing-card-padding-v, spacing-card-padding-h, height-article-card
- **Content:** —

---

## ArticleThumb3

- **Type:** image
- **Parent:** ArticleCard3
- **Children:** none
- **Tokens:** width-thumbnail, height-thumbnail, radius-thumbnail
- **Content:** [dynamic — James Webb Space Telescope photo]
- **Asset:** article-thumb-jwst

---

## ArticleCardBody3

- **Type:** container
- **Parent:** ArticleCard3
- **Children:** ArticleTitle3, ArticleMeta3
- **Tokens:** spacing-xs
- **Content:** —

---

## ArticleTitle3

- **Type:** text
- **Parent:** ArticleCardBody3
- **Children:** none
- **Tokens:** color-text-primary, font-size-article-title, font-weight-semibold
- **Content:** "James Webb Finds New Earth-Like Planets"

---

## ArticleMeta3

- **Type:** text
- **Parent:** ArticleCardBody3
- **Children:** none
- **Tokens:** color-text-secondary, font-size-article-meta, font-weight-regular
- **Content:** "Quanta Magazine · 6 min read"

---

## ArticleAddButton3

- **Type:** button
- **Parent:** ArticleCard3
- **Children:** none
- **Tokens:** color-text-secondary, size-add-button, radius-add-button, color-surface-elevated
- **Content:** —
- **Asset:** icon-plus

---

## ArticleCard4

- **Type:** container
- **Parent:** ArticleList
- **Children:** ArticleThumb4, ArticleCardBody4, ArticleAddButton4
- **Tokens:** color-surface-card, radius-card, spacing-card-padding-v, spacing-card-padding-h, height-article-card
- **Content:** —

---

## ArticleThumb4

- **Type:** image
- **Parent:** ArticleCard4
- **Children:** none
- **Tokens:** width-thumbnail, height-thumbnail, radius-thumbnail
- **Content:** [dynamic — human head with glowing brain illustration]
- **Asset:** article-thumb-memory

---

## ArticleCardBody4

- **Type:** container
- **Parent:** ArticleCard4
- **Children:** ArticleTitle4, ArticleMeta4
- **Tokens:** spacing-xs
- **Content:** —

---

## ArticleTitle4

- **Type:** text
- **Parent:** ArticleCardBody4
- **Children:** none
- **Tokens:** color-text-primary, font-size-article-title, font-weight-semibold
- **Content:** "How Memories Are Made and Lost"

---

## ArticleMeta4

- **Type:** text
- **Parent:** ArticleCardBody4
- **Children:** none
- **Tokens:** color-text-secondary, font-size-article-meta, font-weight-regular
- **Content:** "Aeon · 10 min read"

---

## ArticleAddButton4

- **Type:** button
- **Parent:** ArticleCard4
- **Children:** none
- **Tokens:** color-text-secondary, size-add-button, radius-add-button, color-surface-elevated
- **Content:** —
- **Asset:** icon-plus

---

## ArticleCard5

- **Type:** container
- **Parent:** ArticleList
- **Children:** ArticleThumb5, ArticleCardBody5, ArticleAddButton5
- **Tokens:** color-surface-card, radius-card, spacing-card-padding-v, spacing-card-padding-h, height-article-card
- **Content:** — (partially obscured by MiniPlayer)

---

## ArticleThumb5

- **Type:** image
- **Parent:** ArticleCard5
- **Children:** none
- **Tokens:** width-thumbnail, height-thumbnail, radius-thumbnail
- **Content:** [dynamic — DNA helix / CRISPR concept photo]
- **Asset:** article-thumb-crispr

---

## ArticleCardBody5

- **Type:** container
- **Parent:** ArticleCard5
- **Children:** ArticleTitle5, ArticleMeta5
- **Tokens:** spacing-xs
- **Content:** —

---

## ArticleTitle5

- **Type:** text
- **Parent:** ArticleCardBody5
- **Children:** none
- **Tokens:** color-text-primary, font-size-article-title, font-weight-semibold
- **Content:** "The Future of CRISPR Gene Editing"

---

## ArticleMeta5

- **Type:** text
- **Parent:** ArticleCardBody5
- **Children:** none
- **Tokens:** color-text-secondary, font-size-article-meta, font-weight-regular
- **Content:** "G..." (source truncated by overlap)

---

## ArticleAddButton5

- **Type:** button
- **Parent:** ArticleCard5
- **Children:** none
- **Tokens:** color-text-secondary, size-add-button, radius-add-button, color-surface-elevated
- **Content:** —
- **Asset:** icon-plus

---

## Component Hierarchy (Tree Summary)

```
DiscoverTopicScreen (root)
├── BackNavBar
│   ├── BackNavChevron
│   ├── BackNavLabel
│   └── FilterIcon
├── TopicHeader
│   ├── TopicHeadingRow
│   │   ├── TopicEmoji
│   │   └── TopicTitle
│   ├── TopicStats
│   └── TopicAccentLine
├── ArticleList
│   ├── ArticleCard1
│   │   ├── ArticleThumb1
│   │   ├── ArticleCardBody1
│   │   │   ├── ArticleTitle1
│   │   │   └── ArticleMeta1
│   │   └── ArticleAddButton1
│   ├── ArticleCard2 (same shape)
│   ├── ArticleCard3 (same shape)
│   ├── ArticleCard4 (same shape)
│   └── ArticleCard5 (same shape, partially obscured)
├── MiniPlayer [app-shell]
│   ├── MiniPlayerThumb
│   ├── MiniPlayerInfo
│   │   ├── MiniPlayerTitle
│   │   └── MiniPlayerProgressPercent
│   ├── MiniPlayerPlayPause
│   └── MiniPlayerProgressBar
│       ├── MiniPlayerProgressTrack
│       └── MiniPlayerProgressFill
└── BottomTabBar [app-shell]
    ├── TabHome
    │   ├── TabHomeIcon
    │   └── TabHomeLabel
    ├── TabDiscover
    │   ├── TabDiscoverIcon
    │   └── TabDiscoverLabel
    └── TabLibrary
        ├── TabLibraryIcon
        └── TabLibraryLabel
```

---

## App-Shell Notes

Per `nav-shell.md`:
- `BottomTabBar` → `Scope: app-shell` — renders in root layout on every route screen
- `MiniPlayer` → `Scope: app-shell` — renders in root layout when audio is loaded (visibility conditional)
- This screen (`DiscoverTopicScreen`) is a **route screen** (not exempt) — both app-shell elements are present
- `nav-shell.md` describes 2 tabs (Home + Library) but the approved frame and aesthetic-brief both show 3 tabs (Home + Discover + Library). Forge should use 3-tab layout per the approved screen.
