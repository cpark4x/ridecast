# Component Spec — Library Screen (10-library)

> Extracted from approved screen: `ui-studio/frames/10-library.png`
> Containment coverage: 100% — 62 components across 3 hierarchy levels
> Nav shell reference: `ui-studio/storyboards/nav-shell.md`

---

## App-Shell Components (render in root layout, not inside this route)

---

## BottomTabBar

- **Type:** container
- **Parent:** RootLayout (app-shell — renders on all non-exempt screens)
- **Children:** TabHomeItem, TabLibraryItem
- **Tokens:** color-surface, border-top-divider, spacing-tab-bar-height
- **Content:** none (structural)
- **Scope:** app-shell

---

## TabHomeItem

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** TabHomeIcon, TabHomeLabel
- **Tokens:** spacing-sm, color-text-tertiary
- **Content:** none (structural)

---

## TabHomeIcon

- **Type:** icon
- **Parent:** TabHomeItem
- **Children:** none
- **Tokens:** color-text-tertiary, icon-size-md
- **Asset:** icon-tab-home
- **Content:** none

---

## TabHomeLabel

- **Type:** text
- **Parent:** TabHomeItem
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-text-tertiary
- **Content:** "Home"

---

## TabLibraryItem

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** TabLibraryIcon, TabLibraryLabel
- **Tokens:** spacing-sm, color-accent
- **Content:** none (structural — active state)

---

## TabLibraryIcon

- **Type:** icon
- **Parent:** TabLibraryItem
- **Children:** none
- **Tokens:** color-accent, icon-size-md
- **Asset:** icon-tab-library
- **Content:** none

---

## TabLibraryLabel

- **Type:** text
- **Parent:** TabLibraryItem
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-accent
- **Content:** "Library"

---

## MiniPlayerBar

- **Type:** container
- **Parent:** RootLayout (app-shell — renders when audio is loaded; absent on empty home state)
- **Children:** MiniPlayerContent, MiniPlayerProgress
- **Tokens:** color-surface-elevated, radius-mini-player, spacing-mini-player-height, shadow-mini-player
- **Content:** none (structural)
- **Scope:** app-shell

---

## MiniPlayerContent

- **Type:** container
- **Parent:** MiniPlayerBar
- **Children:** MiniPlayerThumbnail, MiniPlayerTitle, MiniPlayerPauseIcon, MiniPlayerProgressPct
- **Tokens:** spacing-md, spacing-sm
- **Content:** none (structural)

---

## MiniPlayerThumbnail

- **Type:** image
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-mini-player-thumb-size
- **Asset:** img-episode-crispr-thumb
- **Content:** [dynamic — current episode artwork]

---

## MiniPlayerTitle

- **Type:** text
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** font-size-body, font-weight-medium, color-text-primary
- **Content:** [dynamic — "The Future of CRISPR Gene Editing"]

---

## MiniPlayerPauseIcon

- **Type:** icon
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** color-accent, icon-size-md
- **Asset:** icon-pause
- **Content:** none

---

## MiniPlayerProgressPct

- **Type:** text
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-accent
- **Content:** [dynamic — "35%"]

---

## MiniPlayerProgress

- **Type:** container
- **Parent:** MiniPlayerBar
- **Children:** none
- **Tokens:** color-progress-track, color-accent, spacing-progress-bar-height
- **Content:** [dynamic — 35% fill]

---

## Screen-Local Components

---

## LibraryScreen

- **Type:** container
- **Parent:** RootLayout
- **Children:** HeaderSection, SearchSection, FilterTabsSection, EpisodeListSection
- **Tokens:** color-background-screen, spacing-screen-margin
- **Content:** none (structural)
- **Scope:** local

---

## HeaderSection

- **Type:** container
- **Parent:** LibraryScreen
- **Children:** LibraryTitle, FilterIcon, AddIcon
- **Tokens:** spacing-screen-margin, spacing-md, color-background-screen
- **Content:** none (structural)

---

## LibraryTitle

- **Type:** text
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** font-size-display, font-weight-bold, color-text-primary
- **Content:** "Library"

---

## FilterIcon

- **Type:** icon
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** color-text-secondary, icon-size-md
- **Asset:** icon-filter
- **Content:** none

---

## AddIcon

- **Type:** icon
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** color-text-secondary, icon-size-md
- **Asset:** icon-plus
- **Content:** none

---

