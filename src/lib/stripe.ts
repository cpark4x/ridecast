import Stripe from "stripe";

// Lazy singleton — mirrors the Prisma singleton pattern.
// Stripe is only instantiated on first use, not at module evaluation time.
// This prevents Next.js build-time failures when STRIPE_SECRET_KEY is absent.
let _client: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!_client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    _client = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  }
  return _client;
}

export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID!;
