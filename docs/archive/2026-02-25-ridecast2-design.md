# Ridecast 2 Design

## Goal

Rebuild Ridecast from scratch as a polished, 9/10 product. The original was a 3/10 — broken TTS, no tests, rough UX. Ridecast 2 is a personal "podcast factory" that takes long-form content, intelligently compresses it via AI, and produces pleasant, engaging audio. The AI summarization engine is the heart of the product — TTS is the delivery mechanism.

## Background

The original Ridecast proved the concept but fell short on execution: broken text-to-speech, no test coverage, and a rough user experience. The core idea — turning long content into listenable audio for commutes — is sound and personally valuable. A ground-up rebuild with proper architecture, AI-powered compression, and a polished UX will turn it into a product worth using daily.

## Approach

Monolith Next.js 15 full-stack application. One codebase, one deployment. Chosen over a separate backend (over-architected for a solo dev product) and Azure Functions (cold starts, vendor lock-in, complex local dev). This keeps development velocity high and deployment simple.

## Architecture

Three layers, each with a clear responsibility:

```
[Content Ingestion] → [AI Processing] → [Audio Generation]
     ↓                      ↓                   ↓
  Raw text             Script (saved)        Audio file
  in Postgres          in Postgres           in Blob Storage
```

### 1. Content Ingestion Layer

Accepts input two ways:
- **File upload** — PDF, EPUB, TXT. Extraction via pdf-parse, epub parsing, etc.
- **URL paste** — Server-side extraction pulls article content (Mozilla Readability or similar).

All raw text stored in database with metadata (title, author, word count, source type).

### 2. AI Processing Layer (The Heart)

Takes raw text and runs it through Claude in two steps:

**Step 1 — Content Analysis** (single Claude call):
- Content type classification (business book, technical article, narrative, meeting notes, etc.)
- Format decision: Narrator or conversation? Dense analytical content → conversation (makes it digestible). Narrative, meeting notes, short articles → narrator (cleaner delivery).
- Key themes extraction for compression guidance.

**Step 2 — Compression & Script Generation** (second Claude call):
- User's target is either a preset (Quick Summary ~5 min / Main Points ~15 min / Deep Dive ~30 min) or a custom time target ("fit to 20 minutes").
- Time target converts to word count (~150 words/minute for spoken audio).
- **Narrator mode:** Clean, spoken-word-optimized summary. Written for the ear — shorter sentences, natural transitions.
- **Conversation mode:** Two-speaker script with `[Host A]` and `[Host B]` labels. Natural back-and-forth: one explains, the other reacts, asks follow-ups, makes analogies. NotebookLM-style.

### 3. Audio Generation Layer

**Step 3 — TTS Conversion** (OpenAI):
- Narrator mode: One call to gpt-4o-mini-tts with style instruction like "warm, clear audiobook narrator."
- Conversation mode: Alternate chunks split by speaker label, each with a distinct voice instruction ("curious, energetic co-host" vs "thoughtful, knowledgeable expert").
- Output: MP3 audio file → stored in Azure Blob Storage (or local filesystem for v1).

Provider interface abstracts the TTS service so it's swappable later. OpenAI TTS default, Azure Neural TTS as fallback.

## Provider Mapping

| Function | Provider | Why |
|----------|----------|-----|
| Summarization/Compression | Claude (Anthropic) | Best at long-form comprehension and writing |
| Content analysis/format decision | Claude | Already processing the text, decide format in same call |
| Narrator TTS | OpenAI gpt-4o-mini-tts | Steerable — can instruct tone/style. Good quality, simple API |
| Conversation TTS | OpenAI gpt-4o-mini-tts | Two different voice instructions for the two "hosts" |
| Fallback TTS | Azure Neural TTS | Free with MS credits |
| Reserve | Google Gemini | Available for future use |

## Data Model

PostgreSQL via Prisma ORM. Five tables:

| Table | Purpose |
|-------|---------|
| `users` | Auth (email, hashed password, name) |
| `content` | Uploaded/pasted source material (title, author, raw text, word count, source URL or file type, SHA-256 hash for dedup) |
| `scripts` | AI-generated output — the compressed script. Links to content. Format (narrator/conversation), target duration, actual word count, compression ratio, full script text |
| `audio` | Generated audio file. Links to script. Azure Blob URL, duration in seconds, voice(s) used, TTS provider |
| `playback_state` | Per-user progress: position in seconds, playback speed, completed flag |

Key design decisions:
- **Scripts are first-class entities** — the script IS the product. Storing separately means you can regenerate audio with a different voice without re-running Claude.
- **No Redis/Bull queue for v1** — TTS jobs run in-process with progress tracking via polling. Add queue later if scaling needed.
- **Dedup via SHA-256 content hash** — prevents re-uploading identical content.

## User Experience

Four screens plus Car Mode. Dark glassmorphism theme, purple/violet gradients, Inter font. A clickable HTML prototype exists at `prototype/index.html`.

