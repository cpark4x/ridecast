# Native Jest Environment Fix

## Problem

All 31 native test suites fail when running `cd native && npx jest`. The error is related to `ExpoImportMetaRegistry`. The Vitest health gate (`npm run test` from repo root) is unaffected — this is a native-only issue.

A mock already exists at `native/__mocks__/expo-import-meta-registry.js` and the jest config in `native/package.json` has a `moduleNameMapper` pointing to it:

```json
"^expo/src/winter/ImportMetaRegistry$": "<rootDir>/__mocks__/expo-import-meta-registry.js"
```

Despite this, all 31 suites fail. The mock or mapping is not resolving correctly.

## Stack

- Expo SDK ~55.0.6
- jest-expo ~55.0.9
- jest ^30.3.0
- ts-jest ^29.4.6

## Acceptance Criteria

1. `cd native && npx jest` runs without the ExpoImportMetaRegistry error
2. All existing native test suites pass (or fail for legitimate test-logic reasons, not environment errors)
3. No changes to the Vitest health gate (`npm run test` from repo root still passes)

## Approach

1. Run `cd native && npx jest 2>&1 | head -40` to see the exact error message
2. Inspect `native/__mocks__/expo-import-meta-registry.js` to check the mock content
3. Check if jest-expo 55's preset overrides the moduleNameMapper — may need to use `moduleNameMapper` in a way that takes precedence over the preset
4. If the mock content is wrong (empty or incorrect exports), fix it
5. If the issue is jest-expo 55 introducing a new import path, update the moduleNameMapper pattern to match
6. If upgrading jest-expo resolves it, update `native/package.json` and lock file

## Files Likely Touched

- `native/__mocks__/expo-import-meta-registry.js`
- `native/package.json` (jest config section, possibly jest-expo version)
- `native/package-lock.json` (if version bump needed)
