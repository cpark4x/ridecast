# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-05  
**Project:** ridecast2  
**Status:** Core gates green; E2E red (two fixable patterns identified)

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (no-unused-vars, non-blocking) |
| `npm run test` | ✅ PASS | 58/65 passing, 7 skipped (DB-dependent) |
| `npm run build` | ✅ PASS | Next.js 16.1.6 + Turbopack; non-blocking warnings |
| `npm run test:e2e` | ❌ FAIL | 0/5 passing; two selector pattern families fixable |

### E2E Failures

**Pattern A: Ambiguous `getByText('Library')` selector**
- Files: `e2e/commute-flow.spec.ts:11`, `e2e/offline-listening.spec.ts:8`, `e2e/quick-relisten.spec.ts:8`
- Cause: Matches 3+ DOM elements; non-deterministic under strict mode
- Fix: Replace with `getByRole('button', { name: 'Library' })` or `getByTestId('library-tab')`

**Pattern B: Missing "Target Duration" element**
- Files: `e2e/pdf-commute.spec.ts:19`, `e2e/article-discussion.spec.ts:14`
- Cause: Text not found in DOM after file upload; possible config/navigation gap
- Fix: Verify `playwright.config.ts` webServer config; confirm UI renders label

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

- **Architecture:** `specs/architecture.md` (reference; already written)
- **Module:** `specs/modules/content-pipeline.md` (single module spec for full pipeline)
- **E2E Fix Spec:** `specs/features/devx/fix-e2e-selectors.md` (brings E2E green)

## Recovery & Handoff

### Before Handing Off
1. Run the full verification suite:
   ```bash
   npm run lint && npm run test && npm run build && npm run test:e2e
   ```
2. Confirm all gates pass (including E2E).
3. Update this file with final status and date.

### If Interrupted
1. Review `STATE.yaml` for current health gate status and known issues.
2. Consult `specs/features/devx/fix-e2e-selectors.md` for E2E fix details.
3. Use recipes in `.dev-machine/recipes/`:
   - `verify.yaml` — Run lint/test/build/E2E gating suite
   - `setup.yaml` — Install dependencies + run verify
   - `fix-e2e.yaml` — Automated E2E fix (agents analyze and apply fixes)

### Key Files for Context

- `.dev-machine-design.md` — Machine configuration, decisions, verification workflow
- `.dev-machine-assessment.md` — Latest assessment run (verbatim results and diagnostics)
- `STATE.yaml` — Current state, gates, known issues, next steps
- `SCRATCH.md` — Ephemeral notes and task checklist (updated during work)

## Quick Reference

### Standard Verification
```bash
npm run lint && npm run test && npm run build
```

### Full Verification (once E2E is fixed)
```bash
npm run lint && npm run test && npm run build && npm run test:e2e
```

### E2E Fix Recipe (automated)
```bash
npm run fix:e2e  # or delegate to fix-e2e.yaml recipe
```

### Database Setup
```bash
docker compose up -d
npm run db:migrate
npm run db:generate
```

### Development Server
```bash
npm run dev
```
Runs on `http://localhost:3000` (must match `playwright.config.ts` baseURL for E2E).

## Notes

- **Type check caveat:** `npx tsc --noEmit` fails (Request vs NextRequest) but `npm run build` succeeds. Not gating.
- **Skipped tests:** `src/lib/db.test.ts` and `src/lib/seed.test.ts` are DB-dependent; skip 7 tests intentionally.
- **Act() warnings:** `AppShell.test.tsx` has 3 React act() warnings but assertions pass; non-blocking.
- **Lint warnings:** 10 `no-unused-vars` warnings in seed, route handlers, and tests; safe to defer.

## Project Overview

**Ridecast2** is a Next.js + TypeScript SPA that turns uploaded/linked content (PDF/EPUB/TXT/URL) into an AI-compressed script (Claude) and then generates TTS audio (OpenAI). It uses Prisma + PostgreSQL for persistence and Playwright for E2E proof scenarios.

The dev machine is fully functional for development and testing; only E2E is red due to two selector patterns that have been diagnosed and are awaiting fixes.
