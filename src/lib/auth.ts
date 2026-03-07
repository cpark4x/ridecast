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
