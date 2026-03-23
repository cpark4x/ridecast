import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { isBlobStorageConfigured } from '@/lib/storage/blob';
import { BlobServiceClient } from '@azure/storage-blob';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ contentId: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    const { contentId } = await params;

    // Verify ownership
    const content = await prisma.content.findUnique({
      where: { id: contentId },
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

    if (error instanceof Error && error.message === 'Unauthenticated') {
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

  for (const url of urls) {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const containerName = pathParts[0];
      const blobName = pathParts.slice(1).join('/');

      const containerClient = serviceClient.getContainerClient(containerName);
      await containerClient.deleteBlob(blobName, { deleteSnapshots: 'include' });
    } catch (err) {
      console.warn('[delete] blob file cleanup failed:', url, err);
    }
  }
}
