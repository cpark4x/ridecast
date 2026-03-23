# Native iOS App — Design

**Date:** 2026-03-11
**Status:** Approved
**Approach:** B — Native client with local SQLite cache

---

## Summary

Ship Ridecast as a native iOS app using Expo (React Native). The native app calls the existing Next.js API — no backend changes. A local SQLite database caches library metadata for speed and offline resilience. Episodes auto-download after generation. The app includes the full pipeline: upload, process, generate, and play.

---

## Decisions

| Decision | Choice |
|---|---|
| Platform | iOS only, Expo managed workflow |
| Scope | Full pipeline (upload + process + generate + play), everything except Pocket Import |
| Architecture | Native client with local SQLite cache layer |
| Audio model | Hybrid — own episodes auto-download, discovery content streams, play button just works |
| Audio library | react-native-track-player |
| CarPlay | @g4rb4g3/react-native-carplay, ships if Apple entitlement approved in time |
| Auth | Clerk (@clerk/clerk-expo), sign-in wall at launch with value prop screen |
| Navigation | Expo Router (file-based, 2 tabs + stack) |
| Styling | NativeWind (Tailwind for React Native) |
| Project structure | ridecast2/native/ — separate directory, own package.json |
| Backend changes | None — native app calls existing API |
| Push notifications | Not in v1 |

---

## Project Structure

```
ridecast2/
├── native/                    ← new Expo app
│   ├── app/                   ← Expo Router file-based routing
│   │   ├── (tabs)/            ← tab navigator
│   │   │   ├── index.tsx      ← Home (Daily Drive)
│   │   │   └── library.tsx    ← Library
│   │   ├── processing.tsx     ← Processing screen (push route)
│   │   ├── settings.tsx       ← Settings (push route)
│   │   └── _layout.tsx        ← root layout (auth gate + player provider)
│   ├── components/            ← React Native components
│   │   ├── PlayerBar.tsx      ← mini player
│   │   ├── ExpandedPlayer.tsx
│   │   ├── CarMode.tsx
│   │   ├── UploadModal.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts             ← API client (talks to Next.js backend)
│   │   ├── db.ts              ← SQLite local cache (expo-sqlite)
│   │   ├── player.ts          ← react-native-track-player setup
│   │   ├── downloads.ts       ← auto-download manager
│   │   └── sync.ts            ← background sync (local <-> server)
│   ├── app.json               ← Expo config
│   ├── package.json
│   └── tsconfig.json
├── src/                       ← existing Next.js web app (unchanged)
├── prisma/
└── package.json
```

Expo Router for navigation. Two tabs (Home + Library) with Processing and Settings as push routes. Separate native/ directory — web app is untouched. No monorepo tooling, no shared packages.

---

## Dependencies

| Concern | Library | Notes |
|---|---|---|
| Audio playback | react-native-track-player | Background audio, lock screen, CarPlay. Pin to known-good version. |
| CarPlay | @g4rb4g3/react-native-carplay | Active fork of react-native-carplay. Apply for Apple entitlement ASAP. |
| Navigation | expo-router | File-based routing. |
| Auth | @clerk/clerk-expo | Drop-in replacement for @clerk/nextjs. Apple Sign In support. |
| Local DB | expo-sqlite | Cache library data, download state, playback positions. |
| File storage | expo-file-system | Download and manage MP3 files on device. |
| Styling | nativewind | Tailwind CSS for React Native. Same class names as web app. |
| Document picker | expo-document-picker | File upload from iOS Files app. |

Not included: no state management library (React Context is sufficient), no React Query (simple fetch + SQLite), no shared packages with the web app.

---

## Data Architecture

The server (existing Next.js API) is the source of truth. The native app caches a copy locally for speed and offline use.

### Sync Model

| Data | Strategy |
|---|---|
| Episode list (library) | Fetch from /api/library on launch, cache in SQLite. Refresh on pull-to-refresh and after upload completes. Full fetch — library is small enough. |
| Playback position | Save to SQLite on every pause/seek/5s interval. Sync to /api/playback when online. On launch, compare local vs. server timestamp, keep newer. |
| MP3 files | Auto-download after generation completes. Store in app documents directory. No automatic deletion. |
| Upload queue | If offline, save upload intent locally. Execute when connectivity returns. |

### What's Not Cached Locally

- Scripts and raw content text. Read Along fetches on demand.
- User/account data beyond Clerk SDK cache.
- No sync conflict resolution beyond "newer timestamp wins" — data is append-mostly and conflict-free.

### Storage Cleanup

Not in v1. Episodes are small (5-15MB). Watch for v2 if users accumulate 200+ episodes — add "remove played downloads after 30 days" option.

---

## Audio Player & Playback

react-native-track-player manages a system-level audio service. It runs outside the React lifecycle — audio continues when the app is backgrounded, screen is locked, or CarPlay is active.

### Feature Mapping (Web to Native)

| Feature | Web (PlayerContext) | Native (RNTP) |
|---|---|---|
| Play / pause / seek | audio element methods | TrackPlayer.play/pause/seekTo |
| Queue & auto-advance | Manual queue[] + queueIndex | Built-in queue with TrackPlayer.add/skip |
| Speed control | audio.playbackRate | TrackPlayer.setRate() |
| Smart Resume (3s rewind) | Custom logic in PlayerContext | Same logic, triggered on play after threshold |
| Position persistence | POST /api/playback every 5s | Save to SQLite immediately, sync to server when online |
| Sleep timer | setTimeout in React context | TrackPlayer event listener + timer. Works backgrounded. |
| Lock screen controls | N/A | Automatic via MPNowPlayingInfoCenter |
| Background audio | N/A | Automatic — RNTP foreground service |
| CarPlay Now Playing | N/A | Near-automatic — RNTP media session |

