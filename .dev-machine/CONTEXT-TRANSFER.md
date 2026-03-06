# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** All health gates green. Phase 1 COMPLETE — all 5 specs shipped.

---

### Session 2 Summary — 2026-03-06

**Completed:**

- `playback-state-persistence` (commit `90947ea`) — Wired `/api/playback` GET/POST into `PlayerContext.tsx`. Restores position+speed on new item load (`useEffect` on `currentItem?.id`). Saves position on: `pause` event, `seeked` event, `ended` event (with `completed=true`), every 5 seconds via `setInterval` while `isPlaying`, and on `beforeunload`. Used `currentItemIdRef` pattern (ref stays in sync with latest `currentItem.id`) so `savePosition` has stable `[]` deps and event listeners registered once on mount always call the latest version. Added 3 new tests in `PlayerContext.test.tsx`.

- `audio-duration-measurement` (commit `f1ba60c`) — Installed `music-metadata`. Replaced the `fileSizeBytes / 16000` buffer-size estimate in `/api/audio/generate/route.ts` with `parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' })` which reads real MP3 header duration. Falls back to word-count estimate (not buffer-size) if `parseBuffer` throws or returns no duration. Updated the accuracy log line to say `Source: music-metadata`. Added 2 new tests in `route.test.ts` (real measurement test + fallback test).

**Health gates:**

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (unchanged, all pre-existing no-unused-vars) |
| `npm run test` | ✅ PASS | 81/88 passing, 7 skipped (DB-dependent) — up from 76/83 |
| `npm run build` | ✅ PASS | Next.js 16.1.6 + Turbopack, no new errors |

**Phase 1 status: COMPLETE.** All 5 feature specs shipped across 2 sessions.

**Next session should start with:** Phase 2 planning. No `ready` features remain in STATE.yaml. Next work requires defining Phase 2 specs or deciding what to tackle next (iOS shell, queue feature, catalog, or another Phase 1 follow-up).

**Key decisions made:**
- `PlayableItem.id` IS the audio ID (confirmed from LibraryScreen.tsx where `play({ id: item.audioId, ... })`)
- Used `currentItemIdRef` (ref-based) instead of `useCallback` with state dependency to avoid React compiler "Compilation Skipped" lint error
- `music-metadata`'s fallback uses word-count estimate (not buffer-size) — more accurate for short/corrupt files
- Did NOT add `audioId` to `PlayableItem` interface — `id` already serves this role

---

### Session 1 Summary — 2026-03-06

**Completed:**

- `duration-accuracy` (commit `f1f5775`) — Tightened ±30% → ±15% tolerance in `claude.ts`; added 2nd retry with hard constraint prompt; raised `max_tokens` floor to `Math.max(targetWords*2, 2048)`; added `durationAdvisory` field to `/api/process` response (shown when actual word count misses ±15%); wired advisory into `ProcessingScreen`. Added 6 new tests (4 in `claude.test.ts`, 2 in `process/route.test.ts`).

- `pipeline-error-resilience` (commit `b158b0d`) — Created `src/lib/utils/retry.ts` with `retryWithBackoff` (2 retries max, 3× backoff, rate-limit only); wrapped Claude `messages.create` and OpenAI TTS `audio.speech.create` calls; added `truncationWarning` field to upload response (warns above 400K chars); added `truncationWarning` display to `UploadScreen.tsx`; exported `maxDuration = 120` and `maxDuration = 180` from process and audio/generate routes; wrapped PDF/EPUB extraction in try/catch with user-friendly typed error messages; added per-stage `errorStage` state to `ProcessingScreen` with "Retry Audio Generation" button that retries audio-only without re-running Claude. Added 6 new tests in `retry.test.ts`, 2 new tests in `pdf.test.ts`.

- `processing-screen-upgrade` (commit `43bec2a`) — Replaced loading spinner with 4-stage UI (`analyzing → scripting → generating → ready`); added 3-second timer to advance analyzing → scripting; added `STAGE_CONFIG` with icon/label/copy per stage; replaced progress bar with 4-step indicator; added "Ready" episode card with "Play Now" + "Add to Queue" buttons; `onComplete` now called with `audio.id`; `addToQueue` is a console-log stub (future queue feature); `durationAdvisory` shown in ready card. Added 4 new tests in `ProcessingScreen.test.tsx`.

**Health gates:**

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (unchanged, all pre-existing no-unused-vars) |
| `npm run test` | ✅ PASS | 76/83 passing, 7 skipped (DB-dependent) — up from 58/65 |
| `npm run build` | ✅ PASS | Next.js 16.1.6 + Turbopack, no new errors |

**Next session should start with:** `playback-state-persistence` (priority 4)

