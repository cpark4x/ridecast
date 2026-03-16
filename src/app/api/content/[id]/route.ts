import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    const { id } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 },
      );
    }

    // Verify content belongs to this user
    const content = await prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 },
      );
    }

    if (content.userId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 },
      );
    }

    const updated = await prisma.content.update({
      where: { id },
      data: { title: title.trim() },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Content update error:', error);
    return NextResponse.json(
      { error: 'Something went wrong updating the content.' },
      { status: 500 },
    );
  }
}
