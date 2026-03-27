# Component Spec — 10b Source Detail

> Containment overlay: 100% coverage confirmed (36 components, 2 iterations)
> Nav-shell reference: ui-studio/storyboards/nav-shell.md
> Screen: Source Detail View — "MIT Technology Review" — 5 episodes, mini player active

---

## App-Shell Components (root layout — not inside this route)

---

## TabBar

- **Type:** app-shell
- **Parent:** RootLayout
- **Children:** HomeTab, LibraryTab
- **Tokens:** color-surface-card, spacing-tab-bar-height, color-border-divider
- **Content:** none (structural)
- **Scope:** app-shell

---

## HomeTab

- **Type:** container
- **Parent:** TabBar
- **Children:** HomeTabIcon, HomeTabLabel
- **Tokens:** color-text-tertiary
- **Content:** none (structural)

---

## HomeTabIcon

- **Type:** icon
- **Parent:** HomeTab
- **Children:** none
- **Tokens:** color-text-tertiary
- **Asset:** icon-home
- **Content:** none

---

## HomeTabLabel

- **Type:** text
- **Parent:** HomeTab
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-tab-label, font-weight-medium
- **Content:** "Home"

---

## LibraryTab

- **Type:** container
- **Parent:** TabBar
- **Children:** LibraryTabIcon, LibraryTabLabel
- **Tokens:** color-accent
- **Content:** none (structural — active state)

---

## LibraryTabIcon

- **Type:** icon
- **Parent:** LibraryTab
- **Children:** none
- **Tokens:** color-accent
- **Asset:** icon-library
- **Content:** none

---

## LibraryTabLabel

- **Type:** text
- **Parent:** LibraryTab
- **Children:** none
- **Tokens:** color-accent, font-size-tab-label, font-weight-medium
- **Content:** "Library"

---

## MiniPlayer

- **Type:** app-shell
- **Parent:** RootLayout
- **Children:** MiniPlayerContent, MiniPlayerControls, MiniPlayerProgressBar
- **Tokens:** color-surface-elevated, radius-mini-player, spacing-mini-player-height
- **Content:** none (structural)
- **Scope:** app-shell

---

## MiniPlayerContent

- **Type:** container
- **Parent:** MiniPlayer
- **Children:** MiniPlayerThumbnail, MiniPlayerTitle, MiniPlayerProgressText
- **Tokens:** spacing-sm
- **Content:** none (structural)

---

## MiniPlayerThumbnail

- **Type:** image
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** radius-thumbnail
- **Asset:** img-dna-thumbnail
- **Content:** [dynamic]

---

## MiniPlayerTitle

- **Type:** text
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-medium
- **Content:** [dynamic — e.g. "The Future of CRISPR Gene Editing"]

---

## MiniPlayerProgressText

- **Type:** text
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** [dynamic — e.g. "35%"]

---

## MiniPlayerControls

- **Type:** container
- **Parent:** MiniPlayer
- **Children:** MiniPlayerPauseButton
- **Tokens:** spacing-sm
- **Content:** none (structural)

---

## MiniPlayerPauseButton

- **Type:** button
- **Parent:** MiniPlayerControls
- **Children:** none
- **Tokens:** color-accent
- **Asset:** icon-pause
- **Content:** none

---

## MiniPlayerProgressBar

- **Type:** container
- **Parent:** MiniPlayer
- **Children:** none
- **Tokens:** color-accent, spacing-progress-track-height
- **Content:** none (progress fill — width [dynamic] %)

---

## Screen-Level Components (route content)

---

## SourceDetailScreen

- **Type:** container
- **Parent:** RootLayout (content slot)
- **Children:** NavBar, SourceHeader, EpisodeList
- **Tokens:** color-background-screen
- **Content:** none (structural root)
- **Scope:** local

---

## NavBar

- **Type:** container
- **Parent:** SourceDetailScreen
- **Children:** BackButton, NavTitle, NavActionButton
- **Tokens:** color-background-screen, spacing-screen-horizontal, spacing-navbar-vertical
- **Content:** none (structural)

---

## BackButton

- **Type:** button
- **Parent:** NavBar
- **Children:** BackChevron, BackLabel
- **Tokens:** color-text-primary, spacing-xs
- **Content:** none (structural)

---

## BackChevron

- **Type:** icon
- **Parent:** BackButton
- **Children:** none
- **Tokens:** color-text-primary
- **Asset:** icon-chevron-left
- **Content:** none

---

## BackLabel

