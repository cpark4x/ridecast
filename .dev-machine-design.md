# Dev Machine Design — ridecast2

> Working dev-machine config for the ridecast2 content-to-audio pipeline.

## Machine Configuration

| Variable | Value |
|----------|-------|
| `project_name` | `ridecast2` |
| `project_dir` | `/Users/chrispark/Projects/ridecast2` |
| `specs_dir` | `./specs` |
| `state_file` | `./STATE.yaml` |
| `context_file` | `./CONTEXT-TRANSFER.md` |
| `architecture_spec` | `./specs/architecture.md` |
| `build_command` | `npm run build` |
| `test_command` | `npm run test` |

## Template Variables

| Variable | Value | Used by |
|----------|-------|---------|
| `project_name` | `ridecast2` | All recipes |
| `project_dir` | `/Users/chrispark/Projects/ridecast2` | All recipes |
| `specs_dir` | `./specs` | Architecture, module, feature specs |
| `state_file` | `./STATE.yaml` | Dev-machine state persistence |
| `context_file` | `./CONTEXT-TRANSFER.md` | Session handoff context |
| `architecture_spec` | `./specs/architecture.md` | Reference only (already written) |
| `build_command` | `npm run build` | Verification gate |
| `test_command` | `npm run test` | Verification gate |
| `lint_command` | `npm run lint` | Verification gate |
| `e2e_command` | `npm run test:e2e` | Verification gate (currently failing) |
| `dev_command` | `npm run dev` | Local dev server |
| `db_migrate_command` | `npm run db:migrate` | Schema changes |
| `db_generate_command` | `npm run db:generate` | Prisma client regen |

## Health Checks

Gate commands run in this order. All must pass for green status.

| # | Command | Current Status | Notes |
|---|---------|---------------|-------|
| 1 | `npm run lint` | PASS | 10 `no-unused-vars` warnings (non-blocking) |
| 2 | `npm run test` | PASS | 58/65 pass, 7 skipped (DB-dependent) |
| 3 | `npm run build` | PASS | Next.js 16.1.6 Turbopack; non-blocking warnings |
| 4 | `npm run test:e2e` | FAIL | 0/5 — two fixable selector patterns (see below) |

**Known type-check caveat:** `npx tsc --noEmit` fails due to `Request` vs `NextRequest` type mismatch in `src/app/api/playback/route.test.ts`. This does NOT block `npm run build` (Next.js handles it internally). Not a priority.

## Infrastructure

### Database

PostgreSQL 16 via Docker Compose.

```bash
docker compose up -d        # start
npm run db:migrate          # apply schema
npm run db:generate         # regenerate Prisma client
```

| Parameter | Value |
|-----------|-------|
| Image | `postgres:16` |
| User | `postgres` |
| Password | `ridecast` |
| Database | `ridecast` |
| Port | `5432` |
| Volume | `pgdata` (named, persistent) |
| `DATABASE_URL` | `postgresql://postgres:ridecast@localhost:5432/ridecast` |

### API Keys (runtime only; tests use mocks)

| Key | Required for |
|-----|-------------|
| `ANTHROPIC_API_KEY` | `POST /api/process` (Claude analysis + script gen) |
| `OPENAI_API_KEY` | `POST /api/audio/generate` (TTS) |

Template in `.env.example`. Copy to `.env` and fill real values for runtime.

## Module Map

Single module spec captures the full pipeline:

| Spec | Path | Scope |
|------|------|-------|
| Content Pipeline | `specs/modules/content-pipeline.md` | All API routes, provider interfaces, data model |

## Known Issues (ordered by impact)

### E2E Pattern A — Ambiguous `getByText('Library')` selector

- **Affects:** `e2e/commute-flow.spec.ts:11`, `e2e/offline-listening.spec.ts:8`, `e2e/quick-relisten.spec.ts:8`
- **Cause:** Matches 3+ DOM elements under Playwright strict mode
- **Fix:** Replace with `getByRole('tab', { name: 'Library' })` or add `data-testid`

### E2E Pattern B — Missing "Target Duration" element

- **Affects:** `e2e/pdf-commute.spec.ts:19`, `e2e/article-discussion.spec.ts:14`
- **Cause:** Text not found in DOM after file upload step
- **Fix:** Verify Playwright webServer config + confirm UI renders the label

### Non-blocking

- 10 ESLint `no-unused-vars` warnings (safe to defer)
- `tsc --noEmit` type mismatch in playback route test (not gating)
- React `act()` warnings in `AppShell.test.tsx` (assertions still pass)

## Feature Backlog

Intentionally empty. This is a dev-machine config, not a roadmap.
One optional feature spec exists (`specs/features/devx/fix-e2e-selectors.md`) solely to bring E2E green.

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single module spec (not per-directory) | Pipeline is one logical feature; splitting creates noise |
| No auth module | `DEFAULT_USER_ID` is fine for MVP; auth is a future concern |
| Provider interfaces over direct SDK calls | Enables test mocks + future provider swaps |
| Colocated tests | Fast discovery, easy deletion, no mirrored `__tests__/` tree |
| Prisma singleton | Prevents connection pool leaks during Next.js HMR |

## Verification Workflow

Standard verification after any change:

```bash
npm run lint && npm run test && npm run build
```

Full verification (once E2E is fixed):

```bash
npm run lint && npm run test && npm run build && npm run test:e2e
```

## Setup (new machine)

```bash
# 1. Clone + install
git clone <repo> && cd ridecast2
npm install

# 2. Database
docker compose up -d
cp .env.example .env
# Edit .env with real API keys if needed for runtime
npm run db:migrate
npm run db:generate

# 3. Verify
npm run lint && npm run test && npm run build

# 4. Dev
npm run dev
```