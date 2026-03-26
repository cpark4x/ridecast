import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import {
  getBlobContainerClient,
  isBlobStorageConfigured,
  parseBlobUrl,
} from '@/lib/storage/blob';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ contentId: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    const { contentId } = await params;

    // Verify ownership — only the two fields needed for the 404/403 check.
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, userId: true },
    });

    if (!content) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (content.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { blobUrls } = await prisma.$transaction(async (tx) => {
      // Read and delete the related rows inside the same transaction so the
      // audio snapshot cannot go stale between discovery and cleanup.
      const scripts = await tx.script.findMany({
        where: { contentId },
        select: {
          audio: {
            select: {
              id: true,
              filePath: true,
            },
          },
        },
      });

      const audioRecords = scripts.flatMap((s) => s.audio);
      const audioIds = audioRecords.map((a) => a.id);
      const blobUrls = [...new Set(
        audioRecords
          .map((a) => a.filePath)
          .filter((filePath): filePath is string => filePath?.startsWith('https://') ?? false),
      )];

      // Delete in FK order: PlaybackState → Audio → Script → Content
      if (audioIds.length > 0) {
        await tx.playbackState.deleteMany({
          where: { audioId: { in: audioIds } },
        });
        await tx.audio.deleteMany({
          where: { id: { in: audioIds } },
        });
      }

      await tx.script.deleteMany({ where: { contentId } });
      await tx.content.delete({ where: { id: contentId } });

      return { blobUrls };
    });

    // Clean up blob storage (fire-and-forget — don't block the response)
    if (blobUrls.length > 0 && isBlobStorageConfigured()) {
      void deleteBlobFiles(blobUrls).catch((error) => {
        console.warn('[delete] unexpected blob cleanup error:', error);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Delete error:', error);

    return NextResponse.json(
      { error: 'Failed to delete episode' },
      { status: 500 },
    );
  }
}

async function deleteBlobFiles(urls: string[]): Promise<void> {
  // Delete all blobs in parallel — one failure does not abort the rest.
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      let containerName: string;
      let blobName: string;

      try {
        ({ containerName, blobName } = parseBlobUrl(url));
      } catch (error) {
        console.warn('[delete] blob cleanup skipped invalid blob URL:', url, error);
        return;
      }

      return getBlobContainerClient(containerName).deleteBlob(blobName, {
        deleteSnapshots: 'include',
      });
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'rejected') {
      console.warn('[delete] blob file cleanup failed:', urls[i], result.reason);
    }
  }
}
