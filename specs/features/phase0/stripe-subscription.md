# Feature: Stripe Freemium Subscription

> Gate own-content processing behind a $10/month subscription. Catalog browsing and playback stay free. BYOK users are exempt.

## Motivation

The freemium model: free tier = catalog only (no sign-in required). Paid tier = upload and process your own content ($10/mo). This is the revenue model for the iOS app.

## Prerequisite

`clerk-auth` and `multi-user-schema` must be implemented first. User model must have `stripeCustomerId` and `subscriptionStatus` fields.

## Pricing Rules

| Action | Free | Paid ($10/mo) | BYOK (self-hosted) |
|---|---|---|---|
| Browse catalog | ✅ | ✅ | ✅ |
| Play catalog audio | ✅ | ✅ | ✅ |
| Upload own content | ❌ | ✅ | ✅ |
| Process (Claude script) | ❌ | ✅ | ✅ |
| Generate audio (TTS) | ❌ | ✅ | ✅ |

**BYOK exemption:** If the request includes user-provided API keys (`x-elevenlabs-key` header, or the server has `OPENAI_API_KEY` + `ANTHROPIC_API_KEY` set as env vars on a self-hosted instance), skip subscription check.

## Changes

### 1. Install

```bash
npm install stripe
```

### 2. Stripe client (`src/lib/stripe.ts` — new file)

```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
});

export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;
```

### 3. Subscription gate helper (`src/lib/subscription.ts` — new file)

```typescript
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * Check if a user has an active subscription.
 * BYOK instances always pass (no API costs managed by us).
 */
export function isByokInstance(): boolean {
  // Self-hosted: user brings their own keys
  return !!(
    process.env.ANTHROPIC_API_KEY &&
    process.env.OPENAI_API_KEY &&
    !process.env.STRIPE_SECRET_KEY  // no Stripe = self-hosted
  );
}

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
```

### 4. Gate the 3 own-content routes

Add `requireSubscription` check after auth in:

**`src/app/api/upload/route.ts`:**
```typescript
import { requireSubscription } from "@/lib/subscription";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const gate = await requireSubscription(userId);
  if (gate) return gate;
  // ... rest of handler unchanged
}
```

Apply identical pattern to `src/app/api/process/route.ts` and `src/app/api/audio/generate/route.ts`.

### 5. Checkout session route (`src/app/api/create-checkout-session/route.ts` — new)

```typescript
import { getCurrentUserId } from "@/lib/auth";
import { stripe, SUBSCRIPTION_PRICE_ID } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const { origin } = new URL(request.url);

  const user = await prisma.user.findUnique({ where: { id: userId } });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: SUBSCRIPTION_PRICE_ID, quantity: 1 }],
    customer: user?.stripeCustomerId ?? undefined,
    client_reference_id: userId,
    success_url: `${origin}/?upgrade=success`,
    cancel_url: `${origin}/upgrade`,
    metadata: { userId },
  });

  return NextResponse.json({ url: session.url });
}
```

### 6. Stripe webhook (`src/app/api/webhook/route.ts` — new)

```typescript
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const session = event.data.object as { metadata?: { userId?: string }; customer?: string };
  const userId = session.metadata?.userId;

  switch (event.type) {
    case "checkout.session.completed":
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionStatus: "active",
            stripeCustomerId: session.customer as string,
          },
        });
      }
      break;

    case "customer.subscription.deleted":
    case "customer.subscription.paused":
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { subscriptionStatus: "free" },
        });
      }
      break;
  }

  return NextResponse.json({ received: true });
}
```

### 7. Upgrade page (`src/app/upgrade/page.tsx` — new)

Simple page with a "Subscribe for $10/month" button that calls `/api/create-checkout-session`:

```typescript
"use client";
import { useState } from "react";

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    const res = await fetch("/api/create-checkout-session", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-2">Process your own content</h1>
        <p className="text-white/55 text-sm mb-6">
          Upload any PDF, article, or EPUB and turn it into a podcast episode.
          Free plan includes the Ridecast catalog.
        </p>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full py-4 rounded-[14px] bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Subscribe — $10/month"}
        </button>
        <p className="text-xs text-white/30 mt-3">Cancel anytime. Billed monthly.</p>
      </div>
    </div>
  );
}
```

### 8. Update `.env.example`

```bash
# Stripe (required for hosted subscription model)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Files to Modify

| File | Change |
|---|---|
| `package.json` | Add `stripe` |
| `src/lib/stripe.ts` | New — Stripe client + price ID |
| `src/lib/subscription.ts` | New — gate helper + BYOK exemption |
| `src/app/api/upload/route.ts` | Add `requireSubscription` gate |
| `src/app/api/process/route.ts` | Add `requireSubscription` gate |
| `src/app/api/audio/generate/route.ts` | Add `requireSubscription` gate |
| `src/app/api/create-checkout-session/route.ts` | New — Stripe checkout |
| `src/app/api/webhook/route.ts` | New — subscription lifecycle |
| `src/app/upgrade/page.tsx` | New — upgrade UI |
| `.env.example` | Add Stripe env vars |

## Tests

**File:** `src/lib/subscription.test.ts` (new)

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("hasActiveSubscription", () => {
  afterEach(() => { vi.clearAllMocks(); });

  it("returns true for active subscribers", async () => {
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      { subscriptionStatus: "active" } as never
    );
    const { hasActiveSubscription } = await import("./subscription");
    expect(await hasActiveSubscription("user_123")).toBe(true);
  });

  it("returns false for free users", async () => {
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      { subscriptionStatus: "free" } as never
    );
    const { hasActiveSubscription } = await import("./subscription");
    expect(await hasActiveSubscription("user_123")).toBe(false);
  });

  it("returns true for BYOK instances regardless of subscription", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENAI_API_KEY = "sk-test";
    delete process.env.STRIPE_SECRET_KEY;
    vi.resetModules();
    const { hasActiveSubscription } = await import("./subscription");
    expect(await hasActiveSubscription("user_123")).toBe(true);
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });
});

describe("requireSubscription", () => {
  it("returns null for active subscribers (allow through)", async () => {
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      { subscriptionStatus: "active" } as never
    );
    const { requireSubscription } = await import("./subscription");
    const result = await requireSubscription("user_123");
    expect(result).toBeNull();
  });

  it("returns 403 response for free users", async () => {
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
      { subscriptionStatus: "free" } as never
    );
    const { requireSubscription } = await import("./subscription");
    const result = await requireSubscription("user_123");
    expect(result?.status).toBe(403);
  });
});
```

## Success Criteria

```bash
npm install
npm run test   # subscription.test.ts passes; route tests updated with subscription mock
npm run build  # no type errors
```

Manual (requires Stripe test mode):
- [ ] Free user → POST /api/upload → 403 with `upgrade_url`
- [ ] Active subscriber → POST /api/upload → processes normally
- [ ] BYOK instance (no STRIPE_SECRET_KEY) → POST /api/upload → processes normally
- [ ] Stripe checkout session created → redirect to Stripe payment page
- [ ] Webhook `checkout.session.completed` → user.subscriptionStatus = "active"

## Scope

Payment infrastructure only. No changes to content extraction, AI processing, or TTS. The catalog (`GET /api/library`, `GET /api/audio/[id]`) stays completely ungated.
