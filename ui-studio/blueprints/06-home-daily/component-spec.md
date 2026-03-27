# Component Spec — 06 Home Daily Driver
# Screen: Ridecast / Home — Daily Driver (ready state, no mini player)
# Coverage: 35 components · 100% pixel coverage confirmed

---

## BottomTabBar

- **Type:** app-shell
- **Parent:** HomeScreen
- **Children:** HomeTab, DiscoverTab, LibraryTab
- **Tokens:** color-surface, size-tab-bar-height, color-border-divider
- **Content:** none (container)
- **Scope:** app-shell

---

## HomeTab

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** HomeTabIcon, HomeTabLabel
- **Tokens:** color-accent-primary (active state), spacing-xs
- **Content:** none (container)

---

## HomeTabIcon

- **Type:** icon
- **Parent:** HomeTab
- **Children:** none
- **Tokens:** color-accent-primary, size-icon-nav
- **Content:** none
- **Asset:** icon-home

---

## HomeTabLabel

- **Type:** text
- **Parent:** HomeTab
- **Children:** none
- **Tokens:** color-accent-primary, font-size-micro, font-weight-medium
- **Content:** "Home"

---

## DiscoverTab

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** DiscoverTabIcon, DiscoverTabLabel
- **Tokens:** color-text-tertiary, spacing-xs
- **Content:** none (container)

---

## DiscoverTabIcon

- **Type:** icon
- **Parent:** DiscoverTab
- **Children:** none
- **Tokens:** color-text-tertiary, size-icon-nav
- **Content:** none
- **Asset:** icon-discover

---

## DiscoverTabLabel

- **Type:** text
- **Parent:** DiscoverTab
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-micro, font-weight-regular
- **Content:** "Discover"

---

## LibraryTab

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** LibraryTabIcon, LibraryTabLabel
- **Tokens:** color-text-tertiary, spacing-xs
- **Content:** none (container)

---

## LibraryTabIcon

- **Type:** icon
- **Parent:** LibraryTab
- **Children:** none
- **Tokens:** color-text-tertiary, size-icon-nav
- **Content:** none
- **Asset:** icon-library

---

## LibraryTabLabel

- **Type:** text
- **Parent:** LibraryTab
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-micro, font-weight-regular
- **Content:** "Library"

---

## HomeScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** HeaderSection, PlayAllButton, UpNextSection, BottomTabBar
- **Tokens:** color-background-screen, spacing-screen-margin
- **Content:** none (root container)
- **Scope:** local

---

## ScreenBackground

- **Type:** background
- **Parent:** HomeScreen
- **Children:** none
- **Tokens:** color-background-screen
- **Content:** none
- **Asset:** none

---

## HeaderSection

- **Type:** container
- **Parent:** HomeScreen
- **Children:** GreetingText, SubtitleText, AddButton
- **Tokens:** spacing-screen-margin, spacing-lg
- **Content:** none (container)

---

## GreetingText

- **Type:** text
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** color-text-primary, font-size-display, font-weight-bold
- **Content:** "Good evening, Chris"

---

## SubtitleText

- **Type:** text
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** "3 episodes ready"

---

## AddButton

- **Type:** button
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** color-text-secondary, size-icon-sm, spacing-xs
- **Content:** none
- **Asset:** icon-plus

---

## PlayAllButton

- **Type:** button
- **Parent:** HomeScreen
- **Children:** PlayAllIcon, PlayAllLabel
- **Tokens:** color-accent-primary, radius-card, size-button-height, spacing-md
- **Content:** none (container)

---

## PlayAllIcon

- **Type:** icon
- **Parent:** PlayAllButton
- **Children:** none
- **Tokens:** color-text-primary, size-icon-sm
- **Content:** none
- **Asset:** icon-play

---

## PlayAllLabel

- **Type:** text
- **Parent:** PlayAllButton
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "Play All · 15 min"

---

## UpNextSection

- **Type:** container
- **Parent:** HomeScreen
- **Children:** UpNextLabel, EpisodeCard1, EpisodeCard2, EpisodeCard3
- **Tokens:** spacing-screen-margin, spacing-section-gap, spacing-card-gap
- **Content:** none (container)

---

