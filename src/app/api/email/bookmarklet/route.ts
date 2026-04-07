
import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendBookmarkletEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ridecast2.vercel.app';

export async function POST() {
  try {
    const userId = await getCurrentUserId();

    // Get user's email (id IS the Clerk user ID in this schema)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      return NextResponse.json(
        { error: 'No email address on file. Please update your profile.' },
        { status: 400 }
      );
    }

    const result = await sendBookmarkletEmail(user.email, APP_URL);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error('Bookmarklet email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
