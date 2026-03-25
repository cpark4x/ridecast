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
      delete: vi.fn(),
    },
    script: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    audio: {
      deleteMany: vi.fn(),
    },
    playbackState: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/storage/blob', () => ({
  isBlobStorageConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: { fromConnectionString: vi.fn() },
}));

// --- Imports ---

import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { DELETE } from './route';

const mockContentFindUnique = prisma.content.findUnique as ReturnType<typeof vi.fn>;
const mockScriptFindMany = prisma.script.findMany as ReturnType<typeof vi.fn>;
const mockContentDelete = prisma.content.delete as ReturnType<typeof vi.fn>;

function makeParams(contentId: string) {
  return { params: Promise.resolve({ contentId }) };
}

describe('DELETE /api/library/[contentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
    mockContentFindUnique.mockResolvedValue({
      id: 'content-1',
      userId: 'user_test123',
      filePath: null,
    });
    mockScriptFindMany.mockResolvedValue([]);
    mockContentDelete.mockResolvedValue({});
  });

  it('returns 200 ok when the owner deletes their content', async () => {
    const request = new Request('http://localhost/api/library/content-1', { method: 'DELETE' });
    const response = await DELETE(request, makeParams('content-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
  });

  it('returns 401 for unauthenticated requests', async () => {
    vi.mocked(getCurrentUserId).mockRejectedValue(new AuthenticationError());

    const request = new Request('http://localhost/api/library/content-1', { method: 'DELETE' });
    const response = await DELETE(request, makeParams('content-1'));

    expect(response.status).toBe(401);
  });

  it('returns 404 when content does not exist', async () => {
    mockContentFindUnique.mockResolvedValue(null);

    const request = new Request('http://localhost/api/library/content-1', { method: 'DELETE' });
    const response = await DELETE(request, makeParams('content-1'));

    expect(response.status).toBe(404);
  });

  it('returns 403 when the requester does not own the content', async () => {
    mockContentFindUnique.mockResolvedValue({ id: 'content-1', userId: 'other_user' });

    const request = new Request('http://localhost/api/library/content-1', { method: 'DELETE' });
    const response = await DELETE(request, makeParams('content-1'));

    expect(response.status).toBe(403);
  });
});