### Key Differences from Web

1. Queue is native, not manual. RNTP has built-in queue management. Less custom code.
2. Position saves to SQLite first, server second. Survives airplane mode, app kill, crashes.
3. Player lifecycle persists beyond React tree. Initialize once at startup.

### CarPlay Browsable Library

Beyond Now Playing, users can browse and start episodes from the car screen:

```
CarPlay root
├── Now Playing        ← automatic from RNTP
├── Up Next            ← current queue
└── Library            ← recent episodes
```

Three templates, 1-2 levels deep. Apple limits list depth to 5.

---

## Audio Playback Model

Hybrid approach inspired by Apple Podcasts:

- **Your own episodes** — auto-download MP3 when generation finishes. Playback always from local file. No buffering, no connectivity dependency.
- **Discovery content (future)** — stream on tap. Download if user adds to library.
- **The play button never asks the user what to do.** It plays from local file if available, streams if not.

This is simpler than pure download-first or pure streaming because own episodes are always available locally (you control when they're created) and there's no user-facing download management.

---

## Core Workflows

### 1. Create an Episode

Tap FAB → Upload modal → paste URL or pick file → choose duration + format → Processing screen (analyze → script → generate) → MP3 auto-downloads → "Listen now" starts playback → episode appears in Home and Library.

### 2. Commute Playback

Open app → Home shows greeting + episode count → tap "Play All" → queue loads, playback starts → lock phone → lock screen controls work → episodes auto-advance → arrive, pause → position saved locally + synced to server.

### 3. CarPlay

Phone connects to car → CarPlay shows Ridecast → Now Playing with controls → browse Up Next and Library from car screen → steering wheel controls → episodes auto-advance. No phone interaction needed. Episodes already downloaded.

### 4. Resume Listening

Open app (hours/days later) → Home shows current episode with progress → tap play → Smart Resume rewinds 3s → same position whether you left from web, native, or CarPlay.

### 5. Browse Library

Library tab → search (instant, local SQLite filter) → filter chips (All / In Progress / Completed / Generating) → tap episode to play → tap version pill for different duration.

### 6. Offline Playback

No explicit workflow. Episodes are already downloaded. Tap play. It works. User never thinks about offline.

### 7. Cross-Device Sync

Create episode on web → open native app → library refreshes from API → new episode appears → MP3 auto-downloads → ready to play. Seamless, no user action.

### 8. Error Recovery

Processing fails at any stage → error state with "Retry" button → retry resumes from failed stage. App kill mid-processing → episode shows as "Generating" in Library on relaunch. App is never stuck.

### 9. Episode Versioning

Library → episode menu → "New version" → pick different duration → processing runs → both versions appear as duration pills on episode card → tap pill to switch.

### 10. First Launch

Download from App Store → value prop screen → sign in (Apple Sign In / email via Clerk) → if existing web user, library syncs and episodes appear → if new user, empty Home with "Paste a URL to create your first episode" CTA.

---

## Screens

### Home (Daily Drive)
Time-based greeting, episode count + total duration. "Play All" button loads unlistened episodes into queue. Currently Playing card with progress bar. Up Next list (unlistened only, sorted by recency). Data from SQLite cache, background API refresh.

### Library
Search bar (local SQLite filter). Filter chips: All / In Progress / Completed / Generating. Episode cards with source type badges, progress bars, version pills. Tap to play, long press for menu (version picker, delete).

### Upload Modal
Bottom sheet from FAB. Paste URL or pick file (expo-document-picker). Duration preset selector. Format selector (narrator / conversation). Submit navigates to Processing.

### Processing Screen
4-stage progress: analyzing → scripting → generating → ready. Calls /api/upload, /api/process, /api/audio/generate. Per-stage retry on failure. On completion: auto-download MP3, add to SQLite, start playback or navigate to Home.

### Expanded Player
Full-screen overlay from PlayerBar tap. Artwork with dynamic gradient. Scrubber with position / time remaining. Skip back 5s, play/pause, skip forward 15s. Speed control, sleep timer, queue view. Read Along panel (fetches article text on demand).

### Car Mode
Full-screen black overlay. 140px play/pause, +/-30s skip. Minimal, eyes-off use. Accessible from Expanded Player.

### Settings
Account (Clerk user info, sign out). Playback defaults (speed, skip intervals). ElevenLabs API key (BYOK). Storage info (episodes cached, total size).

### PlayerBar (persistent mini-player)
Fixed above tab bar on all screens. Episode title, play/pause, progress indicator. Tap opens Expanded Player.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| react-native-track-player Expo SDK 53 incompatibility | High | Pin to known-good version. Budget 2-3 days per SDK upgrade for testing. Watch baudtech fork. |
| CarPlay entitlement approval delay | Medium | Apply immediately. Build and test with simulator. Ship without if not approved by launch — add when approved. |
| @g4rb4g3/react-native-carplay maintenance | Medium | Fork is active (published 3 months ago). If it stalls, CarPlay integration is isolated enough to swap implementations. |
| NativeWind / Tailwind class parity with web | Low | Some web-specific classes won't exist. Handle on a case-by-case basis during implementation. |

---

## Out of Scope (v1)

- Pocket Import
- Push notifications ("your episode is ready")
- Automatic storage cleanup
- Discovery/browsable content catalog
- Android
- Shared code package with web app