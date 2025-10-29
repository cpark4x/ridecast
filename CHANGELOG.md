# Changelog

All notable changes to the Ridecast project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Spotify-inspired library redesign** with professional table layout
  - Clean table structure with column headers: # | TITLE | AUTHOR | STATUS | DURATION
  - Single green accent color (#1DB954) for play button
  - Hover-based action buttons (convert, download, compress, delete)
  - Gray color scheme for secondary actions
  - Improved information density with compact rows
  - Play button appears on hover in the number column for converted items
  - Action icons appear on the right side on row hover

- **User-friendly compression panel**
  - Changed button labels from technical percentages (20%, 40%, 60%) to clear options:
    - "Quick Summary" (save ~20% time)
    - "Main Points" (save ~40% time)
    - "Essential Only" (save ~60% time)
  - Display time estimates instead of word counts ("4 min listening time" vs "637 words")
  - Show time savings ("~31 min shorter" instead of "Saved 4,669 words")
  - Added descriptive badges explaining each compression level
  - Success message shows actual time saved and new listening duration

### Fixed
- **Backend compression response format**
  - Fixed field name mismatch between backend (snake_case) and frontend (camelCase)
  - Backend now returns `originalWordCount`, `compressedWordCount`, etc.
  - Prevents "Cannot read properties of undefined" crashes in frontend

### Changed
- **Library page visual design**
  - Removed rainbow buttons (green, purple, orange, red) with no hierarchy
  - Replaced stacked vertical buttons with hover-based icon buttons
  - Improved status badges (✓ Ready, Converting..., Not converted)
  - Voice selector and compression panel now expand below rows instead of inline
  - Enhanced hover states with smooth transitions

### Technical Details
- Updated `library-page-enhanced.tsx` (303 lines changed)
- Updated `compression-panel.tsx` (137 lines changed)
- Updated `backend/src/services/compression/controller.ts` (18 lines changed)
- Updated `web/src/app/globals.css` (57 lines changed)

## [0.1.0] - 2025-10-28

### Initial Release
- Full-stack podcast creation platform
- Text-to-Speech conversion with Azure Cognitive Services
- Background job processing with Bull Queue
- Large file support with chunking (10-minute Azure TTS limit)
- Text compression using Amplifier CLI tools
- Audio player with playback controls
- PostgreSQL database with content, jobs, and compression tables
- Redis queue management
- AWS S3 audio file storage

---

**Design Philosophy**: Following Spotify and Audible's clean, minimal design patterns.
**User Focus**: High school student-friendly language and clear time-based messaging.
