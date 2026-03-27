# Component Spec — 08 Expanded Player
> Ridecast · Full-screen immersive player · Exempt from nav shell (no tab bar, no mini player)

---

## ExpandedPlayerScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** TopBar, ArtworkSection, MetadataSection, ScrubberSection, TransportSection, UtilityRow, SectionsPreview
- **Tokens:** color-background-screen, shadow-atmospheric
- **Content:** full-screen background with teal atmospheric color bleed
- **Scope:** local

---

## TopBar

- **Type:** container
- **Parent:** ExpandedPlayerScreen
- **Children:** CollapseChevron, NowPlayingLabel, ShareIcon
- **Tokens:** spacing-screen-margin, spacing-top-bar-height, color-background-screen
- **Content:** horizontal row, space-between layout, centered vertically

---

## CollapseChevron

- **Type:** icon
- **Parent:** TopBar
- **Children:** none
- **Tokens:** color-icon-default, spacing-top-bar-icon-size
- **Content:** none
- **Asset:** icon-collapse-chevron

---

## NowPlayingLabel

- **Type:** text
- **Parent:** TopBar
- **Children:** none
- **Tokens:** color-text-secondary, font-size-now-playing, font-weight-now-playing
- **Content:** "Now Playing"

---

## ShareIcon

- **Type:** icon
- **Parent:** TopBar
- **Children:** none
- **Tokens:** color-icon-default, spacing-top-bar-icon-size
- **Content:** none
- **Asset:** icon-share

---

## ArtworkSection

- **Type:** container
- **Parent:** ExpandedPlayerScreen
- **Children:** AtmosphericBackground, ArtworkCard
- **Tokens:** spacing-screen-margin, spacing-artwork-top-gap, spacing-artwork-size
- **Content:** centered square artwork with atmospheric glow behind it

---

## AtmosphericBackground

- **Type:** background
- **Parent:** ArtworkSection
- **Children:** none
- **Tokens:** color-atmospheric-teal-blended, shadow-atmospheric
- **Content:** none
- **Asset:** bg-atmospheric-teal-glow

---

## ArtworkCard

- **Type:** image
- **Parent:** ArtworkSection
- **Children:** none
- **Tokens:** spacing-artwork-size, radius-artwork, shadow-artwork-depth
- **Content:** none
- **Asset:** artwork-crispr-episode

---

## MetadataSection

- **Type:** container
- **Parent:** ExpandedPlayerScreen
- **Children:** EpisodeTitle, PodcastName, SourceMeta, FavoriteButton
- **Tokens:** spacing-screen-margin, spacing-metadata-top-gap, color-background-screen
- **Content:** left-aligned text stack with favorite button right-aligned

---

## EpisodeTitle

- **Type:** text
- **Parent:** MetadataSection
- **Children:** none
- **Tokens:** color-text-primary, font-size-episode-title, font-weight-episode-title, font-letter-spacing-episode-title
- **Content:** [dynamic] episode title (e.g. "CRISPR and the Future of Medicine")

---

## PodcastName

- **Type:** text
- **Parent:** MetadataSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-podcast-name, font-weight-podcast-name
- **Content:** [dynamic] podcast series name (e.g. "Science Explained")

---

## SourceMeta

- **Type:** text
- **Parent:** MetadataSection
- **Children:** none
- **Tokens:** color-text-tertiary, font-size-source-meta, font-weight-source-meta
- **Content:** [dynamic] author or source attribution

---

## FavoriteButton

- **Type:** button
- **Parent:** MetadataSection
- **Children:** none
- **Tokens:** color-icon-default, spacing-metadata-icon-size
- **Content:** none
- **Asset:** icon-heart-outline

---

## ScrubberSection

- **Type:** container
- **Parent:** ExpandedPlayerScreen
- **Children:** ScrubberTrack, ElapsedTime, RemainingTime
- **Tokens:** spacing-screen-margin, spacing-scrubber-top-gap
- **Content:** progress bar with timestamps underneath

---

## ScrubberTrack

- **Type:** container
- **Parent:** ScrubberSection
- **Children:** ScrubberFilled, ScrubberHandle, ScrubberEmpty
- **Tokens:** color-scrubber-track, spacing-scrubber-height, radius-scrubber-track
- **Content:** full-width track bar at ~35% playback progress

---

## ScrubberFilled

- **Type:** container
- **Parent:** ScrubberTrack
- **Children:** none
- **Tokens:** color-scrubber-filled, spacing-scrubber-height, radius-scrubber-track
- **Content:** orange-filled portion, approximately 35% width

---

## ScrubberHandle

- **Type:** container
- **Parent:** ScrubberTrack
- **Children:** none
- **Tokens:** color-scrubber-handle, spacing-scrubber-handle-size, radius-scrubber-handle, shadow-scrubber-handle
- **Content:** white circular drag handle at junction of filled/empty track

---

## ScrubberEmpty

- **Type:** container
- **Parent:** ScrubberTrack
- **Children:** none
- **Tokens:** color-scrubber-track, spacing-scrubber-height, radius-scrubber-track
- **Content:** unfilled track portion after handle, approximately 65% width

---

## ElapsedTime

- **Type:** text
- **Parent:** ScrubberSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-timestamp, font-weight-timestamp, font-variant-timestamp
- **Content:** [dynamic] elapsed playback time (e.g. "12:34")

---

## RemainingTime

- **Type:** text
- **Parent:** ScrubberSection
- **Children:** none
- **Tokens:** color-text-secondary, font-size-timestamp, font-weight-timestamp, font-variant-timestamp
- **Content:** [dynamic] remaining time with minus sign (e.g. "-28:45")

