# Feature: Clerk Authentication

> Add Clerk as the auth provider — middleware protecting API routes, sign-in/up pages, and a getCurrentUserId helper to replace DEFAULT_USER_ID throughout.

## Motivation

The app currently uses `DEFAULT_USER_ID = "default-user"` hardcoded in all API routes. This is a single-user local tool. To become a hosted multi-user iOS app, every request must be associated with a real authenticated user. Clerk provides Next.js App Router middleware, social auth, and a managed user dashboard in ~30 minutes of integration.

## Changes

### 1. Install

```bash
npm install @clerk/nextjs
```

Add to `.env.example`:
```bash
# Clerk Auth (https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 2. Middleware (`src/middleware.ts` — new file)

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — no auth required
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/library",          // catalog browsing — free, unauthenticated
  "/api/audio/(.*)",       // audio streaming — free, unauthenticated
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth.protect(); // redirects to sign-in if not authenticated
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)", "/(api|trpc)(.*)"],
};
```

### 3. Auth helper (`src/lib/auth.ts` — new file)

```typescript
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

/**
 * Get the authenticated user's ID from Clerk.
 * Creates a User record on first sign-in if one doesn't exist.
 * Throws if called from an unauthenticated context.
 */
export async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthenticated");
  }

  // Upsert User record — Clerk IDs are stable, so this is idempotent
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: "Ridecast User",
    },
  });

  return userId;
}
```

### 4. Sign-in and Sign-up pages

**`src/app/sign-in/[[...sign-in]]/page.tsx`** (new):
```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <SignIn />
    </div>
  );
}
```

**`src/app/sign-up/[[...sign-up]]/page.tsx`** (new):
```typescript
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <SignUp />
    </div>
  );
}
```

### 5. Wrap root layout with ClerkProvider (`src/app/layout.tsx`)

```typescript
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

## Files to Modify

| File | Change |
|---|---|
| `package.json` | Add `@clerk/nextjs` |
| `src/middleware.ts` | New — Clerk middleware with public route matcher |
| `src/lib/auth.ts` | New — `getCurrentUserId()` helper |
| `src/app/sign-in/[[...sign-in]]/page.tsx` | New — Sign-in page |
| `src/app/sign-up/[[...sign-up]]/page.tsx` | New — Sign-up page |
| `src/app/layout.tsx` | Wrap with `<ClerkProvider>` |
| `.env.example` | Add Clerk env vars |

## Tests

**File:** `src/lib/auth.test.ts` (new)

```typescript
import { describe, it, expect, vi } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn().mockResolvedValue({ userId: "user_test123" }),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      upsert: vi.fn().mockResolvedValue({ id: "user_test123" }),
    },
  },
}));

describe("getCurrentUserId", () => {
  it("returns the Clerk userId", async () => {
    const { getCurrentUserId } = await import("./auth");
    const id = await getCurrentUserId();
    expect(id).toBe("user_test123");
  });

  it("upserts a User record on first call", async () => {
    const { prisma } = await import("@/lib/db");
    const { getCurrentUserId } = await import("./auth");
    await getCurrentUserId();
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user_test123" } })
    );
  });

  it("throws when unauthenticated", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never);
    const { getCurrentUserId } = await import("./auth");
    await expect(getCurrentUserId()).rejects.toThrow("Unauthenticated");
  });
});
```

## Success Criteria

```bash
npm install
npm run test   # auth.test.ts passes
npm run build  # no type errors
```

Manual:
- [ ] Visiting `/` while signed out redirects to `/sign-in`
- [ ] `/api/library` is accessible without auth (catalog)
- [ ] `/api/upload` returns 401 without auth
- [ ] Sign-in with Google creates a User record in the database

## Scope

Auth infrastructure only. **Does NOT replace DEFAULT_USER_ID in routes yet** — that is `multi-user-schema` spec's job. This spec adds the middleware, helper, and pages. The routes still work with their hardcoded ID during this step to avoid a big-bang change.
