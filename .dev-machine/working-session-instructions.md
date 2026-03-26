# Working Session Instructions

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
3. **Check quality cadences** -- Read `quality_cadences` in `.dev-machine/STATE.yaml`.
   If any cadence is due (`session_count >= last_run_session + interval`),
   that cadence takes priority over feature work. See "Quality Cadences" below.
4. **Read `specs/architecture.md`** -- The overall system architecture. This is
   the constitution. All implementation must conform to it.
5. **Read the module spec** for the module you're working on. Check
   `.dev-machine/STATE.yaml` `module_specs` to see which modules have specs written.
6. **Read feature specs** marked `ready` in `.dev-machine/STATE.yaml` `features` section.

After orientation, you should know:
- What phase the project is in
- What work has been completed
- Whether any quality cadences are due (these come first)
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
   For each module you will touch, grep or read for the language-appropriate patterns:
   - TypeScript/JS: `interface `, `type `, `export type`, `export function`, `export class`
   - Python: `class `, `def `, `TypedDict`, `Protocol`, type annotations in `__init__.py`
   - Rust: `pub struct`, `pub enum`, `pub fn`, `pub trait`
   - Other: use whatever grep finds exported/public symbols in that language.
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

1. Run `npm run build` (or the language-appropriate lint/typecheck command).
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

**Every commit MUST include STATE.yaml and CONTEXT-TRANSFER.md.** This ensures that
if your session is hard-killed after a commit, the next session has accurate state.
A commit without state files is an incomplete checkpoint.

1. Update STATE.yaml: mark the feature done with timestamp (skip commit hash -- it will be backfilled by the post-session step)
2. Update CONTEXT-TRANSFER.md: add a brief note of what was completed
3. Stage and commit everything together:

```bash
git add -A
git commit -m "feat(<module>): <feature-name>"
```

The `git add -A` stages STATE.yaml and CONTEXT-TRANSFER.md along with your code changes.
This makes every commit a complete checkpoint: code + state + context.

### 10. Verify Checkpoint

The feature should already be marked done in STATE.yaml (you updated it before
committing in step 9). Verify the commit includes state files:

```bash
git show --stat HEAD | grep -E "STATE.yaml|CONTEXT-TRANSFER"
```

If STATE.yaml is not in the commit, amend it:

```bash
git add STATE.yaml CONTEXT-TRANSFER.md
git commit --amend --no-edit
```

### 11. Record Decisions

If you made any design decisions not already covered by the specs, immediately
record them in `.dev-machine/CONTEXT-TRANSFER.md` under "Recent Decisions".

## State Persistence Rules

These are cardinal rules. Violating them breaks the development machine.

1. **STATE.yaml and CONTEXT-TRANSFER.md MUST be included in every git commit.** Never
   commit code without also committing current state. Each commit is a checkpoint --
   if your session is killed after commit N, the next session must find accurate state
   through feature N. This is the single most important persistence rule.
2. **Update .dev-machine/STATE.yaml BEFORE starting work** -- Mark the feature as `in-progress`.
3. **Update .dev-machine/STATE.yaml AFTER completing work** -- Mark the feature as `done` with timestamp.
4. **Never work on two features without a state update between them.**
5. **Design decisions not in spec -> record in .dev-machine/CONTEXT-TRANSFER.md immediately.**
6. **Update `meta.last_updated` and `meta.last_session`** after each feature completion.

## Blocker Taxonomy (Read Before Filing Any Blocker)

**NEVER file a blocker for these -- fix them yourself:**

| Category | Examples |
|----------|----------|
| Build/config broken | tsconfig.json misconfigured, eslint errors, vite config wrong, pyproject.toml |
| Missing dependency | Package not in package.json / requirements.txt / pyproject.toml |
| Type errors | Type errors in code from prior sessions |
| Test infrastructure | Test runner config, missing test deps, vitest/pytest setup |
| Regression failures | Previously-passing tests now failing -- find the breaking change |
| Environment drift | Stale lockfile, tool version mismatch |
| Missing files / wiring | Import/export not connected, file not created |