- **Type:** text
- **Parent:** BackButton
- **Children:** none
- **Tokens:** color-text-primary, font-size-body-lg, font-weight-regular
- **Content:** "Library"

---

## NavTitle

- **Type:** text
- **Parent:** NavBar
- **Children:** none
- **Tokens:** color-text-primary, font-size-body-lg, font-weight-semibold
- **Content:** [dynamic — screen/source title, may be empty]

---

## NavActionButton

- **Type:** button
- **Parent:** NavBar
- **Children:** none
- **Tokens:** color-surface-elevated, radius-full, color-text-secondary
- **Asset:** icon-ellipsis-circle
- **Content:** none

---

## SourceHeader

- **Type:** container
- **Parent:** SourceDetailScreen
- **Children:** SourceLogoImage, SourceInfoGroup, PlayUnplayedButton
- **Tokens:** color-background-screen, spacing-screen-horizontal, spacing-lg
- **Content:** none (structural)

---

## SourceLogoImage

- **Type:** image
- **Parent:** SourceHeader
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-source-logo-size
- **Asset:** img-mit-logo
- **Content:** [dynamic — source favicon/logo]

---

## SourceInfoGroup

- **Type:** container
- **Parent:** SourceHeader
- **Children:** SourceTitle, SourceMeta
- **Tokens:** spacing-xs
- **Content:** none (structural)

---

## SourceTitle

- **Type:** text
- **Parent:** SourceInfoGroup
- **Children:** none
- **Tokens:** color-text-primary, font-size-h1, font-weight-semibold
- **Content:** [dynamic — e.g. "MIT Technology Review"]

---

## SourceMeta

- **Type:** text
- **Parent:** SourceInfoGroup
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** [dynamic — e.g. "5 episodes · 3 unplayed"]

---

## PlayUnplayedButton

- **Type:** button
- **Parent:** SourceHeader
- **Children:** PlayButtonIcon, PlayButtonLabel
- **Tokens:** color-accent, radius-button, spacing-button-height, spacing-screen-horizontal
- **Content:** none (structural CTA)

---

## PlayButtonIcon

- **Type:** icon
- **Parent:** PlayUnplayedButton
- **Children:** none
- **Tokens:** color-text-primary
- **Asset:** icon-play
- **Content:** none

---

## PlayButtonLabel

- **Type:** text
- **Parent:** PlayUnplayedButton
- **Children:** none
- **Tokens:** color-text-primary, font-size-body-lg, font-weight-semibold
- **Content:** [dynamic — e.g. "Play Unplayed · 8 min"]

---

## EpisodeList

- **Type:** list
- **Parent:** SourceDetailScreen
- **Children:** EpisodeCard1, Divider1, EpisodeCard2, Divider2, EpisodeCard3, Divider3, EpisodeCard4, Divider4, EpisodeCard5
- **Tokens:** color-background-screen
- **Content:** none (structural)

---

## EpisodeCard1

- **Type:** container
- **Parent:** EpisodeList
- **Children:** Ep1Thumbnail, Ep1TextColumn, Ep1MoreButton
- **Tokens:** color-background-screen, spacing-episode-card-height, spacing-screen-horizontal, spacing-md
- **Content:** none (structural — episode: "The Future of CRISPR Gene Editing", state: Played)

---

## Ep1Thumbnail

- **Type:** image
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumbnail-size
- **Asset:** img-dna-thumbnail
- **Content:** [dynamic]

---

## Ep1TextColumn

- **Type:** container
- **Parent:** EpisodeCard1
- **Children:** Ep1Title, Ep1Meta, Ep1Status
- **Tokens:** spacing-xs
- **Content:** none (structural)

---

## Ep1Title

- **Type:** text
- **Parent:** Ep1TextColumn
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** [dynamic — "The Future of CRISPR Gene Editing"]

---

## Ep1Meta

- **Type:** text
- **Parent:** Ep1TextColumn
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** [dynamic — "5 min · Standard"]

---

## Ep1Status

- **Type:** container
- **Parent:** Ep1TextColumn
- **Children:** none
- **Tokens:** color-status-played, font-size-micro, font-weight-regular
- **Asset:** icon-check
- **Content:** "Played ✓"

---

## Ep1MoreButton

- **Type:** button
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** color-text-secondary
- **Asset:** icon-ellipsis
- **Content:** none

---

## Divider1

- **Type:** container
- **Parent:** EpisodeList
- **Children:** none
- **Tokens:** color-border-divider, spacing-divider-height
- **Content:** none (decorative separator)

---

## EpisodeCard2

