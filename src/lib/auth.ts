import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";

/**
 * Typed authentication error thrown when a request is made without valid
 * credentials. Use `instanceof AuthenticationError` instead of checking
 * error.message so that message changes don't silently break callers.
 */
export class AuthenticationError extends Error {
  constructor() {
    super("Unauthenticated");
    this.name = "AuthenticationError";
  }
}

/**
 * Stable synthetic user ID injected when E2E_TEST_MODE=true.
 * All E2E test data is owned by this identity so the DB stays coherent
 * across the suite (global-setup can target it for cleanup if needed).
 */
const E2E_TEST_USER_ID = "e2e-test-user";

/**
 * Get the authenticated user's ID from Clerk.
 * Creates a User record on first sign-in if one doesn't exist.
 * Throws if called from an unauthenticated context.
 *
 * In E2E_TEST_MODE the Clerk call is skipped entirely: a synthetic user is
 * upserted and its ID returned so every API route that calls this helper
 * works normally without real auth credentials in CI.
 */
export async function getCurrentUserId(): Promise<string> {
  // ── E2E test bypass ───────────────────────────────────────────────────────
  // When Playwright launches the dev server it injects E2E_TEST_MODE=true
  // (see playwright.config.ts webServer.env).  This lets the full API surface
  // work in CI without CLERK_SECRET_KEY or a real session cookie.
  if (process.env.E2E_TEST_MODE === "true") {
    try {
      await prisma.user.upsert({
        where: { id: E2E_TEST_USER_ID },
        update: {},
        create: { id: E2E_TEST_USER_ID, name: "E2E Test User" },
      });
    } catch (err: unknown) {
      // Concurrent parallel requests (fullyParallel: true in Playwright) can
      // race through the upsert "does it exist?" check simultaneously and both
      // attempt the INSERT.  The second one hits a unique constraint (P2002).
      // That's fine — the row already exists.  Rethrow anything else.
      if ((err as { code?: string }).code !== "P2002") throw err;
    }
    return E2E_TEST_USER_ID;
  }
  // ─────────────────────────────────────────────────────────────────────────

  const authResult = await auth();
  const userId = authResult.userId;
  if (!userId) {
    throw new AuthenticationError();
  }

  // Fetch email from Clerk session claims (available without extra API call)
  // sessionClaims may contain email if Clerk is configured to include it,
  // otherwise we fall back to the Clerk Backend API on first sign-in.
  let email: string | undefined;
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const primaryEmail = clerkUser.emailAddresses?.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    );
    email = primaryEmail?.emailAddress ?? clerkUser.emailAddresses?.[0]?.emailAddress;
  } catch {
    // Non-fatal — email capture is best-effort
  }

  // Upsert User record — Clerk IDs are stable, so this is idempotent.
  // Also captures email on every request (in case it changed in Clerk).
  await prisma.user.upsert({
    where: { id: userId },
    update: {
      ...(email && { email }),
    },
    create: {
      id: userId,
      name: "Ridecast User",
      ...(email && { email }),
    },
  });

  return userId;
}
