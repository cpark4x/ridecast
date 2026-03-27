# Component Spec — Discover Main (Screen 12)

> Ridecast · Discover Main · Extracted from approved PNG `ui-studio/frames/12-discover-main.png`
> Coverage: 100% confirmed (containment overlay iteration 2)
> Nav shell reference: `ui-studio/storyboards/nav-shell.md`

---

## BottomTabBar

- **Type:** app-shell
- **Parent:** DiscoverScreen
- **Children:** TabItem1, TabItem2, TabItem3
- **Tokens:** color-surface, spacing-tab-bar-height, color-border-subtle
- **Content:** none (container)
- **Scope:** app-shell

---

## TabItem1

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** Tab1Icon, Tab1Label
- **Tokens:** color-text-inactive
- **Content:** none

---

## Tab1Icon

- **Type:** icon
- **Parent:** TabItem1
- **Children:** none
- **Tokens:** color-text-inactive
- **Asset:** icon-home
- **Content:** none

---

## Tab1Label

- **Type:** text
- **Parent:** TabItem1
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-text-inactive
- **Content:** "Home"

---

## TabItem2

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** Tab2Icon, Tab2Label
- **Tokens:** color-accent-primary
- **Content:** none

---

## Tab2Icon

- **Type:** icon
- **Parent:** TabItem2
- **Children:** none
- **Tokens:** color-accent-primary
- **Asset:** icon-discover
- **Content:** none

---

## Tab2Label

- **Type:** text
- **Parent:** TabItem2
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-accent-primary
- **Content:** "Discover"

---

## TabItem3

- **Type:** container
- **Parent:** BottomTabBar
- **Children:** Tab3Icon, Tab3Label
- **Tokens:** color-text-inactive
- **Content:** none

---

## Tab3Icon

- **Type:** icon
- **Parent:** TabItem3
- **Children:** none
- **Tokens:** color-text-inactive
- **Asset:** icon-library
- **Content:** none

---

## Tab3Label

- **Type:** text
- **Parent:** TabItem3
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-text-inactive
- **Content:** "Library"

---

## MiniPlayerBar

- **Type:** app-shell
- **Parent:** DiscoverScreen
- **Children:** MiniPlayerContent, MiniPlayerProgressBar
- **Tokens:** color-surface-elevated, radius-mini-player, spacing-mini-player-height
- **Content:** none (container)
- **Scope:** app-shell

---

## MiniPlayerContent

- **Type:** container
- **Parent:** MiniPlayerBar
- **Children:** MiniPlayerThumbnail, MiniPlayerTextGroup, MiniPlayerPlayPause, MiniPlayerPercent
- **Tokens:** spacing-md, spacing-sm
- **Content:** none

---

## MiniPlayerThumbnail

- **Type:** image
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-mini-thumbnail-size
- **Asset:** mini-player-artwork
- **Content:** [dynamic — current episode artwork]

---

## MiniPlayerTextGroup

- **Type:** container
- **Parent:** MiniPlayerContent
- **Children:** MiniPlayerTitle
- **Tokens:** spacing-xs
- **Content:** none

---

## MiniPlayerTitle

- **Type:** text
- **Parent:** MiniPlayerTextGroup
- **Children:** none
- **Tokens:** font-size-body, font-weight-medium, color-text-primary
- **Content:** [dynamic — current episode title]

---

## MiniPlayerPlayPause

- **Type:** button
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** color-text-primary
- **Asset:** icon-pause
- **Content:** none

---

## MiniPlayerPercent

- **Type:** text
- **Parent:** MiniPlayerContent
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** [dynamic — e.g., "35%"]

---

## MiniPlayerProgressBar

- **Type:** container
- **Parent:** MiniPlayerBar
- **Children:** MiniPlayerProgressFill
- **Tokens:** color-border-subtle, spacing-progress-height
- **Content:** none

---

## MiniPlayerProgressFill

- **Type:** container
- **Parent:** MiniPlayerProgressBar
- **Children:** none
- **Tokens:** color-accent-primary, spacing-progress-height
- **Content:** [dynamic — CSS width percentage]

---

## DiscoverScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** HeaderSection, ScrollableContent, MiniPlayerBar, BottomTabBar
- **Tokens:** color-background-screen
- **Content:** none
- **Scope:** local

---

## HeaderSection

- **Type:** container
- **Parent:** DiscoverScreen
- **Children:** HeaderTitleRow, SearchBar
- **Tokens:** color-background-screen, spacing-screen-margin, spacing-md
- **Content:** none

---

## HeaderTitleRow

