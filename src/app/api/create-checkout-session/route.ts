import { getCurrentUserId } from "@/lib/auth";
import { getStripeClient, SUBSCRIPTION_PRICE_ID } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const { origin } = new URL(request.url);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const stripe = getStripeClient();
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
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
