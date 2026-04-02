import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractContent, extractTxt, extractUrl } from '@/lib/extractors';
import { extractMarkdown } from '@/lib/extractors/markdown';
import { extractGoogleDoc } from '@/lib/extractors/google-docs';
import { extractGithub } from '@/lib/extractors/github';
import { extractNotion } from '@/lib/extractors/notion';
import { detectContentType } from '@/lib/extractors/detect';
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
    let file: File | null = null;
    let url: string | null = null;
    let rawText: string | null = null;
    let bodyTitle: string | null = null;

    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = await request.json() as { rawText?: string; url?: string; title?: string };
      rawText = json.rawText ?? null;
      bodyTitle = json.title ?? null;
      // JSON body may also carry a URL (kept for compatibility)
      if (!rawText) url = json.url as string | null ?? null;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawBody: any = await request.formData();
      file = rawBody.get('file') as File | null;
      url = rawBody.get('url') as string | null;
    }

    // Fast-path: if URL is already in this user's library (including Pocket stubs),
    // re-use it so we don't create a duplicate.
    // We check before extraction to avoid the network cost of re-fetching.
    if (url) {
      const byUrl = await prisma.content.findFirst({
        where: { userId, sourceUrl: url },
      });
      if (byUrl) {
        if (byUrl.sourceType === 'pocket' && byUrl.rawText === '') {
          // Stub — fetch and populate it now so the caller gets a real preview.
          let fetched;
          try {
            fetched = await extractUrl(url);
          } catch (extractErr) {
            console.error('Upload: failed to hydrate Pocket stub', { url, extractErr });
            return NextResponse.json(
              { error: "We couldn't extract content from this URL. Try pasting the article text directly.", code: 'EXTRACTION_FAILED' },
              { status: 422 },
            );
          }
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

    if (rawText !== null) {
      const derivedTitle = bodyTitle ?? (rawText.split('\n')[0].trim().slice(0, 80) || 'Pasted text');
      const result = extractTxt(rawText, derivedTitle);
      title = derivedTitle;
      text = result.text;
      wordCount = result.wordCount;
      sourceType = 'txt';
    } else if (url) {
      sourceUrl = url;
      const urlContentType = detectContentType(url, '');

      if (urlContentType === 'google-doc') {
        const result = await extractGoogleDoc(url);
        title = result.title;
        text = result.text;
        wordCount = result.wordCount;
        author = result.author;
        sourceType = 'google-doc';
      } else if (urlContentType === 'github') {
        const result = await extractGithub(url);
        title = result.title;
        text = result.text;
        wordCount = result.wordCount;
        sourceType = 'github';
      } else if (urlContentType === 'notion') {
        // Always throws a helpful user-facing message — caught below as 422
        await extractNotion(url);
        // Unreachable, but satisfies TypeScript
        throw new Error('Notion extraction failed');
      } else {
        const result = await extractUrl(url);
        title = result.title;
        text = result.text;
        wordCount = result.wordCount;
        sourceType = 'url';
        author = result.author;

        // Detect Pocket stubs: a Pocket URL that returned essentially no content
        // means the item was saved without caching — the original article is the
        // only useful source.
        const isPocketUrl = /getpocket\.com|pocket\.co/i.test(url);
        if (isPocketUrl && wordCount < 50) {
          return NextResponse.json(
            {
              error: 'POCKET_STUB',
              message: 'This Pocket item has no cached content. Try the original URL directly.',
            },
            { status: 422 },
          );
        }

        // Guard against paywalled / JS-rendered / bot-blocked pages that return
        // near-empty HTML. Failing early avoids wasting Claude + TTS processing
        // time on garbage content. 200 words is a conservative lower bound —
        // a meaningful article is rarely shorter.
        if (wordCount < 200) {
          return NextResponse.json(
            {
              error: 'INSUFFICIENT_CONTENT',
              wordCount,
              message:
                'Could not extract enough content from this URL. The page may be paywalled, require JavaScript, or block automated access.',
            },
            { status: 422 },
          );
        }
      }
    } else if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let fileSourceType: 'txt' | 'pdf' | 'epub' | 'docx' | 'markdown';

      if (extension === 'pdf') {
        fileSourceType = 'pdf';
      } else if (extension === 'epub') {
        fileSourceType = 'epub';
      } else if (extension === 'docx' || extension === 'doc') {
        fileSourceType = 'docx';
      } else if (extension === 'md' || extension === 'markdown') {
        fileSourceType = 'markdown';
      } else {
        // txt and unknown extensions → plain text
        fileSourceType = 'txt';
      }

      if (fileSourceType === 'markdown') {
        const content = await file.text();
        const result = extractMarkdown(content);
        title = result.title;
        text = result.text;
        wordCount = result.wordCount;
        sourceType = 'markdown';
      } else {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await extractContent(buffer, file.name, fileSourceType);
        title = result.title;
        text = result.text;
        wordCount = result.wordCount;
        author = result.author;
        // DOCX maps to 'txt' in the DB — no schema migration needed
        sourceType = fileSourceType === 'docx' ? 'txt' : fileSourceType;
      }
    } else {
      return NextResponse.json(
        { error: 'No file, URL, or text provided', code: 'INVALID_INPUT' },
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
    let code: string = 'EXTRACTION_FAILED';
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch URL: 403')) {
        message = 'That site blocked our request. Try pasting the article text directly or using a different URL.';
        code = 'EXTRACTION_FAILED';
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        message = 'Could not reach that URL. Please check the address and try again.';
        code = 'EXTRACTION_FAILED';
      } else if (error.message.includes('Invalid URL') || error.message.includes('ERR_INVALID_URL')) {
        message = 'That doesn\u2019t look like a valid URL.';
        code = 'INVALID_INPUT';
      } else if (error.message.includes('Unsupported') || error.message.includes('extract')) {
        message = 'Could not extract text from this content. Try a different file or URL.';
        code = 'EXTRACTION_FAILED';
      } else if (error.message.includes('zip') || error.message.includes('central directory') || error.message.includes('encrypted')) {
        message = 'This file appears to be corrupt or password-protected. Try re-saving as a new file.';
        code = 'EXTRACTION_FAILED';
      }
    }

    return NextResponse.json(
      { error: message, code },
      { status: 500 },
    );
  }
}
