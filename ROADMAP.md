# Ridecast2: Product Roadmap

Priorities derived from competitive analysis (March 2026) against NotebookLM, Speechify, ElevenReader, NaturalReader, Listening.io, and Pocket. See [VISION.md](VISION.md) for positioning context.

## How to Read This

- **Phase 1** = table stakes. The product doesn't deliver on its promise without these.
- **Phase 2** = competitive differentiation. These create distance from NotebookLM and TTS readers.
- **Phase 3** = moat builders. These make the product defensible long-term.
- **Won't Do** = conscious exclusions based on competitive positioning.

Each item links to its GitHub issue for tracking.

---

## Phase 1: "It Actually Works" (Table Stakes)

*These aren't features — they're the gap between "demo" and "daily driver."*

### 1.1 Duration Accuracy — [#5](https://github.com/cpark4x/ridecast2/issues/5)
**Priority: Critical** | Label: `P0`

Duration control is the core differentiator (see VISION.md). A 15-minute target that produces 4 minutes or 20 minutes breaks the fundamental promise. The prompt was improved in PR #2 but still overshoots on long content.

Options to explore:
- Post-generation word count validation with retry loop
- Tighter prompt constraints (word count floor/ceiling, not just target)
- Two-pass: generate long, then trim to target

### 1.2 Upload Screen Reset — [#4](https://github.com/cpark4x/ridecast2/issues/4)
**Priority: High** | Label: `P0`

After generating audio, the upload screen still shows the previous content's preview. Users must reload the page to start fresh. Basic UX bug that breaks the "process another" flow.

### 1.3 Pipeline Error Resilience — [#3](https://github.com/cpark4x/ridecast2/issues/3)
**Priority: High** | Label: `P0`

PR #2 fixed several crashers (JSON fences, TTS token limits, duplicate content blocking), but the pipeline needs to handle any content gracefully:
- Extremely long documents (200K+ tokens)
- Malformed PDFs / protected EPUBs
- Rate limits from Claude or OpenAI
- Network interruptions mid-generation
- Timeouts on slow content extraction

The goal: no user-facing crash, ever. Fail with actionable messages.

### 1.4 ProcessingScreen UI Upgrade *(new)*
**Priority: High** | Label: `P1` | Effort: Small | Ships to: PWA (before native app)

The current ProcessingScreen is a loading state. That's wrong — it's Ridecast2's most valuable UI moment. No competitor has it. Every other audio app plays back pre-existing content. Ridecast2 is the only app where a user submits content and watches it become an episode.

Replace the loading state with a 4-stage designed experience:

| Stage | Display |
|---|---|
| **Analyzing** | "Reading your article — extracting key ideas and structure" + source metadata |
| **Scripting** | Chapter titles emerge in real time; key ideas preview as they're written |
| **Generating** | Waveform animation + voice name ("Narrated by Aria") |
| **Ready** | Episode card with "Start Now" or "Add to Queue" CTA |

This is a writing task before it's a development task. Write the per-stage copy first. Each stage must feel like progress, not waiting. This builds user confidence in the AI during the one moment it has their full attention. Ship this to the existing PWA — it gives the team a design reference for the native app's most important screen.

---

## Phase 2: Competitive Differentiation

*These close the gap with NotebookLM and create distance from TTS readers.*

> **Note:** Phase 2 order updated March 2026 based on competitive analysis. ElevenLabs and Browser Extension promoted ahead of Mobile App — voice quality is the #1 purchase trigger in this category, and the extension is the daily-use habit surface. Mobile ships into a stronger product as a result.

### 2.1 Better Voices (ElevenLabs Integration) — [#9](https://github.com/cpark4x/ridecast2/issues/9)
**Priority: High** | Label: `P1` | Effort: Medium

OpenAI's TTS is good but ElevenLabs' voices are noticeably more natural. Voice quality is visceral — users judge audio products in 3 seconds. ElevenReader's 4.64★ App Store rating (5,600+ reviews) and 56K+ Play Store reviews exist almost entirely because of ElevenLabs voice quality. Users explicitly say things like "100% better than Speechify — smooth, natural, realistic voice." ElevenReader has no AI compression and no duration control — Ridecast2 with ElevenLabs voices is unmatched by anyone.

