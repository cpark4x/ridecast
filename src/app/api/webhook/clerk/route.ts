
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { prisma } from '@/lib/db';

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string; id: string }>;
    primary_email_address_id?: string;
    first_name?: string | null;
    last_name?: string | null;
  };
}

export async function POST(request: Request) {
  if (!CLERK_WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET not set');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Verify webhook signature
  const headerPayload = request.headers;
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(CLERK_WEBHOOK_SECRET);

  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as ClerkWebhookEvent;
  } catch {
    console.error('Clerk webhook verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle user.created and user.updated
  if (event.type === 'user.created' || event.type === 'user.updated') {
    const { id: clerkId, email_addresses, primary_email_address_id, first_name, last_name } = event.data;

    // Find primary email
    const primaryEmail = email_addresses?.find(e => e.id === primary_email_address_id);
    const email = primaryEmail?.email_address ?? email_addresses?.[0]?.email_address;

    // Build name from Clerk profile
    const nameParts = [first_name, last_name].filter(Boolean);
    const name = nameParts.length > 0 ? nameParts.join(' ') : undefined;

    // Upsert user — id IS the Clerk user ID in this schema
    await prisma.user.upsert({
      where: { id: clerkId },
      update: {
        ...(email && { email }),
        ...(name && { name }),
      },
      create: {
        id: clerkId,
        email: email ?? null,
        name: name ?? 'Ridecast User',
      },
    });
  }

  return NextResponse.json({ received: true });
}
