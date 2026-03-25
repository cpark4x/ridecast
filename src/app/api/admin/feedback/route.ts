import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    // Admin gate: read at call time so tests can set process.env
    const adminIds = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);
    if (!adminIds.includes(userId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const since = url.searchParams.get('since');

    // Build dynamic where clause from query params
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = { equals: category, mode: 'insensitive' };
    if (since) where.createdAt = { gte: new Date(since) };

    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Admin feedback query error:', error);

    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to query feedback' },
      { status: 500 },
    );
  }
}
