import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Public routes — no auth required (used inside clerkMiddleware)
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/library",
  "/api/audio/(.*)",
  "/audio/(.*)",
  "/api/webhook",
  "/api/webhook/clerk",
  "/api/pocket/save",
  "/pocket",
  "/save(.*)",
  "/privacy",
  "/support",
  "/upgrade",
]);

// Pages that should never touch Clerk at all — prevents Clerk's localization
// from redirecting /pocket → /en/pocket. Simple set for O(1) lookup.
const SKIP_CLERK = new Set(["/pocket", "/save", "/privacy", "/support", "/upgrade"]);

// Clerk v7 localization redirects /path → /en/path. Strip the prefix so
// Next.js can find the actual page file.
const LOCALE_PREFIX = /^\/([a-z]{2})(\/.*)/;

const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (process.env.E2E_TEST_MODE === "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // 1. Strip locale prefix: /en/pocket → rewrite to /pocket
  const localeMatch = pathname.match(LOCALE_PREFIX);
  if (localeMatch) {
    const realPath = localeMatch[2];
    const url = request.nextUrl.clone();
    url.pathname = realPath;
    return NextResponse.rewrite(url);
  }

  // 2. Skip Clerk entirely for public marketing/utility pages.
  //    This prevents Clerk from injecting a locale redirect.
  if (SKIP_CLERK.has(pathname) || pathname.startsWith("/save") || pathname.startsWith("/api/pocket/") || pathname === "/api/library") {
    const res = NextResponse.next();
    res.headers.set("x-skip-clerk", "true");
    return res;
  }

  // 3. Everything else goes through Clerk.
  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