- **Type:** container
- **Parent:** HeaderSection
- **Children:** DiscoverTitle
- **Tokens:** spacing-screen-margin, spacing-sm
- **Content:** none

---

## DiscoverTitle

- **Type:** text
- **Parent:** HeaderTitleRow
- **Children:** none
- **Tokens:** font-size-display, font-weight-bold, color-text-primary
- **Content:** "Discover"

---

## SearchBar

- **Type:** input
- **Parent:** HeaderSection
- **Children:** SearchIcon, SearchPlaceholder
- **Tokens:** color-surface-elevated, radius-card, spacing-screen-margin, spacing-search-height
- **Content:** none

---

## SearchIcon

- **Type:** icon
- **Parent:** SearchBar
- **Children:** none
- **Tokens:** color-text-secondary
- **Asset:** icon-search
- **Content:** none

---

## SearchPlaceholder

- **Type:** text
- **Parent:** SearchBar
- **Children:** none
- **Tokens:** font-size-body, font-weight-regular, color-text-tertiary
- **Content:** "Search topics, sources, or paste a URL..."

---

## ScrollableContent

- **Type:** container
- **Parent:** DiscoverScreen
- **Children:** ForYouSection, YourTopicsSection, RecommendedSection
- **Tokens:** color-background-screen, spacing-screen-margin, spacing-section-gap
- **Content:** none

---

## ForYouSection

- **Type:** container
- **Parent:** ScrollableContent
- **Children:** ForYouHeaderRow, ArticleCardScroll
- **Tokens:** color-background-screen, spacing-section-gap
- **Content:** none

---

## ForYouHeaderRow

- **Type:** container
- **Parent:** ForYouSection
- **Children:** ForYouLabel
- **Tokens:** spacing-screen-margin, spacing-sm
- **Content:** none

---

## ForYouLabel

- **Type:** text
- **Parent:** ForYouHeaderRow
- **Children:** none
- **Tokens:** font-size-h1, font-weight-semibold, color-text-primary
- **Content:** "For You"

---

## ArticleCardScroll

- **Type:** container
- **Parent:** ForYouSection
- **Children:** ArticleCard1, ArticleCard2, ArticleCard3
- **Tokens:** spacing-screen-margin, spacing-card-gap, spacing-article-card-width
- **Content:** none

---

## ArticleCard1

- **Type:** container
- **Parent:** ArticleCardScroll
- **Children:** Card1Image, Card1ContextBadge, Card1Title, Card1Meta, Card1AddButton
- **Tokens:** color-surface, radius-card, spacing-article-card-width, spacing-article-card-height
- **Content:** none

---

## Card1Image

- **Type:** image
- **Parent:** ArticleCard1
- **Children:** none
- **Tokens:** radius-card, spacing-article-card-width
- **Asset:** crispr-card-image
- **Content:** [dynamic — article photo]

---

## Card1ContextBadge

- **Type:** container
- **Parent:** ArticleCard1
- **Children:** Card1ContextLabel
- **Tokens:** color-category-teal, radius-pill, spacing-xs, spacing-badge-padding
- **Content:** none

---

## Card1ContextLabel

- **Type:** text
- **Parent:** Card1ContextBadge
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-text-primary
- **Content:** "Trending in Science"

---

## Card1Title

- **Type:** text
- **Parent:** ArticleCard1
- **Children:** none
- **Tokens:** font-size-h2, font-weight-semibold, color-text-primary, spacing-sm
- **Content:** "New Gene Therapy Reverses Aging in Mice"

---

## Card1Meta

- **Type:** text
- **Parent:** ArticleCard1
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "MIT Technology Review · 8 min read"

---

## Card1AddButton

- **Type:** button
- **Parent:** ArticleCard1
- **Children:** none
- **Tokens:** color-surface-elevated, radius-pill, spacing-add-button-size
- **Asset:** icon-plus
- **Content:** none

---

## ArticleCard2

- **Type:** container
- **Parent:** ArticleCardScroll
- **Children:** Card2Image, Card2ContextBadge, Card2Title, Card2Meta, Card2AddButton
- **Tokens:** color-surface, radius-card, spacing-article-card-width, spacing-article-card-height
- **Content:** none

---

## Card2Image

- **Type:** image
- **Parent:** ArticleCard2
- **Children:** none
- **Tokens:** radius-card, spacing-article-card-width
- **Asset:** ai-robot-card-image
- **Content:** [dynamic — article photo]

---

## Card2ContextBadge

- **Type:** container
- **Parent:** ArticleCard2
- **Children:** Card2ContextLabel
- **Tokens:** color-category-blue, radius-pill, spacing-xs, spacing-badge-padding
- **Content:** none

