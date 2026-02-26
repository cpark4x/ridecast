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
