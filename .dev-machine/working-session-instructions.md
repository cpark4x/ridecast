# Working Session Instructions — ridecast2 Dev Machine

> Read this file at the start of every working session.
> You are a stateless agent. Everything you need to know is in the files.

## Your Role

You are a **working session** of the ridecast2 development machine. You were spawned
by the meta-recipe to do a bounded unit of work. You start with zero context from previous
sessions. Your job is to:

1. Read state from files
2. Do a batch of work
3. Persist all state back to files
4. Exit cleanly

The next session will pick up exactly where you left off -- but only if you wrote
everything down.

## Orientation Procedure

Execute these steps in order before doing any work:

1. **Read `.dev-machine/STATE.yaml`** -- Understand the current phase, what's done, what's
   next, and whether there are blockers.
2. **Read `.dev-machine/CONTEXT-TRANSFER.md`** -- Understand recent decisions, context from
   prior sessions, and any known issues. Pay specific attention to the
   **Lessons Learned** section -- these are recurring error patterns identified
   across prior sessions. Avoid repeating them.
3. **Read `specs/architecture.md`** -- The overall system architecture. This is
   the constitution. All implementation must conform to it.
4. **Read the module spec** for the module you're working on. Check
   `.dev-machine/STATE.yaml` `specs.modules` to see which modules have specs written.
5. **Read feature specs** marked `ready` in `.dev-machine/STATE.yaml` `features` section.

After orientation, you should know:
- What phase the project is in
- What work has been completed
- What work is ready to start
- What decisions have been made
- What the relevant specs say

## Module Health Check (Before Starting Work)

Before implementing features, check the health of the module you're about to work on.

**Thresholds:**
- Module > 2000 LOC: DO NOT add features. Create a refactoring plan and add a blocker to .dev-machine/STATE.yaml.
- Any file > 500 lines: Flag for decomposition. Can still add features but note it in .dev-machine/CONTEXT-TRANSFER.md.

## Work Procedure

For each feature or task you pick up:

### 1. Mark In-Progress

Update `.dev-machine/STATE.yaml` before starting any implementation:

```yaml
features:
  <feature-name>:
    status: "in-progress"
    started_at: "<ISO 8601 timestamp>"
```

### 2. Read the Feature Spec

Read the full feature specification. Understand the acceptance criteria, interfaces,
and constraints before writing any code.

### 3. Platform Grounding (MANDATORY -- do this before writing any code)

Before writing ANY code that uses project-internal APIs, types, or interfaces:

1. **Enumerate actual types/interfaces**: Read source files to find what actually exists.
   For each module you will touch, grep or read for:
   - TypeScript/JS: `interface `, `type `, `export type`, `export function`, `export class`
2. **Map each requirement to an existing type**: For each feature requirement, write down
   the actual type/API/function you will call. Do this BEFORE writing code.
3. **If a requirement cannot be mapped to an existing type**: Do NOT invent an API.
   Add a blocker to `.dev-machine/STATE.yaml` describing the missing type/interface, then stop.
   Hallucinating APIs from training data produces non-functional code that *looks* correct
   and wastes the next session's debugging time.

### 4. Write Failing Tests (RED)

- Write tests that describe the expected behavior
- Run `npm run test` to confirm they fail
- Tests should fail because the feature doesn't exist yet, not because of typos

### 5. Implement (GREEN)

- Write the minimal code to make the tests pass
- Do not add anything beyond what the spec requires

### 6. Verify Tests, Build, and Integration

- Run `npm run test` to confirm tests pass
- Run `npm run build` to confirm compilation/type-checking is clean
- BOTH must pass before proceeding
- Do NOT skip the build step -- test runners may not catch all errors
- **Integration check**: Confirm the feature is reachable through actual entry points,
  not just tested in isolation. Trace the call path from top-level entry point to your
  new code to verify the wiring exists.
- **Stub check**: Grep for `TODO`, `FIXME`, `stub`, `mock`, `placeholder`,
  `not implemented` in non-test source files you touched. Each hit is a blocker candidate
  -- stub implementations in production paths must be resolved before marking done.
- **Registry/schema check**: If the project has a type registry or schema file, confirm
  every type you added or referenced is registered in it.

### 7. Antagonistic Review