- **Type:** container
- **Parent:** EpisodeList
- **Children:** Ep2Thumbnail, Ep2TextColumn, Ep2MoreButton
- **Tokens:** color-background-screen, spacing-episode-card-height, spacing-screen-horizontal, spacing-md
- **Content:** none (structural — episode: "mRNA Vaccines: What Comes Next", state: in-progress)

---

## Ep2Thumbnail

- **Type:** image
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumbnail-size
- **Asset:** img-dna-thumbnail
- **Content:** [dynamic]

---

## Ep2TextColumn

- **Type:** container
- **Parent:** EpisodeCard2
- **Children:** Ep2Title, Ep2Meta, Ep2ProgressBar
- **Tokens:** spacing-xs
- **Content:** none (structural)

---

## Ep2Title

- **Type:** text
- **Parent:** Ep2TextColumn
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** [dynamic — "mRNA Vaccines: What Comes Next"]

---

## Ep2Meta

- **Type:** text
- **Parent:** Ep2TextColumn
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** [dynamic — "5 min · Standard"]

---

## Ep2ProgressBar

- **Type:** container
- **Parent:** Ep2TextColumn
- **Children:** none
- **Tokens:** color-accent, color-surface-elevated, spacing-progress-track-height, radius-sm
- **Content:** none (progress fill — width [dynamic] %)

---

## Ep2MoreButton

- **Type:** button
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** color-text-secondary
- **Asset:** icon-ellipsis
- **Content:** none

---

## Divider2

- **Type:** container
- **Parent:** EpisodeList
- **Children:** none
- **Tokens:** color-border-divider, spacing-divider-height
- **Content:** none (decorative separator)

---

## EpisodeCard3

- **Type:** container
- **Parent:** EpisodeList
- **Children:** Ep3Thumbnail, Ep3TextColumn, Ep3MoreButton
- **Tokens:** color-background-screen, spacing-episode-card-height, spacing-screen-horizontal, spacing-md
- **Content:** none (structural — episode: "Mapping the Human Brain", state: New)

---

## Ep3Thumbnail

- **Type:** image
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumbnail-size
- **Asset:** img-brain-thumbnail
- **Content:** [dynamic]

---

## Ep3TextColumn

- **Type:** container
- **Parent:** EpisodeCard3
- **Children:** Ep3Title, Ep3Meta, Ep3StatusBadge
- **Tokens:** spacing-xs
- **Content:** none (structural)

---

## Ep3Title

- **Type:** text
- **Parent:** Ep3TextColumn
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** [dynamic — "Mapping the Human Brain"]

---

## Ep3Meta

- **Type:** text
- **Parent:** Ep3TextColumn
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** [dynamic — "5 min · Standard"]

---

## Ep3StatusBadge

- **Type:** container
- **Parent:** Ep3TextColumn
- **Children:** none
- **Tokens:** color-accent, radius-pill, font-size-micro, font-weight-regular, color-text-primary
- **Content:** "New"

---

## Ep3MoreButton

- **Type:** button
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** color-text-secondary
- **Asset:** icon-ellipsis
- **Content:** none

---

## Divider3

- **Type:** container
- **Parent:** EpisodeList
- **Children:** none
- **Tokens:** color-border-divider, spacing-divider-height
- **Content:** none (decorative separator)

---

## EpisodeCard4

- **Type:** container
- **Parent:** EpisodeList
- **Children:** Ep4Thumbnail, Ep4TextColumn, Ep4MoreButton
- **Tokens:** color-background-screen, spacing-episode-card-height, spacing-screen-horizontal, spacing-md
- **Content:** none (structural — episode: "Carbon Capture at Scale", state: New)

---

## Ep4Thumbnail

- **Type:** image
- **Parent:** EpisodeCard4
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumbnail-size
- **Asset:** img-landscape-thumbnail
- **Content:** [dynamic]

---

## Ep4TextColumn

- **Type:** container
- **Parent:** EpisodeCard4
- **Children:** Ep4Title, Ep4Meta, Ep4StatusBadge
- **Tokens:** spacing-xs
- **Content:** none (structural)

---

## Ep4Title

- **Type:** text
- **Parent:** Ep4TextColumn
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** [dynamic — "Carbon Capture at Scale"]

---

## Ep4Meta

- **Type:** text
- **Parent:** Ep4TextColumn
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** [dynamic — "3 min · Summary"]

---

## Ep4StatusBadge

- **Type:** container
- **Parent:** Ep4TextColumn
- **Children:** none
- **Tokens:** color-accent, radius-pill, font-size-micro, font-weight-regular, color-text-primary
- **Content:** "New"

---

## Ep4MoreButton