---

## Card2ContextLabel

- **Type:** text
- **Parent:** Card2ContextBadge
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-text-primary
- **Content:** "Based on your interests"

---

## Card2Title

- **Type:** text
- **Parent:** ArticleCard2
- **Children:** none
- **Tokens:** font-size-h2, font-weight-semibold, color-text-primary, spacing-sm
- **Content:** "GPT-5 and the End of Prompting"

---

## Card2Meta

- **Type:** text
- **Parent:** ArticleCard2
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "Ars Technica · 12 min read"

---

## Card2AddButton

- **Type:** button
- **Parent:** ArticleCard2
- **Children:** none
- **Tokens:** color-surface-elevated, radius-pill, spacing-add-button-size
- **Asset:** icon-plus
- **Content:** none

---

## ArticleCard3

- **Type:** container
- **Parent:** ArticleCardScroll
- **Children:** Card3Image, Card3ContextBadge
- **Tokens:** color-surface, radius-card, spacing-article-card-width, spacing-article-card-height
- **Content:** none

---

## Card3Image

- **Type:** image
- **Parent:** ArticleCard3
- **Children:** none
- **Tokens:** radius-card, spacing-article-card-width
- **Asset:** psychology-card-image
- **Content:** [dynamic — article photo]

---

## Card3ContextBadge

- **Type:** container
- **Parent:** ArticleCard3
- **Children:** Card3ContextLabel
- **Tokens:** color-category-purple, radius-pill, spacing-xs, spacing-badge-padding
- **Content:** none

---

## Card3ContextLabel

- **Type:** text
- **Parent:** Card3ContextBadge
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-text-primary
- **Content:** "Psychology"

---

## Card3Title

- **Type:** text
- **Parent:** ArticleCard3
- **Children:** none
- **Tokens:** font-size-h2, font-weight-semibold, color-text-primary, spacing-sm
- **Content:** [dynamic — article title]

---

## Card3Meta

- **Type:** text
- **Parent:** ArticleCard3
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** [dynamic — "Source · N min read"]

---

## Card3AddButton

- **Type:** button
- **Parent:** ArticleCard3
- **Children:** none
- **Tokens:** color-surface-elevated, radius-pill, spacing-add-button-size
- **Asset:** icon-plus
- **Content:** none

---

## YourTopicsSection

- **Type:** container
- **Parent:** ScrollableContent
- **Children:** YourTopicsHeaderRow, TopicChipsRow
- **Tokens:** color-background-screen, spacing-section-gap
- **Content:** none

---

## YourTopicsHeaderRow

- **Type:** container
- **Parent:** YourTopicsSection
- **Children:** YourTopicsLabel
- **Tokens:** spacing-screen-margin, spacing-sm
- **Content:** none

---

## YourTopicsLabel

- **Type:** text
- **Parent:** YourTopicsHeaderRow
- **Children:** none
- **Tokens:** font-size-h1, font-weight-semibold, color-text-primary
- **Content:** "Your Topics"

---

## TopicChipsRow

- **Type:** container
- **Parent:** YourTopicsSection
- **Children:** TopicChip1, TopicChip2, TopicChip3
- **Tokens:** spacing-screen-margin, spacing-card-gap
- **Content:** none

---

## TopicChip1

- **Type:** container
- **Parent:** TopicChipsRow
- **Children:** Chip1Icon, Chip1Name, Chip1Count
- **Tokens:** color-surface, radius-card, spacing-chip-padding
- **Content:** none

---

## Chip1Icon

- **Type:** icon
- **Parent:** TopicChip1
- **Children:** none
- **Tokens:** color-category-teal
- **Asset:** icon-rocket
- **Content:** none

---

## Chip1Name

- **Type:** text
- **Parent:** TopicChip1
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** "Science"

---

## Chip1Count

- **Type:** text
- **Parent:** TopicChip1
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "24 new"

---

## TopicChip2

- **Type:** container
- **Parent:** TopicChipsRow
- **Children:** Chip2Icon, Chip2Name, Chip2Count
- **Tokens:** color-surface, radius-card, spacing-chip-padding
- **Content:** none

---

## Chip2Icon

- **Type:** icon
- **Parent:** TopicChip2
- **Children:** none
- **Tokens:** color-category-blue
- **Asset:** icon-bot
- **Content:** none

---

## Chip2Name

- **Type:** text
- **Parent:** TopicChip2
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** "AI & Tech"

---

## Chip2Count

- **Type:** text
- **Parent:** TopicChip2
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "35 new"

