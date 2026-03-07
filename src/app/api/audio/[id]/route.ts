import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const audio = await prisma.audio.findUnique({
      where: { id },
    });

    if (!audio) {
      return NextResponse.json(
        { error: 'Audio not found' },
        { status: 404 },
      );
    }

    // If filePath is a full URL (blob storage), redirect to it
    if (audio.filePath.startsWith('https://')) {
      return Response.redirect(audio.filePath, 302);
    }

    // Otherwise serve from local public/ (development fallback)
    const absolutePath = path.join(process.cwd(), 'public', audio.filePath);
    const fileBuffer = await readFile(absolutePath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error) {
    console.error('Audio serve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
