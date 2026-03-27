# Component Spec — 12b Discover FTUE Sources

**Screen:** FTUESourcesScreen
**Flow:** FTUE onboarding — Source Suggestions
**App:** Ridecast
**Nav-shell:** Exempt — fullscreen FTUE flow, no tab bar, no mini player

---

## FTUESourcesScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** HeaderSection, SourcesList, CTASection
- **Tokens:** color-background-screen
- **Content:** [dynamic]
- **Scope:** local

---

## HeaderSection

- **Type:** container
- **Parent:** FTUESourcesScreen
- **Children:** PageTitle, PageSubtitle
- **Tokens:** spacing-top-header, spacing-horizontal-screen, spacing-gap-title-subtitle
- **Content:** none
- **Scope:** local

---

## PageTitle

- **Type:** text
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** color-text-primary, font-size-h1, font-weight-bold, font-family-primary
- **Content:** "Sources you might like"
- **Scope:** local

---

## PageSubtitle

- **Type:** text
- **Parent:** HeaderSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular, font-family-primary
- **Content:** "We picked a few based on your interests.\nFollow the ones you want."
- **Scope:** local

---

## SourcesList

- **Type:** container
- **Parent:** FTUESourcesScreen
- **Children:** SourceCard1, SourceCard2, SourceCard3, SourceCard4, SourceCard5, SourceCard6
- **Tokens:** spacing-horizontal-screen, spacing-gap-cards
- **Content:** none
- **Scope:** local

---

## SourceCard1

- **Type:** container
- **Parent:** SourcesList
- **Children:** SourceLogo1, SourceInfo1, FollowButton1
- **Tokens:** color-background-card, radius-card, spacing-card-padding-vertical, spacing-card-padding-horizontal
- **Content:** none
- **Asset:** source-logo-mit (inline colored block)
- **Scope:** local

---

## SourceLogo1

- **Type:** container
- **Parent:** SourceCard1
- **Children:** none
- **Tokens:** color-logo-mit, radius-logo, font-size-logo-label, font-weight-bold, color-text-primary
- **Content:** "MIT"
- **Asset:** none
- **Scope:** local

---

## SourceInfo1

- **Type:** container
- **Parent:** SourceCard1
- **Children:** SourceName1, SourceCategory1
- **Tokens:** spacing-gap-name-category
- **Content:** none
- **Scope:** local

---

## SourceName1

- **Type:** text
- **Parent:** SourceInfo1
- **Children:** none
- **Tokens:** color-text-primary, font-size-source-name, font-weight-semibold, font-family-primary
- **Content:** "MIT Technology Review"
- **Scope:** local

---

## SourceCategory1

- **Type:** text
- **Parent:** SourceInfo1
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-caption, font-weight-regular, font-family-primary
- **Content:** "Science & Technology"
- **Scope:** local

---

## FollowButton1

- **Type:** button
- **Parent:** SourceCard1
- **Children:** none
- **Tokens:** color-accent, color-text-primary, font-size-button, font-weight-medium, radius-button, spacing-button-padding-horizontal, spacing-button-padding-vertical
- **Content:** "Following"
- **Scope:** local

---

## SourceCard2

- **Type:** container
- **Parent:** SourcesList
- **Children:** SourceLogo2, SourceInfo2, FollowButton2
- **Tokens:** color-background-card, radius-card, spacing-card-padding-vertical, spacing-card-padding-horizontal
- **Content:** none
- **Scope:** local

---

## SourceLogo2

- **Type:** container
- **Parent:** SourceCard2
- **Children:** none
- **Tokens:** color-logo-ars, radius-logo, font-size-logo-label, font-weight-bold, color-text-primary
- **Content:** "Ars"
- **Asset:** none
- **Scope:** local

---

## SourceInfo2

- **Type:** container
- **Parent:** SourceCard2
- **Children:** SourceName2, SourceCategory2
- **Tokens:** spacing-gap-name-category
- **Content:** none
- **Scope:** local

---

## SourceName2

- **Type:** text
- **Parent:** SourceInfo2
- **Children:** none
- **Tokens:** color-text-primary, font-size-source-name, font-weight-semibold, font-family-primary
- **Content:** "Ars Technica"
- **Scope:** local

---

## SourceCategory2

- **Type:** text
- **Parent:** SourceInfo2
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-caption, font-weight-regular, font-family-primary
- **Content:** "Technology"
- **Scope:** local

---

## FollowButton2

- **Type:** button
- **Parent:** SourceCard2
- **Children:** none
- **Tokens:** color-accent, color-text-primary, font-size-button, font-weight-medium, radius-button, spacing-button-padding-horizontal, spacing-button-padding-vertical
- **Content:** "Following"
- **Scope:** local

---

## SourceCard3

- **Type:** container
- **Parent:** SourcesList
- **Children:** SourceLogo3, SourceInfo3, FollowButton3
- **Tokens:** color-background-card, radius-card, spacing-card-padding-vertical, spacing-card-padding-horizontal
- **Content:** none
- **Scope:** local

