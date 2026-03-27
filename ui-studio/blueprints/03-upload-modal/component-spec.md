# Component Spec — 03 Upload Modal

> Screen: Upload Modal (bottom sheet overlay over dimmed Home)
> Nav shell: **Exempt** — per `nav-shell.md`, Upload Modal is a fullscreen bottom-sheet overlay; the tab bar visible below is the persistent app-shell bleeding through the scrim.

---

## UploadModalScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** ScrimOverlay, UploadModalSheet, AppShellTabBar, HomeIndicatorArea
- **Tokens:** color-background-screen
- **Content:** none
- **Scope:** local

---

## ScrimOverlay

- **Type:** container
- **Parent:** UploadModalScreen
- **Children:** BackgroundHomeContent
- **Tokens:** color-scrim-overlay
- **Content:** none
- **Notes:** Full-screen semi-transparent dark layer; positioned absolute, covers entire screen behind the sheet. Reveals the dimmed home content through it.

---

## BackgroundHomeContent

- **Type:** container
- **Parent:** ScrimOverlay
- **Children:** BackgroundGreetingText, BackgroundHeadphonesIllustration
- **Tokens:** spacing-screen-margin
- **Content:** none
- **Notes:** The Home screen background content (greeting + headphones illustration) visible through the scrim. Visually dimmed by the overlay. Not interactive in this modal context.

---

## BackgroundGreetingText

- **Type:** container
- **Parent:** BackgroundHomeContent
- **Children:** GreetingLine, SubgreetingLine
- **Tokens:** spacing-md
- **Content:** none

---

## GreetingLine

- **Type:** text
- **Parent:** BackgroundGreetingText
- **Children:** none
- **Tokens:** font-size-display, font-weight-bold, color-text-primary
- **Content:** "Good morning"

---

## SubgreetingLine

- **Type:** text
- **Parent:** BackgroundGreetingText
- **Children:** none
- **Tokens:** font-size-h2, font-weight-regular, color-text-secondary
- **Content:** "Ready to listen?"

---

## BackgroundHeadphonesIllustration

- **Type:** image
- **Parent:** BackgroundHomeContent
- **Children:** none
- **Tokens:** (no token — asset reference only)
- **Content:** [dynamic]
- **Asset:** headphones-illustration

---

## AppShellTabBar

- **Type:** app-shell
- **Parent:** UploadModalScreen
- **Children:** TabHome, TabLibrary
- **Tokens:** color-surface-card, color-border-top, tab-bar-height
- **Content:** none
- **Scope:** app-shell
- **Notes:** Persistent bottom navigation bar. Visible through/below the modal sheet. Defined in nav-shell.md. Renders in root layout on every non-exempt route.

---

## TabHome

- **Type:** button
- **Parent:** AppShellTabBar
- **Children:** TabHomeIcon, TabHomeLabel
- **Tokens:** color-accent-primary (active state icon + label), spacing-xs
- **Content:** none
- **Notes:** Active state in this screen view.

---

## TabHomeIcon

- **Type:** icon
- **Parent:** TabHome
- **Children:** none
- **Tokens:** color-accent-primary, icon-size-nav
- **Content:** none
- **Asset:** icon-tab-home

---

## TabHomeLabel

- **Type:** text
- **Parent:** TabHome
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-accent-primary
- **Content:** "Home"

---

## TabLibrary

- **Type:** button
- **Parent:** AppShellTabBar
- **Children:** TabLibraryIcon, TabLibraryLabel
- **Tokens:** color-text-inactive, spacing-xs
- **Content:** none
- **Notes:** Inactive state.

---

## TabLibraryIcon

- **Type:** icon
- **Parent:** TabLibrary
- **Children:** none
- **Tokens:** color-text-inactive, icon-size-nav
- **Content:** none
- **Asset:** icon-tab-library

---

## TabLibraryLabel

- **Type:** text
- **Parent:** TabLibrary
- **Children:** none
- **Tokens:** font-size-micro, font-weight-regular, color-text-inactive
- **Content:** "Library"

---

## HomeIndicatorArea

- **Type:** container
- **Parent:** UploadModalScreen
- **Children:** none
- **Tokens:** color-background-screen
- **Content:** none
- **Notes:** The iOS safe-area strip below the tab bar containing the system home indicator bar. App renders a transparent/background-colored container to respect the safe area inset. The white indicator bar itself is OS-drawn.

---

## UploadModalSheet