**Notes:**
- `addToQueue` in `ProcessingScreen` is a stub (logs to console). The full queue feature is deferred.
- `ProcessingScreen.onComplete` signature changed: now passes `audioId` (was `scriptId`). `AppShell.handleProcessComplete` ignores the argument so no breakage.
- All 18 test files pass; 20 test files total (2 DB-dependent are skipped file-level).
- `prisma/dev.db` remains untracked — do not commit.

---

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (no-unused-vars, non-blocking) |
| `npm run test` | ✅ PASS | 58/65 passing, 7 skipped (DB-dependent) |
| `npm run build` | ✅ PASS | Next.js 16.1.6 + Turbopack; non-blocking warnings |
| `npm run test:e2e` | ✅ PASS | 5/5 passing (PR #16, merged today) |

### Recently Merged

- **PR #16** — Upload form reset (#4), E2E Pattern A+B fixes, Phase 1 specs, ROADMAP+VISION update
- **PR #17** — Duplicate 409 regression fix (one-line, broke in PR #15)
- **PR #18** — VISION.md full rewrite (iOS strategy, "enjoyable audio" value prop)

---

## Product Direction (Updated Today)

**Vision:** "Turn anything you want to read into audio worth listening to."

**Product:** iOS app with two modes:
- **Free catalog** — pre-generated episodes from public domain books, Wikipedia, arXiv, top articles
- **Paid own-content** — user uploads any PDF/EPUB/TXT/URL; AI transforms it

**Strategic positioning:** Blinkist for any content + duration control. Not a TTS reader (Speechify). Not a research tool (NotebookLM). A transformation engine that produces something genuinely enjoyable.

Full context: `VISION.md`, `ROADMAP.md`, `docs/plans/2026-03-06-competitive-brief.md`

---

## Phase 1 Feature Specs — Ready to Build

All 5 specs are in `specs/features/phase1/`. Build in this order:

| Priority | Spec | What it builds | Effort |
|----------|------|----------------|--------|
| 1 | `duration-accuracy.md` | Tighten ±15% tolerance, add 2nd retry, surface durationAdvisory to client | Small |
| 2 | `pipeline-error-resilience.md` | retryWithBackoff utility, truncation warning, maxDuration exports | Medium |
| 3 | `processing-screen-upgrade.md` | Replace loading spinner with 4-stage Analyzing→Scripting→Generating→Ready | Small |
| 4 | `playback-state-persistence.md` | Wire /api/playback into PlayerContext — position sync contract | Small |
| 5 | `audio-duration-measurement.md` | Replace MP3 buffer-size estimate with music-metadata library | Small |

---

## Development Environment

### Tech Stack

- **Runtime:** Node.js v24.11.1, npm 11.6.2, macOS arm64
- **Framework:** Next.js 16.1.6 (App Router) + React 19 + TypeScript
- **Styling:** TailwindCSS 4
- **Database:** PostgreSQL 16 via Docker Compose
  - URL: `postgresql://postgres:ridecast@localhost:5432/ridecast`
  - Setup: `docker compose up -d && npm run db:migrate && npm run db:generate`
- **Testing:** Vitest + Testing Library (unit/integration), Playwright (E2E)
- **AI/Audio:** Claude (Anthropic) + OpenAI TTS (requires API keys in `.env`)

### Specs & Architecture

- **Architecture:** `specs/architecture.md`
- **Module:** `specs/modules/content-pipeline.md`
- **Feature specs:** `specs/features/phase1/` (5 specs, all ready)

---

## Recovery & Handoff

### Standard Verification
```bash
npm run lint && npm run test && npm run build
```

### Full Verification
```bash
npm run lint && npm run test && npm run build && npm run test:e2e
```

### Run Dev Machine
```bash
amplifier recipe execute .dev-machine/recipes/build.yaml
```

### Database Setup
```bash
docker compose up -d
npm run db:migrate
npm run db:generate
```

### If Interrupted
1. Check `STATE.yaml` for current health gate status and feature spec list
2. All health gates are currently green — start from any spec
3. Prioritize specs in order listed in STATE.yaml next_steps

## Notes

- **Type check caveat:** `npx tsc --noEmit` fails (Request vs NextRequest) but `npm run build` succeeds. Not gating.
- **Skipped tests:** `src/lib/db.test.ts` and `src/lib/seed.test.ts` are DB-dependent; skip intentionally.
- **Act() warnings:** `AppShell.test.tsx` has 3 React act() warnings but assertions pass; non-blocking.
- **Lint warnings:** 10 `no-unused-vars` warnings; safe to defer.
- **prisma/dev.db:** Untracked SQLite file for local dev. Do not commit.
