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

---

## Phase 2: Competitive Differentiation

*These close the gap with NotebookLM and create distance from TTS readers.*

### 2.1 Native Mobile App — [#6](https://github.com/cpark4x/ridecast2/issues/6)
**Priority: High** | Label: `P1` | Effort: Large

The single biggest gap. Ridecast2 is a commute product without a real mobile app. The PWA works technically but:
- Not discoverable (no App Store presence)
- Can't do reliable background audio on iOS
- No push notifications for "your episode is ready"
- Loses to native apps on perceived quality

React Native or Expo recommended — share business logic with the Next.js backend, native player experience on the front.

### 2.2 Better Voices (ElevenLabs Integration) — [#9](https://github.com/cpark4x/ridecast2/issues/9)
**Priority: Medium** | Label: `P1` | Effort: Medium

OpenAI's TTS is good but ElevenLabs' voices are noticeably more natural. Voice quality is visceral — users judge audio products in 3 seconds.

Approach: Add ElevenLabs as an optional TTS provider (BYOK — user provides their own API key). The provider interface in `src/lib/tts/` already abstracts the TTS service, so this should be a clean addition.

### 2.3 Browser Extension — [#8](https://github.com/cpark4x/ridecast2/issues/8)
**Priority: Medium** | Label: `P1` | Effort: Medium

"Right-click any article > Send to Ridecast." This is how Speechify and ElevenReader acquire daily-use habit. Low-friction content capture that keeps users in their browsing flow.

Chrome extension that sends the current page URL to the Ridecast2 instance for processing. Minimal UI — just the duration picker and a "Process" button.

### 2.4 Episode Versioning — [#7](https://github.com/cpark4x/ridecast2/issues/7)
**Priority: Medium** | Label: `P1` | Effort: Small

Currently, re-processing content with different settings overwrites the previous version. The library shows only the latest script/audio per content item.

Users should be able to have a 5-minute quick summary AND a 30-minute deep dive from the same source. The data model already links scripts to content — this is primarily a UI change to show multiple versions.

---

## Phase 3: Moat Builders

*These make the product defensible and create switching costs.*

### 3.1 Multi-Source Synthesis — [#12](https://github.com/cpark4x/ridecast2/issues/12)
**Priority: Medium** | Label: `P2` | Effort: Large

NotebookLM's killer feature: combine multiple documents into one conversation. "Give me a 20-minute episode covering these 3 articles about the same topic."

This is technically complex (multi-document summarization with coherent narrative) but is a genuine moat feature. NotebookLM supports up to 50 sources per notebook.

### 3.2 Episode Sharing — [#10](https://github.com/cpark4x/ridecast2/issues/10)
**Priority: Low** | Label: `P2` | Effort: Medium

Share a generated episode as a link. NotebookLM recently added audio sharing. This creates a viral loop — someone hears a Ridecast2 episode and wants to make their own.

Requires: hosted audio storage (currently local filesystem), shareable URLs, basic playback page.

### 3.3 Scheduled Production — [#13](https://github.com/cpark4x/ridecast2/issues/13)
**Priority: Low** | Label: `P2` | Effort: Large

Connect an RSS feed or newsletter > auto-generate episodes every morning for your commute. The "set it and forget it" version of Listening.io's model, but with actual AI compression.

This is the long-term daily-habit play: wake up, commute episodes are already waiting.

### 3.4 Voice Selection — [#11](https://github.com/cpark4x/ridecast2/issues/11)
**Priority: Low** | Label: `P2` | Effort: Small-Medium

Offer 3-5 narrator voices and let users pick their preferred voice. Not 1,000 voices (can't compete with Speechify) — just enough for personalization. Retention driver.

Depends on 2.2 (ElevenLabs integration) for the best voice options.

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

### Shipped (PR #2, merged to main)
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

### Next Up
Phase 1 items, in order: duration accuracy > upload reset > pipeline resilience.

---

*Last updated: 2026-03-06. Roadmap is informed by competitive positioning — see VISION.md.*