## UpNextLabel

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
- **Tokens:** color-surface, radius-card, spacing-card-padding, size-card-height, color-content-tech
- **Content:** none (container; left border color = color-content-tech #2563EB)

---

## Card1Thumbnail

- **Type:** image
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** radius-thumbnail, size-thumbnail
- **Content:** [dynamic — episode artwork]
- **Asset:** thumb-crispr

---

## Card1Title

- **Type:** text
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "The Future of CRISPR Gene Editing"

---

## Card1Meta

- **Type:** text
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** "MIT Technology Review · 5 min"

---

## Card1PlayButton

- **Type:** button
- **Parent:** EpisodeCard1
- **Children:** none
- **Tokens:** color-surface-elevated, radius-full, size-play-button
- **Content:** none
- **Asset:** icon-play

---

## EpisodeCard2

- **Type:** container
- **Parent:** UpNextSection
- **Children:** Card2Thumbnail, Card2Title, Card2Meta, Card2PlayButton
- **Tokens:** color-surface, radius-card, spacing-card-padding, size-card-height, color-content-business
- **Content:** none (container; left border color = color-content-business #EA580C)

---

## Card2Thumbnail

- **Type:** image
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** radius-thumbnail, size-thumbnail
- **Content:** [dynamic — episode artwork]
- **Asset:** thumb-remote-work

---

## Card2Title

- **Type:** text
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "Why Remote Work Is Winning"

---

## Card2Meta

- **Type:** text
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** "Harvard Business Review · 5 min"

---

## Card2PlayButton

- **Type:** button
- **Parent:** EpisodeCard2
- **Children:** none
- **Tokens:** color-surface-elevated, radius-full, size-play-button
- **Content:** none
- **Asset:** icon-play

---

## EpisodeCard3

- **Type:** container
- **Parent:** UpNextSection
- **Children:** Card3Thumbnail, Card3Title, Card3Meta, Card3PlayButton
- **Tokens:** color-surface, radius-card, spacing-card-padding, size-card-height, color-content-tech
- **Content:** none (container; left border color = color-content-tech #2563EB)

---

## Card3Thumbnail

- **Type:** image
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** radius-thumbnail, size-thumbnail
- **Content:** [dynamic — episode artwork]
- **Asset:** thumb-ai

---

## Card3Title

- **Type:** text
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "The State of AI in 2026"

---

## Card3Meta

- **Type:** text
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** "Ars Technica · 5 min"

---

## Card3PlayButton

- **Type:** button
- **Parent:** EpisodeCard3
- **Children:** none
- **Tokens:** color-surface-elevated, radius-full, size-play-button
- **Content:** none
- **Asset:** icon-play

---

# Component Hierarchy Tree

```
HomeScreen (local)
├── ScreenBackground
├── HeaderSection
│   ├── GreetingText
│   ├── SubtitleText
│   └── AddButton
├── PlayAllButton
│   ├── PlayAllIcon
│   └── PlayAllLabel
├── UpNextSection
│   ├── UpNextLabel
│   ├── EpisodeCard1
│   │   ├── Card1Thumbnail
│   │   ├── Card1Title
│   │   ├── Card1Meta
│   │   └── Card1PlayButton
│   ├── EpisodeCard2
│   │   ├── Card2Thumbnail
│   │   ├── Card2Title
│   │   ├── Card2Meta
│   │   └── Card2PlayButton
│   └── EpisodeCard3
│       ├── Card3Thumbnail
│       ├── Card3Title
│       ├── Card3Meta
│       └── Card3PlayButton
└── BottomTabBar [app-shell]
    ├── HomeTab (active)
    │   ├── HomeTabIcon
    │   └── HomeTabLabel
    ├── DiscoverTab
    │   ├── DiscoverTabIcon
    │   └── DiscoverTabLabel
    └── LibraryTab
        ├── LibraryTabIcon
        └── LibraryTabLabel
```

# Notes

- **Nav-shell:** `BottomTabBar` matches the persistent bottom-tabs chrome defined in `ui-studio/storyboards/nav-shell.md`. It renders in the root layout on all Route Screens. Marked `Type: app-shell`.
- **Mini player:** Not present in this screen state ("ready state" — no episode has been queued for playback yet). Mini player appears in the playing state only and is defined in nav-shell.md.
- **Episode card border accent:** Each card has a thin left-edge border in the content-type color (tech = #2563EB, business = #EA580C). This is a visual indicator, not a full card border.
- **Discover tab:** 3 tabs visible in screen (Home, Discover, Library). Nav-shell.md currently defines 2 tabs — Discover tab should be added to the nav shell definition.
- **Content is dynamic:** EpisodeCard thumbnails, titles, and metadata are populated from API; placeholder assets represent the design intent.
