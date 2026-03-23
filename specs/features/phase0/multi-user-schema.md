# Feature: Multi-User Schema Migration

> Replace DEFAULT_USER_ID = "default-user" with real Clerk user IDs in all API routes.

## Motivation

The app has 5 API routes with `DEFAULT_USER_ID = "default-user"` hardcoded. With Clerk auth in place, every request has a real authenticated user ID. This spec wires them together.

## Prerequisite

`clerk-auth` spec must be implemented first (`getCurrentUserId()` must exist in `src/lib/auth.ts`).

## Current State (confirmed in code)

`DEFAULT_USER_ID = "default-user"` appears in:
- `src/app/api/upload/route.ts`
- `src/app/api/library/route.ts`
- `src/app/api/playback/route.ts`
- `src/app/api/process/route.ts` (likely — same pattern)
- `src/app/api/audio/generate/route.ts` (likely)

`User` model in `prisma/schema.prisma`:
```prisma
model User {
  id   String @id @default(uuid())
  name String @default("Default User")
  ...
}
```

Clerk user IDs are strings like `user_2abc123` — compatible with the existing `String` type. No column type migration needed.

## Changes

### 1. Add `stripeCustomerId` to User model (`prisma/schema.prisma`)

Add now — needed by the Stripe spec:
```prisma
model User {
  id               String   @id          // Remove @default(uuid()) — Clerk provides the ID
  name             String   @default("Ridecast User")
  stripeCustomerId String?               // Set when user first subscribes
  subscriptionStatus String @default("free")  // "free" | "active" | "canceled"
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  content          Content[]
  playbackState    PlaybackState[]
}
```

Run migration:
```bash
npm run db:migrate
npm run db:generate
```

### 2. Replace DEFAULT_USER_ID in all 5 routes

**Pattern for each route** — replace the constant and the usage:

```typescript
// Before (in every route)
const DEFAULT_USER_ID = 'default-user';
// ... userId: DEFAULT_USER_ID

// After
import { getCurrentUserId } from "@/lib/auth";
// ... const userId = await getCurrentUserId();
```

**`src/app/api/upload/route.ts`:**
```typescript
// Remove: const DEFAULT_USER_ID = 'default-user';
// In POST handler, before using userId:
const userId = await getCurrentUserId();
```

**`src/app/api/library/route.ts`:**
```typescript
const userId = await getCurrentUserId();
// In the findMany: where: { userId }
```

**`src/app/api/playback/route.ts`:**
```typescript
// GET: read userId from auth instead of query param
const userId = await getCurrentUserId();

// POST: read userId from auth instead of request body
const userId = await getCurrentUserId();
```

**`src/app/api/process/route.ts`:** Replace DEFAULT_USER_ID with `getCurrentUserId()`.

**`src/app/api/audio/generate/route.ts`:** Replace DEFAULT_USER_ID with `getCurrentUserId()`.

### 3. Update `PlayerContext.tsx` playback API calls

Currently hardcodes `"default-user"`:
```typescript
// Before
body: JSON.stringify({ userId: "default-user", ... })

// After — get userId from a new /api/me endpoint or pass via prop
```

Add `/api/me` route that returns the current user's ID:
```typescript
// src/app/api/me/route.ts (new)
import { getCurrentUserId } from "@/lib/auth";
export async function GET() {
  const userId = await getCurrentUserId();
  return Response.json({ userId });
}
```

Update `PlayerContext.tsx` to fetch `/api/me` on mount and use that ID for playback state calls.

## Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Remove `@default(uuid())` from User.id; add `stripeCustomerId`, `subscriptionStatus` |
| `src/app/api/upload/route.ts` | Replace DEFAULT_USER_ID with `getCurrentUserId()` |
| `src/app/api/library/route.ts` | Replace DEFAULT_USER_ID with `getCurrentUserId()` |
| `src/app/api/playback/route.ts` | Replace DEFAULT_USER_ID with `getCurrentUserId()` |
| `src/app/api/process/route.ts` | Replace DEFAULT_USER_ID with `getCurrentUserId()` |
| `src/app/api/audio/generate/route.ts` | Replace DEFAULT_USER_ID with `getCurrentUserId()` |
| `src/app/api/me/route.ts` | New — returns current userId |
| `src/components/PlayerContext.tsx` | Fetch `/api/me` for userId in playback state calls |

## Tests

```typescript
// src/app/api/upload/route.test.ts — update existing mock
vi.mock("@/lib/auth", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user_test123"),
}));

// Verify userId from auth is used, not hardcoded
it("associates uploaded content with authenticated user", async () => {
  const { getCurrentUserId } = await import("@/lib/auth");
  vi.mocked(getCurrentUserId).mockResolvedValueOnce("user_abc");
  // ... make request, verify content created with userId "user_abc"
});
```

Apply same mock pattern to all 5 route test files.

## Success Criteria

```bash
npm run db:migrate    # schema migration applies
npm run db:generate   # Prisma client regenerated
npm run test          # all route tests pass with auth mock
npm run build         # no type errors
```

Manual:
- [ ] Upload content while signed in → content appears in that user's library only
- [ ] Sign in as a different user → empty library (no cross-user data leakage)
- [ ] Playback position saved and restored per user

## Scope

API routes and Prisma schema only. No UI changes beyond PlayerContext userId fetch. The migration adds columns with defaults — existing `"default-user"` data remains intact but will not appear to new authenticated users (this is expected).
