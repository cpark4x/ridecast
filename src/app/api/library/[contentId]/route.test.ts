import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    $transaction: vi.fn(),
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

vi.mock('@/lib/storage/blob', async () => {
  const actual = await vi.importActual<typeof import('@/lib/storage/blob')>('@/lib/storage/blob');
  return {
    ...actual,
    getBlobContainerClient: vi.fn(),
    isBlobStorageConfigured: vi.fn().mockReturnValue(false),
  };
});

// --- Imports ---

import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { getBlobContainerClient, isBlobStorageConfigured } from '@/lib/storage/blob';
import { DELETE } from './route';

const mockPrismaTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;
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
    mockPrismaTransaction.mockImplementation(async (callback) => callback(prisma));
    vi.mocked(getBlobContainerClient).mockReset();
    vi.mocked(getBlobContainerClient).mockImplementation(() => {
      throw new Error('getBlobContainerClient should not be called when blob cleanup is disabled');
    });
    vi.mocked(isBlobStorageConfigured).mockReturnValue(false);
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
    expect(mockScriptFindMany).toHaveBeenCalledWith({
      where: { contentId: 'content-1' },
      select: {
        audio: {
          select: {
            id: true,
            filePath: true,
          },
        },
      },
    });
  });

  it('runs the related database deletes inside a transaction', async () => {
    const request = new Request('http://localhost/api/library/content-1', { method: 'DELETE' });
    const response = await DELETE(request, makeParams('content-1'));

    expect(response.status).toBe(200);
    expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
  });

  it('reads related audio rows from the transaction client before deleting', async () => {
    const txScriptFindMany = vi.fn().mockResolvedValue([]);
    const txScriptDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const txContentDelete = vi.fn().mockResolvedValue({});
    const txAudioDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const txPlaybackStateDeleteMany = vi.fn().mockResolvedValue({ count: 0 });

    mockScriptFindMany.mockImplementation(() => {
      throw new Error('route should use tx.script.findMany inside the transaction');
    });
    mockPrismaTransaction.mockImplementation(async (callback) =>
      callback({
        playbackState: { deleteMany: txPlaybackStateDeleteMany },
        audio: { deleteMany: txAudioDeleteMany },
        script: {
          findMany: txScriptFindMany,
          deleteMany: txScriptDeleteMany,
        },
        content: { delete: txContentDelete },
      }),
    );

    const response = await DELETE(
      new Request('http://localhost/api/library/content-1', { method: 'DELETE' }),
      makeParams('content-1'),
    );

    expect(response.status).toBe(200);
    expect(txScriptFindMany).toHaveBeenCalledWith({
      where: { contentId: 'content-1' },
      select: {
        audio: {
          select: {
            id: true,
            filePath: true,
          },
        },
      },
    });
  });

  it('ignores audio rows without blob URLs when filePath is null', async () => {
    mockScriptFindMany.mockResolvedValue([{
      id: 'script-1',
      audio: [{ id: 'audio-1', filePath: null }],
    }]);

    const request = new Request('http://localhost/api/library/content-1', { method: 'DELETE' });
    const response = await DELETE(request, makeParams('content-1'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('returns 401 for unauthenticated requests without logging an expected auth error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getCurrentUserId).mockRejectedValue(new AuthenticationError());

    try {
      const request = new Request('http://localhost/api/library/content-1', { method: 'DELETE' });
      const response = await DELETE(request, makeParams('content-1'));

      expect(response.status).toBe(401);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
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

  describe('blob cleanup', () => {
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    function setupBlobCleanup(mockDeleteBlob: ReturnType<typeof vi.fn>): void {
      vi.mocked(isBlobStorageConfigured).mockReturnValue(true);
      vi.mocked(getBlobContainerClient).mockImplementation(
        () => ({ deleteBlob: mockDeleteBlob }) as never,
      );
    }

    it('attempts all blob deletes even if one fails', async () => {
      // Arrange: two blobs — first delete rejects, second resolves.
      // Key guarantee under test: Promise.allSettled means the second delete
      // is still attempted even after the first one fails.
      const mockDeleteBlob = vi.fn()
        .mockRejectedValueOnce(new Error('BlobNotFound'))
        .mockResolvedValueOnce({});
      setupBlobCleanup(mockDeleteBlob);

      mockScriptFindMany.mockResolvedValue([{
        id: 'script-1',
        audio: [
          { id: 'audio-1', filePath: 'https://account.blob.core.windows.net/container/blob1.mp3' },
          { id: 'audio-2', filePath: 'https://account.blob.core.windows.net/container/blob2.mp3' },
        ],
      }]);

      const response = await DELETE(
        new Request('http://localhost/api/library/content-1', { method: 'DELETE' }),
        makeParams('content-1'),
      );

      // The route response must be 200 — blob cleanup errors must not surface
      expect(response.status).toBe(200);
      expect((await response.json()).ok).toBe(true);

      // Flush the fire-and-forget blob cleanup promise
      await vi.waitFor(() => expect(mockDeleteBlob).toHaveBeenCalledTimes(2));

      // Both URLs were attempted despite the first failure
      expect(mockDeleteBlob).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[delete] blob file cleanup failed:',
        'https://account.blob.core.windows.net/container/blob1.mp3',
        expect.any(Error),
      );
    });

    it('still attempts later deletes when a delete throws synchronously', async () => {
      const mockDeleteBlob = vi.fn()
        .mockImplementationOnce(() => { throw new Error('SyncDeleteFailure'); })
        .mockResolvedValueOnce({});
      setupBlobCleanup(mockDeleteBlob);

      mockScriptFindMany.mockResolvedValue([{
        id: 'script-1',
        audio: [
          { id: 'audio-1', filePath: 'https://account.blob.core.windows.net/container/blob1.mp3' },
          { id: 'audio-2', filePath: 'https://account.blob.core.windows.net/container/blob2.mp3' },
        ],
      }]);

      const response = await DELETE(
        new Request('http://localhost/api/library/content-1', { method: 'DELETE' }),
        makeParams('content-1'),
      );

      expect(response.status).toBe(200);
      await vi.waitFor(() => expect(mockDeleteBlob).toHaveBeenCalledTimes(2));
      await vi.waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[delete] blob file cleanup failed:',
          'https://account.blob.core.windows.net/container/blob1.mp3',
          expect.any(Error),
        );
      });
    });

    it('skips malformed container URLs that do not include a blob path', async () => {
      const mockDeleteBlob = vi.fn().mockResolvedValue({});
      setupBlobCleanup(mockDeleteBlob);

      mockScriptFindMany.mockResolvedValue([{
        id: 'script-1',
        audio: [
          { id: 'audio-1', filePath: 'https://account.blob.core.windows.net/container' },
          { id: 'audio-2', filePath: 'https://account.blob.core.windows.net/container/blob2.mp3' },
        ],
      }]);

      const response = await DELETE(
        new Request('http://localhost/api/library/content-1', { method: 'DELETE' }),
        makeParams('content-1'),
      );

      expect(response.status).toBe(200);
      await vi.waitFor(() => expect(mockDeleteBlob).toHaveBeenCalledTimes(1));
      expect(mockDeleteBlob).toHaveBeenCalledWith('blob2.mp3', { deleteSnapshots: 'include' });
      expect(getBlobContainerClient).toHaveBeenCalledTimes(1);
      expect(getBlobContainerClient).toHaveBeenCalledWith('container');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[delete] blob cleanup skipped invalid blob URL:',
        'https://account.blob.core.windows.net/container',
        expect.any(Error),
      );
    });

    it('skips invalid blob URLs without a container path and still deletes valid blobs', async () => {
      const mockDeleteBlob = vi.fn().mockResolvedValue({});
      setupBlobCleanup(mockDeleteBlob);

      mockScriptFindMany.mockResolvedValue([{
        id: 'script-1',
        audio: [
          { id: 'audio-1', filePath: 'https://account.blob.core.windows.net' },
          { id: 'audio-2', filePath: 'https://account.blob.core.windows.net/container/blob2.mp3' },
        ],
      }]);

      const response = await DELETE(
        new Request('http://localhost/api/library/content-1', { method: 'DELETE' }),
        makeParams('content-1'),
      );

      expect(response.status).toBe(200);
      await vi.waitFor(() => expect(mockDeleteBlob).toHaveBeenCalledTimes(1));
      expect(mockDeleteBlob).toHaveBeenCalledWith('blob2.mp3', { deleteSnapshots: 'include' });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[delete] blob cleanup skipped invalid blob URL:',
        'https://account.blob.core.windows.net',
        expect.any(Error),
      );
    });

    it('deduplicates repeated blob URLs before deleting', async () => {
      const mockDeleteBlob = vi.fn().mockResolvedValue({});
      setupBlobCleanup(mockDeleteBlob);

      mockScriptFindMany.mockResolvedValue([{
        id: 'script-1',
        audio: [
          { id: 'audio-1', filePath: 'https://account.blob.core.windows.net/container/blob1.mp3' },
          { id: 'audio-2', filePath: 'https://account.blob.core.windows.net/container/blob1.mp3' },
        ],
      }]);

      const response = await DELETE(
        new Request('http://localhost/api/library/content-1', { method: 'DELETE' }),
        makeParams('content-1'),
      );

      expect(response.status).toBe(200);
      await vi.waitFor(() => expect(mockDeleteBlob).toHaveBeenCalledTimes(1));
      expect(mockDeleteBlob).toHaveBeenCalledWith('blob1.mp3', { deleteSnapshots: 'include' });
      expect(getBlobContainerClient).toHaveBeenCalledTimes(1);
      expect(getBlobContainerClient).toHaveBeenCalledWith('container');
    });

    it('decodes URL-encoded blob names before deleting', async () => {
      const mockDeleteBlob = vi.fn().mockResolvedValue({});
      setupBlobCleanup(mockDeleteBlob);

      mockScriptFindMany.mockResolvedValue([{
        id: 'script-1',
        audio: [
          {
            id: 'audio-1',
            filePath:
              'https://account.blob.core.windows.net/container/path%20with%20spaces/blob%2B1.mp3',
          },
        ],
      }]);

      const response = await DELETE(
        new Request('http://localhost/api/library/content-1', { method: 'DELETE' }),
        makeParams('content-1'),
      );

      expect(response.status).toBe(200);
      await vi.waitFor(() => expect(mockDeleteBlob).toHaveBeenCalledTimes(1));
      expect(mockDeleteBlob).toHaveBeenCalledWith('path with spaces/blob+1.mp3', {
        deleteSnapshots: 'include',
      });
      expect(getBlobContainerClient).toHaveBeenCalledWith('container');
    });
  });

  it('resets blob storage configuration mocks between tests', () => {
    expect(isBlobStorageConfigured()).toBe(false);
  });
});
