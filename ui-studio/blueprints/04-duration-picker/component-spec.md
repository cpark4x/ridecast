# Component Spec — 04 Duration Picker

> Screen: Duration Picker bottom sheet over dimmed Home screen
> Nav-shell status: EXEMPT — this screen is a bottom sheet overlay; no app-shell chrome renders here.
> The BottomNavBar visible in this screen is local (part of the modal sheet layout), not app-shell.

---

## DurationPickerScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** DimmedHomeBackground, DimOverlay, BottomSheetModal
- **Tokens:** color-background-screen
- **Content:** none
- **Scope:** local

---

## DimmedHomeBackground

- **Type:** background
- **Parent:** DurationPickerScreen
- **Children:** none
- **Tokens:** color-background-screen
- **Content:** [dynamic] — blurred/dimmed render of the Home screen behind the sheet
- **Asset:** none (runtime render of parent route, blurred via CSS filter or React Native overlay)
- **Scope:** local

---

## DimOverlay

- **Type:** container
- **Parent:** DurationPickerScreen
- **Children:** none
- **Tokens:** color-dim-overlay
- **Content:** none (full-screen semi-transparent black scrim)
- **Scope:** local

---

## BottomSheetModal

- **Type:** container
- **Parent:** DurationPickerScreen
- **Children:** SheetDragHandle, ArticlePreviewCard, EpisodeLengthSection, CreateEpisodeCTA, BottomNavBar
- **Tokens:** color-background-sheet, radius-sheet-top, sheet-horizontal-padding
- **Content:** none
- **Scope:** local

---

## SheetDragHandle

- **Type:** container
- **Parent:** BottomSheetModal
- **Children:** none
- **Tokens:** color-grab-handle, radius-pill, spacing-md
- **Content:** none (decorative drag handle pill — ~36×4px, centered)
- **Scope:** local

---

## ArticlePreviewCard

- **Type:** container
- **Parent:** BottomSheetModal
- **Children:** ArticleThumbnail, ArticleCardContent
- **Tokens:** color-background-card, radius-card, article-card-padding, item-gap
- **Content:** none
- **Scope:** local

---

## ArticleThumbnail

- **Type:** image
- **Parent:** ArticlePreviewCard
- **Children:** none
- **Tokens:** radius-thumbnail
- **Content:** [dynamic]
- **Asset:** article-thumbnail
- **Scope:** local

---

## ArticleCardContent

- **Type:** container
- **Parent:** ArticlePreviewCard
- **Children:** ArticleTitle, ArticleMetadata
- **Tokens:** spacing-sm
- **Content:** none
- **Scope:** local

---

## ArticleTitle

- **Type:** text
- **Parent:** ArticleCardContent
- **Children:** none
- **Tokens:** color-text-primary, font-size-article-title, font-weight-article-title, line-height-tight
- **Content:** [dynamic] (e.g. "The Future of CRISPR Gene Editing")
- **Scope:** local

---

## ArticleMetadata

- **Type:** text
- **Parent:** ArticleCardContent
- **Children:** none
- **Tokens:** color-text-secondary, font-size-metadata, font-weight-metadata, line-height-normal
- **Content:** [dynamic] (e.g. "MIT Technology Review · 12 min read")
- **Scope:** local

---

## EpisodeLengthSection

- **Type:** container
- **Parent:** BottomSheetModal
- **Children:** EpisodeLengthLabel, DurationChipRow
- **Tokens:** section-gap, spacing-sm
- **Content:** none
- **Scope:** local

---

## EpisodeLengthLabel

- **Type:** text
- **Parent:** EpisodeLengthSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-section-label, font-weight-section-label
- **Content:** "Episode length"
- **Scope:** local

---

## DurationChipRow

- **Type:** container
- **Parent:** EpisodeLengthSection
- **Children:** SummaryChip, StandardChip, ReadAloudChip
- **Tokens:** chip-row-gap
- **Content:** none (horizontal flex row, equal-width columns)
- **Scope:** local

---

## SummaryChip

