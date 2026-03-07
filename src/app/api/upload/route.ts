import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractContent, extractUrl } from '@/lib/extractors';
import { contentHash } from '@/lib/utils/hash';
import { getCurrentUserId } from '@/lib/auth';

// Max chars sent to Claude for script generation (~600K = ~150K words / ~500 pages)
const TRUNCATION_WARNING_CHARS = 400_000; // warn above ~100K words / ~330 pages

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

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

    // Reject duplicate content so the caller knows this exact text already
    // exists and can surface the existing record to the user.
    const existing = await prisma.content.findUnique({
      where: { contentHash: hash },
    });

    if (existing) {
      return NextResponse.json(existing, { status: 409 });
    }

    const record = await prisma.content.create({
      data: {
        userId,
        title,
        rawText: text,
        wordCount,
        sourceType,
        sourceUrl,
        contentHash: hash,
        ...(author ? { author } : {}),
      },
    });

    const truncationWarning = text.length > TRUNCATION_WARNING_CHARS
      ? `This document is very long (${Math.round(text.length / 6)} words). Only the first ~100,000 words will be used for audio generation.`
      : null;

    return NextResponse.json({ ...record, truncationWarning });
  } catch (error) {
    console.error('Upload error:', error);

    let message = 'Something went wrong processing your upload.';
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        message = 'Could not reach that URL. Please check the address and try again.';
      } else if (error.message.includes('Invalid URL') || error.message.includes('ERR_INVALID_URL')) {
        message = 'That doesn\u2019t look like a valid URL.';
      } else if (error.message.includes('Unsupported') || error.message.includes('extract')) {
        message = 'Could not extract text from this content. Try a different file or URL.';
      }
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