- **Type:** button
- **Parent:** EpisodeCard4
- **Children:** none
- **Tokens:** color-text-secondary
- **Asset:** icon-ellipsis
- **Content:** none

---

## Divider4

- **Type:** container
- **Parent:** EpisodeList
- **Children:** none
- **Tokens:** color-border-divider, spacing-divider-height
- **Content:** none (decorative separator)

---

## EpisodeCard5

- **Type:** container
- **Parent:** EpisodeList
- **Children:** Ep5Thumbnail, Ep5TextColumn, Ep5MoreButton
- **Tokens:** color-background-screen, spacing-episode-card-height, spacing-screen-horizontal, spacing-md
- **Content:** none (structural — episode: "The Rise of Humanoid Robots", state: Played)

---

## Ep5Thumbnail

- **Type:** image
- **Parent:** EpisodeCard5
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-thumbnail-size
- **Asset:** img-robot-thumbnail
- **Content:** [dynamic]

---

## Ep5TextColumn

- **Type:** container
- **Parent:** EpisodeCard5
- **Children:** Ep5Title, Ep5Meta, Ep5Status
- **Tokens:** spacing-xs
- **Content:** none (structural)

---

## Ep5Title

- **Type:** text
- **Parent:** Ep5TextColumn
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** [dynamic — "The Rise of Humanoid Robots"]

---

## Ep5Meta

- **Type:** text
- **Parent:** Ep5TextColumn
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** [dynamic — "5 min · Standard"]

---

## Ep5Status

- **Type:** container
- **Parent:** Ep5TextColumn
- **Children:** none
- **Tokens:** color-status-played, font-size-micro, font-weight-regular
- **Asset:** icon-check
- **Content:** "Played ✓"

---

## Ep5MoreButton

- **Type:** button
- **Parent:** EpisodeCard5
- **Children:** none
- **Tokens:** color-text-secondary
- **Asset:** icon-ellipsis
- **Content:** none

---

## Component Tree Summary

```
RootLayout
├── TabBar [app-shell]
│   ├── HomeTab
│   │   ├── HomeTabIcon
│   │   └── HomeTabLabel
│   └── LibraryTab [active]
│       ├── LibraryTabIcon
│       └── LibraryTabLabel
├── MiniPlayer [app-shell]
│   ├── MiniPlayerContent
│   │   ├── MiniPlayerThumbnail
│   │   ├── MiniPlayerTitle
│   │   └── MiniPlayerProgressText
│   ├── MiniPlayerControls
│   │   └── MiniPlayerPauseButton
│   └── MiniPlayerProgressBar
└── SourceDetailScreen [local]
    ├── NavBar
    │   ├── BackButton
    │   │   ├── BackChevron
    │   │   └── BackLabel
    │   ├── NavTitle
    │   └── NavActionButton
    ├── SourceHeader
    │   ├── SourceLogoImage
    │   ├── SourceInfoGroup
    │   │   ├── SourceTitle
    │   │   └── SourceMeta
    │   └── PlayUnplayedButton
    │       ├── PlayButtonIcon
    │       └── PlayButtonLabel
    └── EpisodeList
        ├── EpisodeCard1
        │   ├── Ep1Thumbnail
        │   ├── Ep1TextColumn
        │   │   ├── Ep1Title
        │   │   ├── Ep1Meta
        │   │   └── Ep1Status
        │   └── Ep1MoreButton
        ├── Divider1
        ├── EpisodeCard2
        │   ├── Ep2Thumbnail
        │   ├── Ep2TextColumn
        │   │   ├── Ep2Title
        │   │   ├── Ep2Meta
        │   │   └── Ep2ProgressBar
        │   └── Ep2MoreButton
        ├── Divider2
        ├── EpisodeCard3
        │   ├── Ep3Thumbnail
        │   ├── Ep3TextColumn
        │   │   ├── Ep3Title
        │   │   ├── Ep3Meta
        │   │   └── Ep3StatusBadge
        │   └── Ep3MoreButton
        ├── Divider3
        ├── EpisodeCard4
        │   ├── Ep4Thumbnail
        │   ├── Ep4TextColumn
        │   │   ├── Ep4Title
        │   │   ├── Ep4Meta
        │   │   └── Ep4StatusBadge
        │   └── Ep4MoreButton
        ├── Divider4
        └── EpisodeCard5
            ├── Ep5Thumbnail
            ├── Ep5TextColumn
            │   ├── Ep5Title
            │   ├── Ep5Meta
            │   └── Ep5Status
            └── Ep5MoreButton
```
