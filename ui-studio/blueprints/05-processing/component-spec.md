
# Component Spec — 05-Processing

> Screen: Processing (fullscreen modal)
> Nav-shell status: **Exempt** — no tab bar, no mini player (see nav-shell.md)
> Scope: All components are `local` — this screen only

---

## ProcessingScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** HeaderBar, ArticleInfoSection, ThumbnailSection, PipelineSection, ProgressBarSection, FooterNote
- **Tokens:** color-background-screen
- **Content:** none
- **Asset:** none
- **Scope:** local

---

## HeaderBar

- **Type:** container
- **Parent:** ProcessingScreen
- **Children:** CloseButton
- **Tokens:** color-background-screen, spacing-screen-margin, spacing-md
- **Content:** none
- **Asset:** none

---

## CloseButton

- **Type:** button
- **Parent:** HeaderBar
- **Children:** none
- **Tokens:** color-close-button-bg, color-text-primary, radius-full, size-close-button
- **Content:** none
- **Asset:** icon-close

---

## ArticleInfoSection

- **Type:** container
- **Parent:** ProcessingScreen
- **Children:** ArticleTitle, ArticleMeta
- **Tokens:** spacing-screen-margin, spacing-xs
- **Content:** none
- **Asset:** none

---

## ArticleTitle

- **Type:** text
- **Parent:** ArticleInfoSection
- **Children:** none
- **Tokens:** color-text-primary, font-size-h1, font-weight-bold
- **Content:** [dynamic] — article title (e.g., "The Future of CRISPR Gene Editing")
- **Asset:** none

---

## ArticleMeta

- **Type:** text
- **Parent:** ArticleInfoSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-body, font-weight-regular
- **Content:** [dynamic] — "{SourceName} • {N} min episode"
- **Asset:** none

---

## ThumbnailSection

- **Type:** container
- **Parent:** ProcessingScreen
- **Children:** ThumbnailImage
- **Tokens:** spacing-screen-margin, spacing-xl
- **Content:** none
- **Asset:** none

---

## ThumbnailImage

- **Type:** image
- **Parent:** ThumbnailSection
- **Children:** none
- **Tokens:** radius-thumbnail-featured, size-thumbnail-featured, shadow-thumbnail
- **Content:** [dynamic] — AI-generated article artwork
- **Asset:** processing-thumbnail-crispr

---

## PipelineSection

- **Type:** container
- **Parent:** ProcessingScreen
- **Children:** StageRow1, StageRow2, StageRow3, StageRow4
- **Tokens:** spacing-screen-margin, spacing-xl
- **Content:** none
- **Asset:** none

---

## StageRow1

- **Type:** container
- **Parent:** PipelineSection
- **Children:** Stage1Icon, Stage1Label, Stage1Status, Stage1Connector
- **Tokens:** spacing-stage-row-v, spacing-stage-row-gap
- **Content:** none
- **Asset:** none

---

## Stage1Icon

- **Type:** icon
- **Parent:** StageRow1
- **Children:** none
- **Tokens:** color-status-success, size-stage-icon, radius-full
- **Content:** none
- **Asset:** icon-check-circle-filled

---

## Stage1Label

- **Type:** text
- **Parent:** StageRow1
- **Children:** none
- **Tokens:** color-text-secondary, font-size-stage-label, font-weight-medium
- **Content:** "Analyzing"
- **Asset:** none

---

## Stage1Status

- **Type:** text
- **Parent:** StageRow1
- **Children:** none
- **Tokens:** color-text-secondary, font-size-stage-label, font-weight-regular
- **Content:** "Done"
- **Asset:** none

---

## Stage1Connector

- **Type:** container
- **Parent:** StageRow1
- **Children:** none
- **Tokens:** color-connector-line, size-connector-height, size-connector-width
- **Content:** none
- **Asset:** none

---

## StageRow2

- **Type:** container
- **Parent:** PipelineSection
- **Children:** Stage2Icon, Stage2Label, Stage2Status, Stage2Connector
- **Tokens:** spacing-stage-row-v, spacing-stage-row-gap
- **Content:** none
- **Asset:** none

---

## Stage2Icon

- **Type:** icon
- **Parent:** StageRow2
- **Children:** none
- **Tokens:** color-status-success, size-stage-icon, radius-full
- **Content:** none
- **Asset:** icon-check-circle-filled