### Screen 1 — Home / Upload

Clean, minimal. Two input options: drag-and-drop file zone (PDF, EPUB, TXT) + URL paste field. After ingestion, shows preview (title, word count, estimated read time). Duration selector: three preset buttons (Quick Summary ~5 min / Main Points ~15 min / Deep Dive ~30 min) OR "Fit to my commute" slider (5-60 min). Big CTA: "Create Audio".

### Screen 2 — Processing

Animated progress with stages: "Analyzing content..." → "Compressing to X minutes..." → "Generating audio..." Smooth progress bar. Badge showing "AI chose: Conversation style" or "AI chose: Narrator style". Auto-transitions to Library when complete.

### Screen 3 — Library

Content collection — everything processed. Clean card layout. Each item: title, source type icon, date, duration badge, status (Processing/Ready). Tap to play.

### Screen 4 — Player

Two states:
- **Collapsed:** Persistent bottom bar (60px) — thumbnail, title, play/pause, mini progress. Tap to expand.
- **Expanded:** Large artwork/gradient area, title + format badge, progress bar with elapsed/remaining, play/pause center, skip +/-15s and +/-30s, speed control (0.5x-3x), sleep timer, Car Mode button.

### Screen 5 — Car Mode

Triggered by button in expanded player. Full black background. Massive play/pause button (40%+ of screen, center). Two large skip buttons (+/-30s). Current title in large text. Nothing else. X to exit.

## Error Handling

**Content ingestion failures:**
- URL can't be fetched (paywall, 404, timeout) → "Couldn't access this URL. Try uploading the content as a file instead."
- File too large or corrupt → Reject with size/format guidance before processing.
- Content too short (< 200 words) → Skip compression, offer direct TTS: "This is short enough to listen to as-is."

**AI processing failures:**
- Claude API timeout or error → Retry once automatically, then surface: "Summarization failed. Retry?" with button.
- Generated script too long/short for target → Auto-adjust, show actual vs. target duration.

**TTS failures:**
- OpenAI TTS error → Retry once, then offer: "Audio generation failed. Your script is ready — retry or try a different voice."
- Key: Script saved independently of audio. If TTS fails, summarization work isn't lost.

**Offline/network:**
- PWA caches all downloaded audio in IndexedDB for offline playback.
- If offline during upload/processing → queue request, process when back online.
- Subtle network status indicator.

## Testing Strategy

Three layers, kept simple:

**Unit tests** (Vitest):
- Content extraction (PDF, EPUB, TXT, URL parsing)
- Time-to-word-count calculation ("20 minutes" → ~3,000 words)
- Script parsing (splitting conversation scripts by speaker labels for TTS)
- Audio chunk stitching logic

**Integration tests** (Vitest):
- Full pipeline with mocked AI calls: upload → extract → script → audio
- URL paste → same pipeline
- Verify TTS failure doesn't lose the saved script

**E2E tests** (Playwright):
- Browser-based user flows covering the five proof scenarios below

**Philosophy:** Test the pipeline, not every component. AI calls get mocked — we're testing our code, not Claude's or OpenAI's.

## Proof Scenarios

Five end-to-end scenarios that must work before v1 is done:

### Scenario 1 — "The PDF Commute"
Upload PDF → extract text → "Fit to 20 minutes" → Claude compresses, chooses narrator → OpenAI TTS generates → appears in library as "Ready" → play, skip forward, change speed to 1.5x.

### Scenario 2 — "The Article Discussion"
Paste long-form URL → fetch and extract → "Main Points ~15 min" → Claude compresses, chooses conversation (two speakers) → OpenAI TTS alternating voices → plays as natural discussion.

### Scenario 3 — "The Commute Flow"
3 items in library → tap one → mini player activates → expand → enter Car Mode → massive play/pause works → skip +/-30s → exit Car Mode → back to expanded player → close to library.

### Scenario 4 — "Offline Listening"
Generate audio online → cached in IndexedDB → go offline → library → play cached audio → works. Network indicator shows "Offline."

### Scenario 5 — "Quick Re-listen"
Return to previously played item → resumes from saved position → speed preference remembered.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, Server Actions, API Routes) |
| Database | PostgreSQL via Prisma ORM |
| AI | Claude API (Anthropic) for summarization |
| TTS (primary) | OpenAI gpt-4o-mini-tts |
| TTS (fallback) | Azure Neural TTS |
| Storage | Azure Blob Storage for audio files |
| Offline | PWA with IndexedDB (Dexie.js) |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| Styling | TailwindCSS |
| Deployment | Vercel (frontend) or Azure (full-stack) |

## Open Questions

- Exact Claude prompt engineering for narrator vs. conversation script quality
- Maximum content size before chunking for Claude's context window
- Audio file format (MP3 vs. other) and quality/bitrate tradeoffs
- Auth approach for v1 (simple email/password vs. OAuth vs. skip auth entirely for personal use)
