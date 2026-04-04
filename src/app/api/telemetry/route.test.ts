import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

// vi.hoisted runs before vi.mock factories, making the class available inside the factory
// and in the test body without a top-level variable that vi.mock hoisting can't reach.
const { MockAuthenticationError } = vi.hoisted(() => {
  class MockAuthenticationError extends Error {
    constructor() {
      super('Unauthenticated');
      this.name = 'AuthenticationError';
    }
  }
  return { MockAuthenticationError };
});

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
  AuthenticationError: MockAuthenticationError,
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    telemetryEvent: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

// --- Imports ---

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { POST } from './route';
import { createJsonRequest } from '../__tests__/test-utils';

const mockCreate = prisma.telemetryEvent.create as ReturnType<typeof vi.fn>;
const mockCreateMany = prisma.telemetryEvent.createMany as ReturnType<typeof vi.fn>;

describe('POST /api/telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
    mockCreate.mockResolvedValue({
      id: 'tel-1',
      userId: 'user_test123',
      eventType: 'api_error',
      metadata: { status: 500 },
      surfaced: false,
    });
    mockCreateMany.mockResolvedValue({ count: 2 });
  });

  it('creates telemetry event and returns id', async () => {
    const request = createJsonRequest({
      eventType: 'api_error',
      metadata: { status: 500, endpoint: '/api/library' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('tel-1');
  });

  it('stores event with correct userId and surfaced=false', async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue('user_xyz');

    const request = createJsonRequest({
      eventType: 'playback_failure',
      metadata: { error: 'buffer underrun' },
    });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_xyz',
          eventType: 'playback_failure',
          surfaced: false,
        }),
      }),
    );
  });

  it('rejects invalid eventType with 400', async () => {
    const request = createJsonRequest({
      eventType: 'invalid_type',
      metadata: {},
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Invalid eventType');
  });

  it('rejects missing eventType with 400', async () => {
    const request = createJsonRequest({ metadata: {} });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('defaults metadata to empty object when not provided', async () => {
    const request = createJsonRequest({ eventType: 'api_error' });

    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: {},
        }),
      }),
    );
  });

  it('accepts a batch of telemetry events in one request', async () => {
    const request = createJsonRequest([
      { eventType: 'api_error', metadata: { status: 500 } },
      { eventType: 'playback_failure', metadata: { error: 'buffer underrun' } },
    ]);

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(2);
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'user_test123',
          eventType: 'api_error',
          metadata: { status: 500 },
          surfaced: false,
          clientEventId: null,
        },
        {
          userId: 'user_test123',
          eventType: 'playback_failure',
          metadata: { error: 'buffer underrun' },
          surfaced: false,
          clientEventId: null,
        },
      ],
      skipDuplicates: true,
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 401 for unauthenticated requests', async () => {
    vi.mocked(getCurrentUserId).mockRejectedValue(new MockAuthenticationError());

    const request = createJsonRequest({
      eventType: 'api_error',
      metadata: {},
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('returns 200 on duplicate single-event clientEventId (idempotent retry)', async () => {
    // Simulate Prisma P2002 unique constraint violation on the second attempt
    const p2002 = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });
    mockCreate.mockRejectedValueOnce(p2002);

    const request = createJsonRequest({
      eventType: 'api_error',
      metadata: { status: 500 },
      clientEventId: 'test-idempotency-key-abc123',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    // Client should not loop on 500; duplicate is silently accepted
    const data = await response.json();
    expect(data).not.toHaveProperty('error');
  });
});