- **Type:** button
- **Parent:** DurationChipRow
- **Children:** SummaryChipDuration, SummaryChipLabel
- **Tokens:** color-background-card, color-border-chip-inactive, radius-chip, spacing-md, spacing-sm
- **Content:** none
- **Scope:** local

---

## SummaryChipDuration

- **Type:** text
- **Parent:** SummaryChip
- **Children:** none
- **Tokens:** color-text-primary, font-size-chip-duration, font-weight-chip-duration
- **Content:** "2 min"
- **Scope:** local

---

## SummaryChipLabel

- **Type:** text
- **Parent:** SummaryChip
- **Children:** none
- **Tokens:** color-text-secondary, font-size-chip-label, font-weight-chip-label
- **Content:** "Summary"
- **Scope:** local

---

## StandardChip

- **Type:** button
- **Parent:** DurationChipRow
- **Children:** SparkleIcon, StandardChipDuration, StandardChipLabel
- **Tokens:** color-accent-primary, radius-chip, spacing-md, spacing-sm
- **Content:** none (selected/active state — orange background, no border)
- **Scope:** local

---

## SparkleIcon

- **Type:** icon
- **Parent:** StandardChip
- **Children:** none
- **Tokens:** color-text-primary
- **Content:** none
- **Asset:** icon-sparkle
- **Scope:** local

---

## StandardChipDuration

- **Type:** text
- **Parent:** StandardChip
- **Children:** none
- **Tokens:** color-text-primary, font-size-chip-duration, font-weight-chip-duration
- **Content:** "5 min"
- **Scope:** local

---

## StandardChipLabel

- **Type:** text
- **Parent:** StandardChip
- **Children:** none
- **Tokens:** color-text-primary, font-size-chip-label, font-weight-chip-label
- **Content:** "Standard"
- **Scope:** local

---

## ReadAloudChip

- **Type:** button
- **Parent:** DurationChipRow
- **Children:** ReadAloudChipDuration, ReadAloudChipLabel
- **Tokens:** color-background-card, color-border-chip-inactive, radius-chip, spacing-md, spacing-sm
- **Content:** none
- **Scope:** local

---

## ReadAloudChipDuration

- **Type:** text
- **Parent:** ReadAloudChip
- **Children:** none
- **Tokens:** color-text-primary, font-size-chip-duration, font-weight-chip-duration
- **Content:** "12 min"
- **Scope:** local

---

## ReadAloudChipLabel

- **Type:** text
- **Parent:** ReadAloudChip
- **Children:** none
- **Tokens:** color-text-secondary, font-size-chip-label, font-weight-chip-label
- **Content:** "Read aloud"
- **Scope:** local

---

## CreateEpisodeCTA

- **Type:** button
- **Parent:** BottomSheetModal
- **Children:** CreateEpisodeCTALabel
- **Tokens:** color-accent-primary, radius-cta, cta-margin-vertical, spacing-md
- **Content:** none (full-width pill button, ~56px height)
- **Scope:** local

---

## CreateEpisodeCTALabel

- **Type:** text
- **Parent:** CreateEpisodeCTA
- **Children:** none
- **Tokens:** color-text-primary, font-size-cta, font-weight-cta
- **Content:** "Create Episode · 5 min"
- **Scope:** local

---

## BottomNavBar

- **Type:** container
- **Parent:** BottomSheetModal
- **Children:** HomeTab, LibraryTab
- **Tokens:** color-background-sheet, color-tab-divider, spacing-sm
- **Content:** none (2-tab horizontal bar at base of sheet, ~56px height, 1px top border)
- **Scope:** local

---

## HomeTab

- **Type:** button
- **Parent:** BottomNavBar
- **Children:** HomeTabIcon, HomeTabLabel
- **Tokens:** spacing-xs
- **Content:** none (active state)
- **Scope:** local

---

## HomeTabIcon

- **Type:** icon
- **Parent:** HomeTab
- **Children:** none
- **Tokens:** color-tab-active
- **Content:** none
- **Asset:** icon-home
- **Scope:** local

