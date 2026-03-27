# Component Spec — 02 Home Empty State

> Extracted from: `ui-studio/frames/02-home-empty.png`
> Design system: `ui-studio/moodboard/aesthetic-brief.md`
> Nav shell: `ui-studio/storyboards/nav-shell.md`
> Coverage: 22 components, 100% pixel coverage confirmed
> Overlay: `containment-overlay.png`

---

## app-shell Components (from nav-shell.md — render in root layout)

---

## BottomTabBar

- **Type:** app-shell
- **Parent:** RootLayout
- **Children:** TabBarTopBorder, HomeTab, LibraryTab
- **Tokens:** color-background-surface, spacing-tabbar-height, color-border-divider
- **Content:** none
- **Scope:** app-shell

---

## TabBarTopBorder

- **Type:** background
- **Parent:** BottomTabBar
- **Children:** none
- **Tokens:** color-border-divider
- **Content:** none

---

## HomeTab

- **Type:** button
- **Parent:** BottomTabBar
- **Children:** HomeTabIcon, HomeTabLabel
- **Tokens:** color-accent-primary (active state), spacing-xs, spacing-sm
- **Content:** none

---

## HomeTabIcon

- **Type:** icon
- **Parent:** HomeTab
- **Children:** none
- **Tokens:** color-accent-primary
- **Content:** none
- **Asset:** tab-home-filled

---

## HomeTabLabel

- **Type:** text
- **Parent:** HomeTab
- **Children:** none
- **Tokens:** color-accent-primary, font-size-tab-label, font-weight-medium
- **Content:** "Home"

---

## LibraryTab

- **Type:** button
- **Parent:** BottomTabBar
- **Children:** LibraryTabIcon, LibraryTabLabel
- **Tokens:** color-text-inactive (inactive state), spacing-xs, spacing-sm
- **Content:** none

---

## LibraryTabIcon

- **Type:** icon
- **Parent:** LibraryTab
- **Children:** none
- **Tokens:** color-text-inactive
- **Content:** none
- **Asset:** tab-library-outline

---

## LibraryTabLabel

- **Type:** text
- **Parent:** LibraryTab
- **Children:** none
- **Tokens:** color-text-inactive, font-size-tab-label, font-weight-medium
- **Content:** "Library"

---

## Screen Content Components (local to this screen)

---

## HomeEmptyScreen

- **Type:** container
- **Parent:** RootLayout
- **Children:** ScreenBackground, HeaderSection, EmptyStateSection
- **Tokens:** color-background-screen
- **Content:** none
- **Scope:** local

---

## ScreenBackground

- **Type:** background
- **Parent:** HomeEmptyScreen
- **Children:** none
- **Tokens:** color-background-screen, glow-hero
- **Content:** none
- **Asset:** none (CSS: solid `#0F0F1A` background + the AtmosphericGlow radial gradient is an overlay layer)

---

## HeaderSection

- **Type:** container
- **Parent:** HomeEmptyScreen
- **Children:** GreetingGroup
- **Tokens:** color-background-screen, spacing-screen-margin, spacing-md
- **Content:** none

---

## GreetingGroup

- **Type:** container
- **Parent:** HeaderSection
- **Children:** GreetingTitle, GreetingSubtitle
- **Tokens:** spacing-greeting-gap
- **Content:** none

---

## GreetingTitle

- **Type:** text
- **Parent:** GreetingGroup
- **Children:** none
- **Tokens:** color-text-primary, font-size-display, font-weight-bold, line-height-tight
- **Content:** "Good morning"

---

## GreetingSubtitle

- **Type:** text
- **Parent:** GreetingGroup
- **Children:** none
- **Tokens:** color-text-secondary, font-size-subtitle, font-weight-regular, line-height-normal
- **Content:** "Ready to listen?"

---

## EmptyStateSection

- **Type:** container
- **Parent:** HomeEmptyScreen
- **Children:** IllustrationContainer, EmptyStateCopyGroup, CreateEpisodeButton
- **Tokens:** spacing-screen-margin, spacing-illustration-to-copy, spacing-copy-to-button
- **Content:** none

---

## IllustrationContainer

- **Type:** container
- **Parent:** EmptyStateSection
- **Children:** AtmosphericGlow, HeadphoneIllustration
- **Tokens:** spacing-header-to-illustration
- **Content:** none

---

## AtmosphericGlow

- **Type:** background
- **Parent:** IllustrationContainer
- **Children:** none
- **Tokens:** glow-hero, color-glow-orange
- **Content:** none
- **Asset:** none (CSS: `radial-gradient(circle at center, rgba(255,107,53,0.45) 0%, rgba(15,15,26,0) 70%)`, ~300px diameter)

---

## HeadphoneIllustration

- **Type:** image
- **Parent:** IllustrationContainer
- **Children:** none
- **Tokens:** none
- **Content:** none
- **Asset:** headphone-empty-state

---

## EmptyStateCopyGroup

- **Type:** container
- **Parent:** EmptyStateSection
- **Children:** EmptyStateTitle, EmptyStateBody
- **Tokens:** spacing-screen-margin, spacing-copy-title-body-gap
- **Content:** none

---

## EmptyStateTitle

- **Type:** text
- **Parent:** EmptyStateCopyGroup
- **Children:** none
- **Tokens:** color-text-primary, font-size-h1, font-weight-semibold, line-height-tight
- **Content:** "Create Your First Episode"

---

## EmptyStateBody

- **Type:** text
- **Parent:** EmptyStateCopyGroup
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular, line-height-normal
- **Content:** "Paste a URL or drop a file to turn any article, paper, or book into a podcast episode"

---

## CreateEpisodeButton

- **Type:** button
- **Parent:** EmptyStateSection
- **Children:** CreateEpisodeLabel
- **Tokens:** color-accent-primary, radius-button-cta, spacing-button-height, spacing-screen-margin
- **Content:** none

---

## CreateEpisodeLabel

- **Type:** text
- **Parent:** CreateEpisodeButton
- **Children:** none
- **Tokens:** color-text-primary, font-size-button, font-weight-semibold
- **Content:** "Create Episode"

---

## Component Hierarchy (tree view)

```
RootLayout
├── BottomTabBar                  [app-shell]
│   ├── TabBarTopBorder
│   ├── HomeTab
│   │   ├── HomeTabIcon
│   │   └── HomeTabLabel
│   └── LibraryTab
│       ├── LibraryTabIcon
│       └── LibraryTabLabel
└── HomeEmptyScreen               [local]
    ├── ScreenBackground
    ├── HeaderSection
    │   └── GreetingGroup
    │       ├── GreetingTitle
    │       └── GreetingSubtitle
    └── EmptyStateSection
        ├── IllustrationContainer
        │   ├── AtmosphericGlow
        │   └── HeadphoneIllustration
        ├── EmptyStateCopyGroup
        │   ├── EmptyStateTitle
        │   └── EmptyStateBody
        └── CreateEpisodeButton
            └── CreateEpisodeLabel
```