---

## SourceLogo3

- **Type:** container
- **Parent:** SourceCard3
- **Children:** none
- **Tokens:** color-logo-quanta, radius-logo, font-size-logo-label, font-weight-bold, color-text-primary
- **Content:** "QM"
- **Asset:** none
- **Scope:** local

---

## SourceInfo3

- **Type:** container
- **Parent:** SourceCard3
- **Children:** SourceName3, SourceCategory3
- **Tokens:** spacing-gap-name-category
- **Content:** none
- **Scope:** local

---

## SourceName3

- **Type:** text
- **Parent:** SourceInfo3
- **Children:** none
- **Tokens:** color-text-primary, font-size-source-name, font-weight-semibold, font-family-primary
- **Content:** "Quanta Magazine"
- **Scope:** local

---

## SourceCategory3

- **Type:** text
- **Parent:** SourceInfo3
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-caption, font-weight-regular, font-family-primary
- **Content:** "Science & Math"
- **Scope:** local

---

## FollowButton3

- **Type:** button
- **Parent:** SourceCard3
- **Children:** none
- **Tokens:** color-button-unselected-bg, color-button-unselected-border, color-text-tertiary, font-size-button, font-weight-medium, radius-button, spacing-button-padding-horizontal, spacing-button-padding-vertical, border-width-default
- **Content:** "Follow"
- **Scope:** local

---

## SourceCard4

- **Type:** container
- **Parent:** SourcesList
- **Children:** SourceLogo4, SourceInfo4, FollowButton4
- **Tokens:** color-background-card, radius-card, spacing-card-padding-vertical, spacing-card-padding-horizontal
- **Content:** none
- **Scope:** local

---

## SourceLogo4

- **Type:** container
- **Parent:** SourceCard4
- **Children:** none
- **Tokens:** color-logo-nature, radius-logo, font-size-logo-label, font-weight-bold, color-text-primary
- **Content:** "Nat"
- **Asset:** none
- **Scope:** local

---

## SourceInfo4

- **Type:** container
- **Parent:** SourceCard4
- **Children:** SourceName4, SourceCategory4
- **Tokens:** spacing-gap-name-category
- **Content:** none
- **Scope:** local

---

## SourceName4

- **Type:** text
- **Parent:** SourceInfo4
- **Children:** none
- **Tokens:** color-text-primary, font-size-source-name, font-weight-semibold, font-family-primary
- **Content:** "Nature"
- **Scope:** local

---

## SourceCategory4

- **Type:** text
- **Parent:** SourceInfo4
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-caption, font-weight-regular, font-family-primary
- **Content:** "Science"
- **Scope:** local

---

## FollowButton4

- **Type:** button
- **Parent:** SourceCard4
- **Children:** none
- **Tokens:** color-button-unselected-bg, color-button-unselected-border, color-text-tertiary, font-size-button, font-weight-medium, radius-button, spacing-button-padding-horizontal, spacing-button-padding-vertical, border-width-default
- **Content:** "Follow"
- **Scope:** local

---

## SourceCard5

- **Type:** container
- **Parent:** SourcesList
- **Children:** SourceLogo5, SourceInfo5, FollowButton5
- **Tokens:** color-background-card, radius-card, spacing-card-padding-vertical, spacing-card-padding-horizontal
- **Content:** none
- **Scope:** local

---

## SourceLogo5

- **Type:** container
- **Parent:** SourceCard5
- **Children:** none
- **Tokens:** color-logo-gradient, radius-logo, font-size-logo-label, font-weight-bold, color-text-primary
- **Content:** "TG"
- **Asset:** none
- **Scope:** local

---

## SourceInfo5

- **Type:** container
- **Parent:** SourceCard5
- **Children:** SourceName5, SourceCategory5
- **Tokens:** spacing-gap-name-category
- **Content:** none
- **Scope:** local

---

## SourceName5

- **Type:** text
- **Parent:** SourceInfo5
- **Children:** none
- **Tokens:** color-text-primary, font-size-source-name, font-weight-semibold, font-family-primary
- **Content:** "The Gradient"
- **Scope:** local

---

## SourceCategory5

- **Type:** text
- **Parent:** SourceInfo5
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-caption, font-weight-regular, font-family-primary
- **Content:** "AI & Machine Learning"
- **Scope:** local

---

## FollowButton5

- **Type:** button
- **Parent:** SourceCard5
- **Children:** none
- **Tokens:** color-button-unselected-bg, color-button-unselected-border, color-text-tertiary, font-size-button, font-weight-medium, radius-button, spacing-button-padding-horizontal, spacing-button-padding-vertical, border-width-default
- **Content:** "Follow"
- **Scope:** local

---

## SourceCard6

