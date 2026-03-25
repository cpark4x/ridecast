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
  parseBlobUrl: vi.fn().mockImplementation((url: string) => {
    const { pathname } = new URL(url);
    const parts = pathname.split('/').filter(Boolean);
    return { containerName: parts[0], blobName: parts.slice(1).join('/') };
  }),
}));

vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: { fromConnectionString: vi.fn() },
}));

// --- Imports ---

import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { isBlobStorageConfigured } from '@/lib/storage/blob';
import { BlobServiceClient } from '@azure/storage-blob';
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
    vi.unstubAllEnvs();
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

  it('blob cleanup: attempts all blob deletes even if one fails', async () => {
    // Arrange: two blobs — first delete rejects, second resolves.
    // Key guarantee under test: Promise.allSettled means the second delete
    // is still attempted even after the first one fails.
    const mockDeleteBlob = vi.fn()
      .mockRejectedValueOnce(new Error('BlobNotFound'))
      .mockResolvedValueOnce({});

    vi.mocked(BlobServiceClient.fromConnectionString).mockReturnValue({
      getContainerClient: vi.fn().mockReturnValue({ deleteBlob: mockDeleteBlob }),
    } as unknown as InstanceType<typeof BlobServiceClient>);

    vi.mocked(isBlobStorageConfigured).mockReturnValue(true);

    // deleteBlobFiles guards on the raw env var in addition to isBlobStorageConfigured;
    // stub it so the function doesn't short-circuit before calling Azure.
    vi.stubEnv('AZURE_STORAGE_CONNECTION_STRING', 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net');

    mockScriptFindMany.mockResolvedValue([
      {
        id: 'script-1',
        audio: [
          { id: 'audio-1', filePath: 'https://account.blob.core.windows.net/container/blob1.mp3' },
          { id: 'audio-2', filePath: 'https://account.blob.core.windows.net/container/blob2.mp3' },
        ],
      },
    ]);

    const request = new Request('http://localhost/api/library/content-1', { method: 'DELETE' });
    const response = await DELETE(request, makeParams('content-1'));

    // The route response must be 200 — blob cleanup errors must not surface
    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);

    // Flush the fire-and-forget blob cleanup promise
    await vi.waitFor(() => expect(mockDeleteBlob).toHaveBeenCalledTimes(2));

    // Both URLs were attempted despite the first failure
    expect(mockDeleteBlob).toHaveBeenCalledTimes(2);
  });
});
