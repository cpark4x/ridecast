import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes — no auth required
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/library", // catalog browsing — free, unauthenticated
  "/api/audio/(.*)", // audio streaming — free, unauthenticated
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth.protect(); // redirects to sign-in if not authenticated
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
