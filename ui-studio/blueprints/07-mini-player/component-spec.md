# Component Spec — 07 Mini Player (Home Daily Driver + Active Playback)

Screen: Home Daily Driver with CRISPR episode playing in mini player
Nav shell: `nav-shell.md` — `bottom-tabs` model, 2 persistent chrome elements on this route

---

## MiniPlayerScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** HeaderSection, PlayingBanner, UpNextSection, MiniPlayerBar, BottomTabBar
- **Tokens:** color-background-screen
- **Content:** none
- **Scope:** local

---

## BottomTabBar

- **Type:** app-shell
- **Parent:** MiniPlayerScreen
- **Children:** TabHome, TabLibrary
- **Tokens:** color-background-card, color-border-divider, spacing-tab-height
- **Content:** none
- **Scope:** app-shell

---

## TabHome

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** TabHomeIcon, TabHomeLabel
- **Tokens:** color-accent-primary, spacing-sm
- **Content:** none

---

## TabHomeIcon

- **Type:** icon
- **Parent:** TabHome
- **Children:** none
- **Tokens:** color-accent-primary
- **Content:** none
- **Asset:** icon-tab-home

---

## TabHomeLabel

- **Type:** text
- **Parent:** TabHome
- **Children:** none
- **Tokens:** color-accent-primary, font-size-micro, font-weight-medium
- **Content:** "Home"

---

## TabLibrary

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** TabLibraryIcon, TabLibraryLabel
- **Tokens:** color-text-tertiary, spacing-sm
- **Content:** none

---

## TabLibraryIcon

- **Type:** icon
- **Parent:** TabLibrary
- **Children:** none
- **Tokens:** color-text-tertiary
- **Content:** none
- **Asset:** icon-tab-library

---

## TabLibraryLabel

- **Type:** text
- **Parent:** TabLibrary
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-micro, font-weight-medium
- **Content:** "Library"

---

## MiniPlayerBar

- **Type:** app-shell
- **Parent:** MiniPlayerScreen
- **Children:** MiniPlayerThumbnail, MiniPlayerTextGroup, MiniPlayerPauseButton, MiniPlayerProgressBar
- **Tokens:** color-background-elevated, radius-mini-player, shadow-mini-player, spacing-sm, spacing-mini-player-height
- **Content:** none
- **Scope:** app-shell

---

## MiniPlayerThumbnail

- **Type:** image
- **Parent:** MiniPlayerBar
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-xs
- **Content:** none
- **Asset:** img-crispr-artwork

---

## MiniPlayerTextGroup

- **Type:** container
- **Parent:** MiniPlayerBar
- **Children:** MiniPlayerEpisodeTitle, MiniPlayerSource
- **Tokens:** spacing-xs
- **Content:** none

---

## MiniPlayerEpisodeTitle

- **Type:** text
- **Parent:** MiniPlayerTextGroup
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "The Future of CRISPR Gene..." (dynamic, truncated)

---

## MiniPlayerSource

- **Type:** text
- **Parent:** MiniPlayerTextGroup
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** "MIT Technology Review" (dynamic)

---

## MiniPlayerPauseButton

- **Type:** button
- **Parent:** MiniPlayerBar
- **Children:** none
- **Tokens:** color-text-primary
- **Content:** none
- **Asset:** icon-pause-circle

---

## MiniPlayerProgressBar

- **Type:** container
- **Parent:** MiniPlayerBar
- **Children:** none
- **Tokens:** color-accent-primary, color-background-elevated, radius-pill
- **Content:** none

---

## HeaderSection

- **Type:** container
- **Parent:** MiniPlayerScreen
- **Children:** GreetingGroup, AddButton
- **Tokens:** color-background-screen, spacing-screen-x, spacing-lg
- **Content:** none
- **Scope:** local

---

## GreetingGroup

- **Type:** container
- **Parent:** HeaderSection
- **Children:** GreetingText, EpisodesLeftText
- **Tokens:** spacing-xs
- **Content:** none

---

## GreetingText

- **Type:** text
- **Parent:** GreetingGroup
- **Children:** none
- **Tokens:** color-text-primary, font-size-display, font-weight-bold, line-height-tight
- **Content:** "Good evening, Chris"

---

## EpisodesLeftText

- **Type:** text
- **Parent:** GreetingGroup
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular
- **Content:** "2 episodes left"

---

## AddButton

- **Type:** button
- **Parent:** HeaderSection
- **Children:** AddButtonIcon
- **Tokens:** color-background-elevated, radius-button, spacing-sm
- **Content:** none

---

## AddButtonIcon

- **Type:** icon
- **Parent:** AddButton
- **Children:** none
- **Tokens:** color-text-secondary
- **Content:** none
- **Asset:** icon-plus

---

## PlayingBanner

- **Type:** button
- **Parent:** MiniPlayerScreen
- **Children:** PlayingBannerIcon, PlayingBannerText
- **Tokens:** color-accent-primary, radius-button, spacing-screen-x, spacing-md
- **Content:** none
- **Scope:** local

---

## PlayingBannerIcon

- **Type:** icon
- **Parent:** PlayingBanner
- **Children:** none
- **Tokens:** color-text-primary
- **Content:** none
- **Asset:** icon-pause

---

## PlayingBannerText

- **Type:** text
- **Parent:** PlayingBanner
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "Playing · 10 min left"

---

## UpNextSection

- **Type:** container
- **Parent:** MiniPlayerScreen
- **Children:** UpNextTitle, EpisodeCard1, EpisodeCard2
- **Tokens:** color-background-screen, spacing-screen-x, spacing-md
- **Content:** none
- **Scope:** local

---

## UpNextTitle

- **Type:** text
- **Parent:** UpNextSection
- **Children:** none
- **Tokens:** color-text-primary, font-size-h2, font-weight-semibold
- **Content:** "Up Next"

---

## EpisodeCard1

- **Type:** container
- **Parent:** UpNextSection
- **Children:** Card1Thumbnail, Card1Title, Card1Meta, Card1PlayButton
- **Tokens:** color-background-card, radius-card, spacing-card-padding, spacing-card-gap
- **Content:** none

---

## Card1Thumbnail

- **Type:** image
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** radius-thumbnail
- **Content:** none
- **Asset:** img-remote-work-thumb

---

## Card1Title

- **Type:** text
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "Why Remote Work Is Winning"

---

## Card1Meta

- **Type:** text
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-caption, font-weight-regular
- **Content:** "Harvard Business Review · 5 min"

---

## Card1PlayButton

- **Type:** button
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** color-text-secondary
- **Content:** none
- **Asset:** icon-play-circle

---

## EpisodeCard2

- **Type:** container
- **Parent:** UpNextSection
- **Children:** Card2Thumbnail, Card2Title, Card2Meta, Card2PlayButton
- **Tokens:** color-background-card, radius-card, spacing-card-padding, spacing-card-gap
- **Content:** none

---

## Card2Thumbnail

- **Type:** image
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** radius-thumbnail
- **Content:** none
- **Asset:** img-ai-2026-thumb

---

## Card2Title

- **Type:** text
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "The State of AI in 2026"

---

## Card2Meta

- **Type:** text
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-caption, font-weight-regular
- **Content:** "Ars Technica · 5 min"

---

## Card2PlayButton

- **Type:** button
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** color-text-secondary
- **Content:** none
- **Asset:** icon-play-circle
