# Component Spec — Settings Screen (11-settings)

> **Screen context:** Modal sheet overlay — listed as Exempt Screen in `nav-shell.md`. No persistent tab bar, no mini player. Rendered as a full-screen modal over the Home/Library routes.
>
> **Coverage:** 32 components. 100% of app-content pixels covered.
> **Gaps flagged:** iOS status bar + home indicator — both OS chrome, excluded per blueprint scope rules.

---

## SettingsScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** NavBar, ScrollableContent
- **Tokens:** color-background-screen
- **Content:** —
- **Scope:** local

---

## NavBar

- **Type:** container
- **Parent:** SettingsScreen
- **Children:** BackButton, NavTitle
- **Tokens:** color-background-screen, spacing-screen-margin, font-size-body
- **Content:** —

---

## BackButton

- **Type:** button
- **Parent:** NavBar
- **Children:** none
- **Tokens:** color-text-secondary, spacing-xs
- **Content:** "‹ Library" (back chevron + parent screen label)
- **Asset:** icon-chevron-left

---

## NavTitle

- **Type:** text
- **Parent:** NavBar
- **Children:** none
- **Tokens:** color-text-primary, font-size-h1, font-weight-semibold
- **Content:** "Settings"

---

## ScrollableContent

- **Type:** container
- **Parent:** SettingsScreen
- **Children:** AccountSection, PlaybackSection, ProcessingSection, UseYourOwnKeySection
- **Tokens:** color-background-screen, spacing-screen-margin, spacing-section-gap
- **Content:** [scrollable — more sections below fold: Notifications, Storage, About, Sign Out, Delete Account]

---

## AccountSection

- **Type:** container
- **Parent:** ScrollableContent
- **Children:** AccountSectionHeader, AccountCard
- **Tokens:** color-background-screen, spacing-section-gap
- **Content:** —

---

## AccountSectionHeader

- **Type:** text
- **Parent:** AccountSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-micro, font-weight-regular, spacing-section-header-bottom
- **Content:** "ACCOUNT"

---

## AccountCard

- **Type:** container
- **Parent:** AccountSection
- **Children:** AvatarCircle, AccountInfo, AccountChevron
- **Tokens:** color-surface-card, radius-card, spacing-card-padding
- **Content:** —

---

## AvatarCircle

- **Type:** container
- **Parent:** AccountCard
- **Children:** AvatarInitials
- **Tokens:** color-accent-primary, radius-full, spacing-avatar-size
- **Content:** —

---

## AvatarInitials

- **Type:** text
- **Parent:** AvatarCircle
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "CP"

---

## AccountInfo

- **Type:** container
- **Parent:** AccountCard
- **Children:** AccountName, AccountEmail
- **Tokens:** spacing-xs
- **Content:** —

---

## AccountName

- **Type:** text
- **Parent:** AccountInfo
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-semibold
- **Content:** "Chris Park"

---

## AccountEmail

- **Type:** text
- **Parent:** AccountInfo
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** "chris@email.com"

---

## AccountChevron

- **Type:** icon
- **Parent:** AccountCard
- **Children:** none
- **Tokens:** color-text-tertiary
- **Content:** —
- **Asset:** icon-chevron-right

---

## PlaybackSection

- **Type:** container
- **Parent:** ScrollableContent
- **Children:** PlaybackSectionHeader, PlaybackGroup
- **Tokens:** color-background-screen, spacing-section-gap
- **Content:** —

---

## PlaybackSectionHeader

- **Type:** text
- **Parent:** PlaybackSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-micro, font-weight-regular, spacing-section-header-bottom
- **Content:** "PLAYBACK"

---

## PlaybackGroup

- **Type:** container
- **Parent:** PlaybackSection
- **Children:** DefaultSpeedRow, RowDivider1, SkipForwardRow, RowDivider2, SkipBackRow, RowDivider3, AutoPlayRow
- **Tokens:** color-surface-card, radius-card
- **Content:** —

---

## DefaultSpeedRow

- **Type:** container
- **Parent:** PlaybackGroup
- **Children:** DefaultSpeedLabel, DefaultSpeedValue
- **Tokens:** color-surface-card, spacing-row-padding, row-height
- **Content:** —

---

## DefaultSpeedLabel

- **Type:** text
- **Parent:** DefaultSpeedRow
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-regular
- **Content:** "Default Speed"

---

## DefaultSpeedValue

- **Type:** container
- **Parent:** DefaultSpeedRow
- **Children:** DefaultSpeedValueText, DefaultSpeedChevron
- **Tokens:** spacing-xs
- **Content:** —

---

## DefaultSpeedValueText

- **Type:** text
- **Parent:** DefaultSpeedValue
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular
- **Content:** "1.0x"