**Rule of thumb:** If there is only ONE correct fix, implement it. Do NOT file a blocker.

**Genuine blockers (file these):**

| Category | Examples |
|----------|----------|
| Spec ambiguity | Two reasonable approaches; spec is silent on which to use |
| Missing external service | API key needed, external system not configured |
| Architecture question | Which fundamental approach to take (multiple valid options) |
| Out-of-scope access | Needs files/creds outside the project directory |

**Before filing a blocker for test failures:**

1. Is this a config/infrastructure issue? → Fix it (not a blocker)
2. Is this a bug in your implementation? → Try a different approach (up to 3 times)
3. Is the test itself wrong? → Fix the test
4. Is the spec genuinely ambiguous? → THEN file a blocker

## When to Stop

Stop your session gracefully when any of these conditions are true:

- **Genuine blocker requiring human judgment** -- See Blocker Taxonomy above. Only file
  a blocker if the fix is NOT objective (spec ambiguity, missing external service,
  fundamental architecture question). If the fix is objective, fix it yourself.
- **Repeating yourself on a genuine problem after 3 attempts** -- Stop and document.
- **Repeating yourself or losing coherence** -- Stop immediately.
- **Reached the session size budget** -- Stop when accumulated feature point total ≥ 8 points
  (S=1, M=2, L=3, XL=5). This replaces a flat feature count cap. An XL feature alone fills
  a session; four S features also fill a session. Stop even if more features are ready.
- **Quality cadence found regressions** -- If a cadence (smoke test, performance profile)
  found regressions, you MUST fix ALL regressions before stopping. Do not leave broken
  cadence results for the next session.

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
   The host monitor surfaces this file in `docker logs`. It is the machine's formal
   signal that human input is required. Write it whenever you cannot start *any*
   ready feature without a human decision. Do NOT write it for partial blockers
   (one feature blocked but others available).
5. Exit

## Quality Cadences (Mandatory Periodic Maintenance)

Quality cadences are periodic checks that take priority over feature work. They are
defined in `.dev-machine/STATE.yaml` under `quality_cadences`. Each cadence has an `interval`
(in sessions) and a `last_run_session` counter.

**When to check**: At orientation (step 3), after reading `.dev-machine/STATE.yaml`.

**How to check**: For each cadence, if `meta.session_count >= last_run_session + interval`,
the cadence is due.

**Priority**: Due cadences run BEFORE feature selection. They are not optional.

**After completing a cadence**: Update `quality_cadences.<name>.last_run_session` to the
current `meta.session_count` value in `.dev-machine/STATE.yaml`, then commit.

### Built-in Cadences

**Every 5 sessions -- Smoke / E2E Test (if suite exists)**

1. Check: `meta.session_count mod 5 == 0` (approximately -- use the interval check above)
2. Look for e2e/smoke test directories (`tests/e2e/`, `tests/smoke/`, `e2e/`)
3. If found, run the suite. If ANY scenario fails:
   - STOP all feature work
   - Create fix tasks with `priority: critical`
   - Fix ALL regressions and re-run to confirm
4. If no e2e suite exists yet, note in `.dev-machine/CONTEXT-TRANSFER.md`: "Smoke test cadence: no suite found."
5. Update `quality_cadences.smoke_test.last_run_session`
6. Commit: `chore: smoke test cadence (pass/fail/skipped) -- session NNN`

**Every 15 sessions -- Performance Profile (if tooling exists)**

1. Check: `meta.session_count mod 15 == 0`
2. Look for performance test tooling or benchmarks in the project
3. If found, run profiling with a realistic workload (large document, many records, etc.)
4. Compare against previous baseline (if recorded in `.dev-machine/STATE.yaml` or `.dev-machine/CONTEXT-TRANSFER.md`)
5. If any metric regresses significantly: STOP, identify the regression, fix before continuing
6. If no perf tooling exists, note in `.dev-machine/CONTEXT-TRANSFER.md`: "Performance cadence: no tooling found."
7. Update `quality_cadences.performance_profile.last_run_session`

**Every 20 sessions -- State File Pruning**

