import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { isBlobStorageConfigured, parseBlobUrl } from '@/lib/storage/blob';
import { BlobServiceClient } from '@azure/storage-blob';

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

    // Find all related records (Content → Scripts → Audio → PlaybackState)
    const scripts = await prisma.script.findMany({
      where: { contentId },
      include: { audio: true },
    });

    const audioIds = scripts.flatMap((s) => s.audio.map((a) => a.id));
    const blobUrls = scripts.flatMap((s) =>
      s.audio.filter((a) => a.filePath.startsWith('https://')).map((a) => a.filePath),
    );

    // Delete in FK order: PlaybackState → Audio → Script → Content
    if (audioIds.length > 0) {
      await prisma.playbackState.deleteMany({
        where: { audioId: { in: audioIds } },
      });
      await prisma.audio.deleteMany({
        where: { id: { in: audioIds } },
      });
    }

    await prisma.script.deleteMany({ where: { contentId } });
    await prisma.content.delete({ where: { id: contentId } });

    // Clean up blob storage (fire-and-forget — don't block the response)
    if (blobUrls.length > 0 && isBlobStorageConfigured()) {
      deleteBlobFiles(blobUrls).catch((err) =>
        console.warn('[delete] blob cleanup error:', err),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete error:', error);

    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete episode' },
      { status: 500 },
    );
  }
}

async function deleteBlobFiles(urls: string[]): Promise<void> {
  const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connString) return;

  const serviceClient = BlobServiceClient.fromConnectionString(connString);

  // Delete all blobs in parallel — one failure does not abort the rest.
  const results = await Promise.allSettled(
    urls.map((url) => {
      const { containerName, blobName } = parseBlobUrl(url);
      const containerClient = serviceClient.getContainerClient(containerName);
      return containerClient.deleteBlob(blobName, { deleteSnapshots: 'include' });
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'rejected') {
      console.warn('[delete] blob file cleanup failed:', urls[i], result.reason);
    }
  }
}