---

## DefaultSpeedChevron

- **Type:** icon
- **Parent:** DefaultSpeedValue
- **Children:** none
- **Tokens:** color-text-tertiary
- **Content:** —
- **Asset:** icon-chevron-right

---

## RowDivider1

- **Type:** container
- **Parent:** PlaybackGroup
- **Children:** none
- **Tokens:** color-divider, border-width-divider
- **Content:** —

---

## SkipForwardRow

- **Type:** container
- **Parent:** PlaybackGroup
- **Children:** SkipForwardLabel, SkipForwardValue
- **Tokens:** color-surface-card, spacing-row-padding, row-height
- **Content:** —

---

## SkipForwardLabel

- **Type:** text
- **Parent:** SkipForwardRow
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-regular
- **Content:** "Skip Forward"

---

## SkipForwardValue

- **Type:** container
- **Parent:** SkipForwardRow
- **Children:** SkipForwardValueText, SkipForwardChevron
- **Tokens:** spacing-xs
- **Content:** —

---

## SkipForwardValueText

- **Type:** text
- **Parent:** SkipForwardValue
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular
- **Content:** "30s"

---

## SkipForwardChevron

- **Type:** icon
- **Parent:** SkipForwardValue
- **Children:** none
- **Tokens:** color-text-tertiary
- **Content:** —
- **Asset:** icon-chevron-right

---

## RowDivider2

- **Type:** container
- **Parent:** PlaybackGroup
- **Children:** none
- **Tokens:** color-divider, border-width-divider
- **Content:** —

---

## SkipBackRow

- **Type:** container
- **Parent:** PlaybackGroup
- **Children:** SkipBackLabel, SkipBackValue
- **Tokens:** color-surface-card, spacing-row-padding, row-height
- **Content:** —

---

## SkipBackLabel

- **Type:** text
- **Parent:** SkipBackRow
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-regular
- **Content:** "Skip Back"

---

## SkipBackValue

- **Type:** container
- **Parent:** SkipBackRow
- **Children:** SkipBackValueText, SkipBackChevron
- **Tokens:** spacing-xs
- **Content:** —

---

## SkipBackValueText

- **Type:** text
- **Parent:** SkipBackValue
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular
- **Content:** "15s"

---

## SkipBackChevron

- **Type:** icon
- **Parent:** SkipBackValue
- **Children:** none
- **Tokens:** color-text-tertiary
- **Content:** —
- **Asset:** icon-chevron-right

---

## RowDivider3

- **Type:** container
- **Parent:** PlaybackGroup
- **Children:** none
- **Tokens:** color-divider, border-width-divider
- **Content:** —

---

## AutoPlayRow

- **Type:** container
- **Parent:** PlaybackGroup
- **Children:** AutoPlayLabel, AutoPlayToggle
- **Tokens:** color-surface-card, spacing-row-padding, row-height
- **Content:** —

---

## AutoPlayLabel

- **Type:** text
- **Parent:** AutoPlayRow
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-regular
- **Content:** "Auto-play Next"

---

## AutoPlayToggle

- **Type:** input
- **Parent:** AutoPlayRow
- **Children:** none
- **Tokens:** color-accent-primary, color-surface-elevated
- **Content:** [dynamic — boolean, default ON]

---

## ProcessingSection

- **Type:** container
- **Parent:** ScrollableContent
- **Children:** ProcessingSectionHeader, ProcessingGroup
- **Tokens:** color-background-screen, spacing-section-gap
- **Content:** —

---

## ProcessingSectionHeader

- **Type:** text
- **Parent:** ProcessingSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-micro, font-weight-regular, spacing-section-header-bottom
- **Content:** "PROCESSING"

---

## ProcessingGroup

- **Type:** container
- **Parent:** ProcessingSection
- **Children:** DefaultDurationRow, RowDivider4, DefaultVoiceRow
- **Tokens:** color-surface-card, radius-card
- **Content:** —

---

## DefaultDurationRow

- **Type:** container
- **Parent:** ProcessingGroup
- **Children:** DefaultDurationLabel, DefaultDurationValue
- **Tokens:** color-surface-card, spacing-row-padding, row-height
- **Content:** —

---

## DefaultDurationLabel

- **Type:** text
- **Parent:** DefaultDurationRow
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-regular
- **Content:** "Default Duration"

---

## DefaultDurationValue

- **Type:** container
- **Parent:** DefaultDurationRow
- **Children:** SparkleIcon, DefaultDurationValueText, DefaultDurationChevron
- **Tokens:** spacing-xs
- **Content:** —

---

## SparkleIcon

- **Type:** icon
- **Parent:** DefaultDurationValue
- **Children:** none
- **Tokens:** color-accent-primary
- **Content:** —
- **Asset:** icon-sparkle

