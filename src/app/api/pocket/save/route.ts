import { NextResponse } from 'next/server';
import { prisma, isUniqueConstraintViolation } from '@/lib/db';
import { contentHash } from '@/lib/utils/hash';
import { getCurrentUserId } from '@/lib/auth';
import { requireSubscription } from '@/lib/subscription';

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const gate = await requireSubscription(userId);
    if (gate) return gate;

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
