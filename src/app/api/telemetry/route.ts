import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';

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
    const events = Array.isArray(body) ? body : [body];

    if (events.length === 0) {
      return NextResponse.json(
        { error: 'At least one telemetry event is required' },
        { status: 400 },
      );
    }

    for (const event of events) {
      if (!event?.eventType || !VALID_EVENT_TYPES.includes(event.eventType)) {
        return NextResponse.json(
          { error: `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
          { status: 400 },
        );
      }
    }

    if (events.length === 1) {
      const [eventInput] = events;
      try {
        const event = await prisma.telemetryEvent.create({
          data: {
            userId,
            eventType: eventInput.eventType,
            metadata: eventInput.metadata || {},
            surfaced: false,
            clientEventId: eventInput.clientEventId ?? null,
          },
        });
        return NextResponse.json({ id: event.id });
      } catch (err) {
        // P2002 = unique constraint violation: clientEventId already exists.
        // This is an idempotent duplicate from a client retry — treat as success
        // so the client stops retrying instead of looping on 500 forever.
        if ((err as { code?: string }).code === 'P2002') {
          return NextResponse.json({ id: null });
        }
        throw err;
      }
    }

    const result = await prisma.telemetryEvent.createMany({
      data: events.map((event) => ({
        userId,
        eventType: event.eventType,
        metadata: event.metadata || {},
        surfaced: false,
        clientEventId: event.clientEventId ?? null,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error('Telemetry error:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to log telemetry event' },
      { status: 500 },
    );
  }
}
