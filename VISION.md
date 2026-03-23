# Ridecast2: Product Vision

> **Turn anything you want to read into audio worth listening to.**

## What Ridecast2 Is

Ridecast2 is a **Personal Audio Studio**. You give it content — a PDF, an article, a book chapter, anything — and it produces a genuinely enjoyable audio episode from it. Not a robot reading text aloud. Not a dry summary. A produced show: structured narrative, the right format for the content, professional voice quality, shaped to the time you have.

Think of it as Blinkist — but for any content, not just the books Blinkist has licensed. And unlike Blinkist, you control the duration.

Ridecast2 ships as an **iOS app** with two modes:
- **Browse the catalog** — pre-generated episodes from public domain books, Wikipedia, research papers, top articles. Free. No setup. Listen immediately.
- **Process your own content** — upload any PDF, article, EPUB, or URL. Paid tier (subscription or credits).

The core product is the AI transformation engine: the system that reads any content and produces something genuinely worth listening to.

## The Insight

The "read it later" market is enormous and underserved. Pocket had millions of loyal users when Mozilla shut it down in July 2025. People save more than they ever read. The reading backlog is a universal problem for knowledge workers, students, and curious people.

The content-to-audio space offers three inadequate solutions:

1. **AI Podcast Generators** — Transform content into conversational audio (NotebookLM). Research tools built for comprehension, not listening enjoyment.
2. **TTS Reader Apps** — Read text aloud at high quality (Speechify, ElevenReader). Good voices, but verbatim reading isn't the same as an enjoyable listen.
3. **Curated Summary Products** — Pre-produced audio summaries of selected content (Blinkist). Excellent quality, but limited to their catalog of ~7,000 titles.

**The gap:** Nobody produces genuinely enjoyable audio from *any* content the user brings, at the duration the user specifies.

Ridecast2 answers: *"I have more to read than I have time to read. Turn it into something I actually want to listen to."*

## Three Pillars

### 1. Enjoyable by Design

The value isn't compression — it's transformation. Any model can summarize content. Ridecast2 produces something with narrative arc, format intelligence (narrator vs. two-host conversation chosen by content type), chapter structure, and voice quality that makes the audio genuinely worth listening to.

The production quality of the output — the writing, the pacing, the structure, the voice — is the product. Everything else is delivery.

### 2. Unlimited Content

Blinkist has ~7,000 titles. Ridecast2 has no ceiling.

The **catalog** provides free, immediately-listenable content on first launch: public domain books (Project Gutenberg), Wikipedia deep dives, academic papers (arXiv), daily top articles. This demonstrates the transformation engine before users bring their own content — and drives organic discovery.

The **bring-your-own** layer handles what no competitor touches: the research paper your company just published, the 300-page industry report you need to absorb, the Substack newsletter you're behind on, the EPUB you've had on your Kindle for six months.

### 3. Duration Control

You pick the time, the AI fills it. 5 minutes. 22 minutes. 45 minutes. A 15-minute target that produces 15 minutes — not "approximately 10 minutes" like NotebookLM's presets.

This is the feature that makes Ridecast2 work for the commute, the gym, the walk — any fixed block of time. Nobody else does minute-precision duration.

## Mobile UI Design Principles

*Derived from UI research across Blinkist, Spotify, Overcast, Pocket Casts, Audible, Castro, ElevenReader, and Speechify. Full research: `docs/plans/2026-03-06-mobile-audio-ui-research.md`.*

The gap between 4.5★ audio apps (ElevenReader, Speechify) and 4.8★ apps (Overcast, Pocket Casts, Spotify) is **not a feature gap — it's a reliability gap**. Feature parity doesn't produce 4.8★ ratings. Reliability does.

### 1. Queue-First Home
Users who generate their own content don't browse — they play. The home screen is a queue, not a discovery feed. *"You have 3 episodes ready. Your commute is 23 min."* One Play button.

