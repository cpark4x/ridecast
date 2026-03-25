import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    telemetryEvent: {
      create: vi.fn(),
    },
  },
}));

// --- Imports ---

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { POST } from './route';

const mockCreate = prisma.telemetryEvent.create as ReturnType<typeof vi.fn>;

function createJsonRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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

  it('returns 401 for unauthenticated requests', async () => {
    vi.mocked(getCurrentUserId).mockRejectedValue(new Error('Unauthenticated'));

    const request = createJsonRequest({
      eventType: 'api_error',
      metadata: {},
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