- **Type:** container
- **Parent:** SourcesList
- **Children:** SourceLogo6, SourceInfo6, FollowButton6
- **Tokens:** color-background-card, radius-card, spacing-card-padding-vertical, spacing-card-padding-horizontal
- **Content:** none
- **Scope:** local

---

## SourceLogo6

- **Type:** container
- **Parent:** SourceCard6
- **Children:** none
- **Tokens:** color-logo-aeon, radius-logo, font-size-logo-label, font-weight-bold, color-text-primary
- **Content:** "Aeon"
- **Asset:** none
- **Scope:** local

---

## SourceInfo6

- **Type:** container
- **Parent:** SourceCard6
- **Children:** SourceName6, SourceCategory6
- **Tokens:** spacing-gap-name-category
- **Content:** none
- **Scope:** local

---

## SourceName6

- **Type:** text
- **Parent:** SourceInfo6
- **Children:** none
- **Tokens:** color-text-primary, font-size-source-name, font-weight-semibold, font-family-primary
- **Content:** "Aeon"
- **Scope:** local

---

## SourceCategory6

- **Type:** text
- **Parent:** SourceInfo6
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-caption, font-weight-regular, font-family-primary
- **Content:** "Psychology & Philosophy"
- **Scope:** local

---

## FollowButton6

- **Type:** button
- **Parent:** SourceCard6
- **Children:** none
- **Tokens:** color-button-unselected-bg, color-button-unselected-border, color-text-tertiary, font-size-button, font-weight-medium, radius-button, spacing-button-padding-horizontal, spacing-button-padding-vertical, border-width-default
- **Content:** "Follow"
- **Scope:** local

---

## CTASection

- **Type:** container
- **Parent:** FTUESourcesScreen
- **Children:** DoneButton
- **Tokens:** spacing-cta-top-gap, spacing-horizontal-screen, spacing-cta-bottom-gap
- **Content:** none
- **Scope:** local

---

## DoneButton

- **Type:** button
- **Parent:** CTASection
- **Children:** DoneCTAIcon, DoneCTALabel
- **Tokens:** color-accent, color-text-primary, radius-cta-button, spacing-cta-button-padding-vertical
- **Content:** none
- **Scope:** local

---

## DoneCTAIcon

- **Type:** icon
- **Parent:** DoneButton
- **Children:** none
- **Tokens:** color-text-primary
- **Content:** none
- **Asset:** check-icon (Lucide: `check`, 16×16px)
- **Scope:** local

---

## DoneCTALabel

- **Type:** text
- **Parent:** DoneButton
- **Children:** none
- **Tokens:** color-text-primary, font-size-cta, font-weight-bold, font-family-primary
- **Content:** "Done · Following 2 sources"
- **Scope:** local

---

## Component Tree

```
FTUESourcesScreen
├── HeaderSection
│   ├── PageTitle
│   └── PageSubtitle
├── SourcesList
│   ├── SourceCard1
│   │   ├── SourceLogo1
│   │   ├── SourceInfo1
│   │   │   ├── SourceName1
│   │   │   └── SourceCategory1
│   │   └── FollowButton1 (Following — active)
│   ├── SourceCard2
│   │   ├── SourceLogo2
│   │   ├── SourceInfo2
│   │   │   ├── SourceName2
│   │   │   └── SourceCategory2
│   │   └── FollowButton2 (Following — active)
│   ├── SourceCard3
│   │   ├── SourceLogo3
│   │   ├── SourceInfo3
│   │   │   ├── SourceName3
│   │   │   └── SourceCategory3
│   │   └── FollowButton3 (Follow — inactive)
│   ├── SourceCard4
│   │   ├── SourceLogo4
│   │   ├── SourceInfo4
│   │   │   ├── SourceName4
│   │   │   └── SourceCategory4
│   │   └── FollowButton4 (Follow — inactive)
│   ├── SourceCard5
│   │   ├── SourceLogo5
│   │   ├── SourceInfo5
│   │   │   ├── SourceName5
│   │   │   └── SourceCategory5
│   │   └── FollowButton5 (Follow — inactive)
│   └── SourceCard6
│       ├── SourceLogo6
│       ├── SourceInfo6
│       │   ├── SourceName6
│       │   └── SourceCategory6
│       └── FollowButton6 (Follow — inactive)
└── CTASection
    └── DoneButton
        ├── DoneCTAIcon
        └── DoneCTALabel
```

---

## Follow Button State Model

Two visual states for the FollowButton component:

### Active ("Following") — SourceCard1, SourceCard2
- Background: `color-accent` (#FF6B35)
- Border: none
- Text: `color-text-primary` (#FFFFFF)
- Text content: "Following"

### Inactive ("Follow") — SourceCard3–6
- Background: `color-button-unselected-bg` (transparent / #1A1A2E)
- Border: 1px solid `color-button-unselected-border` (rgba(255,255,255,0.12) or #6B7280)
- Text: `color-text-tertiary` (#6B7280)
- Text content: "Follow"
