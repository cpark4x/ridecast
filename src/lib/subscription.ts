import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const FREE_EPISODE_LIMIT = 3;

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
 * Check if a user can process content.
 * Three-state: active subscriber, free trial (< 3 episodes), or trial expired.
 * BYOK instances always pass.
 */
export async function canProcess(userId: string): Promise<{
  allowed: boolean;
  reason: "subscribed" | "byok" | "free_trial" | "trial_expired";
  freeEpisodesRemaining?: number;
}> {
  if (isByokInstance()) return { allowed: true, reason: "byok" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, freeEpisodesUsed: true },
  });

  if (user?.subscriptionStatus === "active") {
    return { allowed: true, reason: "subscribed" };
  }

  const used = user?.freeEpisodesUsed ?? 0;
  if (used < FREE_EPISODE_LIMIT) {
    return {
      allowed: true,
      reason: "free_trial",
      freeEpisodesRemaining: FREE_EPISODE_LIMIT - used - 1, // after this one
    };
  }

  return { allowed: false, reason: "trial_expired", freeEpisodesRemaining: 0 };
}

/**
 * Increment the free episode counter after successful processing.
 * Only call this AFTER the episode is successfully generated.
 */
export async function incrementFreeEpisode(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { freeEpisodesUsed: { increment: 1 } },
  });
}

/**
 * Legacy gate helper — still used by routes that need binary subscription check
 * (e.g., audio/generate which runs after process already gated).
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
 * Gate helper for processing routes.
 * Returns null if the user can proceed, or a 403 Response if not.
 */
export async function requireSubscription(userId: string): Promise<NextResponse | null> {
  const result = await canProcess(userId);
  if (result.allowed) return null;

  return NextResponse.json(
    {
      error: "Free trial ended. Subscribe to keep creating episodes.",
      upgrade_url: "/upgrade",
      freeEpisodesRemaining: 0,
    },
    { status: 403 }
  );
}
