import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Check if this is a self-hosted / BYOK instance.
 * When users bring their own API keys and there's no Stripe configured,
 * the subscription gate is bypassed entirely.
 */
export function isByokInstance(): boolean {
  return !!(
    process.env.ANTHROPIC_API_KEY &&
    process.env.OPENAI_API_KEY &&
    !process.env.STRIPE_SECRET_KEY
  );
}

/**
 * Check if a user has an active subscription.
 * BYOK instances always pass (no API costs managed by us).
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  if (isByokInstance()) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });

  return user?.subscriptionStatus === "active";
}

/**
 * Gate helper for API route handlers.
 * Returns null if the user can proceed, or a 403 Response if not.
 */
export async function requireSubscription(userId: string): Promise<NextResponse | null> {
  const ok = await hasActiveSubscription(userId);
  if (ok) return null;
  return NextResponse.json(
    { error: "Subscription required", upgrade_url: "/upgrade" },
    { status: 403 }
  );
}
