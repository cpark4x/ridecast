
# Component Spec — 09 Car Mode

> **Nav-shell status:** Car Mode is listed as an **Exempt Screen** in `nav-shell.md` ("fullscreen driving interface, black background"). No `app-shell` components apply. No tab bar. No mini player. Pure fullscreen content.

---

## CarModeScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** CloseButton, ArticleInfoSection, ProgressBarSection, PlaybackControlsRow
- **Tokens:** color-background-screen
- **Content:** none
- **Scope:** local

---

## CloseButton

- **Type:** button
- **Parent:** CarModeScreen
- **Children:** CloseButtonIcon
- **Tokens:** color-surface-button-secondary, radius-button-secondary, size-close-button
- **Content:** none (icon only)

---

## CloseButtonIcon

- **Type:** icon
- **Parent:** CloseButton
- **Children:** none
- **Tokens:** color-text-primary
- **Asset:** icon-close
- **Content:** none

---

## ArticleInfoSection

- **Type:** container
- **Parent:** CarModeScreen
- **Children:** ArticleTitleText, SourceText
- **Tokens:** spacing-section-gap
- **Content:** none

---

## ArticleTitleText

- **Type:** text
- **Parent:** ArticleInfoSection
- **Children:** none
- **Tokens:** font-size-car-title, font-weight-bold, color-text-primary, line-height-tight
- **Content:** [dynamic] — article title

---

## SourceText

- **Type:** text
- **Parent:** ArticleInfoSection
- **Children:** none
- **Tokens:** font-size-source, font-weight-regular, color-text-secondary
- **Content:** [dynamic] — publisher / source name

---

## ProgressBarSection

- **Type:** container
- **Parent:** CarModeScreen
- **Children:** ProgressBarTrack
- **Tokens:** spacing-progress-vertical, spacing-progress-horizontal
- **Content:** none

---

## ProgressBarTrack

- **Type:** container
- **Parent:** ProgressBarSection
- **Children:** ProgressBarFill
- **Tokens:** color-progress-track, height-progress-bar, radius-progress-bar
- **Content:** none

---

## ProgressBarFill

- **Type:** container
- **Parent:** ProgressBarTrack
- **Children:** none
- **Tokens:** color-accent-primary, height-progress-bar, radius-progress-bar
- **Content:** none (width driven by playback % — ~35% at design time)

---

## PlaybackControlsRow

- **Type:** container
- **Parent:** CarModeScreen
- **Children:** SkipBackButton, PlayPauseButton, SkipForwardButton
- **Tokens:** spacing-controls-gap, spacing-controls-vertical
- **Content:** none

---

## SkipBackButton

- **Type:** button
- **Parent:** PlaybackControlsRow
- **Children:** SkipBackLabel
- **Tokens:** color-surface-button-secondary, size-skip-button, radius-full
- **Content:** none (label child carries text)

---

## SkipBackLabel

- **Type:** text
- **Parent:** SkipBackButton
- **Children:** none
- **Tokens:** font-size-skip-label, font-weight-bold, color-text-primary
- **Content:** "−30"

---

## PlayPauseButton

- **Type:** button
- **Parent:** PlaybackControlsRow
- **Children:** PauseIcon
- **Tokens:** color-accent-primary, size-play-button, radius-full
- **Content:** none (icon child)

---

## PauseIcon

- **Type:** icon
- **Parent:** PlayPauseButton
- **Children:** none
- **Tokens:** color-text-primary
- **Asset:** icon-pause
- **Content:** none

---

## SkipForwardButton

- **Type:** button
- **Parent:** PlaybackControlsRow
- **Children:** SkipForwardLabel
- **Tokens:** color-surface-button-secondary, size-skip-button, radius-full
- **Content:** none (label child carries text)

---

## SkipForwardLabel

- **Type:** text
- **Parent:** SkipForwardButton
- **Children:** none
- **Tokens:** font-size-skip-label, font-weight-bold, color-text-primary
- **Content:** "+30"
