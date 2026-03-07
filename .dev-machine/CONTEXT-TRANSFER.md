# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** Phase 0 iOS foundation — 3 of 6 specs done. All gates green.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 11 warnings (non-blocking) |
| `npm run test` | ✅ PASS | **139 passing**, 7 skipped |
| `npm run build` | ✅ PASS | All routes including sign-in/sign-up |
| `npm run test:e2e` | ✅ PASS | 5/5 (last run 2026-03-06) |

### Total shipped to date: 19 features across 7 machine sessions

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

6 specs in `specs/features/phase0/`. **Respect depends_on strictly.**

| Priority | Feature | Depends on | Status |
|----------|---------|------------|--------|
| 1 | google-cloud-tts | — | ✅ DONE (de483d0) |
| 2 | clerk-auth | — | ✅ DONE (40c35f7) |
| 3 | azure-blob-storage | — | ✅ DONE (41f81e8) |
| 4 | multi-user-schema | clerk-auth ✅ | **ready** |
| 5 | stripe-subscription | clerk-auth ✅ + multi-user-schema | blocked on #4 |
| 6 | azure-deployment | — | **ready** |

**Next session:** multi-user-schema + azure-deployment (both ready, can be done together)
**Session after:** stripe-subscription (depends on multi-user-schema)

---

## Session 7 Summary — 2026-03-06

**Completed:**
- `google-cloud-tts` — `GoogleCloudTTSProvider` in `src/lib/tts/google.ts` using `@google-cloud/text-to-speech`. Factory priority updated: Google > ElevenLabs > OpenAI. Triggered by `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CLOUD_PROJECT`. Google voices: `en-US-Studio-O` (narrator), `en-US-Studio-M`/`O` (conversation). `instructions` field ignored (Google uses voice name only).
- `clerk-auth` — `src/lib/auth.ts` with `getCurrentUserId()` helper (Clerk `auth()` + upserts User). `src/middleware.ts` with public route matcher (`/sign-in`, `/sign-up`, `/api/library`, `/api/audio/*`). Sign-in/up pages created. `layout.tsx` wrapped with `<ClerkProvider>`. **Does NOT replace `DEFAULT_USER_ID` yet** — that's `multi-user-schema`'s job.
- `azure-blob-storage` — `src/lib/storage/blob.ts` with `uploadAudio()` + `isBlobStorageConfigured()`. `audio/generate/route.ts` uses blob when `AZURE_STORAGE_CONNECTION_STRING` is set, local filesystem fallback for dev. `audio/[id]/route.ts` redirects to blob URL when `filePath` starts with `https://`.

**Health gates:** lint ✅ test ✅ (139 passing) build ✅

**Key decisions made:**
- Used named import `{ TextToSpeechClient }` from `@google-cloud/text-to-speech` (not default import) — resolves TypeScript namespace error at build time
- Test mock for `TextToSpeechClient` uses `vi.fn(function() { return {...} })` (regular function, not arrow) so it works as a constructor with `new`
- Blob storage `containerClient` is module-level singleton (lazy-initialized) — consistent with singleton DB pattern

**Next session should start with:** `multi-user-schema` (spec: `specs/features/phase0/multi-user-schema.md`)
- clerk-auth is done, so the dependency is met
- Key work: remove `@default(uuid())` from `User.id`, add `stripeCustomerId`/`subscriptionStatus` to User schema, replace `DEFAULT_USER_ID` in 5 routes with `await getCurrentUserId()`, add `/api/me` route, run `npm run db:migrate && npm run db:generate`
- Also do `azure-deployment` in the same session (independent, no unit tests — just Dockerfile + CI/CD)

---

## Key Implementation Notes Per Spec

### multi-user-schema (next)
- Remove `@default(uuid())` from `User.id` — Clerk provides the ID
- Add `stripeCustomerId String?` and `subscriptionStatus String @default("free")` to User
- Replace `DEFAULT_USER_ID = "default-user"` in 5 routes with `await getCurrentUserId()`
- Add `src/app/api/me/route.ts` → returns `{ userId }` for PlayerContext
- Run `npm run db:migrate && npm run db:generate` after schema changes
- Tests must mock `getCurrentUserId` from `@/lib/auth`

### azure-deployment (next, can batch with multi-user-schema)
- `Dockerfile`: multi-stage, node:20-alpine, `next.config.ts` needs `output: "standalone"`
- `.github/workflows/deploy-azure.yml`: build image → push to ACR → deploy to Container Apps
- `docs/deployment.md`: one-time Azure CLI setup commands
- `.env.example`: complete list of all Phase 0 env vars (mostly done already)
- `.dockerignore`: exclude node_modules, .next, .env, prisma/dev.db
- **No unit tests** — verify by `docker build .` succeeding

### stripe-subscription (session after next)
- Package: `stripe`
- `src/lib/stripe.ts`: Stripe client + `SUBSCRIPTION_PRICE_ID`
- `src/lib/subscription.ts`: `hasActiveSubscription()`, `requireSubscription()`, `isByokInstance()`
- BYOK exemption: if `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` set but no `STRIPE_SECRET_KEY` → skip gate
- Gate on: `POST /api/upload`, `POST /api/process`, `POST /api/audio/generate`
- New routes: `/api/create-checkout-session`, `/api/webhook`
- New page: `/app/upgrade/page.tsx`

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

// Mock Prisma user operations
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { upsert: vi.fn(), findUnique: vi.fn() },
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

// Mock Google Cloud TTS (use regular function not arrow for constructor)
vi.mock("@google-cloud/text-to-speech", () => ({
  TextToSpeechClient: vi.fn(function () {
    return { synthesizeSpeech: vi.fn().mockResolvedValue([{ audioContent: Buffer.from("audio") }]) };
  }),
}));

// Mock Stripe
vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: { create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }) },
    },
    webhooks: { constructEvent: vi.fn() },
  })),
}));
```

---

## Commands

```bash
npm run lint && npm run test && npm run build   # standard verification
npm run db:migrate && npm run db:generate       # after schema changes
amplifier recipe execute .dev-machine/recipes/build.yaml
```