---

## TransportSection

- **Type:** container
- **Parent:** ExpandedPlayerScreen
- **Children:** TransportControls
- **Tokens:** spacing-screen-margin, spacing-transport-top-gap
- **Content:** centered horizontal row of transport controls

---

## TransportControls

- **Type:** container
- **Parent:** TransportSection
- **Children:** RewindButton, PlayPauseButton, ForwardButton
- **Tokens:** color-background-screen
- **Content:** space-between layout, vertically centered on PlayPauseButton

---

## RewindButton

- **Type:** button
- **Parent:** TransportControls
- **Children:** none
- **Tokens:** color-icon-active, spacing-transport-skip-size
- **Content:** none
- **Asset:** icon-rewind-15

---

## PlayPauseButton

- **Type:** button
- **Parent:** TransportControls
- **Children:** none
- **Tokens:** color-text-primary, color-background-screen, spacing-transport-play-size, radius-play-pause-button
- **Content:** none
- **Asset:** icon-pause

---

## ForwardButton

- **Type:** button
- **Parent:** TransportControls
- **Children:** none
- **Tokens:** color-icon-active, spacing-transport-skip-size
- **Content:** none
- **Asset:** icon-forward-30

---

## UtilityRow

- **Type:** container
- **Parent:** ExpandedPlayerScreen
- **Children:** UtilityControls
- **Tokens:** spacing-screen-margin, spacing-utility-top-gap
- **Content:** horizontal row of 5 equally-spaced utility buttons

---

## UtilityControls

- **Type:** container
- **Parent:** UtilityRow
- **Children:** SpeedButton, SleepButton, CarModeButton, ReadAlongButton, AirPlayButton
- **Tokens:** color-background-screen
- **Content:** space-between layout, 5 buttons full width

---

## SpeedButton

- **Type:** button
- **Parent:** UtilityControls
- **Children:** none
- **Tokens:** color-text-primary, font-size-speed-label, font-weight-speed-label, color-surface-chapter-active, radius-speed-button, spacing-utility-button-size
- **Content:** "1.0×"

---

## SleepButton

- **Type:** button
- **Parent:** UtilityControls
- **Children:** none
- **Tokens:** color-icon-default, spacing-utility-icon-size, spacing-utility-button-size
- **Content:** none
- **Asset:** icon-sleep-timer

---

## CarModeButton

- **Type:** button
- **Parent:** UtilityControls
- **Children:** none
- **Tokens:** color-icon-default, spacing-utility-icon-size, spacing-utility-button-size
- **Content:** none
- **Asset:** icon-car-mode

---

## ReadAlongButton

- **Type:** button
- **Parent:** UtilityControls
- **Children:** none
- **Tokens:** color-icon-default, spacing-utility-icon-size, spacing-utility-button-size
- **Content:** none
- **Asset:** icon-read-along

---

## AirPlayButton

- **Type:** button
- **Parent:** UtilityControls
- **Children:** none
- **Tokens:** color-icon-default, spacing-utility-icon-size, spacing-utility-button-size
- **Content:** none
- **Asset:** icon-airplay

---

## SectionsPreview

- **Type:** container
- **Parent:** ExpandedPlayerScreen
- **Children:** SectionsHeader, ChapterListContainer
- **Tokens:** color-surface-sections, spacing-sections-top-gap, spacing-screen-margin
- **Content:** peek of the chapters list — partially visible, implies scrollability

---

## SectionsHeader

- **Type:** text
- **Parent:** SectionsPreview
- **Children:** none
- **Tokens:** color-text-primary, font-size-sections-header, font-weight-sections-header
- **Content:** "Sections"

---

## ChapterListContainer

- **Type:** list
- **Parent:** SectionsPreview
- **Children:** ChapterItem1, ChapterItem2, ChapterItem3
- **Tokens:** color-surface-sections, color-divider, spacing-chapter-row-height
- **Content:** scrollable list of chapter items, first 2–3 visible (peek)

---

## ChapterItem1

- **Type:** container
- **Parent:** ChapterListContainer
- **Children:** none
- **Tokens:** color-surface-sections, color-text-primary, color-text-tertiary, font-size-chapter-title, font-weight-chapter-title, font-size-chapter-timestamp, spacing-chapter-row-height, spacing-chapter-thumbnail-size, radius-chapter-thumbnail, color-accent-primary
- **Content:** [dynamic] chapter title + timestamp; leftmost item may have orange active indicator
- **Asset:** chapter-thumbnail-1

---

## ChapterItem2

- **Type:** container
- **Parent:** ChapterListContainer
- **Children:** none
- **Tokens:** color-surface-sections, color-text-primary, color-text-tertiary, font-size-chapter-title, font-weight-chapter-title, font-size-chapter-timestamp, spacing-chapter-row-height, spacing-chapter-thumbnail-size, radius-chapter-thumbnail
- **Content:** [dynamic] chapter title + timestamp
- **Asset:** chapter-thumbnail-2

---

## ChapterItem3

- **Type:** container
- **Parent:** ChapterListContainer
- **Children:** none
- **Tokens:** color-surface-sections, color-text-primary, color-text-tertiary, font-size-chapter-title, font-weight-chapter-title, font-size-chapter-timestamp, spacing-chapter-row-height, spacing-chapter-thumbnail-size, radius-chapter-thumbnail
- **Content:** [dynamic] chapter title + timestamp — partially cropped at bottom edge (peek indicator)
- **Asset:** chapter-thumbnail-3
