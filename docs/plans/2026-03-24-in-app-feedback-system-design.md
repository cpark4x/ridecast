# In-App Feedback System Design

## Goal

Build an AI-powered feedback pipeline built into the Ridecast iOS app that collects user feedback (voice + text), automatically categorizes and prioritizes it, captures implicit telemetry signals, and surfaces actionable insights through Amplifier CLI.

## Background

As Ridecast moves toward beta and general release, there's no structured way to capture user feedback or observe where users hit friction. Feedback today is ad-hoc and unstructured. This system solves three problems:

1. **Capture** — Give users a low-friction way to report issues (text or voice) directly from the app
2. **Enrich** — Use AI to categorize, prioritize, and connect vague feedback with real telemetry data
3. **Surface** — Make feedback queryable through Amplifier so it's actionable without a separate dashboard

## Phased Rollout

- **Phase A (now):** Chris only — fast capture of own feedback during development
- **Phase B (next week):** Small group of testers
- **Phase C (next month):** All users

## Approach

**Smart Intake (chosen approach):** AI processes feedback at submission time via Claude. Telemetry events are aggregated by a daily scheduled job. Results land in structured Postgres tables ready for Amplifier queries. Server-side processing uses the existing Next.js backend infrastructure.

This avoids both extremes — no raw-dump-and-analyze-later (too slow to act on), and no over-engineered real-time streaming pipeline (YAGNI). Feedback is categorized and prioritized the moment it arrives, so every query returns clean, actionable data.

## Architecture

```
┌─────────────────────┐
│   Ridecast iOS App   │
│                      │
│  ┌────────────────┐  │
│  │ Feedback Sheet  │  │──── POST /api/feedback ────┐
│  │ (text / voice)  │  │                             │
│  └────────────────┘  │                             ▼
│                      │                   ┌──────────────────┐
│  ┌────────────────┐  │                   │  Next.js Backend  │
│  │ useTelemetry   │  │──── POST /api/ ──▶│                  │
│  │ (silent hook)   │  │    telemetry     │  ┌────────────┐  │
│  └────────────────┘  │                   │  │ Claude API  │  │
└─────────────────────┘                   │  │ (categorize)│  │
                                           │  └────────────┘  │
                                           │  ┌────────────┐  │
                                           │  │ Whisper API │  │
                                           │  │ (transcribe)│  │
                                           │  └────────────┘  │
                                           │  ┌────────────┐  │
                                           │  │  Postgres   │  │
                                           │  │ (Feedback + │  │
                                           │  │  Telemetry) │  │
                                           │  └────────────┘  │
                                           └──────────────────┘
                                                    ▲
                                                    │
                                           GET /api/admin/feedback
                                                    │
                                           ┌────────────────┐
                                           │  Amplifier CLI  │
                                           └────────────────┘
```

Two data flows:
1. **Explicit feedback** — User submits text/voice → AI categorizes at submission time → stored structured in Postgres → queryable via Amplifier
2. **Implicit telemetry** — Silent hook captures failures → batched to server → daily cron job flags patterns via Claude → surfaced through Amplifier

## Components

### Data Model

Two new Prisma models. No separate analysis tables — structured fields live directly on the Feedback row.

**Feedback** — each user submission:

| Field             | Type     | Description                                                        |
|-------------------|----------|--------------------------------------------------------------------|
| id                | String   | Primary key                                                        |
| userId            | String   | From Clerk                                                         |
| createdAt         | DateTime | Submission timestamp                                               |
| type              | String   | `"text"` or `"voice"`                                              |
| rawText           | String   | What the user typed, or transcript from voice                      |
| audioUrl          | String?  | Azure Blob URL for voice recordings (null for text)                |
| screenContext     | String   | Which screen they were on when they submitted                      |
| category          | String   | AI-assigned: Bug, UX Friction, Feature Request, Content Quality, Playback Issue |
| summary           | String   | AI-generated one-line summary (max 100 chars)                      |
| priority          | String   | AI-assigned: Critical, High, Medium, Low                           |
| status            | String   | `"new"`, `"reviewed"`, `"addressed"`, or `"dismissed"`             |
| relatedEpisodeId  | String?  | Optional link to the episode they were interacting with            |

**TelemetryEvent** — implicit failure/friction signals:

| Field     | Type     | Description                                                                    |
|-----------|----------|--------------------------------------------------------------------------------|
| id        | String   | Primary key                                                                    |
| userId    | String   | From Clerk                                                                     |
| createdAt | DateTime | Event timestamp                                                                |
| eventType | String   | `"api_error"`, `"playback_failure"`, `"processing_timeout"`, `"upload_failure"` |
| metadata  | Json     | Error details (status code, error message, episode ID, screen)                 |
| surfaced  | Boolean  | Whether the AI has flagged this as part of a pattern worth addressing          |

### API Routes

**`POST /api/feedback`** — Submit feedback

- Accepts: `{ type: "text" | "voice", text?: string, audioFile?: File, screenContext: string, episodeId?: string }`
- For voice: uploads audio to Azure Blob, calls OpenAI Whisper for transcription
- Calls Claude to categorize, summarize, and prioritize
- Attaches recent telemetry events from the same user to give Claude context (connecting vague feedback with real errors)
- Stores the complete Feedback row in Postgres
- Returns: `{ id, summary, category }`

