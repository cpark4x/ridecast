# Feature Spec Template

> Use this template when writing feature specs for the development machine.
> Every field must be filled in. The machine implements specs literally.

---

# F-XXX: [Feature Name]

## 1. Overview

**Module:** [which module this feature belongs to]
**Priority:** [P0/P1/P2]
**Size:** [S / M / L / XL] — S=1pt, M=2pt, L=3pt, XL=5pt (see sizing guide below)
**Depends on:** [list feature IDs this depends on, or "none"]

[2-3 sentences: what this feature does and why it's needed]

## 2. Requirements

### Interfaces

```
[TypeScript/Python/Rust/etc. signatures for any new or modified interfaces]
[Include types, function signatures, class definitions]
```

### Behavior

- [Concrete behavior rule 1]
- [Concrete behavior rule 2]
- [Keyboard shortcuts, API responses, state transitions, etc.]

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | [Specific, testable criterion] | [How to verify: unit test, integration test, manual check] |
| AC-2 | [Specific, testable criterion] | [How to verify] |
| AC-3 | [Specific, testable criterion] | [How to verify] |

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| [Edge case 1] | [What should happen] |
| [Edge case 2] | [What should happen] |

## 5. Files to Create/Modify

| File | Action | Contents |
|------|--------|----------|
| `path/to/new-file.ts` | Create | [Description of what this file contains] |
| `path/to/existing.ts` | Modify | [Description of changes] |
| `tests/path/to/test.ts` | Create | [Tests for this feature] |

## 6. Dependencies

- [Package/library dependencies needed]
- [Or "No new dependencies"]

## 7. Notes

- [Implementation caveats]
- [Future work deferred]
- [Warnings about gotchas]

## Size Guide

| Size | Points | Typical scope |
|------|--------|---------------|
| S | 1 | ≤1 file, ≤50 LOC, no new interfaces |
| M | 2 | 2–3 files, ≤150 LOC, one new interface |
| L | 3 | 4–6 files, ≤300 LOC, multiple interfaces or cross-module |
| XL | 5 | 7+ files or >300 LOC — consider splitting into multiple features |

**Session budget**: ~8 size points per session (e.g. 4×S, 2×M, 1×L+2×S).
Features sized XL should be decomposed if possible. If XL is unavoidable, it occupies a full session alone.

## 8. Implementation Map

> ⚠️ **REQUIRED: Fill this table BEFORE writing any implementation code.**
> This section must be completed during Platform Grounding (step 3 of working-session-instructions.md).
> Do not begin coding until every requirement row has a verified mapping to actual codebase types/APIs.

| Requirement | Implementation File + Function | Types/APIs Used | Notes |
|-------------|-------------------------------|-----------------|-------|
| [Requirement from §2] | [e.g. `src/auth.py::validate_token()`] | [Actual type names found in source] | [Caveats] |
| [Add one row per behavior rule] | | | |

**Instructions for the machine:**
1. Read actual source files for each module you will touch (grep for exports, class defs, public functions).
2. For each requirement, find the exact type/function you will call — write its real name.
3. If a requirement cannot be mapped to an existing type or function: **do NOT invent an API**.
   Add a blocker to `STATE.yaml` with a description of the missing interface, then stop.
4. Only after every row is filled may implementation begin.