---

## DefaultDurationValueText

- **Type:** text
- **Parent:** DefaultDurationValue
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular
- **Content:** "Smart"

---

## DefaultDurationChevron

- **Type:** icon
- **Parent:** DefaultDurationValue
- **Children:** none
- **Tokens:** color-text-tertiary
- **Content:** —
- **Asset:** icon-chevron-right

---

## RowDivider4

- **Type:** container
- **Parent:** ProcessingGroup
- **Children:** none
- **Tokens:** color-divider, border-width-divider
- **Content:** —

---

## DefaultVoiceRow

- **Type:** container
- **Parent:** ProcessingGroup
- **Children:** DefaultVoiceLabel, DefaultVoiceValue
- **Tokens:** color-surface-card, spacing-row-padding, row-height
- **Content:** —

---

## DefaultVoiceLabel

- **Type:** text
- **Parent:** DefaultVoiceRow
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-regular
- **Content:** "Default Voice"

---

## DefaultVoiceValue

- **Type:** container
- **Parent:** DefaultVoiceRow
- **Children:** DefaultVoiceValueText, DefaultVoiceChevron
- **Tokens:** spacing-xs
- **Content:** —

---

## DefaultVoiceValueText

- **Type:** text
- **Parent:** DefaultVoiceValue
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular
- **Content:** "Studio"

---

## DefaultVoiceChevron

- **Type:** icon
- **Parent:** DefaultVoiceValue
- **Children:** none
- **Tokens:** color-text-tertiary
- **Content:** —
- **Asset:** icon-chevron-right

---

## UseYourOwnKeySection

- **Type:** container
- **Parent:** ScrollableContent
- **Children:** ApiKeySectionHeader, ApiKeyDescription, ApiKeyGroup
- **Tokens:** color-background-screen, spacing-section-gap
- **Content:** —

---

## ApiKeySectionHeader

- **Type:** text
- **Parent:** UseYourOwnKeySection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-micro, font-weight-regular, spacing-section-header-bottom
- **Content:** "USE YOUR OWN KEY"

---

## ApiKeyDescription

- **Type:** text
- **Parent:** UseYourOwnKeySection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular, spacing-section-description-bottom
- **Content:** "Bring your own OpenAI API key to use Ridecast without a subscription."

---

## ApiKeyGroup

- **Type:** container
- **Parent:** UseYourOwnKeySection
- **Children:** OpenAIRow
- **Tokens:** color-surface-card, radius-card
- **Content:** —

---

## OpenAIRow

- **Type:** container
- **Parent:** ApiKeyGroup
- **Children:** OpenAILabel, OpenAIStatus
- **Tokens:** color-surface-card, spacing-row-padding, row-height
- **Content:** —

---

## OpenAILabel

- **Type:** text
- **Parent:** OpenAIRow
- **Children:** none
- **Tokens:** color-text-primary, font-size-body, font-weight-regular
- **Content:** "OpenAI"

---

## OpenAIStatus

- **Type:** container
- **Parent:** OpenAIRow
- **Children:** OpenAIStatusText, OpenAIChevron
- **Tokens:** spacing-xs
- **Content:** —

---

## OpenAIStatusText

- **Type:** text
- **Parent:** OpenAIStatus
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular
- **Content:** "Not configured"

---

## OpenAIChevron

- **Type:** icon
- **Parent:** OpenAIStatus
- **Children:** none
- **Tokens:** color-text-tertiary
- **Content:** —
- **Asset:** icon-chevron-right

---

## Below-Fold Components (scrollable — not visible in approved frame)

> These components exist per screen description but are below the fold in the approved PNG.
> They follow the same section + group + row pattern as above.

### NotificationsSection
- **Type:** container / **Parent:** ScrollableContent
- **Children:** NotificationsSectionHeader, NotificationsGroup
- **Content:** [dynamic — notification preference rows]

### StorageSection
- **Type:** container / **Parent:** ScrollableContent
- **Children:** StorageSectionHeader, StorageGroup
- **Content:** [dynamic — storage usage rows]

### AboutSection
- **Type:** container / **Parent:** ScrollableContent
- **Children:** AboutSectionHeader, AboutGroup
- **Content:** [dynamic — version, legal rows]

### SignOutRow
- **Type:** button / **Parent:** ScrollableContent
- **Tokens:** color-text-primary, color-surface-card, font-size-body, font-weight-semibold, radius-card
- **Content:** "Sign Out"

### DeleteAccountRow
- **Type:** button / **Parent:** ScrollableContent
- **Tokens:** color-destructive, color-surface-card, font-size-body, font-weight-semibold, radius-card
- **Content:** "Delete Account"
