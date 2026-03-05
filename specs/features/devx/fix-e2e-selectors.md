# Feature: Fix E2E Selectors

> Get `npm run test:e2e` from 0/5 to 5/5 by fixing two selector pattern families.

## Motivation

All five Playwright E2E scenarios fail. The failures cluster into exactly two patterns — both are selector/config issues, not logic bugs. Fixing them brings the fourth verification gate green.

## Pattern A — Ambiguous `getByText('Library')`

**Affected specs (3):**
- `e2e/commute-flow.spec.ts:11`
- `e2e/offline-listening.spec.ts:8`
- `e2e/quick-relisten.spec.ts:8`

**Root cause:** `getByText('Library')` resolves to 3+ DOM elements (nav button, heading, possible aria label). Playwright strict mode rejects ambiguous matches.

**Fix:**

In each affected spec, replace:
```typescript
page.getByText('Library')
```
with a role-scoped selector:
```typescript
page.getByRole('tab', { name: 'Library' })
```

If the BottomNav renders `<button>` not `<a role="tab">`, use:
```typescript
page.getByRole('button', { name: 'Library' })
```

Alternative (if role query is also ambiguous): add `data-testid="library-tab"` to the `BottomNav.tsx` Library button and use:
```typescript
page.getByTestId('library-tab')
```

**Verification:** Each affected spec should navigate to the Library screen without strict-mode errors.

## Pattern B — Missing "Target Duration" element

**Affected specs (2):**
- `e2e/pdf-commute.spec.ts:19`
- `e2e/article-discussion.spec.ts:14`

**Root cause:** After file upload, `getByText('Target Duration')` finds nothing. Two possible sub-causes:

1. **Playwright webServer config mismatch** — `playwright.config.ts` may point to wrong port/baseURL, so the app isn't actually running or the page doesn't load the expected UI.
2. **UI flow gap** — The upload step may not automatically navigate to the processing screen where "Target Duration" renders. The spec may need an explicit navigation step or wait.

**Diagnostic steps:**
1. Check `playwright.config.ts` → `webServer.url` and `use.baseURL` match the dev server port (default 3000).
2. Run one spec in headed mode: `npx playwright test e2e/pdf-commute.spec.ts --headed` and observe what renders after upload.
3. If UI shows upload confirmation but NOT processing config, the spec needs a click/navigation step to reach the processing screen.

**Fix (most likely):**

Ensure Playwright config has correct webServer:
```typescript
// playwright.config.ts
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
},
use: {
  baseURL: 'http://localhost:3000',
},
```

If the flow requires navigating from upload to processing:
```typescript
// After upload, click the item to enter processing
await page.getByText(uploadedTitle).click();
// Now "Target Duration" should be visible
await expect(page.getByText('Target Duration')).toBeVisible();
```

If the label text changed, update specs to match the current UI copy.

**Verification:** Both specs should reach the processing configuration screen and find the Target Duration control.

## Files to Modify

| File | Change |
|------|--------|
| `e2e/commute-flow.spec.ts` | Replace `getByText('Library')` with role-scoped selector |
| `e2e/offline-listening.spec.ts` | Same selector fix |
| `e2e/quick-relisten.spec.ts` | Same selector fix |
| `e2e/pdf-commute.spec.ts` | Fix webServer config and/or navigation flow |
| `e2e/article-discussion.spec.ts` | Same as above |
| `playwright.config.ts` | Verify/fix webServer URL (if Pattern B cause #1) |
| `src/components/BottomNav.tsx` | Optionally add `data-testid` (if role selector insufficient) |

## Success Criteria

```bash
npm run test:e2e
# 5/5 scenarios passing
```

## Scope

This spec is strictly about making existing E2E tests pass. No new test scenarios. No UI behavior changes. Selector and config fixes only.