### 2. Controls in the Bottom 40%
Every primary player control lives in the bottom 40% of the screen. 48px+ touch targets. One-handed, eyes-closed operation. Design for the car and the train, not the desk.

### 3. 3-Second Glanceable Mini Player
The mini player communicates three things instantly: what's playing, how far in, how much is left. Phone in a cupholder. Design for that context.

### 4. Interruption Recovery Is a Reliability Contract
Smart Resume — 3–5 second auto-rewind on every reopen, force-quit, backgrounding, and call interrupt — is not a feature. It is the promise the app makes to every listener. ElevenReader's #1 negative review: position rewinds 30–60 minutes on reopen. That's the anti-target.

### 5. Download-First Is an Architectural Moat
Never stream audio during active playback. Speechify's worst failure mode: voice drops to robotic TTS mid-sentence on connectivity loss. Ridecast2's pre-generated file architecture prevents this structurally. Don't accidentally remove that protection.

### The Generation Pipeline Is the Unique UI Moment
No competitor has a user-triggered AI generation step. The ProcessingScreen is Ridecast2's most valuable screen — a 4-stage designed experience (Analyzing → Scripting → Generating → Ready) that builds user confidence in the AI. This is a writing task before it's a development task.

## Competitive Position

| Capability | Ridecast2 | Blinkist | NotebookLM | Speechify | ElevenReader |
|---|---|---|---|---|---|
| **AI transformation (not verbatim)** | ✅ Any content | ✅ Fixed catalog | ✅ Research-focused | ⚠️ AI Podcasts | ⚠️ Vestigial |
| **Content source** | Catalog + anything you bring | Their 7,000 titles only | Your uploaded docs | Your uploads | Your uploads |
| **Duration control** | ✅ 5–60 min precise | ✅ ~15 min fixed | ⚠️ 3 crude presets | ⚠️ Rough presets | ❌ None |
| **EPUB support** | ✅ Yes | ❌ N/A | ❌ No | ❌ No | ✅ Yes |
| **Native iOS app** | ⚠️ Building (Phase 0) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Free tier** | ✅ Full catalog | ⚠️ Trial only | ✅ 3/day cap | ⚠️ Crippled | ✅ 10 hrs/mo |
| **Offline** | ✅ Yes (file-based) | ✅ Yes | ✅ Download | ✅ Premium | ✅ 10 files |
| **Car mode** | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| **Voice quality** | Good → Best (ElevenLabs P2) | Human narrators | Excellent (Gemini) | Excellent (premium) | Best (ElevenLabs) |
| **Price** | Free catalog / paid own content | $16/mo | Free (limited) | $29/mo | $11/mo |
| **BYOK option** | ✅ Advanced users | ❌ No | ❌ No | ❌ No | ❌ No |

## Strengths

- **The transformation engine is genuinely differentiated.** Not TTS. Not verbatim reading. A produced show from any content.
- **Catalog + own content is a unique combination.** Blinkist has catalog, no own-content. NotebookLM has own-content, no catalog, no consumer UX. Ridecast2 has both.
- **Duration control is genuinely unique.** No competitor offers minute-precision. "Exactly 22 minutes" is a category of one.
- **Car mode and commute UX.** Nobody else has built explicitly for this listening context.
- **BYOK as an advanced option.** Privacy-conscious power users get something none of Ridecast2's competitors offer.

## Vulnerabilities

- **Not yet on iOS.** Every competitor has a native app. This is the most urgent gap — it's the whole product plan.
- **No hosted product yet.** iOS requires a hosted backend, auth, accounts, and managed API keys. Currently self-hosted only.
- **Voice quality is good but not best-in-class.** Users judge audio in 3 seconds. ElevenLabs integration (Phase 2) closes this.
- **Transformation quality needs consistent calibration.** Duration accuracy, script quality, and format intelligence need to be measurably reliable.
- **ElevenReader is a latent threat.** Best voices in the market, existing content-to-audio app, vestigial AI podcast feature waiting to be matured. Watch their changelog.
- **NotebookLM is moving fast.** 5 major features in 12 months. Window to own this category: 12–18 months.