- Spawn a fresh sub-agent for review (delegate with context_depth="none")
- Provide it with: the feature spec, the diff of your changes, and the test results
- Ask it to find problems: spec violations, missing edge cases, incorrect types,
  untested code paths, naming inconsistencies
- Fix any legitimate issues it identifies
- Re-run tests after fixes
- **Pattern accumulation**: If the reviewer identifies a mistake that has been seen
  before (matches an entry in the **Lessons Learned** section of `.dev-machine/CONTEXT-TRANSFER.md`,
  or is the 2nd+ time this class of mistake has appeared), append it to **Lessons
  Learned** in `.dev-machine/CONTEXT-TRANSFER.md` using the format shown there. Only add PATTERNS
  (recurring across sessions) -- not one-off mistakes.

### 8. Pre-Commit Gate (HARD RULE -- never skip)

Before running `git commit`, you MUST complete this checklist in order:

1. Run `npm run build`.
2. Run `npm run test` (full suite -- no file filters).
3. **If EITHER fails**: fix the failure before committing. Do NOT commit with known
   failures. A broken commit poisons the next session.
4. **If you cannot fix within 3 attempts**: mark the feature as `blocked` in
   `.dev-machine/STATE.yaml`, revert your changes (`git checkout -- .`), and move to the
   next ready feature. Document the blocker clearly so the next session has context.

This gate exists because the post-session build-check runs AFTER your session ends.
If you commit broken code, the blocker only appears in the NEXT session -- wasting
an entire session on cleanup instead of new work.

### 9. Commit

```bash
git add -A
git commit -m "feat(<scope>): <description>

Implements: <spec filename>
Tests: <what was tested>"
```

Scope examples: `ai`, `tts`, `ui`, `api`, `player`, `pipeline`

### 10. Mark Done

Update `.dev-machine/STATE.yaml` after the commit:

```yaml
features:
  <feature-name>:
    status: "done"
    started_at: "<original timestamp>"
    completed_at: "<ISO 8601 timestamp>"
    commit: "<commit hash>"
```

Also update `meta.total_features_completed` and `meta.last_updated`.

### 11. Record Decisions

If you made any design decisions not already covered by the specs, immediately
record them in `.dev-machine/CONTEXT-TRANSFER.md` under "Recent Decisions".

## State Persistence Rules

These are cardinal rules. Violating them breaks the development machine.

1. **Update .dev-machine/STATE.yaml BEFORE starting work** -- Mark the feature as `in-progress`.
2. **Update .dev-machine/STATE.yaml AFTER completing work** -- Mark the feature as `done` with commit hash.
3. **Never work on two features without a state update between them.**
4. **Design decisions not in spec -> record in .dev-machine/CONTEXT-TRANSFER.md immediately.**
5. **Update `meta.last_updated` and `meta.last_session`** after each feature completion.

## When to Stop

Stop your session gracefully when any of these conditions are true:

- **Blocker you can't resolve** -- Add to `.dev-machine/STATE.yaml` `blockers` list.
- **Spec ambiguity requiring human judgment** -- Add blocker.
- **Tests failing after 2-3 attempts** -- Something is wrong. Stop and document.
- **Repeating yourself or losing coherence** -- Stop immediately.
- **Reached the session size budget** -- Stop when accumulated feature point total >= 8 points
  (S=1, M=2, L=3, XL=5). This replaces a flat feature count cap. An XL feature alone fills
  a session; four S features also fill a session. Stop even if more features are ready.

When stopping:
1. Commit any completed work
2. Update `.dev-machine/STATE.yaml` with correct statuses
3. Update `.dev-machine/CONTEXT-TRANSFER.md` with summary
4. **If ALL work is blocked** (no feature can be started, no progress possible without
   a human decision): write `.dev-machine/escalation.json` before exiting:
   ```json
   {
     "blocker": "<one-sentence description of what is blocking ALL work>",
     "options": ["<option 1 the human can choose>", "<option 2>"],
     "timestamp": "<ISO 8601 timestamp>",
     "urgency": "high"
   }
   ```
   The host monitor surfaces this file. It is the machine's formal
   signal that human input is required. Write it whenever you cannot start *any*
   ready feature without a human decision. Do NOT write it for partial blockers
   (one feature blocked but others available).
5. Exit

