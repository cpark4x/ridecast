import { NextResponse } from 'next/server';
import { prisma, isUniqueConstraintViolation } from '@/lib/db';
import { contentHash } from '@/lib/utils/hash';
import { getCurrentUserId } from '@/lib/auth';

/**
 * Default owner for bookmarklet saves when user isn't authenticated.
 * This lets the bookmarklet work without sign-in — articles are saved to
 * this owner and visible in the library once they do sign in with this ID.
 * Set BOOKMARKLET_DEFAULT_USER_ID in env to your Clerk user ID.
 */
const DEFAULT_OWNER = process.env.BOOKMARKLET_DEFAULT_USER_ID || 'default-bookmarklet-user';

export async function POST(request: Request) {
  try {
    let userId: string;
    try {
      userId = await getCurrentUserId();
    } catch {
      // No auth session — use default owner so bookmarklet works without sign-in.
      // Ensure the default user exists in DB.
      try {
        await prisma.user.upsert({
          where: { id: DEFAULT_OWNER },
          update: {},
          create: { id: DEFAULT_OWNER, name: 'Bookmarklet User' },
        });
      } catch (err) {
        if ((err as { code?: string }).code !== 'P2002') throw err;
      }
      userId = DEFAULT_OWNER;
    }

    const body = await request.json();
    const { url, title } = body as { url?: string; title?: string };

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Basic URL validation
    try { new URL(url); } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Dedup by (userId, sourceUrl)
    const existing = await prisma.content.findFirst({
      where: { userId, sourceUrl: url },
      select: { id: true, title: true },
    });

    if (existing) {
      return NextResponse.json({ id: existing.id, title: existing.title, alreadySaved: true });
    }

    let record;
    try {
      record = await prisma.content.create({
        data: {
          userId,
          title: title?.trim() || url,
          rawText: '',
          wordCount: 0,
          sourceType: 'pocket',
          sourceUrl: url,
          contentHash: contentHash(userId + ':' + url),
        },
      });
    } catch (err) {
      if (isUniqueConstraintViolation(err)) {
        // Concurrent request already saved this URL — fetch and return idempotently
        const duplicate = await prisma.content.findFirst({
          where: { userId, sourceUrl: url },
          select: { id: true, title: true },
        });
        if (duplicate) {
          return NextResponse.json({ id: duplicate.id, title: duplicate.title, alreadySaved: true });
        }
      }
      throw err;
    }

    return NextResponse.json({ id: record.id, title: record.title, alreadySaved: false });
  } catch (error) {
    console.error('Pocket save error:', error);
    return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
  }
}
