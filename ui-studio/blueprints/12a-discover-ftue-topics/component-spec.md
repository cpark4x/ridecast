# Component Spec — 12a Discover FTUE Topics

Screen: `DiscoverFTUETopicsScreen`
Flow: Onboarding FTUE — Topic Picker
Nav shell: **exempt** — fullscreen, no tab bar, no mini player
Scope note: All components are `local` unless noted

---

## DiscoverFTUETopicsScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** HeaderSection, ContentLayout, BottomActions
- **Tokens:** color-background-screen
- **Content:** n/a
- **Scope:** local

---

## HeaderSection

- **Type:** container
- **Parent:** DiscoverFTUETopicsScreen
- **Children:** ScreenTitle, ScreenSubtitle
- **Tokens:** spacing-screen-margin-horizontal, spacing-padding-above-title, spacing-gap-title-subtitle
- **Content:** n/a

---

## ScreenTitle

- **Type:** text
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** color-text-primary, font-size-display, font-weight-bold, line-height-display
- **Content:** "What are you into?"

---

## ScreenSubtitle

- **Type:** text
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body-lg, font-weight-regular, line-height-body
- **Content:** "Pick at least 3 topics to personalize your feed."

---

## ContentLayout

- **Type:** container
- **Parent:** DiscoverFTUETopicsScreen
- **Children:** TopicGrid
- **Tokens:** spacing-screen-margin-horizontal, spacing-gap-subtitle-to-grid
- **Content:** n/a

---

## TopicGrid

- **Type:** container
- **Parent:** ContentLayout
- **Children:** TopicChip_Science, TopicChip_AITech, TopicChip_Business, TopicChip_Finance, TopicChip_Psychology, TopicChip_Health, TopicChip_Design, TopicChip_Climate, TopicChip_Space, TopicChip_Politics, TopicChip_History, TopicChip_Culture, TopicChip_Sports, TopicChip_Cooking, TopicChip_Parenting, TopicChip_Philosophy, TopicChip_Law, TopicChip_RealEstate
- **Tokens:** spacing-grid-row-gap, spacing-grid-col-gap
- **Content:** 3-column CSS grid, 6 rows × 3 columns = 18 chips

---

## TopicChip_Science

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-selected-bg, color-chip-selected-text, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🧬 Science"
- **State:** selected (orange fill)

---

## TopicChip_AITech

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-selected-bg, color-chip-selected-text, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🤖 AI & Tech"
- **State:** selected (orange fill)

---

## TopicChip_Business

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "💼 Business"
- **State:** unselected

---

## TopicChip_Finance

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "💰 Finance"
- **State:** unselected

---

## TopicChip_Psychology

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-selected-bg, color-chip-selected-text, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🧠 Psychology"
- **State:** selected (orange fill)

---

## TopicChip_Health

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🏥 Health"
- **State:** unselected

---

## TopicChip_Design

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🎨 Design"
- **State:** unselected

---

## TopicChip_Climate

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🌍 Climate"
- **State:** unselected

---

## TopicChip_Space

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🚀 Space"
- **State:** unselected

---

## TopicChip_Politics

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "📰 Politics"
- **State:** unselected

---

## TopicChip_History

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "📚 History"
- **State:** unselected

---

## TopicChip_Culture

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🎭 Culture"
- **State:** unselected

---

## TopicChip_Sports

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "⚽ Sports"
- **State:** unselected

---

## TopicChip_Cooking

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🍳 Cooking"
- **State:** unselected

---

## TopicChip_Parenting

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "👶 Parenting"
- **State:** unselected

---

## TopicChip_Philosophy

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "💡 Philosophy"
- **State:** unselected

---

## TopicChip_Law

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "⚖️ Law"
- **State:** unselected

---

## TopicChip_RealEstate

- **Type:** button
- **Parent:** TopicGrid
- **Children:** none
- **Tokens:** color-chip-unselected-bg, color-chip-unselected-text, color-chip-border-unselected, font-size-chip, font-weight-semibold, radius-chip, spacing-chip-padding-vertical, spacing-chip-padding-horizontal
- **Content:** "🏠 Real Estate"
- **State:** unselected

---

## BottomActions

- **Type:** container
- **Parent:** DiscoverFTUETopicsScreen
- **Children:** ContinueButton, SkipLink
- **Tokens:** spacing-screen-margin-horizontal, spacing-gap-grid-to-cta, spacing-gap-cta-to-skip, spacing-padding-bottom
- **Content:** n/a

---

## ContinueButton

- **Type:** button
- **Parent:** BottomActions
- **Children:** none
- **Tokens:** color-cta-bg, color-cta-text, font-size-body-lg, font-weight-semibold, radius-button, spacing-cta-padding-vertical
- **Content:** "Continue · 3 selected" (count is dynamic: "Continue · {N} selected")

---

## SkipLink

- **Type:** button
- **Parent:** BottomActions
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body-lg, font-weight-regular
- **Content:** "Skip"

---

## Component Tree Summary

```
DiscoverFTUETopicsScreen                    [container, root, local]
├── HeaderSection                           [container]
│   ├── ScreenTitle                         [text] "What are you into?"
│   └── ScreenSubtitle                      [text] "Pick at least 3 topics..."
├── ContentLayout                           [container]
│   └── TopicGrid                           [container, 3-col grid]
│       ├── TopicChip_Science               [button, selected]
│       ├── TopicChip_AITech                [button, selected]
│       ├── TopicChip_Business              [button, unselected]
│       ├── TopicChip_Finance               [button, unselected]
│       ├── TopicChip_Psychology            [button, selected]
│       ├── TopicChip_Health                [button, unselected]
│       ├── TopicChip_Design                [button, unselected]
│       ├── TopicChip_Climate               [button, unselected]
│       ├── TopicChip_Space                 [button, unselected]
│       ├── TopicChip_Politics              [button, unselected]
│       ├── TopicChip_History               [button, unselected]
│       ├── TopicChip_Culture               [button, unselected]
│       ├── TopicChip_Sports                [button, unselected]
│       ├── TopicChip_Cooking               [button, unselected]
│       ├── TopicChip_Parenting             [button, unselected]
│       ├── TopicChip_Philosophy            [button, unselected]
│       ├── TopicChip_Law                   [button, unselected]
│       └── TopicChip_RealEstate            [button, unselected]
└── BottomActions                           [container]
    ├── ContinueButton                      [button] "Continue · 3 selected"
    └── SkipLink                            [button] "Skip"
```

**Total:** 27 components | **Depth:** 4 levels | **Leaf nodes:** 23