---

## Stage2Label

- **Type:** text
- **Parent:** StageRow2
- **Children:** none
- **Tokens:** color-text-secondary, font-size-stage-label, font-weight-medium
- **Content:** "Scripting"
- **Asset:** none

---

## Stage2Status

- **Type:** text
- **Parent:** StageRow2
- **Children:** none
- **Tokens:** color-text-secondary, font-size-stage-label, font-weight-regular
- **Content:** "Done"
- **Asset:** none

---

## Stage2Connector

- **Type:** container
- **Parent:** StageRow2
- **Children:** none
- **Tokens:** color-connector-line, size-connector-height, size-connector-width
- **Content:** none
- **Asset:** none

---

## StageRow3

- **Type:** container
- **Parent:** PipelineSection
- **Children:** Stage3Icon, Stage3Label, Stage3Timer, Stage3Connector
- **Tokens:** spacing-stage-row-v, spacing-stage-row-gap
- **Content:** none
- **Asset:** none

---

## Stage3Icon

- **Type:** icon
- **Parent:** StageRow3
- **Children:** none
- **Tokens:** color-accent, size-stage-icon, radius-full
- **Content:** none
- **Asset:** icon-circle-filled-active

---

## Stage3Label

- **Type:** text
- **Parent:** StageRow3
- **Children:** none
- **Tokens:** color-text-primary, font-size-stage-label, font-weight-medium
- **Content:** "Generating Audio"
- **Asset:** none

---

## Stage3Timer

- **Type:** text
- **Parent:** StageRow3
- **Children:** none
- **Tokens:** color-accent, font-size-stage-label, font-weight-medium
- **Content:** [dynamic] — elapsed timer (e.g., "2:14")
- **Asset:** none

---

## Stage3Connector

- **Type:** container
- **Parent:** StageRow3
- **Children:** none
- **Tokens:** color-connector-line, size-connector-height, size-connector-width
- **Content:** none
- **Asset:** none

---

## StageRow4

- **Type:** container
- **Parent:** PipelineSection
- **Children:** Stage4Icon, Stage4Label
- **Tokens:** spacing-stage-row-v, spacing-stage-row-gap
- **Content:** none
- **Asset:** none

---

## Stage4Icon

- **Type:** icon
- **Parent:** StageRow4
- **Children:** none
- **Tokens:** color-stage-pending, size-stage-icon, radius-full
- **Content:** none
- **Asset:** icon-circle-outline-pending

---

## Stage4Label

- **Type:** text
- **Parent:** StageRow4
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-stage-label, font-weight-medium
- **Content:** "Ready"
- **Asset:** none

---

## ProgressBarSection

- **Type:** container
- **Parent:** ProcessingScreen
- **Children:** ProgressBarTrack
- **Tokens:** spacing-screen-margin, spacing-xl
- **Content:** none
- **Asset:** none

---

## ProgressBarTrack

- **Type:** container
- **Parent:** ProgressBarSection
- **Children:** ProgressFill, ProgressTrackBg
- **Tokens:** color-progress-track, radius-progress-bar, size-progress-bar-height
- **Content:** none
- **Asset:** none

---

## ProgressFill

- **Type:** container
- **Parent:** ProgressBarTrack
- **Children:** none
- **Tokens:** color-accent, radius-progress-bar, size-progress-bar-height
- **Content:** [dynamic] — width driven by progress percentage (~65%)
- **Asset:** none

---

## ProgressTrackBg

- **Type:** container
- **Parent:** ProgressBarTrack
- **Children:** none
- **Tokens:** color-progress-track, radius-progress-bar, size-progress-bar-height
- **Content:** [dynamic] — remaining unfilled width
- **Asset:** none

---

## FooterNote

- **Type:** container
- **Parent:** ProcessingScreen
- **Children:** FooterText
- **Tokens:** spacing-screen-margin, spacing-md
- **Content:** none
- **Asset:** none

---

## FooterText

- **Type:** text
- **Parent:** FooterNote
- **Children:** none
- **Tokens:** color-text-secondary, font-size-caption, font-weight-regular
- **Content:** "This usually takes 1-2 minutes"
- **Asset:** none
