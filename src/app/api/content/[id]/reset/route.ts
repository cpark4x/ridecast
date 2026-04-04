import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    const { id } = await params;

    const content = await prisma.content.findUnique({ where: { id } });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.content.update({
      where: { id },
      data: { pipelineStatus: 'idle', pipelineError: null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to reset pipeline status:', error);
    return NextResponse.json(
      { error: 'Failed to reset pipeline status' },
      { status: 500 },
    );
  }
}
