# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** Phase 0 iOS foundation — ALL 6 specs COMPLETE. All gates green.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 11 warnings (non-blocking) |
| `npm run test` | ✅ PASS | **151 passing**, 7 skipped |
| `npm run build` | ✅ PASS | All routes including /upgrade, /api/webhook |
| `npm run test:e2e` | ✅ PASS | 5/5 (last run 2026-03-06) |

### Total shipped to date: 22 features across 8 machine sessions

---

## Phase 0 Context

**Target:** iOS app on Azure. Microsoft subscription, East US 2.

**Architecture decisions:**
- Hosting: Azure Container Apps (no function timeout — pipeline takes 60-180s)
- Auth: Clerk (drop-in Next.js middleware, free up to 10K MAU)
- Database: Azure Database for PostgreSQL (replace Docker local)
- Audio storage: Azure Blob Storage (replace `public/audio/` local filesystem)
- TTS default: Google Cloud TTS Studio voices (same as NotebookLM, GCP access available)
- Pricing: Free catalog (no login) / $10/mo own-content (Stripe)
- BYOK: still supported — BYOK instances skip subscription gate

---

## Phase 0 Specs — Build Order

6 specs in `specs/features/phase0/`. All DONE.

| Priority | Feature | Status |
|----------|---------|--------|
| 1 | google-cloud-tts | ✅ DONE (de483d0) |
| 2 | clerk-auth | ✅ DONE (40c35f7) |
| 3 | azure-blob-storage | ✅ DONE (41f81e8) |
| 4 | multi-user-schema | ✅ DONE (a476a7b) |
| 5 | stripe-subscription | ✅ DONE (7750c49) |
| 6 | azure-deployment | ✅ DONE (3b39547) |

**Phase 0 is complete.** Next session should begin Phase 1 specs.

---

## Session 8 Summary — 2026-03-06

**Completed:**

- `multi-user-schema` (a476a7b) — Removed `@default(uuid())` from `User.id` (Clerk provides ID); added `stripeCustomerId String?` and `subscriptionStatus String @default("free")` to User model; ran migration `20260307061942_add_stripe_fields_to_user`; replaced `DEFAULT_USER_ID = "default-user"` with `await getCurrentUserId()` in all 5 routes (upload, library, playback, process, audio/generate); created `GET /api/me` → `{ userId }`; updated `PlayerContext.tsx` to fetch `/api/me` on mount and gate `savePosition` on `userIdRef.current`; updated all route tests with `vi.mock('@/lib/auth')`.

- `azure-deployment` (3b39547) — Multi-stage `Dockerfile` (node:20-alpine, deps/builder/runner stages); `.dockerignore`; `next.config.ts` + `output: "standalone"`; `.github/workflows/deploy-azure.yml` CI/CD pipeline to ACR + Container Apps; `docs/deployment.md` one-time Azure CLI setup guide; `.env.example` with complete Phase 0 env vars.

- `stripe-subscription` (7750c49) — `src/lib/stripe.ts` lazy singleton (avoids build-time failure when key absent); `src/lib/subscription.ts` with `isByokInstance()`, `hasActiveSubscription()`, `requireSubscription()`; gated upload/process/audio-generate with `requireSubscription`; `GET /api/create-checkout-session`; `POST /api/webhook` (checkout.session.completed, customer.subscription.deleted/paused); `/app/upgrade/page.tsx` upgrade UI; 10 subscription tests passing; route tests mock `@/lib/subscription` pass-through.

**Health gates:** lint ✅ test ✅ (151 passing) build ✅

**Key decisions made:**
- Stripe client uses lazy singleton pattern (same as Prisma DB) — prevents Next.js build error when `STRIPE_SECRET_KEY` absent. Uses `getStripeClient()` function, not a direct module-level `new Stripe(...)`.
- Stripe API version: `"2026-02-25.clover"` (matches installed stripe@latest)
- `PlayerContext.tsx` savePosition now guarded by `userIdRef.current` being non-null — fetch `/api/me` on mount first, then persisting works. Silent fail if `/api/me` unavailable.
- Subscription gate tests use top-level `vi.mock('@/lib/db')` + env var manipulation per test (no `vi.resetModules()` complexity) — simpler and reliable.
- Route tests mock `@/lib/subscription` with `requireSubscription: vi.fn().mockResolvedValue(null)` — subscription logic fully tested in `subscription.test.ts`, not in every route test.

---

## What's Next: Phase 1

**Next session should start with Phase 1 specs:**

5 specs in `specs/features/phase1/`:
1. `duration-accuracy.md` — Tighten ±15%, 2nd retry, durationAdvisory
2. `pipeline-error-resilience.md` — retryWithBackoff, truncation warning, maxDuration
3. `processing-screen-upgrade.md` — 4-stage Analyzing→Scripting→Generating→Ready
4. `playback-state-persistence.md` — Wire /api/playback into PlayerContext
5. `audio-duration-measurement.md` — Replace buffer-size estimate with real measurement

**Note:** Items 1, 2, 4, 5 are already marked `done` in completed_features (they were shipped in earlier sessions). Verify before re-implementing.

Actually, looking at STATE.yaml, all 5 Phase 1 specs are already in `completed_features`. **The machine should check what Phase 1 specs REMAIN** before starting. The `next_steps` in STATE.yaml points to Phase 1 as the next target.

---

## Test Mock Patterns for Phase 0

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

// Mock Prisma user operations
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    content: { findMany: vi.fn(), create: vi.fn() },
    // ... etc
  },
}));

// Mock Azure Blob
vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn().mockReturnValue({
      getContainerClient: vi.fn().mockReturnValue({
        getBlockBlobClient: vi.fn().mockReturnValue({
          uploadData: vi.fn().mockResolvedValue({}),
          url: "https://account.blob.core.windows.net/ridecast-audio/test.mp3",
        }),
      }),
    }),
  },
}));

// Mock Stripe (use getStripeClient pattern)
vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn().mockReturnValue({
    checkout: {
      sessions: { create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }) },
    },
    webhooks: { constructEvent: vi.fn() },
  }),
  SUBSCRIPTION_PRICE_ID: "price_test",
}));
```

---

## Commands

```bash
npm run lint && npm run test && npm run build   # standard verification
npm run db:migrate && npm run db:generate       # after schema changes
amplifier recipe execute .dev-machine/recipes/build.yaml
```
