# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** Phase 2 complete. All 4 Phase 2 features shipped. All health gates green.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (no-unused-vars, non-blocking) — 0 errors |
| `npm run test` | ✅ PASS | **95 passing**, 7 skipped (DB-dependent) — up from 81 (machine added 14 more tests) |
| `npm run build` | ✅ PASS | Next.js 16.1.6 + Turbopack |
| `npm run test:e2e` | ✅ PASS (last verified 2026-03-06 PR #16) | 5/5 passing |

### Phase 2 — Complete ✅

All 4 Phase 2 features shipped in one machine session:

| Commit | Feature |
|--------|---------|
| `1ba268f` | ElevenLabs TTS Provider — `ElevenLabsTTSProvider` class + `elevenlabs` npm dep |
| `0738f2f` | ElevenLabs Routing — `createTTSProvider()` factory, ElevenLabs voice configs in narrator/conversation |
| `3c55a2e` | Episode Versioning — `/api/library` returns `versions[]` array; LibraryScreen expandable cards |
| `1252d1f` | Commute Duration Preference — `useCommuteDuration()` hook; UploadScreen remembers slider setting |

---

## Product Direction

**Vision:** "Turn anything you want to read into audio worth listening to."

**Platform:** iOS app (consumer) with:
- Free catalog (pre-generated episodes from public domain/Wikipedia/arXiv)
- Paid own-content tier (user uploads any PDF/EPUB/TXT/URL)
- Freemium model (BYOK remains for advanced users)

Full context: `VISION.md`, `ROADMAP.md`, `docs/plans/2026-03-06-competitive-brief.md`

---

## Session 3 Summary — 2026-03-06

**Completed:**
- `elevenlabs-provider` — `ElevenLabsTTSProvider` implementing `TTSProvider` interface; `elevenlabs` npm package installed; `ELEVENLABS_API_KEY` added to `.env.example`; test uses `vi.fn().mockImplementation(function() {...})` (not arrow fn) for constructor mocking
- `elevenlabs-routing` — `createTTSProvider()` factory in `src/lib/tts/provider.ts`; checks `ELEVENLABS_API_KEY` env var to pick provider; narrator/conversation voice configs updated with ElevenLabs Rachel/Adam voice IDs; audio generate route updated to use factory
- `episode-versioning` — `/api/library` now returns `versions: AudioVersion[]` per content item (sorted by targetDuration ascending); items with no audio show `status: "generating"`; LibraryScreen updated with expandable card UI (chevron for multi-version items, inline version rows with duration/format/status badges)
- `commute-duration` — `useCommuteDuration()` hook in `src/hooks/`; uses **lazy state initializer** (not useEffect) to avoid React compiler lint error about "cascading renders"; UploadScreen slider defaults to stored value, persists on change

**Key decisions:**
- ElevenLabs `ElevenLabsClient` mock: must use `function()` not arrow fn in `mockImplementation` so it can be used as constructor with `new`
- `createTTSProvider()` reads env var at call time (not module load time) — dynamic env-checking is correct
- Library route TypeScript fix: explicit `(script): AudioVersion[]` return type annotation on `flatMap` callback to satisfy strict compiler
- `useCommuteDuration` uses lazy `useState(readStoredDuration)` instead of `useEffect(() => setState(...))` to satisfy React compiler no-cascading-renders lint rule — functionally identical but cleaner

**Health gates after session:** lint ✅ (0 errors, 10 warnings) · test ✅ (95 passing, 7 skipped) · build ✅

**Next session should start with:** Phase 3 specs (none yet written) — the next step is to plan Phase 3 features. Check `ROADMAP.md` and `VISION.md` for direction.

**Notes:**
- All Phase 2 STATE.yaml features are `status: done` with commit hashes
- No schema changes were needed this session
- ElevenLabs integration is complete but requires `ELEVENLABS_API_KEY` in `.env` to activate — falls back to OpenAI seamlessly without it
- `src/hooks/` directory created this session (new module location)
- Test count: 58 (Phase 1 start) → 81 (Phase 1 end) → 95 (Phase 2 end)

---

## Development Environment

- **Runtime:** Node.js v24.11.1, npm 11.6.2, macOS arm64
- **DB:** PostgreSQL 16 via Docker on port 5433 (`docker compose up -d`)
- **Test mocks:** All Claude/OpenAI/ElevenLabs API calls must be mocked in tests — never real calls
- **Architecture:** `specs/architecture.md` — always read first in each session

---

## Commands

```bash
# Verify (run before and after each feature)
npm run lint && npm run test && npm run build

# Run dev machine
amplifier recipe execute .dev-machine/recipes/build.yaml

# DB setup (if needed)
docker compose up -d && npm run db:migrate && npm run db:generate
```
