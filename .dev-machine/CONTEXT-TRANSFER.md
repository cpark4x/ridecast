# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-26
**Project:** ridecast2
**Status:** Phase 5 in progress — 52+ features shipped across 19 sessions.

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
- `double-logo-fix` — Replaced duplicate favicon `<Image>` in SourceThumbnail badge with `<Ionicons>` glyph mapped by sourceType. Added SOURCE_TYPE_ICONS map + sourceTypeIcon helper. Removed overflow:hidden from badge container. Antagonistic review: 5/6 icons unreachable by-design (badge gated on showLogo which is URL-only, per spec Edge Cases).

**In progress:**
- `paste-raw-text` — Add text input to upload modal
- `basic-file-types` — DOCX/MD file type support

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

## What's Next

**Phase 5 User Feedback Batch 1.** After paste-raw-text + basic-file-types:
- `episode-sharing-expanded` (M) — No spec yet
- `verbatim-read-mode` (M) — No spec yet
- Close stale GitHub issues (#24–#41)

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