---

## HomeTabLabel

- **Type:** text
- **Parent:** HomeTab
- **Children:** none
- **Tokens:** color-tab-active, font-size-tab-label, font-weight-tab-label
- **Content:** "Home"
- **Scope:** local

---

## LibraryTab

- **Type:** button
- **Parent:** BottomNavBar
- **Children:** LibraryTabIcon, LibraryTabLabel
- **Tokens:** spacing-xs
- **Content:** none (inactive state)
- **Scope:** local

---

## LibraryTabIcon

- **Type:** icon
- **Parent:** LibraryTab
- **Children:** none
- **Tokens:** color-tab-inactive
- **Content:** none
- **Asset:** icon-library
- **Scope:** local

---

## LibraryTabLabel

- **Type:** text
- **Parent:** LibraryTab
- **Children:** none
- **Tokens:** color-tab-inactive, font-size-tab-label, font-weight-tab-label
- **Content:** "Library"
- **Scope:** local

---

## StatusBarArea

- **Type:** container
- **Parent:** DurationPickerScreen
- **Children:** StatusBarTime, DynamicIsland, StatusBarSignal, StatusBarWifi, StatusBarBattery
- **Tokens:** color-text-primary
- **Content:** none
- **Asset:** none
- **Scope:** local
- **Note:** OS-managed status bar. App controls style (light icons on dark background). Individual children are OS-rendered — not app components.

---

## StatusBarTime

- **Type:** text
- **Parent:** StatusBarArea
- **Children:** none
- **Tokens:** color-text-primary, font-size-status-time, font-weight-status-time
- **Content:** "9:41" (OS-rendered system clock)
- **Scope:** local

---

## DynamicIsland

- **Type:** container
- **Parent:** StatusBarArea
- **Children:** none
- **Tokens:** none (OS-rendered pill cutout — pure black)
- **Content:** none
- **Scope:** local

---

## StatusBarSignal

- **Type:** icon
- **Parent:** StatusBarArea
- **Children:** none
- **Tokens:** color-text-primary
- **Content:** none
- **Asset:** none (OS-rendered)
- **Scope:** local

---

## StatusBarWifi

- **Type:** icon
- **Parent:** StatusBarArea
- **Children:** none
- **Tokens:** color-text-primary
- **Content:** none
- **Asset:** none (OS-rendered)
- **Scope:** local

---

## StatusBarBattery

- **Type:** icon
- **Parent:** StatusBarArea
- **Children:** none
- **Tokens:** color-text-primary
- **Content:** none
- **Asset:** none (OS-rendered)
- **Scope:** local

---

## Component Hierarchy Summary

```
DurationPickerScreen
├── StatusBarArea (OS-managed)
│   ├── StatusBarTime
│   ├── DynamicIsland
│   ├── StatusBarSignal
│   ├── StatusBarWifi
│   └── StatusBarBattery
├── DimmedHomeBackground
├── DimOverlay
└── BottomSheetModal
    ├── SheetDragHandle
    ├── ArticlePreviewCard
    │   ├── ArticleThumbnail
    │   └── ArticleCardContent
    │       ├── ArticleTitle
    │       └── ArticleMetadata
    ├── EpisodeLengthSection
    │   ├── EpisodeLengthLabel
    │   └── DurationChipRow
    │       ├── SummaryChip
    │       │   ├── SummaryChipDuration
    │       │   └── SummaryChipLabel
    │       ├── StandardChip
    │       │   ├── SparkleIcon
    │       │   ├── StandardChipDuration
    │       │   └── StandardChipLabel
    │       └── ReadAloudChip
    │           ├── ReadAloudChipDuration
    │           └── ReadAloudChipLabel
    ├── CreateEpisodeCTA
    │   └── CreateEpisodeCTALabel
    └── BottomNavBar
        ├── HomeTab
        │   ├── HomeTabIcon
        │   └── HomeTabLabel
        └── LibraryTab
            ├── LibraryTabIcon
            └── LibraryTabLabel
```

Total components: 38
