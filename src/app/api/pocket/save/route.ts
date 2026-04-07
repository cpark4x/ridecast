import { NextResponse } from 'next/server';
import { prisma, isUniqueConstraintViolation } from '@/lib/db';
import { contentHash } from '@/lib/utils/hash';

/**
 * Default owner for bookmarklet saves.
 * Set BOOKMARKLET_DEFAULT_USER_ID to your Clerk user ID to link saved
 * articles to your account. Otherwise uses a standalone bookmarklet user.
 */
const DEFAULT_OWNER = process.env.BOOKMARKLET_DEFAULT_USER_ID || 'default-bookmarklet-user';

async function ensureUser(id: string): Promise<string> {
  try {
    await prisma.user.upsert({
      where: { id },
      update: {},
      create: { id, name: 'Bookmarklet User' },
    });
  } catch (err) {
    // Ignore unique constraint race condition
    if ((err as { code?: string }).code !== 'P2002') throw err;
  }
  return id;
}

export async function POST(request: Request) {
  try {
    // Try to get Clerk auth if available — but don't fail if it's not.
    // This route is SKIP_CLERK in middleware, so auth may not be populated.
    let userId: string;
    try {
      const { auth } = await import('@clerk/nextjs/server');
      const authResult = await auth();
      if (authResult.userId) {
        userId = authResult.userId;
        // Ensure user exists in DB
        await ensureUser(userId);
      } else {
        userId = await ensureUser(DEFAULT_OWNER);
      }
    } catch {
      // Clerk not available or errored — use default owner
      userId = await ensureUser(DEFAULT_OWNER);
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
