import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Public routes — no auth required
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/library", // catalog browsing — free, unauthenticated
  "/api/audio/(.*)", // audio streaming — free, unauthenticated
  "/audio/(.*)",     // static audio files from public/ — free, unauthenticated
  "/api/webhook", // Stripe webhooks — verified by signature, not Clerk session
  "/pocket", // marketing landing page — no auth required
  "/save(.*)", // bookmarklet popup landing — no auth required
]);

// Clerk v7 redirects to /:locale/ prefixed paths (e.g. /en/pocket) when
// localization is enabled in the Clerk dashboard. Our Next.js app doesn't use
// locale-based file routing (no src/app/[locale]/), so /en/pocket 404s.
// Fix: rewrite /xx/path → /path so Next.js finds the actual page, then run
// Clerk auth normally on the rewritten path.
const LOCALE_PREFIX = /^\/([a-z]{2})(\/.*)/;

// Build the Clerk handler once (lazy — keys are only validated when the handler
// is actually invoked, not when clerkMiddleware() is called here).
const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect(); // redirects to sign-in if not authenticated
  }
});

/**
 * E2E_TEST_MODE bypass — activated by the Playwright webServer env injection
 * (see playwright.config.ts).  When true:
 *   - Clerk is never called, so CI needs no CLERK_SECRET_KEY / publishable key.
 *   - All routes are treated as accessible; auth.ts returns a synthetic user.
 *
 * This flag is NEVER set in production deployments, so there is zero runtime
 * security impact.  It is a server-side env var (no NEXT_PUBLIC_ prefix), so
 * it is never embedded in the client bundle.
 */
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (process.env.E2E_TEST_MODE === "true") {
    return NextResponse.next();
  }

  // Strip Clerk's locale prefix so Next.js can resolve pages.
  // /en/pocket → rewrite to /pocket (URL bar still shows /en/pocket)
  // /en/ → rewrite to / (main app)
  const { pathname } = request.nextUrl;
  const match = pathname.match(LOCALE_PREFIX);
  if (match) {
    const realPath = match[2]; // everything after /xx
    const url = request.nextUrl.clone();
    url.pathname = realPath;
    return NextResponse.rewrite(url);
  }

  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
