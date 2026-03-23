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
      expect.objectContaining({ where: { id: "user_test123" } }),
    );
  });

  it("throws when unauthenticated", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    vi.mocked(auth).mockResolvedValueOnce({ userId: null } as never);
    const { getCurrentUserId } = await import("./auth");
    await expect(getCurrentUserId()).rejects.toThrow("Unauthenticated");
  });
});