Approach: Add ElevenLabs as an optional TTS provider (BYOK — user provides their own API key). The provider interface in `src/lib/tts/` already abstracts the TTS service, so this should be a clean addition. Unlocks Voice Selection (#11) in Phase 3.

### 2.2 Browser Extension — [#8](https://github.com/cpark4x/ridecast2/issues/8)
**Priority: High** | Label: `P1` | Effort: Medium

"Right-click any article > Send to Ridecast." This is how Speechify, ElevenReader, and NaturalReader all acquire daily-use habit. Every major competitor has one. NaturalReader's extension is rated 3.6★ — the bar is low. Without an extension, every user must copy-paste URLs manually; every copy-paste is an abandonment opportunity.

Chrome extension that sends the current page URL to the Ridecast2 instance for processing. Minimal UI — duration picker and a "Process" button. Also becomes the capture surface for Pocket refugee users who have an established browser-clip habit.

### 2.3 Episode Versioning — [#7](https://github.com/cpark4x/ridecast2/issues/7)
**Priority: Medium** | Label: `P1` | Effort: Small

Currently, re-processing content with different settings overwrites the previous version. The library shows only the latest script/audio per content item.

Users should be able to have a 5-minute quick summary AND a 30-minute deep dive from the same source. The data model already links scripts to content — this is primarily a UI change to show multiple versions. No competitor does this. Ship while Mobile App is in progress.

### 2.4 Native Mobile App — [#6](https://github.com/cpark4x/ridecast2/issues/6)
**Priority: High** | Label: `P1` | Effort: Large

Ridecast2 is a commute product — a native mobile app is non-negotiable. The PWA works technically but:
- Not discoverable (no App Store presence)
- Can't do reliable background audio on iOS
- No push notifications for "your episode is ready"
- Loses to native apps on perceived quality

Sequenced last in Phase 2 deliberately: shipping with ElevenLabs voices, a browser extension, and episode versioning already live means the App Store launch happens into a stronger product. A 4.5★ v1 launch is worth more than a 3.2★ rushed launch.

React Native or Expo recommended — share business logic with the Next.js backend, native player experience on the front.

#### Mobile UI Acceptance Criteria

Research across 9 audio apps (Blinkist, Spotify, Overcast, Pocket Casts, Audible, Castro, ElevenReader, Speechify, Apple Podcasts) identified the following as non-negotiable requirements. Full research: `docs/plans/2026-03-06-mobile-audio-ui-research.md`.

**P0 — Must ship at launch or the app is broken:**

| Item | Requirement | Why |
|---|---|---|
| **Smart Resume** | Auto-rewind 3–5s on every reopen, force-quit, backgrounding, and call interrupt. Land between words, not mid-syllable. | A commute product without interruption recovery is broken. Every commute has 4–8 interruptions. |
| **Position sync ≤3s drift** | Write playback position on every state change: pause, background, lock screen, force-quit. Poll every ≤3s during playback. Test matrix: force-quit → reopen, background 30min → reopen, connectivity loss → reopen, device restart → reopen. | ElevenReader's #1 negative review cause: position rewinds 30–60 min on reopen. This is the exact failure to prevent. |
| **Download-first — never stream during playback** | Every episode in the queue must be fully cached locally before playback begins. No "stream if not downloaded" fallback. | Speechify's #1 complaint: voice drops to robotic TTS mid-sentence on connectivity loss. Ridecast2's pre-generated file architecture prevents this — don't accidentally remove it. |
| **Frame-accurate chapter timestamps** | Chapter markers in the player must match actual audio positions within ≤0.5 seconds. Derive timestamps from TTS audio output, not word-count estimates. | Blinkist's documented gap: chapter taps don't land where labeled. Chapter Explorer is broken if timestamps drift. |
| **Queue-first home screen** | Home screen primary content: queued episodes ready to play + total queue duration matched to user's commute time. One large "Play" CTA. Not a discovery/recommendation feed. | Users generated their content — they don't browse, they play. Blinkist's home is discovery-first; this is the gap to fix. |
| **All primary player controls in bottom 40%** | Play/pause, skip ±15–30s, speed, chapter navigation — all reachable by one thumb without repositioning grip. 48px+ touch targets. | One-handed operation is the #1 commute constraint. Test: operate the player eyes-closed with one thumb. |
| **Persistent mini player** | Artwork + title + progress bar + time remaining + play/pause. Visible on every screen. Tap to expand to full player. | Present in every 4.5★+ audio app. Absence produces perception of incompleteness. |

**P1 — Required for 4.8★ target (add in first sprint post-launch if not at launch):**

| Item | Effort | Rationale |
|---|---|---|
| **Undo Seek** | Small | Ghost button appears 3–5s after any position jump; tap to undo. Overcast added to a mature 4.8★ app. Cheapest differentiating feature in the category. |
| **Voice Boost / Commute Audio Profile** | Small–Medium | EQ normalization for noise environments. Can be applied at generation time (ships before native app) or as a client-side audio filter. |
| **Chapter Explorer** | Medium | Swipe-up panel from player. Shows AI-generated 1-sentence chapter summaries, frame-accurate timestamps, word-level transcript seek (transcript already exists in pipeline). |
| **Commute time preference** | Small | User-configured commute duration (onboarding). Prerequisite for home screen duration math and "Ready to Commute" notification (#3.7). |
| **Dynamic color from artwork** | Small | Player background tints to match episode artwork color palette. Present in Spotify, Pocket Casts, Apple Podcasts. Correlates with 4.8★ apps. |

---

## Phase 3: Moat Builders

*These make the product defensible and create switching costs.*

### 3.1 Multi-Source Synthesis — [#12](https://github.com/cpark4x/ridecast2/issues/12)
**Priority: Medium** | Label: `P2` | Effort: Large

NotebookLM's killer feature: combine multiple documents into one conversation. "Give me a 20-minute episode covering these 3 articles about the same topic."

This is technically complex (multi-document summarization with coherent narrative) but is a genuine moat feature. NotebookLM supports up to 50 sources per notebook. Position this as "duration-controlled multi-source" — NotebookLM can combine sources but still can't give you a precise 15-minute result.

### 3.2 Episode Sharing — [#10](https://github.com/cpark4x/ridecast2/issues/10)
**Priority: Low** | Label: `P2` | Effort: Medium

Share a generated episode as a link. NotebookLM added audio sharing, confirming the viral loop model. A shared Ridecast2 episode with ElevenLabs voice quality is a genuine acquisition moment — someone hears it and wants to make their own.

Requires: hosted audio storage (currently local filesystem), shareable URLs, basic playback page.

### 3.3 Scheduled Production — [#13](https://github.com/cpark4x/ridecast2/issues/13)
**Priority: Low** | Label: `P2` | Effort: Large

Connect an RSS feed or newsletter > auto-generate episodes every morning for your commute. The "set it and forget it" version of Listening.io's model, but with actual AI compression and duration control.

This is the long-term daily-habit play: wake up, commute episodes are already waiting. Enables RSS/Podcast Feed Output (see 3.5).

### 3.4 Voice Selection — [#11](https://github.com/cpark4x/ridecast2/issues/11)
**Priority: Low** | Label: `P2` | Effort: Small-Medium

Let users pick their narrator voice. Depends on 2.1 (ElevenLabs integration). Post-integration this means surfacing ElevenLabs' 800+ voice library via their API — not building or licensing a proprietary library. Retention driver, low effort once #9 is live.

### 3.5 RSS / Podcast Feed Output *(new)*
**Priority: Low** | Label: `P2` | Effort: Medium | Depends on: #13

Deliver Ridecast2 episodes to Spotify, Apple Podcasts, and Pocket Casts via a personal RSS feed — so users receive AI-compressed, duration-controlled audio in the apps they already use every day. Listening.io pioneered this distribution model with verbatim TTS and URL-only input; Ridecast2 executes it correctly. Turns Ridecast2 from a player into a publisher. For users deeply embedded in podcast apps, this removes the need to open a separate app for playback.

### 3.7 "Ready to Commute" Push Notification *(new)*
**Priority: Medium** | Label: `P2` | Effort: Medium | Depends on: #13 Scheduled Production, commute time preference (onboarding)

When a user's AI episodes are ready before their typical commute time, push a lock screen notification: *"You have 3 episodes ready — 28 min of audio. Your commute starts in 20 min."* One tap → app → auto-plays.

No competitor sends commute-time-aware notifications. Every competitor sends "your episode is ready." This is the only one that says "your commute is ready." The distinction is the product.

### 3.8 Word-Level Transcript Seek *(new)*
**Priority: Low** | Label: `P2` | Effort: Small–Medium

Tap any word in the episode transcript to jump to that exact position in the audio. Spotify and Apple Podcasts both added this in 2024 — it's rapidly becoming a table-stakes navigation feature for produced audio. Ridecast2 generates a full transcript as a pipeline artifact (it already exists). Surfacing it as a seek surface costs almost nothing in new engineering and adds the deepest navigation capability in the category.

### 3.9 CarPlay Integration *(new)*
**Priority: Low** | Label: `P3` | Effort: Large | Depends on: #6 Native Mobile App

First-party CarPlay support: episode queue in the dashboard, artwork + title on the car display, steering wheel controls, Siri handoff. The PWA's CarMode screen is the interim — it proves the layout concept. CarPlay is the production version for the primary commute context.

### 3.6 Pocket Refugee Capture *(new)* ⏰
**Priority: Medium** | Label: `P2` | Effort: Small-Medium | Time-sensitive

Pocket shut down July 8, 2025, leaving millions of loyal read-it-later users without a home. These users have never experienced AI-compressed audio — Ridecast2 is not a marginal improvement over what they had, it's a categorical upgrade. The positioning is clean: *"Do what Pocket should have become."*

Build: an import flow that accepts Pocket's standard JSON export format, ingests saved URLs as a batch queue, and auto-generates a library of commute-length episodes. The browser extension (#8) is the long-term capture surface for this audience.

Start the positioning immediately — before the import flow ships. The acquisition window narrows as displaced users settle into permanent alternatives.

---

## Won't Do

These are conscious positioning decisions, not "someday" items:

| Item | Reason |
|------|--------|
| Massive voice library (100+) | Can't out-voice Speechify/ElevenLabs. Focus on production quality. |
| OCR / camera scanning | Different use case (physical books). Stay digital-first. |
| Real-time text highlighting | TTS reader feature. We produce episodes, not read-alongs. |
| Enterprise / accessibility | Speechify owns this market. Don't dilute positioning. |

---

## Current Status (March 2026)

### Shipped
**PR #2 (merged to main)**
- 5/5 E2E tests passing
- Claude JSON parsing fix
- Infinite loading screen fix (error UI + retry)
- Library refresh on tab switch
- React Strict Mode double-mount fix
- Large file handling (truncation + error messages)
- Duration prompt improvement (floor/ceiling)
- Duplicate content handling (return existing)
- TTS script chunking for long content
- Specific error messages throughout pipeline

**PR #15 (merged to main)** — Duration accuracy improvement
- Word count validation loop with ±30% tolerance
- Single retry with correction guidance
- `actualWordCount` + `compressionRatio` persisted on Script record

**PR #16 (in progress, fix/upload-screen-reset)** — Upload screen reset + E2E fixes
- ✅ Upload form resets after audio generation (#4)
- ✅ E2E Pattern A fixed (ambiguous Library selector)
- ✅ E2E Pattern B fixed (Target Duration race condition)
- ✅ 5/5 E2E scenarios passing

### In Progress
- Duration Accuracy tightening (#5) — specs written in `specs/features/phase1/`
- Pipeline Error Resilience (#3) — specs written in `specs/features/phase1/`

### Next Up
Phase 1 completion, then Phase 2 in order: ElevenLabs (#9) > Browser Extension (#8) > Episode Versioning (#7) > Native Mobile App (#6).

---

*Last updated: 2026-03-06. Roadmap updated after competitive analysis — see `docs/plans/2026-03-06-competitive-brief.md` and VISION.md.*