- **Type:** container
- **Parent:** UploadModalScreen
- **Children:** SheetHandle, PasteLinkSection, OrDividerRow, DropZone
- **Tokens:** color-surface-card, radius-bottom-sheet-top, spacing-md
- **Content:** none
- **Notes:** Bottom sheet modal. Rounded top corners (14px). Positioned at bottom of screen, slides up over dimmed content.

---

## SheetHandle

- **Type:** container
- **Parent:** UploadModalSheet
- **Children:** none
- **Tokens:** color-handle, radius-pill, spacing-xs
- **Content:** none
- **Notes:** Small horizontal pill (approx 36×4px) centered at the top of the sheet. Indicates drag-to-dismiss interaction.

---

## PasteLinkSection

- **Type:** container
- **Parent:** UploadModalSheet
- **Children:** PasteLinkTitle, UrlInputRow
- **Tokens:** spacing-screen-margin, spacing-sm
- **Content:** none

---

## PasteLinkTitle

- **Type:** text
- **Parent:** PasteLinkSection
- **Children:** none
- **Tokens:** font-size-h1, font-weight-semibold, color-text-primary
- **Content:** "Paste a link"

---

## UrlInputRow

- **Type:** container
- **Parent:** PasteLinkSection
- **Children:** UrlInputField, FetchButton
- **Tokens:** color-surface-elevated, radius-md, spacing-sm
- **Content:** none
- **Notes:** Wraps the text input and the Fetch pill button side-by-side within one pill-shaped container. Full-width row.

---

## UrlInputField

- **Type:** input
- **Parent:** UrlInputRow
- **Children:** none
- **Tokens:** font-size-body, font-weight-regular, color-text-placeholder, color-surface-elevated
- **Content:** "https://article-url.com" (placeholder)
- **Notes:** Takes up the majority of the input row width. No visible border — shares the row background.

---

## FetchButton

- **Type:** button
- **Parent:** UrlInputRow
- **Children:** none
- **Tokens:** color-accent-primary, color-button-text-on-accent, radius-pill, font-size-body, font-weight-semibold
- **Content:** "Fetch"
- **Notes:** Orange pill button, right-aligned inside the input row. Text color is very dark (near-black) for contrast on orange.

---

## OrDividerRow

- **Type:** container
- **Parent:** UploadModalSheet
- **Children:** OrDividerLineLeft, OrLabel, OrDividerLineRight
- **Tokens:** spacing-screen-margin, spacing-md
- **Content:** none
- **Notes:** Full-width row. Three children laid out horizontally: line + pill label + line.

---

## OrDividerLineLeft

- **Type:** container
- **Parent:** OrDividerRow
- **Children:** none
- **Tokens:** color-border-divider, border-width-default
- **Content:** none
- **Notes:** Thin 1px horizontal line occupying the left half of the row.

---

## OrLabel

- **Type:** text
- **Parent:** OrDividerRow
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary, spacing-xs
- **Content:** "or"
- **Notes:** Small pill centered between the two divider lines. Light gray text.

---

## OrDividerLineRight

- **Type:** container
- **Parent:** OrDividerRow
- **Children:** none
- **Tokens:** color-border-divider, border-width-default
- **Content:** none
- **Notes:** Thin 1px horizontal line occupying the right half of the row.

---

## DropZone

- **Type:** container
- **Parent:** UploadModalSheet
- **Children:** DropZoneUploadIcon, DropZonePrimaryText, DropZoneSecondaryText
- **Tokens:** color-border-dropzone, radius-md, spacing-lg, spacing-screen-margin
- **Content:** none
- **Notes:** Large interactive rectangle with dashed border (`rgba(255,255,255,0.12)`). Full width within sheet margins. Tap triggers file picker. Drag target for file drops. Children centered vertically and horizontally.

---

## DropZoneUploadIcon

- **Type:** icon
- **Parent:** DropZone
- **Children:** none
- **Tokens:** color-text-secondary, icon-size-lg
- **Content:** none
- **Asset:** icon-upload-cloud

---

## DropZonePrimaryText

- **Type:** text
- **Parent:** DropZone
- **Children:** none
- **Tokens:** font-size-body, font-weight-medium, color-text-primary
- **Content:** "Drop a file or tap to browse"

---

## DropZoneSecondaryText

- **Type:** text
- **Parent:** DropZone
- **Children:** none
- **Tokens:** font-size-caption, font-weight-regular, color-text-secondary
- **Content:** "PDF, EPUB, or text file"
