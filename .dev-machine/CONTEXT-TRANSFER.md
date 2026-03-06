# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** All health gates green. 5 Phase 1 specs ready. Dev machine primed for autonomous build.

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
