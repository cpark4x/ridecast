import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

const VALID_EVENT_TYPES = [
  'api_error',
  'playback_failure',
  'processing_timeout',
  'upload_failure',
];

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await request.json();
    const { eventType, metadata } = body;

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const event = await prisma.telemetryEvent.create({
      data: {
        userId,
        eventType,
        metadata: metadata || {},
        surfaced: false,
      },
    });

    return NextResponse.json({ id: event.id });
  } catch (error) {
    console.error('Telemetry error:', error);

    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to log telemetry event' },
      { status: 500 },
    );
  }
}
