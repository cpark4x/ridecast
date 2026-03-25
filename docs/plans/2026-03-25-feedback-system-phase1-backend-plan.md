# In-App Feedback System — Phase 1 Backend Infrastructure (COMPLETE)

**Status:** ✅ Complete  
**Completed:** 2026-03-25

## Overview

Backend API and AI pipeline for collecting, categorizing, and querying user feedback and telemetry events. This phase is implemented and documented here as a reference record.

**Architecture:** Three Next.js App Router API routes backed by two Prisma models (`Feedback`, `TelemetryEvent`). Feedback submissions are categorized at intake by Claude. Voice submissions are transcribed by OpenAI Whisper and optionally stored in Azure Blob Storage. Admin queries are gated by an `ADMIN_USER_IDS` environment-variable allowlist.

**Tech stack:** Next.js App Router, Prisma + Postgres, Claude (Anthropic SDK), OpenAI Whisper, Azure Blob Storage, Vitest

---

## What Was Built

### Prisma Models — `prisma/schema.prisma`

Two models added; relation arrays (`feedback`, `telemetryEvent`) added to the `User` model.

**`Feedback`**
- `id`, `userId`, `type` ("text" | "voice"), `rawText`, `audioUrl?`, `screenContext`
- `category?` — AI-assigned: Bug, UX Friction, Feature Request, Content Quality, Playback Issue (nullable on categorization failure)
- `summary?` — AI-generated one-line summary (nullable on categorization failure)
- `priority?` — AI-assigned: Critical, High, Medium, Low (nullable on categorization failure)
- `status` — "new" | "reviewed" | "addressed" | "dismissed" (default: "new")
- `relatedEpisodeId?`, `createdAt`, `updatedAt`

**`TelemetryEvent`**
- `id`, `userId`, `eventType`, `metadata` (Json), `surfaced` (default: false), `createdAt`
- Valid event types: `api_error`, `playback_failure`, `processing_timeout`, `upload_failure`

---

### Claude Categorization Module — `src/lib/ai/feedback.ts`

`categorizeFeedback(input: FeedbackInput): Promise<FeedbackAnalysis>`

- Model: `claude-sonnet-4-20250514`, max_tokens: 256, wrapped in `retryWithBackoff`
- Input: `text`, `screenContext`, optional `episodeId`, optional `telemetryEvents` (last hour, used to enrich the prompt)
- Output: `{ category, summary, priority, duplicateOf }`
- Strips markdown fences before JSON parsing
- Throws on empty response, malformed JSON, or missing required fields

Tests: `src/lib/ai/feedback.test.ts` (7 tests)

---

### POST /api/feedback — `src/app/api/feedback/route.ts`

Accepts text feedback (JSON body) or voice feedback (multipart FormData).

- `maxDuration = 60` (voice transcription + Claude can be slow)
- **Text path:** `{ text, screenContext, episodeId? }` → validate → fetch recent telemetry → categorize → store
- **Voice path:** `{ audioFile, screenContext, episodeId? }` FormData → upload to Azure Blob (if configured via `isBlobStorageConfigured()`) → transcribe with Whisper (`whisper-1`) → categorize → store
- Categorization failure is **graceful**: stores feedback with `null` category/summary/priority rather than failing the request
- Fetches up to 10 telemetry events from the last hour to include in the Claude prompt
- Returns: `{ id, summary, category }`
- Auth: `getCurrentUserId()` — returns 401 on unauthenticated

Tests: `src/app/api/feedback/route.test.ts` (9 tests)

---

### POST /api/telemetry — `src/app/api/telemetry/route.ts`

Logs individual telemetry events.

- Validates `eventType` against allowlist; rejects unknown types with 400
- Defaults `metadata` to `{}` if not provided
- Stores with `surfaced: false`
- Returns: `{ id }`

Tests: `src/app/api/telemetry/route.test.ts` (6 tests)

---

### GET /api/admin/feedback — `src/app/api/admin/feedback/route.ts`

Admin-only endpoint for querying submitted feedback.

- Admin gate: `ADMIN_USER_IDS` env var (comma-separated), read at call time — returns 403 for non-admins
- Filter query params: `status`, `category` (case-insensitive match), `since` (ISO date string)
- Results: ordered by `createdAt desc`, limit 50
- Returns: `{ feedback: [...] }`

Tests: `src/app/api/admin/feedback/route.test.ts` (8 tests)

---

## File Reference

| File | Description |
|------|-------------|
| `prisma/schema.prisma` | Feedback + TelemetryEvent models |
| `src/lib/ai/feedback.ts` | Claude categorization module |
| `src/lib/ai/feedback.test.ts` | Categorization tests (7) |
| `src/app/api/feedback/route.ts` | POST /api/feedback |
| `src/app/api/feedback/route.test.ts` | Feedback route tests (9) |
| `src/app/api/telemetry/route.ts` | POST /api/telemetry |
| `src/app/api/telemetry/route.test.ts` | Telemetry route tests (6) |
| `src/app/api/admin/feedback/route.ts` | GET /api/admin/feedback |
| `src/app/api/admin/feedback/route.test.ts` | Admin route tests (8) |

**Total: 30 tests across 4 test files.**
