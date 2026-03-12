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
| 8 | Homepage redesign Option B | L | — | 🆕 | Hero card, carousel, rich list. Mockup: `docs/mockups/option-b-visual-hybrid.html` |
| 9 | Episode card redesign | M | — | 🆕 | Rich cards with source icons, descriptions, visual hierarchy |
| 10 | Empty state: new user | M | — | 🆕 | Onboarding flow for first launch. Mockup: `docs/mockups/empty-state-new-user.html` |
| 11 | Empty state: all caught up | S | — | 🆕 | Celebratory + suggestions. Mockup: `docs/mockups/empty-state-caught-up.html` |
| 12 | Stale library nudge | S | — | 🆕 | Dormant user re-engagement when no new episodes in 7+ days |

### Theme 4: Library Overhaul

The library should be fast to scan, easy to search, and smart about what it shows you.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 13 | Library redesign | L | — | 🆕 | Time sections, rich cards, upgraded filters. Mockup: `docs/mockups/library-redesign-v2.html` |
| 14 | Default to Active filter | S | — | 🆕 | Hide completed episodes from default view |
| 15 | Smart search | M | — | 🆕 | Search across title, author, themes, summary |

### Theme 5: Following & Discovery

Follow sources and authors. The beginning of a content graph.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 16 | Source/author following | L | — | 🆕 | Follow button on sources and authors. Mockup: `docs/mockups/source-author-card.html` |
| 17 | Following management screen | M | — | 🆕 | Manage follows, suggestions. Mockup: `docs/mockups/following-screen.html` |

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

### Theme 7: Pocket Refugee Capture

Time-sensitive. The acquisition window for displaced Pocket users narrows every month. Fully specced and ready to build.

| # | Feature | Size | Spec | Status | Notes |
|---|---------|------|------|--------|-------|
| 27 | Pocket Refugee Capture | M | `specs/features/phase3/pocket-refugee-capture.md` | 📝 | JSON import, batch queue, positioning campaign |

---

## Phase 5: Platform Expansion

Ridecast becomes available everywhere you consume content, not just inside the app.

| # | Feature | Size | Status | Notes |
|---|---------|------|--------|-------|
| 28 | Browser Extension | L | 🆕 | "Right-click any article > Send to Ridecast." Chrome first. |
| 29 | iOS Share Extension | M | 🆕 | Share from Safari, Twitter, email, Substack. Mobile capture surface. |
| 30 | Content type expansion (advanced) | M | 🆕 | .docx, Google Docs, Notion, GitHub as native input sources |
| 31 | Generic URL handling (advanced) | M | 🆕 | Homepage detection, article picker, paywall handling |
| 32 | Dynamic color from artwork | S | 🆕 | Player background tints from episode artwork. Source-branded gradients. |
| 33 | Episode Sharing | M | 🆕 | Shareable links with hosted playback page. Viral acquisition loop. |

---

## Phase 6: Content Intelligence

The AI gets smarter about what it produces and how it produces it.

| # | Feature | Size | Status | Notes |
|---|---------|------|--------|-------|
| 34 | Progressive Depth "Go Deeper" | M | 🆕 | Continuation episodes that build on what you already heard. Not re-summarization. |
| 35 | Format Expansion | M | 🆕 | Debate, Critique, Storytelling modes beyond narrator and two-host. |
| 36 | Multi-Source Synthesis | L | 🆕 | "Give me 20 minutes covering these 3 articles." NotebookLM's killer feature, done with duration control. |
| 37 | Voice Selection | M | 🆕 | ElevenLabs voice library surfaced in-app. Retention driver. |
| 38 | Voice Boost / Commute Audio Profile | M | 🆕 | EQ normalization for noisy environments. |
| 39 | Chapter Explorer | M | 🆕 | Swipe-up panel with AI chapter summaries and frame-accurate timestamps. |
| 40 | Word-Level Transcript Seek | M | 🆕 | Tap any word in the transcript to jump to that position. |
| 41 | "What Did I Miss?" Recap | M | 🆕 | 30s AI summary when resuming after 24+ hours. "Previously on your episode..." |

---

## Phase 7: Automation & Distribution

Ridecast runs on autopilot. Episodes are waiting before your commute starts.

| # | Feature | Size | Status | Notes |
|---|---------|------|--------|-------|
| 42 | Scheduled Production | L | 🆕 | Connect RSS feeds, auto-generate episodes every morning. The daily-habit play. |
| 43 | RSS / Podcast Feed Output | M | 🆕 | Personal RSS feed delivers episodes to Spotify, Apple Podcasts, Pocket Casts. Depends on #42. |
| 44 | "Ready to Commute" Push Notification | M | 🆕 | Commute-time-aware lock screen notification. Depends on #42. |
| 45 | Newsletter / Email Digest | L | 🆕 | Substack RSS first, then full email OAuth integration. Morning audio briefing from your inbox. |
| 46 | Smart Queue Curation | L | 🆕 | AI fills your commute queue ranked by predicted interest. Learns from skips, replays, favorites. |

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

*Last updated: 2026-03-12. Unified roadmap consolidating all brainstorm items, GitHub issues (#33-#41), and competitive analysis into a single planning document. 46 items across 4 active phases. STATE.yaml is the machine's execution queue; this file is the human plan.*
