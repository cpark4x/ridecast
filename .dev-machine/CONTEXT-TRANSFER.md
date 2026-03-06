# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** Phase 1 complete. 4 Phase 2 specs ready. All health gates green.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (no-unused-vars, non-blocking) |
| `npm run test` | ✅ PASS | **81 passing**, 7 skipped (DB-dependent) — up from 58 (machine added 23 tests) |
| `npm run build` | ✅ PASS | Next.js 16.1.6 + Turbopack |
| `npm run test:e2e` | ✅ PASS | 5/5 passing |

### Phase 1 — Complete ✅

All 5 Phase 1 features shipped autonomously across 2 machine sessions:

| Commit | Feature |
|--------|---------|
| `f1f5775` | Duration accuracy — ±15% tolerance, 2nd retry, durationAdvisory |
| `b158b0d` | Pipeline error resilience — retryWithBackoff, truncation warning, maxDuration |
| `43bec2a` | ProcessingScreen — 4-stage Analyzing→Scripting→Generating→Ready UI |
| `90947ea` | Playback state persistence — PlayerContext ↔ /api/playback (5s polling) |
| `f1ba60c` | Audio duration measurement — music-metadata library (accurate, not buffer-size estimate) |

Machine also committed `8369785 docs: rewrite README for public portfolio`.

---

## Product Direction

**Vision:** "Turn anything you want to read into audio worth listening to."

**Platform:** iOS app (consumer) with:
- Free catalog (pre-generated episodes from public domain/Wikipedia/arXiv)
- Paid own-content tier (user uploads any PDF/EPUB/TXT/URL)
- Freemium model (BYOK remains for advanced users)

Full context: `VISION.md`, `ROADMAP.md`, `docs/plans/2026-03-06-competitive-brief.md`

---

## Phase 2 Feature Specs — Ready to Build

All 4 specs in `specs/features/phase2/`. Build in this order (respect depends_on):

| Priority | Feature | Spec | Effort | Note |
|----------|---------|------|--------|------|
| 1 | elevenlabs-provider | `elevenlabs-provider.md` | Small | No depends_on — start here |
| 2 | elevenlabs-routing | `elevenlabs-routing.md` | Small | Depends on elevenlabs-provider |
| 3 | episode-versioning | `episode-versioning.md` | Small | Independent |
| 4 | commute-duration | `commute-duration.md` | Small | Independent |

### Key context for Phase 2 specs

**ElevenLabs:**
- Package: `elevenlabs` (npm)
- Interface: `TTSProvider.generateSpeech(text, voice): Promise<Buffer>` — identical to OpenAI
- Rachel voice ID: `21m00Tcm4TlvDq8ikWAM` (narrator), Adam: `pNInz6obpgDQGcFmaJgB` (Host A)
- Factory pattern: `createTTSProvider()` in `src/lib/tts/provider.ts` — picks by env var

**Episode Versioning:**
- Current `/api/library` returns `latestScript + latestAudio` (one version per content)
- New shape: `{ ...item, versions: AudioVersion[] }` sorted by targetDuration ascending
- LibraryScreen needs expandable card when `versions.length > 1`

**Commute Duration:**
- localStorage key: `ridecast:commute-duration-mins`
- Hook: `useCommuteDuration()` in `src/hooks/useCommuteDuration.ts`
- Used in: UploadScreen slider default (replace hardcoded 15)

---

## Development Environment

- **Runtime:** Node.js v24.11.1, npm 11.6.2, macOS arm64
- **DB:** PostgreSQL 16 via Docker on port 5433 (`docker compose up -d`)
- **Test mocks:** All Claude/OpenAI/ElevenLabs API calls must be mocked in tests — never real calls
- **Architecture:** `specs/architecture.md` — always read first in each session

---

## If Interrupted

1. Read `STATE.yaml` — features with `status: ready` are the work queue
2. Check `specs/features/phase2/` for the spec files
3. Respect `depends_on` — build elevenlabs-provider before elevenlabs-routing

## Commands

```bash
# Verify (run before and after each feature)
npm run lint && npm run test && npm run build

# Run dev machine
amplifier recipe execute .dev-machine/recipes/build.yaml

# DB setup (if needed)
docker compose up -d && npm run db:migrate && npm run db:generate
```
