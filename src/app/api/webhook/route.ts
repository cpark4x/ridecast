import { getStripeClient } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  const stripe = getStripeClient();
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