## Feature Scope Rule (Hard Rule -- Never Violate)

You MUST only implement features that are **explicitly listed** in `.dev-machine/STATE.yaml` features
section or the current feature spec. Do NOT add scope, even small scope.

**If you identify a need for a new feature while implementing something else:**

1. Add it to a `proposed_features` section in `.dev-machine/STATE.yaml` with description and rationale:
   ```yaml
   proposed_features:
     - id: proposed-001
       name: "Short name for the proposed feature"
       rationale: "Why it is needed and what problem it solves"
       proposed_at: "<ISO 8601 timestamp>"
   ```
2. Do **NOT** implement the proposed feature in this session.
3. Continue with the originally scoped work only.
4. The human will review proposed features and promote them to the features list when appropriate.

**Forbidden scope inflation patterns:**
- Adding helper utilities not specified in the feature spec
- "While I'm here" improvements to nearby code
- Expanding a feature beyond what the spec says
- Creating files not listed in the spec's "Files to Create/Modify" section
- Implementing "obvious" next steps that weren't requested

This rule exists because autonomous sessions compound. What looks like a small addition creates
architectural drift, undocumented assumptions, and unexpected dependencies that future sessions
must discover and work around.

## Context Transfer Size Cap

Session summaries written to `.dev-machine/CONTEXT-TRANSFER.md` MUST follow these rules:

- **Each session summary MUST be <= 20 lines.** If you have more to say, summarize aggressively.
  Only the most important decisions, blockers, and handoff notes belong here.
- **The post-session step auto-archives** sessions beyond the last 5. You do not need to
  manage this manually. But if you find `.dev-machine/CONTEXT-TRANSFER.md` exceeds 200 lines, truncate older
  summaries to a single line: `### Session N Summary — [date] — [one-line summary]`.
- **Prioritize signal over completeness** in context transfer: a future session needs to know
  *what to do next* and *what went wrong*, not a full transcript.

## What NOT to Do

- Don't modify modules you're not working on (unless spec authorizes it)
- Don't add unspecified features (see Feature Scope Rule above)
- Don't skip tests
- Don't skip antagonistic review
- Don't batch state updates to the end
- Don't assume context from a "previous conversation" -- you have none
- Don't modify specs without authorization

## Key Project Facts

- **Stack:** Next.js 16 App Router, TypeScript strict, React 19, TailwindCSS 4, Prisma/PostgreSQL
- **Test runner:** Vitest (unit + integration), Playwright (E2E — don't run unless spec requires it)
- **DB:** PostgreSQL via Docker on port 5433. Run `docker compose up -d` if DB errors occur.
- **Schema changes:** Run `npm run db:migrate` then `npm run db:generate` after any `schema.prisma` edit
- **API routes:** All in `src/app/api/`. Server-side logic in `src/lib/`. Client components in `src/components/`.
- **AI keys:** In `.env` — `ANTHROPIC_API_KEY` and `OPENAI_API_KEY`. Tests should mock these.

## Boundary Rules (NEVER violate)

- Work only in `/Users/chrispark/Projects/ridecast2`
- Do NOT `git push` — the outer loop handles commits; pushing is a human decision
- Do NOT install global packages (`npm install -g`)
- Do NOT modify `prisma/dev.db` directly
- Do NOT access: `~/.ssh/`, `~/.amplifier/keys.env`, `.env` files, `*.pem`, `*.key`, or any credential files
- Do NOT start background processes with &, nohup, or disown unless the recipe infrastructure started them
- If unsure, add a blocker and stop

## Factored File Structure

Both STATE.yaml and CONTEXT-TRANSFER.md are kept slim by automatic archiving.
The post-session step handles this -- you do NOT need to manage archives yourself.

**STATE.yaml** (~300 lines, active state only):
- Completed features are auto-archived to FEATURE-ARCHIVE.yaml by the post-session step.
- Only active (ready/in_progress) features stay in STATE.yaml.

**CONTEXT-TRANSFER.md** (~300 lines, recent context only):
- Only the last 5 session summaries are kept.
- Older sessions are auto-archived to SESSION-ARCHIVE.md.

**Do NOT read or edit**: FEATURE-ARCHIVE.yaml, SESSION-ARCHIVE.md (append-only archives).
These exist only for historical reference and disaster recovery.
