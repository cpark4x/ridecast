# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** Phase 0 iOS foundation — 6 specs ready. All gates green.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (non-blocking) |
| `npm run test` | ✅ PASS | **126 passing**, 7 skipped |
| `npm run build` | ✅ PASS | |
| `npm run test:e2e` | ✅ PASS | 5/5 |

### Total shipped to date: 16 features across 6 machine sessions

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

| Priority | Feature | Depends on | Key work |
|----------|---------|------------|---------|
| 1 | google-cloud-tts | — | `@google-cloud/text-to-speech`, `GoogleCloudTTSProvider`, update factory |
| 2 | clerk-auth | — | `@clerk/nextjs`, middleware.ts, `getCurrentUserId()`, sign-in/up pages |
| 3 | azure-blob-storage | — | `@azure/storage-blob`, `src/lib/storage/blob.ts`, replace fs.writeFile |
| 4 | multi-user-schema | clerk-auth | Remove DEFAULT_USER_ID, schema migration, add stripeCustomerId |
| 5 | stripe-subscription | clerk-auth + multi-user-schema | `stripe`, gates on upload/process/generate, webhook, upgrade page |
| 6 | azure-deployment | — | Dockerfile, GitHub Actions, docs/deployment.md, .env.example |

**Sessions 1:** google-cloud-tts + clerk-auth + azure-blob-storage (3 independent)
**Session 2:** multi-user-schema (depends on clerk-auth)
**Session 3:** stripe-subscription (depends on multi-user-schema)
**Session 4:** azure-deployment (independent, infrastructure only)

---

## Key Implementation Notes Per Spec

### google-cloud-tts
- Package: `@google-cloud/text-to-speech`
- Class: `GoogleCloudTTSProvider implements TTSProvider` in `src/lib/tts/google.ts`
- Voices: `en-US-Studio-O` (narrator), `en-US-Studio-M` + `en-US-Studio-O` (conversation)
- Factory priority in `createTTSProvider()`: Google > ElevenLabs > OpenAI
- Trigger: `process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT`
- `instructions` field in VoiceConfig is ignored by Google — pass empty string

### clerk-auth
- Package: `@clerk/nextjs`
- `src/middleware.ts`: public routes = `/sign-in`, `/sign-up`, `/api/library`, `/api/audio/(.*)`
- `src/lib/auth.ts`: `getCurrentUserId()` calls `auth()` from Clerk, upserts User record
- `src/app/layout.tsx`: wrap with `<ClerkProvider>`
- **Does NOT replace DEFAULT_USER_ID** — that's multi-user-schema's job

### azure-blob-storage
- Package: `@azure/storage-blob`
- `src/lib/storage/blob.ts`: `uploadAudio(buffer, filename?): Promise<string>` returns blob URL
- `isBlobStorageConfigured()`: returns true when `AZURE_STORAGE_CONNECTION_STRING` is set
- In `audio/generate/route.ts`: use blob when configured, local fallback for dev
- `filePath` becomes a full `https://` URL in production — audio/[id] route redirects to it

### multi-user-schema
- Remove `@default(uuid())` from `User.id` — Clerk provides the ID
- Add `stripeCustomerId String?` and `subscriptionStatus String @default("free")` to User
- Replace `DEFAULT_USER_ID = "default-user"` in 5 routes with `await getCurrentUserId()`
- Add `src/app/api/me/route.ts` → returns `{ userId }` for PlayerContext
- Run `npm run db:migrate && npm run db:generate` after schema changes

### stripe-subscription
- Package: `stripe`
- `src/lib/stripe.ts`: Stripe client + `SUBSCRIPTION_PRICE_ID`
- `src/lib/subscription.ts`: `hasActiveSubscription()`, `requireSubscription()`, `isByokInstance()`
- BYOK exemption: if `ANTHROPIC_API_KEY` + `OPENAI_API_KEY` set but no `STRIPE_SECRET_KEY` → skip gate
- Gate on: `POST /api/upload`, `POST /api/process`, `POST /api/audio/generate`
- New routes: `/api/create-checkout-session`, `/api/webhook`
- New page: `/app/upgrade/page.tsx`

### azure-deployment
- `Dockerfile`: multi-stage, node:20-alpine, `next.config.ts` needs `output: "standalone"`
- `.github/workflows/deploy-azure.yml`: build image → push to ACR → deploy to Container Apps
- `docs/deployment.md`: one-time Azure CLI setup commands
- `.env.example`: complete list of all Phase 0 env vars
- `.dockerignore`: exclude node_modules, .next, .env, prisma/dev.db
- **No unit tests** — verify by `docker build .` succeeding

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