## The Biggest Risk

Google adds minute-precision duration control and a consumer-grade mobile app to NotebookLM.

The defense: own the *enjoyable listening* identity so thoroughly that even if NotebookLM adds duration control, users still prefer Ridecast2 for the actual experience of listening. The catalog, the voice quality, the format intelligence, the commute UX — these compound into a listening product that a research tool can add features to but can't replicate.

## Market Opportunities

1. **The reading backlog problem.** Every knowledge worker saves more than they read. Ridecast2 isn't "commute audio" — it's a solution to the reading backlog. The commute is just the most natural time to clear it.

2. **Pocket refugees.** Mozilla shut Pocket down July 8, 2025. Millions of habitual content-savers are without a home. They've never experienced AI-transformed audio. Positioning: *"Do what Pocket should have become."* See ROADMAP Phase 3 (#3.6).

3. **Blinkist's ceiling.** Blinkist can only cover what they've produced. The niche research paper, the industry report, the EPUB that's been on your Kindle for months — Blinkist can't touch these. Ridecast2 can.

4. **The catalog as discovery channel.** Free, high-quality pre-generated episodes (public domain books, Wikipedia deep dives, top articles) create an organic acquisition surface. Users find Ridecast2 through the catalog, experience the transformation quality, then upgrade to process their own content.

5. **Listening.io's distribution model, done right.** RSS delivery into Spotify/Apple Podcasts is the right idea, executed poorly by Listening.io (verbatim TTS, URL-only, stagnant). Ridecast2 can deliver genuinely enjoyable AI-transformed audio into the apps users already open daily. See ROADMAP Phase 3 (#3.5).

## Product Path

**Phase 0 — iOS foundation:**
Hosted backend, auth/accounts, managed API keys, freemium pricing model, seeded content catalog, iOS app. Required before App Store submission.

**Phase 1 — Make the core promise reliable:**
Duration accuracy, pipeline resilience, ProcessingScreen UI upgrade.

**Phase 2 — Quality and acquisition:**
ElevenLabs voices, browser extension, episode versioning, native mobile app with full commute UI.

**Phase 3 — Moat:**
Multi-source synthesis, RSS distribution, scheduled production, episode sharing, Pocket refugee capture, CarPlay.

## What We Don't Do

- **Verbatim TTS** — We don't read content aloud. We transform it. Speechify and ElevenReader are the right products for verbatim reading.
- **Massive voice library** — We won't build or license a 1,000-voice library. We offer high-quality voices for produced audio, not a voice marketplace.
- **OCR / camera scanning** — Physical books are a different use case. Stay digital-first.
- **Real-time text highlighting** — TTS reader feature. We produce episodes, not read-alongs.
- **Enterprise / accessibility positioning** — Speechify owns this market.

## Success Metrics

The product succeeds when:

1. **Transformation quality is consistent** — Users describe the output as "enjoyable" and "worth listening to," not just "compressed"
2. **The catalog drives discovery** — New users listen to catalog content before processing their own; catalog is a meaningful acquisition channel
3. **Daily listening habit** — Users listen multiple times per week, not just occasionally after uploading
4. **Duration accuracy is reliable** — A 15-minute target produces 13–17 minutes consistently
5. **App Store rating ≥4.7★** — Voice quality, reliability, and transformation quality all contribute; none alone is sufficient

---

*Last updated: 2026-03-06. Vision rewritten to reflect iOS publishing commitment and "enjoyable audio transformation" core value. Full competitive research: `docs/plans/2026-03-06-competitive-brief.md`. Mobile UI research: `docs/plans/2026-03-06-mobile-audio-ui-research.md`.*
