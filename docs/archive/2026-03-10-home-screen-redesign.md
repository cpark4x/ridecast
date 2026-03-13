# Home Screen Redesign

## Problem

The current HomeScreen has multiple UX issues that make the app hard to use:

1. No way to tell which episodes have been listened to
2. Not all episodes have titles — some show blank or unhelpful text
3. 5 minutes is too long as the shortest duration option — some articles are very short
4. No visual distinction between different content items — every card looks identical
5. Sort order is unlabeled — users don't know why things are in a particular order
6. "Your commute is 5 minutes" is awkward copy that doesn't serve the user
7. "Narrator" label on every card is an implementation detail, not useful to users
8. Home and Library are nearly redundant — both show the same data with minor cosmetic differences
9. The tab bar gives equal billing to Upload and Settings, which are infrequent actions

## Design Decisions

### Information Architecture — New Tab Structure

Old: `Home | Library | Upload | Settings` (4 tabs)
New: `Home | Library` (2 tabs) + floating `+` action button + gear icon in header

- **Home** — focused entirely on playback. "What should I listen to?" Shows unlistened content, currently playing, auto-queue.
- **Library** — content management. Everything the user has uploaded/processed. Grouped by content item, status badges, version management.
- **Upload** — demoted from a tab to a `+` floating action button (bottom-right). Opens as a sheet/modal. Upload is an occasional action, not a destination.
- **Settings** — demoted from a tab to a gear icon in the top-right header. Visited rarely.
- **Discover** — deferred. When content discovery exists, it surfaces as a "For You" section on the Home page, not a separate tab.

### Home Screen — "Your Queue" Design

#### Header

- Time-based greeting: "Good morning" / "Good afternoon" / "Good evening"
- Subtitle: "{duration} min \u00b7 {count} episodes" — embeds the user's time setting naturally without awkward "Your commute is X" copy
- Gear icon top-right for Settings access

#### Play CTA

- Full-width accent-colored button: "\u25b6 Play All"
- Starts a queue of episodes that fit the user's available time
- Auto-advances between episodes (requires PlayerContext queue support)

#### Currently Playing Card

- Appears only when audio is active
- Shows: title, source type + age, progress bar with time remaining, play/pause control
- Left side: color-coded gradient square with source-type icon
- Visually distinct from Up Next cards (larger, has playback controls)

#### Up Next Queue

- Section header: "Up Next" with "Recent" sort indicator chip
- Shows only UNLISTENED episodes (listened episodes live in Library only)
- One card per content item (not one card per version — shortest version that fits available time)
- Each card shows:
  - Left: color-coded gradient square (cycles through orange \u2192 pink \u2192 teal \u2192 amber) with source-type icon (PDF, URL/link, book/EPUB, text/TXT)
  - Title (bold, max 2 lines, truncated)
  - Subtitle: "{sourceType} \u00b7 {timeAgo}" (e.g. "PDF \u00b7 1d ago")
  - Duration badge on right (e.g. "5:30")
- Partially-listened episodes show a progress bar at the bottom of the card
- No "narrator" or "conversation" format labels
- No "X min target" labels
- Sort order: newest first (labeled with "Recent" chip)

#### For You Section (future, when discovery exists)

- Appears below the personal queue after scrolling
- Section header: "For You" with "Popular" chip
- Subtitle: "Trending articles to listen to"
- Different card style from personal queue: category-colored left border, category tag, source name, estimated listen duration, "+" add button
- Tapping "+" adds content to user's Library for processing
- Discovery content is visually distinct from personal content

### Fixes Addressed by This Design

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Can't tell what's listened | Listened episodes removed from Home entirely. Partially-listened show progress bar. |
| 2 | Missing titles | Fallback logic: if title is empty, use source URL domain or filename. API layer fix. |
| 3 | 5 min shortest is too long | Add 2-minute and 3-minute presets. Change slider min from 5 to 2. |
| 4 | No visual distinction | Color-cycling gradient squares with source-type icons (ported from LibraryScreen). |
| 5 | Unknown sort order | "Recent" chip label next to "Up Next" header. |
| 6 | Weird commute text | Replaced with natural subtitle: "45 min \u00b7 3 episodes". |
| 7 | "Narrator" on every card | Removed. Subtitle now shows source type + age instead. |
| 8 | Home/Library redundant | Home = unlistened queue for playback. Library = everything, all statuses, content management. Clear separation. |
| 9 | Upload/Settings as tabs | Upload \u2192 floating + button. Settings \u2192 gear icon in header. |

### Data / API Changes Required

The current `/api/library` endpoint does NOT return playback state. These changes are needed:

1. **API: Join PlaybackState** — `GET /api/library` must join `PlaybackState` for each audio record, returning `completed` (boolean) and `position` (float). The data exists in the DB (`PlaybackState` model) but is never queried by the library endpoint.

2. **API: Return author field** — `Content.author` exists in the schema but is not included in the API response. Add it.

3. **PlayerContext: Add queue support** — `play(item)` takes a single item. Need `playQueue(items[])` with auto-advance on `ended` event. The "Play All" button depends on this.

4. **PlayerContext: Fix hardcoded userId** — `PlayerContext` hardcodes `userId: "default-user"` when persisting playback state. Must use actual Clerk user ID.

5. **HomeScreen: Title fallback** — When `title` is empty/blank, derive a fallback from `sourceUrl` (domain name) or `sourceType + createdAt`.

6. **UploadScreen: Shorter durations** — Add 2-min and 3-min presets. Change slider min from 5 to 2.

### Mockup

Visual mockup: `docs/mockups/home/home-daily-drive.html` — open in any browser, no server needed.

### Out of Scope

- Content discovery pipeline (the "For You" section is designed but the backend doesn't exist yet)
- Newsletter/RSS subscription feature
- Native mobile app
- Browser extension
- Sort controls (single sort order for now: newest first)
- font-semibold \u2192 font-bold typography migration (cosmetic, separate PR)