1. Check: `meta.session_count mod 20 == 0`
2. **CONTEXT-TRANSFER.md**: If file exceeds 50KB or 200 lines of session summaries,
   keep only the last 20 session entries. Archive the rest to SESSION-ARCHIVE.md.
   Cap Lessons Learned to 10 patterns (retire lowest-seen-count to archive).
3. **STATE.yaml**: Collapse `completed_features` list to a tombstone comment if it
   exceeds 50 entries. Archive stale `proposed_features` (older than 10 epochs,
   never promoted). Remove `blockers` older than 5 sessions. Verify `module_specs`
   paths exist on disk -- remove dead references.
4. Commit: `chore: state file pruning -- session NNN`

### Regressions Found During Cadences

Regressions found during any cadence are BLOCKING. The machine must:
1. Stop all feature work immediately
2. Create fix tasks with appropriate priority
3. Fix the regressions before the session ends
4. Only after all regressions are resolved may feature work resume

### Adding Project-Specific Cadences

Append new entries to `quality_cadences` in `.dev-machine/STATE.yaml` following the same format.
Set `interval` to 0 to disable a cadence.

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

## Branching Mode (conditional -- only when false is enabled)

> Skip this section if `branching_mode` is not set or is `false` in the machine config.

When `branching_mode` is enabled, the machine does NOT commit directly to `main`.
Instead:

1. **At session start**: check out a feature branch if not already on one:
   ```bash
   git checkout -b machine/session-<epoch>-<feature-id> 2>/dev/null || git checkout machine/session-<epoch>-<feature-id>
   ```
2. **During the session**: commit to the feature branch as normal.
3. **At session end** (after all work is committed and tests pass): create a pull request:
   ```bash
   # Requires gh CLI installed (see Dockerfile / system_packages)
   git push origin HEAD
   gh pr create --title "machine: <session summary>" \
     --body "Automated PR from dev machine session <epoch>. Features completed: <list>." \
     --base main
   ```
4. **Do NOT merge the PR yourself.** The PR is for human review. Add the PR URL to `.dev-machine/CONTEXT-TRANSFER.md` under "Open PRs".
5. If the PR creation fails (no gh CLI, no push permissions), write an escalation file and stop.

## Context Transfer Size Cap

Session summaries written to `.dev-machine/CONTEXT-TRANSFER.md` MUST follow these rules:

- **Each session summary MUST be ≤ 20 lines.** If you have more to say, summarize aggressively.
  Only the most important decisions, blockers, and handoff notes belong here.
- **Hard size limit: 50KB.** If `.dev-machine/CONTEXT-TRANSFER.md` exceeds 50KB, the post-session step will
  force-truncate to the last 5 sessions regardless of other rules. Do not let this happen --
  keep summaries terse so the file stays small naturally.
- **The post-session step auto-archives** sessions beyond the last 5. You do not need to
  manage this manually. But if you find `.dev-machine/CONTEXT-TRANSFER.md` exceeds 200 lines, truncate older
  summaries to a single line: `### Session N Summary — [date] — [one-line summary]`.
- **Lessons Learned cap: 10 patterns.** The Lessons Learned section is capped at 10 entries.
  When a new pattern is added and the count exceeds 10, the post-session step retires the
  oldest (lowest `Seen` count) pattern to SESSION-ARCHIVE.md.
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

## Factored File Structure

Both STATE.yaml and CONTEXT-TRANSFER.md are kept slim by automatic archiving.
The post-session step handles this -- you do NOT need to manage archives yourself.

**STATE.yaml** (~300 lines, active state only):
- If the project uses `completed_features` list pattern, completed features are
  auto-archived to FEATURE-ARCHIVE.yaml by the post-session step.
- Only active (ready/in_progress) features stay in STATE.yaml.

**CONTEXT-TRANSFER.md** (~300 lines, recent context only):
- Only the last 5 session summaries are kept.
- Older sessions are auto-archived to SESSION-ARCHIVE.md.

**Do NOT read or edit**: FEATURE-ARCHIVE.yaml, SESSION-ARCHIVE.md (append-only archives).
These exist only for historical reference and disaster recovery.
