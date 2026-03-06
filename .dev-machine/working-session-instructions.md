# Working Session Instructions — ridecast2 Dev Machine

You are a working session of the ridecast2 development machine. You start with ZERO prior context. Read everything you need from files. What you don't write down is lost forever.

## Your Mission

Implement the next batch of ready features from `STATE.yaml`. Aim for 3 features per session. Stop at 5 maximum — bounded sessions beat long degraded ones.

## Step 0: Orient (always first)

Read these files IN ORDER before touching any code:

1. `.dev-machine/STATE.yaml` — current phase, features queue, health gates
2. `.dev-machine/CONTEXT-TRANSFER.md` — recent decisions and handoff notes
3. `specs/architecture.md` — the constitution (module boundaries, patterns, data model)
4. `specs/modules/content-pipeline.md` — the pipeline interface contracts

Then read the spec file for each feature you plan to implement this session.

## Step 1: Pick Your Work

From `STATE.yaml`, find features with `status: "ready"` and no unmet `depends_on`. Pick the first 3 (top of the list = highest priority).

Update each to `status: "in-progress"` in STATE.yaml before starting:

```yaml
features:
  duration-accuracy:
    status: "in-progress"    # ← change this
```

## Step 2: Implement Each Feature (TDD)

For each feature, follow this exact cycle:

### RED — Write a failing test first

Read the spec's Success Criteria section. Write the test(s) it describes. Run the test suite and confirm the new test(s) fail for the right reason (missing implementation, not a syntax error).

```bash
cd /Users/chrispark/Projects/ridecast2
npm run test
```

If the test passes immediately without any implementation change, the test is wrong — rewrite it.

### GREEN — Minimal implementation

Write the smallest code that makes the failing test(s) pass. Do not over-engineer. Do not add untested code.

```bash
npm run test
```

All tests must pass (58+ passing, 7 skipped DB-dependent is expected baseline).

### VERIFY — Full gates

```bash
npm run lint    # warnings ok, errors not ok
npm run test    # all passing
npm run build   # must succeed
```

If any gate fails, fix before proceeding. Do not commit broken code.

### COMMIT

```bash
git add -A
git commit -m "feat(<scope>): <description>

Implements: <spec filename>
Tests: <what was tested>"
```

Scope examples: `ai`, `tts`, `ui`, `api`, `player`, `pipeline`

### UPDATE STATE

Mark the feature done in STATE.yaml:

```yaml
features:
  duration-accuracy:
    status: "done"
    commit: "abc1234"
    completed_at: "2026-03-06T14:30:00Z"
```

## Step 3: Update CONTEXT-TRANSFER.md

After completing your batch, add a session summary to CONTEXT-TRANSFER.md:

```markdown
### Session N Summary — YYYY-MM-DD

**Completed:**
- `feature-id` — what was built, key decisions made

**Health gates:** lint ✅ test ✅ build ✅

**Next session should start with:** [feature-id]

**Notes:** [anything the next session needs to know]
```

## If You Hit a Blocker

Add it to STATE.yaml and stop:

```yaml
blockers:
  - description: "What is blocked and why"
    feature: "feature-id"
    since: "2026-03-06T14:30:00Z"
    severity: "high"
    suggested_resolution: "What needs to happen to unblock"
```

Then update CONTEXT-TRANSFER.md with the blocker context.

## Key Project Facts

- **Stack:** Next.js 16 App Router, TypeScript strict, React 19, TailwindCSS 4, Prisma/PostgreSQL
- **Test runner:** Vitest (unit + integration), Playwright (E2E — don't run unless spec requires it)
- **DB:** PostgreSQL via Docker on port 5433. Run `docker compose up -d` if DB errors occur.
- **Schema changes:** Run `npm run db:migrate` then `npm run db:generate` after any `schema.prisma` edit
- **API routes:** All in `src/app/api/`. Server-side logic in `src/lib/`. Client components in `src/components/`.
- **Default user:** `DEFAULT_USER_ID = "default-user"` throughout — no auth yet
- **AI keys:** In `.env` — `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`. Tests should mock these.

## Boundary Rules (NEVER violate)

- Work only in `/Users/chrispark/Projects/ridecast2`
- Do NOT `git push` — the outer loop handles commits; pushing is a human decision
- Do NOT install global packages (`npm install -g`)
- Do NOT modify `prisma/dev.db` directly
- If unsure, add a blocker and stop