## SearchSection

- **Type:** container
- **Parent:** LibraryScreen
- **Children:** SearchInput
- **Tokens:** spacing-screen-margin, spacing-sm, color-background-screen
- **Content:** none (structural)

---

## SearchInput

- **Type:** input
- **Parent:** SearchSection
- **Children:** SearchIcon, SearchPlaceholder
- **Tokens:** color-surface, radius-card, border-input, spacing-md, spacing-input-height
- **Content:** none (structural)

---

## SearchIcon

- **Type:** icon
- **Parent:** SearchInput
- **Children:** none
- **Tokens:** color-text-tertiary, icon-size-sm
- **Asset:** icon-search
- **Content:** none

---

## SearchPlaceholder

- **Type:** text
- **Parent:** SearchInput
- **Children:** none
- **Tokens:** font-size-body, font-weight-regular, color-text-tertiary
- **Content:** "Search my library..."

---

## FilterTabsSection

- **Type:** container
- **Parent:** LibraryScreen
- **Children:** FilterTabsContainer
- **Tokens:** spacing-screen-margin, spacing-sm, color-background-screen
- **Content:** none (structural)

---

## FilterTabsContainer

- **Type:** container
- **Parent:** FilterTabsSection
- **Children:** TabAll, TabUnplayed, TabInProgress
- **Tokens:** color-surface, radius-card, border-input, spacing-xs
- **Content:** none (structural — segmented control wrapper)

---

## TabAll

- **Type:** button
- **Parent:** FilterTabsContainer
- **Children:** none
- **Tokens:** color-surface-elevated, radius-card, font-size-body, font-weight-semibold, color-text-primary, spacing-sm
- **Content:** "All"

---

## TabUnplayed

- **Type:** button
- **Parent:** FilterTabsContainer
- **Children:** none
- **Tokens:** color-transparent, radius-card, font-size-body, font-weight-regular, color-text-secondary, spacing-sm
- **Content:** "Unplayed"

---

## TabInProgress

- **Type:** button
- **Parent:** FilterTabsContainer
- **Children:** none
- **Tokens:** color-transparent, radius-card, font-size-body, font-weight-regular, color-text-secondary, spacing-sm
- **Content:** "In Progress"

---

## EpisodeListSection

- **Type:** list
- **Parent:** LibraryScreen
- **Children:** EpisodeCard1, EpisodeDivider1, EpisodeCard2, EpisodeDivider2, EpisodeCard3, EpisodeDivider3, EpisodeCard4, EpisodeDivider4, EpisodeCard5
- **Tokens:** color-background-screen, spacing-screen-margin
- **Content:** [dynamic — scrollable list of episodes]

---

## EpisodeCard1

- **Type:** container
- **Parent:** EpisodeListSection
- **Children:** Card1Thumbnail, Card1Title, Card1Source, Card1NewBadge, Card1Duration, Card1StatusBadge, Card1MenuIcon
- **Tokens:** color-background-screen, spacing-md, spacing-card-height
- **Content:** none (structural)

---

## Card1Thumbnail

- **Type:** image
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumb-size
- **Asset:** img-episode-crispr-thumb
- **Content:** [dynamic — episode cover art]

---

## Card1Title

- **Type:** text
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** "The Future of CRISPR Gene Editing"

---

## Card1Source

- **Type:** text
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "MIT Technology Review"

---

## Card1NewBadge

- **Type:** text
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** font-size-caption, font-weight-medium, color-accent
- **Content:** "2 new ›"

---

## Card1Duration

- **Type:** text
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "• 5 min"

---

## Card1StatusBadge

- **Type:** text
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-status-played
- **Content:** "Played ✓"

---

## Card1MenuIcon

- **Type:** icon
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** color-accent, icon-size-sm
- **Asset:** icon-more-horizontal
- **Content:** none

---

## EpisodeDivider1

- **Type:** container
- **Parent:** EpisodeListSection
- **Children:** none
- **Tokens:** color-divider, border-divider-height
- **Content:** none (decorative separator)

---

## EpisodeCard2

- **Type:** container
- **Parent:** EpisodeListSection
- **Children:** Card2Thumbnail, Card2Title, Card2Source, Card2NewBadge, Card2ProgressBar, Card2ProgressPct, Card2MenuIcon
- **Tokens:** color-background-screen, spacing-md, spacing-card-height
- **Content:** none (structural)

