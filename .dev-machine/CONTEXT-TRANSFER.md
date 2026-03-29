# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-26
**Project:** ridecast2
**Status:** Phase 5 in progress — 68 features shipped across 21 sessions.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | PASS | ~10 warnings (non-blocking) |
| `npm run test` | PASS | **418 passing**, 7 skipped |
| `npm run build` | PASS | All routes build successfully |
| `npm run test:e2e` | PASS | 5/5 (last run 2026-03-06) |

### Known Issue: Native Jest environment broken
All 31 native test suites (`cd native && npx jest`) fail with `ExpoImportMetaRegistry` error.
Pre-existing. Health gates use Vitest (`npm run test`) not native Jest.

---

## Session 19 Summary — 2026-03-26

**Completed:**
- `double-logo-fix` — Replaced duplicate favicon `<Image>` in SourceThumbnail badge with `<Ionicons>` glyph mapped by sourceType.
- `paste-raw-text` — Added text paste input to UploadModal, uploadText() in api.ts, JSON body path in upload route, extractTxt export. 4 new server tests. Fixed double-spinner bug (antagonistic review).
- `basic-file-types` — Added mammoth-based DOCX extractor, docx/doc/md extension sniff, MIME types in DocumentPicker, mammoth.d.ts type shim. 8 new tests (5 docx extractor + 3 upload route). Fixed corrupt file error message (antagonistic review).

---

## Session 16 Summary — 2026-03-13

1 feature (3 pts): homepage-redesign.

---

## Session 15 Summary — 2026-03-11

1 feature (3 pts): library-screen-rewrite. Phase 3 complete.

---

## Session 13 Summary — 2026-03-11

3 features (6 pts): expanded-player-rewrite, upload-modal, process-new-version.

---

## Session 22 Summary — 2026-03-29

**Completed:**
- `dark-theme-foundation` — Created `native/lib/theme.ts` (pure data module, 80 LOC, all 5 token objects + convenience bundle). Modified `native/app/_layout.tsx`: StatusBar "dark" → "light", AppShell root View gains `backgroundColor: colors.backgroundScreen`. Created `native/__tests__/theme.test.ts` (21 tests with pinned value assertions). Antagonistic review caught missing value-pin tests for typography.sizes, sizes, and borderRadius — all fixed. Also removed redundant inner `as const` from weight literals.
- `redesign-sign-in` BLOCKED — `@clerk/clerk-expo` v2.19 wraps `<SignIn />` in a `WrapComponent()` that throws "not supported in native environments" on iOS. Spec needs update to use `useSSO()` hook with custom Apple/Google buttons. Visual changes can proceed once auth approach is updated.
- `redesign-processing` — Full dark theme pass on `native/app/processing.tsx`. Replaced all Tailwind classNames with inline style objects using theme tokens. Added progress bar (track: surfaceElevated, fill: accentPrimary, width from getStageIndex). Antagonistic review caught: Math.round(2/3×100)=67 not 66 → fixed to Math.floor. Removed dead `delay` function.
- `redesign-upload-modal` — Dark theme pass on `UploadModal.tsx` + `DurationPicker.tsx`. Both KAV and ScrollView set to surface (#1A1A2E). Drag handle #3A3A4E. Inputs to surfaceElevated/borderInput. File drop zone dashed borderDropzone. Active chip: accentPrimary no border; inactive: surfaceElevated + borderInput. Slider tokens updated. Truncation+offline banners → dark amber rgba. OrDivider extracted as inline component. Antagonistic review caught: borderDropzone should be unconditional (not offline-conditional) → fixed. Pre-existing: double-onDismiss in Modal (not introduced, not fixing per "no logic changes" rule).

- `redesign-settings-carmode` — Dark theme pass on settings.tsx + CarMode.tsx + 4 settings sub-components (SettingsSection, SettingsRow, SettingsToggleRow, SettingsDivider). CarMode: added ArticleInfoSection (absolute top, title+source), ProgressBarSection (track #1A1A2E, fill accentPrimary), updated skip buttons (80×80 #1A1A2E fill), play button (140×140 accentPrimary fill), removed bottom title. Antagonistic review caught pre-existing bugs (chevron on disabled rows, handleSignOut no error handling) — deferred per "no logic changes" rule. Also fixed tsconfig.json: added `"native"` to exclude list to prevent Next.js type-checker from processing React Native files (pre-existing build failure from 86bbed7 expo-av→expo-audio commit).

## What's Next

**Phase 5 UI Redesign Batch 2:** Session 22 completed 6 pts (dark-theme-foundation M, redesign-processing S, redesign-upload-modal M, redesign-settings-carmode S). Remaining ready features:
- `nav-shell-redesign` (L, 3pts) — 3-tab layout + dark mini player
- `redesign-home-screens` (M, 2pts) — depends on nav-shell-redesign
- `redesign-expanded-player` (M, 2pts) — Expanded Player dark theme
- `redesign-library` (M, 2pts) — Library screen dark theme
- `discover-ftue` (M, 2pts) — Discover FTUE
- `source-detail` (M, 2pts) — Source Detail screen
- `discover-screens` (L, 3pts) — Discover Main + Topic Drilldown
- `redesign-sign-in` BLOCKED — see STATE.yaml blocker note

---

## Test Mock Patterns

```typescript
// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_test123" }),
}));

// Mock getCurrentUserId (use in route tests)
vi.mock("@/lib/auth", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user_test123"),
}));

// Mock subscription gate (use in route tests — logic tested in subscription.test.ts)
vi.mock("@/lib/subscription", () => ({
  requireSubscription: vi.fn().mockResolvedValue(null),
}));
```

---

## Commands

```bash
npm run lint && npm run test && npm run build   # standard verification
npm run db:migrate && npm run db:generate       # after schema changes
```
