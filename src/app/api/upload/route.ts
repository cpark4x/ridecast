import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractContent, extractUrl } from '@/lib/extractors';
import { contentHash } from '@/lib/utils/hash';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { requireSubscription } from '@/lib/subscription';

// Max chars sent to Claude for script generation (~600K = ~150K words / ~500 pages)
const TRUNCATION_WARNING_CHARS = 400_000; // warn above ~100K words / ~330 pages

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const gate = await requireSubscription(userId);
    if (gate) return gate;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody: any = await request.formData();
    const file = rawBody.get('file') as File | null;
    const url = rawBody.get('url') as string | null;

    // Fast-path: if URL is already in this user's library (including Pocket stubs),
    // re-use it so we don't create a duplicate.
    // We check before extraction to avoid the network cost of re-fetching.
    if (url) {
      const byUrl = await prisma.content.findFirst({
        where: { userId, sourceUrl: url },
      });
      if (byUrl) {
        if (byUrl.sourceType === 'pocket' && byUrl.rawText === '') {
          // Stub — fetch and populate it now so the caller gets a real preview
          try {
            const fetched = await extractUrl(url);
            const hash = contentHash(fetched.text);
            const updated = await prisma.content.update({
              where: { id: byUrl.id },
              data: {
                rawText: fetched.text,
                wordCount: fetched.wordCount,
                title: fetched.title || byUrl.title,
                sourceType: 'url',
                contentHash: hash,
              },
            });
            return NextResponse.json(updated);
          } catch {
            // Fetch failed — fall through to normal upload flow
          }
        } else {
          // Already fully populated — return as 409 dedup
          return NextResponse.json(
            { ...byUrl, error: 'This content has already been uploaded.' },
            { status: 409 },
          );
        }
      }
    }

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
      // Return the existing record so the client can surface it directly.
      // Include an `error` field as a fallback message in case the client
      // doesn't special-case 409 — prevents the generic "Upload failed" string.
      return NextResponse.json(
        { ...existing, error: 'This content has already been uploaded.' },
        { status: 409 },
      );
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

    // Auth failure should be 401, not 500
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let message = 'Something went wrong processing your upload.';
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch URL: 403')) {
        message = 'That site blocked our request. Try pasting the article text directly or using a different URL.';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
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