---

## TopicChip3

- **Type:** container
- **Parent:** TopicChipsRow
- **Children:** Chip3Icon, Chip3Name, Chip3Count
- **Tokens:** color-surface, radius-card, spacing-chip-padding
- **Content:** none

---

## Chip3Icon

- **Type:** icon
- **Parent:** TopicChip3
- **Children:** none
- **Tokens:** color-category-purple
- **Asset:** icon-brain
- **Content:** none

---

## Chip3Name

- **Type:** text
- **Parent:** TopicChip3
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** "Psychology"

---

## Chip3Count

- **Type:** text
- **Parent:** TopicChip3
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "12 new"

---

## RecommendedSection

- **Type:** container
- **Parent:** ScrollableContent
- **Children:** RecommendedHeaderRow, RecommendedList
- **Tokens:** color-background-screen, spacing-section-gap
- **Content:** none

---

## RecommendedHeaderRow

- **Type:** container
- **Parent:** RecommendedSection
- **Children:** RecommendedLabel, SeeAllLink
- **Tokens:** spacing-screen-margin, spacing-sm
- **Content:** none

---

## RecommendedLabel

- **Type:** text
- **Parent:** RecommendedHeaderRow
- **Children:** none
- **Tokens:** font-size-h1, font-weight-semibold, color-text-primary
- **Content:** "Recommended"

---

## SeeAllLink

- **Type:** button
- **Parent:** RecommendedHeaderRow
- **Children:** SeeAllText, SeeAllChevron
- **Tokens:** color-accent-primary
- **Content:** none

---

## SeeAllText

- **Type:** text
- **Parent:** SeeAllLink
- **Children:** none
- **Tokens:** font-size-body, font-weight-regular, color-accent-primary
- **Content:** "See all"

---

## SeeAllChevron

- **Type:** icon
- **Parent:** SeeAllLink
- **Children:** none
- **Tokens:** color-accent-primary
- **Asset:** icon-chevron-right
- **Content:** none

---

## RecommendedList

- **Type:** list
- **Parent:** RecommendedSection
- **Children:** SourceRow1, SourceRow2
- **Tokens:** spacing-screen-margin, spacing-card-gap
- **Content:** none

---

## SourceRow1

- **Type:** container
- **Parent:** RecommendedList
- **Children:** Source1Logo, Source1TextGroup, Source1FollowButton
- **Tokens:** color-background-screen, spacing-source-row-height, spacing-md
- **Content:** none

---

## Source1Logo

- **Type:** image
- **Parent:** SourceRow1
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-source-logo-size
- **Asset:** nature-logo
- **Content:** none

---

## Source1TextGroup

- **Type:** container
- **Parent:** SourceRow1
- **Children:** Source1Name, Source1Meta
- **Tokens:** spacing-xs
- **Content:** none

---

## Source1Name

- **Type:** text
- **Parent:** Source1TextGroup
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** "Nature"

---

## Source1Meta

- **Type:** text
- **Parent:** Source1TextGroup
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "Science · 3 new articles"

---

## Source1FollowButton

- **Type:** button
- **Parent:** SourceRow1
- **Children:** none
- **Tokens:** color-surface-elevated, radius-pill, spacing-follow-button, font-size-caption, font-weight-semibold, color-text-primary
- **Content:** "Follow"

---

## SourceRow2

- **Type:** container
- **Parent:** RecommendedList
- **Children:** Source2Logo, Source2TextGroup, Source2FollowButton
- **Tokens:** color-background-screen, spacing-source-row-height, spacing-md
- **Content:** none

---

## Source2Logo

- **Type:** image
- **Parent:** SourceRow2
- **Children:** none
- **Tokens:** radius-thumbnail, spacing-source-logo-size
- **Asset:** the-gradient-logo
- **Content:** none

---

## Source2TextGroup

- **Type:** container
- **Parent:** SourceRow2
- **Children:** Source2Name, Source2Meta
- **Tokens:** spacing-xs
- **Content:** none

---

## Source2Name

- **Type:** text
- **Parent:** Source2TextGroup
- **Children:** none
- **Tokens:** font-size-body, font-weight-semibold, color-text-primary
- **Content:** "The Gradient"

---

## Source2Meta

- **Type:** text
- **Parent:** Source2TextGroup
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "AI & ML · 5 new articles"

---

## Source2FollowButton

- **Type:** button
- **Parent:** SourceRow2
- **Children:** none
- **Tokens:** color-surface-elevated, radius-pill, spacing-follow-button, font-size-caption, font-weight-semibold, color-text-primary
- **Content:** "Follow"
