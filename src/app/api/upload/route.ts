import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractContent, extractUrl } from '@/lib/extractors';
import { contentHash } from '@/lib/utils/hash';

const DEFAULT_USER_ID = 'default-user';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const url = formData.get('url') as string | null;

    let title: string;
    let text: string;
    let wordCount: number;
    let sourceType: string;
    let sourceUrl: string | null = null;
    let author: string | undefined;

    if (url) {
      const result = await extractUrl(url);
      title = result.title;
      text = result.text;
      wordCount = result.wordCount;
      sourceType = 'url';
      sourceUrl = url;
      author = result.author;
    } else if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let fileSourceType: 'txt' | 'pdf' | 'epub';

      if (extension === 'pdf') {
        fileSourceType = 'pdf';
      } else if (extension === 'epub') {
        fileSourceType = 'epub';
      } else {
        fileSourceType = 'txt';
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const buffer = Buffer.from(bytes);
      const result = await extractContent(buffer, file.name, fileSourceType);

      title = result.title;
      text = result.text;
      wordCount = result.wordCount;
      sourceType = fileSourceType;
      author = result.author;
    } else {
      return NextResponse.json(
        { error: 'No file or URL provided' },
        { status: 400 },
      );
    }

    const hash = contentHash(text);

    // Check for duplicate
    const existing = await prisma.content.findUnique({
      where: { contentHash: hash },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Duplicate content', existingId: existing.id },
        { status: 409 },
      );
    }

    const record = await prisma.content.create({
      data: {
        userId: DEFAULT_USER_ID,
        title,
        rawText: text,
        wordCount,
        sourceType,
        sourceUrl,
        contentHash: hash,
        ...(author ? { author } : {}),
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
