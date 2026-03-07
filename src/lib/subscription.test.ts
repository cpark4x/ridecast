import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { isByokInstance, hasActiveSubscription, requireSubscription } from "./subscription";

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;

// Save originals to restore after each test
const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
const originalOpenAIKey = process.env.OPENAI_API_KEY;
const originalStripeKey = process.env.STRIPE_SECRET_KEY;

afterEach(() => {
  vi.clearAllMocks();
  // Restore env vars
  if (originalAnthropicKey !== undefined) {
    process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
  } else {
    delete process.env.ANTHROPIC_API_KEY;
  }
  if (originalOpenAIKey !== undefined) {
    process.env.OPENAI_API_KEY = originalOpenAIKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
  if (originalStripeKey !== undefined) {
    process.env.STRIPE_SECRET_KEY = originalStripeKey;
  } else {
    delete process.env.STRIPE_SECRET_KEY;
  }
});

describe("isByokInstance", () => {
  it("returns true when AI keys are set but no Stripe key (self-hosted)", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENAI_API_KEY = "sk-test";
    delete process.env.STRIPE_SECRET_KEY;
    expect(isByokInstance()).toBe(true);
  });

  it("returns false when Stripe key is also set (hosted with payment)", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.STRIPE_SECRET_KEY = "sk_test_stripe";
    expect(isByokInstance()).toBe(false);
  });

  it("returns false when AI keys are missing", () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    expect(isByokInstance()).toBe(false);
  });
});

describe("hasActiveSubscription", () => {
  beforeEach(() => {
    // Default: hosted mode (Stripe configured)
    process.env.STRIPE_SECRET_KEY = "sk_test_stripe";
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns true for active subscribers", async () => {
    mockFindUnique.mockResolvedValueOnce({ subscriptionStatus: "active" } as never);
    expect(await hasActiveSubscription("user_123")).toBe(true);
  });

  it("returns false for free users", async () => {
    mockFindUnique.mockResolvedValueOnce({ subscriptionStatus: "free" } as never);
    expect(await hasActiveSubscription("user_123")).toBe(false);
  });

  it("returns false for null user", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    expect(await hasActiveSubscription("user_unknown")).toBe(false);
  });

  it("returns true for BYOK instances regardless of DB subscription status", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENAI_API_KEY = "sk-test";
    delete process.env.STRIPE_SECRET_KEY;
    // DB is NOT called because isByokInstance() short-circuits
    expect(await hasActiveSubscription("user_123")).toBe(true);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

describe("requireSubscription", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_stripe";
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns null for active subscribers (allow through)", async () => {
    mockFindUnique.mockResolvedValueOnce({ subscriptionStatus: "active" } as never);
    const result = await requireSubscription("user_123");
    expect(result).toBeNull();
  });

  it("returns 403 response for free users", async () => {
    mockFindUnique.mockResolvedValueOnce({ subscriptionStatus: "free" } as never);
    const result = await requireSubscription("user_123");
    expect(result?.status).toBe(403);
  });

  it("403 response body contains upgrade_url", async () => {
    mockFindUnique.mockResolvedValueOnce({ subscriptionStatus: "free" } as never);
    const result = await requireSubscription("user_123");
    const body = await result!.json();
    expect(body.upgrade_url).toBe("/upgrade");
    expect(body.error).toBe("Subscription required");
  });
});