---

## Card2Thumbnail

- **Type:** image
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumb-size
- **Asset:** img-episode-remotework-thumb
- **Content:** [dynamic — episode cover art]

---

## Card2Title

- **Type:** text
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** "Why Remote Work Is Winning"

---

## Card2Source

- **Type:** text
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "Harvard Business Review"

---

## Card2NewBadge

- **Type:** text
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** font-size-caption, font-weight-medium, color-accent
- **Content:** "1 new ›"

---

## Card2ProgressBar

- **Type:** container
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** color-progress-track, color-accent, spacing-progress-bar-height, radius-pill
- **Content:** [dynamic — 60% fill]

---

## Card2ProgressPct

- **Type:** text
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-text-secondary
- **Content:** "60%"

---

## Card2MenuIcon

- **Type:** icon
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** color-accent, icon-size-sm
- **Asset:** icon-more-horizontal
- **Content:** none

---

## EpisodeDivider2

- **Type:** container
- **Parent:** EpisodeListSection
- **Children:** none
- **Tokens:** color-divider, border-divider-height
- **Content:** none (decorative separator)

---

## EpisodeCard3

- **Type:** container
- **Parent:** EpisodeListSection
- **Children:** Card3Thumbnail, Card3Title, Card3SourceDuration, Card3NewBadge, Card3MenuIcon
- **Tokens:** color-background-screen, spacing-md, spacing-card-height
- **Content:** none (structural)

---

## Card3Thumbnail

- **Type:** image
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumb-size
- **Asset:** img-episode-ai2026-thumb
- **Content:** [dynamic — episode cover art]

---

## Card3Title

- **Type:** text
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** "The State of AI in 2026"

---

## Card3SourceDuration

- **Type:** text
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "Ars Technica • 5 min"

---

## Card3NewBadge

- **Type:** text
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** font-size-micro, font-weight-medium, color-accent, radius-pill, color-surface-elevated, spacing-badge-padding
- **Content:** "New"

---

## Card3MenuIcon

- **Type:** icon
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** color-accent, icon-size-sm
- **Asset:** icon-more-horizontal
- **Content:** none

---

## EpisodeDivider3

- **Type:** container
- **Parent:** EpisodeListSection
- **Children:** none
- **Tokens:** color-divider, border-divider-height
- **Content:** none (decorative separator)

---

## EpisodeCard4

- **Type:** container
- **Parent:** EpisodeListSection
- **Children:** Card4Thumbnail, Card4Title, Card4SourceNew, Card4StatusBadge, Card4MenuIcon
- **Tokens:** color-background-screen, spacing-md, spacing-card-height
- **Content:** none (structural)

---

## Card4Thumbnail

- **Type:** image
- **Parent:** EpisodeCard4
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumb-size
- **Asset:** img-episode-quantum-thumb
- **Content:** [dynamic — episode cover art]

---

## Card4Title

- **Type:** text
- **Parent:** EpisodeCard4
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** "Quantum Computing Explained"

---

## Card4SourceNew

- **Type:** text
- **Parent:** EpisodeCard4
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary, color-accent
- **Content:** "Nature • 1 new ›" (inline "1 new ›" in color-accent)

---

## Card4StatusBadge

- **Type:** text
- **Parent:** EpisodeCard4
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-status-played
- **Content:** "Played ✓"

---

## Card4MenuIcon

- **Type:** icon
- **Parent:** EpisodeCard4
- **Children:** none
- **Tokens:** color-accent, icon-size-sm
- **Asset:** icon-more-horizontal
- **Content:** none

---

## EpisodeDivider4

- **Type:** container
- **Parent:** EpisodeListSection
- **Children:** none
- **Tokens:** color-divider, border-divider-height
- **Content:** none (decorative separator)

---

## EpisodeCard5

- **Type:** container
- **Parent:** EpisodeListSection
- **Children:** Card5Thumbnail, Card5Title
- **Tokens:** color-background-screen, spacing-md, spacing-card-height
- **Content:** none (structural — partially visible, bottom of scroll)

---

## Card5Thumbnail

- **Type:** image
- **Parent:** EpisodeCard5
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumb-size
- **Asset:** img-episode-placeholder-thumb
- **Content:** [dynamic — episode cover art]

---

## Card5Title

- **Type:** text
- **Parent:** EpisodeCard5
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** [dynamic — partially visible episode title]
