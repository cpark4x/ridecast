import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
  };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    content: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// --- Imports ---

import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { POST } from './route';

const mockFindUnique = prisma.content.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.content.update as ReturnType<typeof vi.fn>;
const mockGetCurrentUserId = getCurrentUserId as ReturnType<typeof vi.fn>;

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string) {
  return new Request(`http://localhost/api/content/${id}/reset`, { method: 'POST' });
}

describe('POST /api/content/[id]/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('user_test123');
  });

  it('returns 200 and resets pipelineStatus to idle with pipelineError null', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'content-1',
      userId: 'user_test123',
      pipelineStatus: 'error',
    });
    mockUpdate.mockResolvedValue({
      id: 'content-1',
      userId: 'user_test123',
      pipelineStatus: 'idle',
      pipelineError: null,
    });

    const response = await POST(makeRequest('content-1'), makeParams('content-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pipelineStatus).toBe('idle');
    expect(data.pipelineError).toBeNull();
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'content-1' } });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { pipelineStatus: 'idle', pipelineError: null },
    });
  });

  it('returns 404 if content is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest('content-1'), makeParams('content-1'));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Content not found');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 403 if content belongs to a different user', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'content-1',
      userId: 'other_user',
      pipelineStatus: 'error',
    });

    const response = await POST(makeRequest('content-1'), makeParams('content-1'));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 500 when findUnique rejects', async () => {
    mockFindUnique.mockRejectedValue(new Error('DB connection lost'));

    const response = await POST(makeRequest('content-1'), makeParams('content-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to reset pipeline status');
  });

  it('returns 500 when update rejects', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'content-1',
      userId: 'user_test123',
      pipelineStatus: 'error',
    });
    mockUpdate.mockRejectedValue(new Error('Write conflict'));

    const response = await POST(makeRequest('content-1'), makeParams('content-1'));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to reset pipeline status');
  });

  it('returns 401 when getCurrentUserId throws AuthenticationError', async () => {
    mockGetCurrentUserId.mockRejectedValue(new AuthenticationError());

    const response = await POST(makeRequest('content-1'), makeParams('content-1'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});
