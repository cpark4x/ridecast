# Ridecast Roadmap

> Turn anything you want to read into audio worth listening to.

## How This Works

- **ROADMAP.md** = the plan (you're reading it)
- **specs/features/phase4/*.md** = detailed implementation specs
- **.dev-machine/STATE.yaml** = what the machine runs tonight

Status key: 🆕 Not started · 📝 Specced · 🔄 In progress · ✅ Complete

Size key: S = hours · M = 1-2 days · L = 3+ days

---

## Completed (Phases 0-3)

43 features shipped across 15 sessions. The product went from a Next.js prototype to a native iOS app with a full audio pipeline.

**Phase 0 — Foundation (6 features):** Clerk auth, Azure blob storage, Stripe billing, multi-user isolation, Google TTS integration, Vercel deployment.

**Phase 1 — "It Actually Works" (5 features):** Duration accuracy with word-count validation loop, pipeline error resilience, processing screen with staged UX, playback position persistence, audio measurement infrastructure.

**Phase 2 — Competitive Differentiation (11 features):** ElevenLabs voice integration, episode versioning with version pills and long-press menu, commute duration preference, smart resume with 3-5s rewind, undo seek ghost button, and assorted pipeline fixes.

**Phase 3 — Native iOS App (21 features):** Home screen with queue-first design, expanded player with chapter navigation, library with time sections and filters, persistent mini player, offline-first download architecture, upload flow, settings screen, offline banner, app foreground sync, and full end-to-end native build.

---

## Phase 4: Native App Intelligence & Polish

### Theme 1: Critical Fixes

P0 items that block daily usage. These ship first.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 1 | Delete episodes + remove non-functional queue button | S | — | 📝 | Stubbed but not wired. GitHub #33 |
| 2 | Generating episode feedback | S | — | 📝 | Silent failure when pipeline runs. GitHub #34 |
| 3 | Offline guards for upload flow | S | — | 📝 | Crashes if offline during upload. GitHub #35 |
| 3a | Medium URL extraction + graceful error handling | S | — | 🆕 | Medium URLs fail with "missing scriptID" instead of user-friendly error. Two fixes: (1) graceful error when extraction fails, (2) investigate Medium-specific anti-scraping. User feedback 2026-03-26. |
| 3b | Double logo on all episode cards | S | — | 🆕 | Artwork renders at two sizes in every card on home screen — big logo with small logo layered inside. Layout/component bug, not data-specific. User feedback 2026-03-26. |

### Theme 2: Episode Identity & Intelligence

Smart titles, source attribution, content type expansion. Episodes should feel like they know where they came from.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 4 | Episode identity data model | M | — | 🆕 | Source icons, author, publisher, favicon, attribution fields |
| 5 | Smart title generation | M | — | 🆕 | Backend generates descriptive titles from content analysis |
| 6 | Content type expansion | M | — | 🆕 | .docx, Google Docs, Notion, GitHub as input sources |
| 7 | Generic URL handling | M | — | 🆕 | Homepage detection + article picker for non-article URLs |

### Theme 3: Homepage Redesign

Option B visual hybrid. The home screen becomes a place you want to open.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 8 | Homepage redesign Option B | L | — | 🆕 | Hero card, carousel, rich list. Mockup: `docs/mockups/archive/option-b-visual-hybrid.html` |
| 9 | Episode card redesign | M | — | 🆕 | Rich cards with source icons, descriptions, visual hierarchy |
| 10 | Empty state: new user | M | — | 🆕 | Onboarding flow for first launch. Mockup: `docs/mockups/empty-states/empty-state-new-user.html` |
| 11 | Empty state: all caught up | S | — | 🆕 | Celebratory + suggestions. Mockup: `docs/mockups/empty-states/empty-state-caught-up.html` |
| 12 | Stale library nudge | S | — | 🆕 | Dormant user re-engagement when no new episodes in 7+ days |

### Theme 4: Library Overhaul

The library should be fast to scan, easy to search, and smart about what it shows you.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 13 | Library redesign | L | — | 🆕 | Time sections, rich cards, upgraded filters. Mockup: `docs/mockups/library/library-redesign-v2.html` |
| 14 | Default to Active filter | S | — | 🆕 | Hide completed episodes from default view |
| 15 | Smart search | M | — | 🆕 | Search across title, author, themes, summary |

### Theme 5: Following & Discovery

Follow sources and authors. The beginning of a content graph.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 16 | Source/author following | L | — | 🆕 | Follow button on sources and authors. Mockup: `docs/mockups/discovery/source-author-card.html` |
| 17 | Following management screen | M | — | 🆕 | Manage follows, suggestions. Mockup: `docs/mockups/discovery/following-screen.html` |

### Theme 6: Native App Polish

Accumulated UX debt from the Phase 3 build. Death by a thousand cuts if left unaddressed.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 18 | Haptic feedback | S | — | 🆕 | Tactile response throughout the app |
| 19 | PlayerBar upgrade | S | — | 🆕 | Add source icon, duration display |
| 20 | Skeleton loading states | S | — | 🆕 | Shimmer placeholders on cold launch |
| 21 | Upload modal error handling | S | — | 📝 | GitHub #36 |
| 22 | Player controls polish | S | — | 📝 | GitHub #37 |
| 23 | Single-version process new version | S | — | 📝 | proposed-001. GitHub #38 |
| 24 | Settings and onboarding polish | S | — | 📝 | GitHub #39 |
| 25 | Minor UX polish | S | — | 📝 | Assorted paper cuts. GitHub #41 |
| 26 | App infrastructure hardening | M | — | 📝 | Build tooling, error boundaries, crash resilience. GitHub #40 |
| 50 | Graceful Claude outage handling | S | — | 🆕 | `/api/process` and `/api/audio/generate` return clear user-facing error when Anthropic API is down instead of cryptic failure. "AI service temporarily unavailable — content saved, try again in a few minutes." Architecture review 2026-03-26. |

### Theme 7: Pocket Refugee Capture

Time-sensitive. The acquisition window for displaced Pocket users narrows every month. Fully specced and ready to build.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 27 | Pocket Refugee Capture | M | `specs/features/phase3/pocket-refugee-capture.md` | 📝 | JSON import, batch queue, positioning campaign |

---

## Phase 5: Platform Expansion

Ridecast becomes available everywhere you consume content, not just inside the app.

### Theme: Smoke Test Bug Fixes

Issues surfaced from first-run smoke test (2026-03-30). P1 items block basic usability. Ship before next external TestFlight build.

| # | Issue | Size | Type | Status | Notes |
|---|-------|------|------|--------|-------|
| ST-1 | pasted-text-no-title | S | bug | 🆕 | Pasted text episodes show "Pasted text" as title. Auto-generate title from first sentence/line of pasted content. |
| ST-2 | pasted-text-no-icon | S | bug | 🆕 | Pasted text episodes show "?" placeholder in SourceThumbnail. Add a document/text icon fallback for `sourceType='txt'` with no URL. |
| ST-3 | episode-completion-state | M | bug | 🆕 | **P1.** Episode not marked as listened/completed after playing to the end. Playback completion event not persisting state. |
| ST-4 | pause-play-toggle-on-end | S | bug | 🆕 | Pause button doesn't switch to Play icon when track finishes. Player state stays as "playing" after completion. |
| ST-5 | playback-duration-not-loading | M | bug | 🆕 | **P1.** Duration from TrackPlayer never loads. Expanded player shows -0:00 entire time. Mini player shows source name instead of time remaining. Root cause: TrackPlayer not reporting duration. |
| ST-6 | settings-safe-area | S | bug | 🆕 | Settings access button covered by notch/Dynamic Island. Safe area insets not respected for the settings entry point. |
| ST-7 | recommended-sources-not-tappable | S | ux | 🆕 | Recommended section in Discover only shows Follow button. Users can't tap through to see articles or understand what they'd follow. Wire up Source Detail navigation from Recommended rows. |
| ST-8 | discover-real-content | L | feature | 🆕 | Discover "For You" and topic feeds show static placeholder data with no real article images. Phase 6+ — needs backend. |

### Theme: Platform Expansion

| # | Feature | Size | Status | Notes |
|---|---------|------|--------|-------|
| 28 | Browser Extension | L | 🆕 | "Right-click any article > Send to Ridecast." Chrome first. |
| 29 | iOS Share Extension | M | 🆕 | Share from Safari, Twitter, email, Substack. Mobile capture surface. |
| 30 | Basic file type support (.docx, PDF, text files) | M | 🆕 | Basics first: Word docs, PDFs, plain text files. Table stakes vs Speechify/Blinkist. User feedback 2026-03-26. |
| 31 | Paste raw text to create episode | S | 🆕 | Text input field in upload modal — no file, no URL, just paste and go. Eliminates clipboard→file bottleneck. User feedback 2026-03-26. |
| 32 | Episode Sharing (link + download) | M | 🆕 | Shareable links with hosted playback page AND MP3 download/export. Viral acquisition loop. User feedback 2026-03-26 expanded scope. |
| 33 | Content type expansion (advanced) | M | 🆕 | Google Docs, Notion, GitHub as native input sources. Depends on #30. |
| 34 | Generic URL handling (advanced) | M | 🆕 | Homepage detection, article picker, paywall handling |
| 35 | Dynamic color from artwork | S | 🆕 | Player background tints from episode artwork. Source-branded gradients. |
| 36 | Estimated read time in upload modal | S | 🆕 | Surface "~X min read" using word count already in pipeline. Prevents nonsensical duration choices. Quick win. User feedback 2026-03-26. |

---

## Phase 6: Content Intelligence

The AI gets smarter about what it produces and how it produces it.

| # | Feature | Size | Status | Notes |
|---|---------|------|--------|-------|
| 37 | Progressive Depth "Go Deeper" | M | 🆕 | Continuation episodes that build on what you already heard. Not re-summarization. |
| 38 | Format Expansion | M | 🆕 | Debate, Critique, Storytelling modes beyond narrator and two-host. |
| 38a | Verbatim "Read It to Me" mode | M | 🆕 | Skip AI scripting, TTS source directly. New format alongside Narrator/Two-Host. Simpler, faster, cheaper. User-requested feedback 2026-03-26. |
| 39 | Multi-Source Synthesis | L | 🆕 | "Give me 20 minutes covering these 3 articles." NotebookLM's killer feature, done with duration control. |
| 40 | Voice Selection | M | 🆕 | ElevenLabs voice library surfaced in-app. Retention driver. |
| 41 | Voice Boost / Commute Audio Profile | M | 🆕 | EQ normalization for noisy environments. |
| 42 | Chapter Explorer | M | 🆕 | Swipe-up panel with AI chapter summaries and frame-accurate timestamps. |
| 43 | Word-Level Transcript Seek | M | 🆕 | Tap any word in the transcript to jump to that position. |
| 44 | "What Did I Miss?" Recap | M | 🆕 | 30s AI summary when resuming after 24+ hours. "Previously on your episode..." |

### Theme: Live Discovery

| ID | Size | Type | Description |
|----|------|------|-------------|
| discover-live-content | XL | feature | Live Discover feed — real article recommendations, RSS/newsletter ingestion, source subscription, article thumbnails, personalized feed based on FTUE topic + source selections |

---

## Phase 7: Automation & Distribution

Ridecast runs on autopilot. Episodes are waiting before your commute starts.

| # | Feature | Size | Status | Notes |
|---|---------|------|--------|-------|
| 45 | Scheduled Production | L | 🆕 | Connect RSS feeds, auto-generate episodes every morning. The daily-habit play. |
| 46 | RSS / Podcast Feed Output | M | 🆕 | Personal RSS feed delivers episodes to Spotify, Apple Podcasts, Pocket Casts. Depends on #45. |
| 47 | "Ready to Commute" Push Notification | M | 🆕 | Commute-time-aware lock screen notification. Depends on #45. |
| 48 | Newsletter / Email Digest + Auto-Subscribe | L | 🆕 | Substack RSS first, then full email OAuth integration. Morning audio briefing from your inbox. User feedback 2026-03-26: full autopilot — follow a source, auto-generate when they publish. Depends on Phase 4 #16 (following data model) + #45 (scheduled production). |
| 49 | Smart Queue Curation | L | 🆕 | AI fills your commute queue ranked by predicted interest. Learns from skips, replays, favorites. |

---

## Future / Parked

Interesting but not committed. Revisit after Phase 5 proves the platform.

| Idea | Why It's Interesting | Why It's Parked |
|------|----------------------|-----------------|
| CarPlay Integration | First-party dashboard, steering wheel controls, Siri handoff. The production commute surface. | Large effort, depends on native app maturity. PWA CarMode is the interim. |
| Highlights & Clips | Tap to mark moments, get text excerpts, share audio clips. Knowledge artifacts from listening. | Scope creep beyond core identity. Transcript exists in pipeline — low effort later. |
| Ambient Soundscapes | Background audio (rain, lo-fi) during listening. ElevenReader shipped this. | Nice-to-have polish. Doesn't drive adoption. |
| Interactive Q&A Post-Episode | Ask questions about content after listening. NotebookLM's stickiest feature. | Expands surface from "audio production" to "knowledge assistant." Bigger strategic decision. |
| Context-Aware Format Selection | Auto-detect context (CarPlay = narrator, AirPods + walking = two-host). | Requires Format Expansion first. UX risk of wrong auto-selection. Needs usage data. |
| Amplifier → Ridecast Integration | Send content from Amplifier to Ridecast via skill/API. Developer workflow shortcut. | Shape TBD. Narrow audience (power users). General-user equivalents (Share Extension, Browser Extension) ship first. User feedback 2026-03-26. |

---

## Won't Do

Conscious positioning decisions, not "someday" items.

| Item | Reason |
|------|--------|
| Massive voice library (100+) | Can't out-voice Speechify or ElevenLabs. Focus on production quality, not catalog size. |
| OCR / camera scanning | Different use case (physical books). Stay digital-first. |
| Real-time text highlighting | TTS reader feature. Ridecast produces episodes, not read-alongs. |
| Enterprise / accessibility | Speechify owns this market. Don't dilute positioning. |

---

*Last updated: 2026-03-26. Added 9 user feedback items (2 bugs, 7 features) from TestFlight feedback session. 55 items across 4 active phases. STATE.yaml is the machine's execution queue; this file is the human plan.*
