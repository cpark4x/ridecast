# SCRATCH.md — Ephemeral Notes & Task Checklist

**Date Started:** 2026-03-05  
**Current Focus:** Bringing E2E to green (Pattern A + Pattern B fixes)

## Task Checklist

### Phase 1: E2E Pattern A (Ambiguous `getByText('Library')`)
- [ ] Read `specs/features/devx/fix-e2e-selectors.md` for detailed spec
- [ ] Inspect `src/components/BottomNav.tsx` to determine DOM role (tab, button, or link)
- [ ] Edit `e2e/commute-flow.spec.ts:11` — replace `getByText('Library')` selector
- [ ] Edit `e2e/offline-listening.spec.ts:8` — replace `getByText('Library')` selector
- [ ] Edit `e2e/quick-relisten.spec.ts:8` — replace `getByText('Library')` selector
- [ ] Verify selectors resolve to single element in strict mode
- [ ] Commit: "fix(e2e): resolve Pattern A ambiguous Library selector"

### Phase 2: E2E Pattern B (Missing "Target Duration" Element)
- [ ] Verify `playwright.config.ts` webServer config:
  - [ ] `webServer.command` runs dev server (e.g., `npm run dev`)
  - [ ] `webServer.url` === `http://localhost:3000`
  - [ ] `use.baseURL` === `http://localhost:3000`
  - [ ] `reuseExistingServer: !process.env.CI` (or correct env check)
- [ ] Inspect upload flow UI component(s) to find "Target Duration" label
- [ ] Edit `e2e/pdf-commute.spec.ts:19` — add missing navigation or fix selector
- [ ] Edit `e2e/article-discussion.spec.ts:14` — add missing navigation or fix selector
- [ ] Verify selectors find element or add missing wait/navigation
- [ ] Commit: "fix(e2e): resolve Pattern B missing Target Duration element"

### Phase 3: Full Verification
- [ ] Run `npm run lint` — confirm still passing
- [ ] Run `npm run test` — confirm still passing
- [ ] Run `npm run build` — confirm still passing
- [ ] Run `npm run test:e2e` — confirm all 5 scenarios passing
- [ ] Commit: "test(e2e): all scenarios green"

### Phase 4: Cleanup (Optional; Defer if Time)
- [ ] Address 10 eslint `no-unused-vars` warnings
- [ ] React act() warnings in `AppShell.test.tsx`
- [ ] Add `test-results/` and `playwright-report/` to `.gitignore`

## Useful Context

### Pattern A Root Cause
```
BottomNav renders multiple elements with text "Library" (or similar text nodes in DOM tree).
Playwright strict mode requires a single match; getByText('Library') is ambiguous.
Solution: Use role-based query (getByRole) or data-testid to disambiguate.
```

### Pattern B Root Cause
```
After file upload, test expects "Target Duration" label in processing/preview screen.
Either:
  1. webServer config points to wrong port (test talks to different instance)
  2. UI flow missing a navigation step to reach the screen with "Target Duration"
  3. Label text changed in UI; spec copy is stale
Solution: Verify config, inspect UI flow, update spec to match current impl.
```

### Test Files to Read
- `e2e/commute-flow.spec.ts` — The Library flow scenario (Pattern A)
- `e2e/offline-listening.spec.ts` — Offline Library flow (Pattern A)
- `e2e/quick-relisten.spec.ts` — Resume position flow (Pattern A)
- `e2e/pdf-commute.spec.ts` — PDF upload → processing (Pattern B)
- `e2e/article-discussion.spec.ts` — Article upload → discussion (Pattern B)
- `src/components/BottomNav.tsx` — Navigation component (determine role for Pattern A fix)

### Config Files to Check
- `playwright.config.ts` — webServer config, baseURL, browser settings
- `src/components/` — Components rendering "Target Duration" label (Pattern B)

## Notes

- **Use fix-e2e.yaml recipe** to automate fixes via agents if manual editing is tedious.
- **Capture error-context.md** from test-results/ if needed for detailed failure info.
- **Keep STATE.yaml updated** with latest health gate status after each fix.
- **Update CONTEXT-TRANSFER.md** with final status before handoff.

---

## Log

### 2026-03-05 02:25 — Initial State
- Reviewed `.dev-machine-design.md` and `.dev-machine-assessment.md`
- Confirmed current status: lint/test/build pass, E2E fail (0/5)
- Identified two pattern families for fixes
- Created STATE.yaml, CONTEXT-TRANSFER.md, SCRATCH.md
- Updated recipe files (verify.yaml, setup.yaml, fix-e2e.yaml)
- Ready to proceed with Phase 1 (Pattern A fixes)