**`POST /api/telemetry`** — Log implicit events

- Accepts: `{ eventType: string, metadata: object }`
- Lightweight — no AI processing at submission time. Just stores the row.
- Batched from the client (accumulated events sent every 60 seconds, not on every error)

**`GET /api/admin/feedback`** — Query feedback (admin only)

- Query params: `?status=new&category=bug&since=2026-03-20`
- Returns structured feedback rows with telemetry context
- This is what Amplifier hits when querying feedback
- Auth-gated to admin users only

### AI Processing Pipeline

**Voice submissions:**

1. Audio file uploads to Azure Blob Storage (same bucket pattern as episodes)
2. OpenAI Whisper API transcribes audio → raw text
3. Raw text flows into the same processing step as text submissions

**All submissions (text and transcribed voice):**

Single Claude call with a structured prompt:

- **Input:** raw text, screen context, episode title (if present), recent telemetry from same user in last hour
- **Output JSON:**
  - `category`: Bug | UX Friction | Feature Request | Content Quality | Playback Issue
  - `summary`: one-line actionable summary (max 100 chars)
  - `priority`: Critical | High | Medium | Low
  - `duplicateOf`: feedback ID if matches existing feedback, null otherwise

Attaching recent telemetry events enriches vague feedback like "it didn't work" with actual error data.

**Daily telemetry analysis (scheduled job):**

A cron job runs once daily. It queries all unsurfaced telemetry events, groups by event type, and calls Claude to flag patterns that indicate real problems worth addressing. Only flagged patterns get marked `surfaced: true` and become visible in Amplifier queries.

### Native App — Feedback UI

**Entry points:**

- **Settings screen** — "Send Feedback" row, always visible
- **Shake gesture** — triggers the same feedback sheet. Controlled by a settings toggle. Defaults on during beta (phases A/B), off at general release (phase C).

**Feedback sheet** (bottom sheet using `@gorhom/bottom-sheet`, already in the project):

- Opens as a half-screen modal
- Two input modes toggled by a tab at top: **Type** | **Talk**
- **Type mode:** Text input with placeholder "What's on your mind?" and submit button
- **Talk mode:** Tap-to-record button, shows recording waveform/timer, tap again to stop. Preview and re-record before submitting.
- Auto-detected screen context shown as subtle chip ("From: Library")
- If listening to an episode, episode title shown too
- Submit → brief loading state → "Thanks! We'll look into this." → sheet dismisses

**Telemetry capture** (invisible to user):

- Lightweight `useTelemetry` hook wrapping existing API calls and player events
- When API call fails or playback errors, queues a telemetry event in memory
- Events batched and sent to `POST /api/telemetry` every 60 seconds (or on app background)
- No UI, no user awareness — silent observation

### Amplifier Integration

Primary consumption is through Amplifier CLI, not a web dashboard. Data is pre-categorized and prioritized by Claude at submission time, so queries return clean, actionable items.

Typical queries:

- "Show me all new feedback since Monday" → filters by `status=new&since=...`
- "What bugs are users reporting?" → filters by `category=bug`
- "What are the critical issues?" → filters by `priority=critical`
- "Any telemetry patterns this week?" → returns surfaced telemetry patterns from the daily job

Status updates (`reviewed`, `addressed`, `dismissed`) made through the same API, keeping the loop closed.

## Feedback Categories

| Category         | When it applies                                                                 |
|------------------|---------------------------------------------------------------------------------|
| Bug              | Something is broken — crash, error, feature doesn't work                       |
| UX Friction      | It works but feels wrong — confusing flow, missing feedback                    |
| Feature Request  | "I wish it could do X"                                                         |
| Content Quality  | AI output wasn't good enough — hallucinations, bad summaries, inaccurate narration, awkward phrasing |
| Playback Issue   | Audio-specific problems — looping, timing, controls, artwork                   |

## Error Handling

- **Voice upload failure:** Fall back to text-only submission, surface error to user
- **Whisper transcription failure:** Store audio URL, mark for manual review, notify via Amplifier
- **Claude categorization failure:** Store raw feedback with `category: null`, process in next daily batch
- **Telemetry batch failure:** Retain events in memory, retry on next batch cycle
- **Admin query failure:** Standard API error responses, Amplifier handles retry

## Testing Strategy

- **API route tests** — Vitest tests for `POST /api/feedback`, `POST /api/telemetry`, `GET /api/admin/feedback` (mocking Claude and Whisper calls)
- **AI processing tests** — Verify Claude prompt returns correct structure (category, summary, priority) with sample inputs
- **Native UI tests** — Jest tests for the feedback sheet component (text submission, voice recording flow, state transitions)
- **Integration test** — End-to-end: submit feedback from app → verify it appears in admin query with correct categorization

## YAGNI — What We're NOT Building

- No push notifications when feedback is received
- No user-facing feedback history (they submit and forget)
- No web dashboard UI beyond the API (Amplifier is the interface)
- No real-time websocket streaming of feedback
- No export to GitHub Issues (can be done manually through Amplifier if needed)
