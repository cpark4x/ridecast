import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ClaudeProvider } from '@/lib/ai/claude';
import { WORDS_PER_MINUTE } from '@/lib/utils/duration';
import { getCurrentUserId } from '@/lib/auth';
import { requireSubscription } from '@/lib/subscription';
import { extractUrl } from '@/lib/extractors';
import { contentHash } from '@/lib/utils/hash';

// 2 minutes — Claude can be slow on long content
export const maxDuration = 120;

export async function POST(request: Request) {
  let contentId: string | undefined;
  try {
    const userId = await getCurrentUserId();
    const gate = await requireSubscription(userId);
    if (gate) return gate;

    const body = await request.json();
    contentId = body.contentId;
    const { targetMinutes } = body;

    if (!contentId || !targetMinutes) {
      return NextResponse.json(
        { error: 'Missing required fields: contentId and targetMinutes' },
        { status: 400 },
      );
    }

    // Look up content
    let content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { scripts: true },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 },
      );
    }

    // Reject duplicate duration — no point generating the same length twice
    const existingDuration = content.scripts.find(
      (s) => s.targetDuration === targetMinutes,
    );
    if (existingDuration) {
      return NextResponse.json(
        { error: `You already have a ${targetMinutes}-minute version of this episode.` },
        { status: 409 },
      );
    }

    // Pocket stubs: rawText is empty — fetch the URL now on demand
    if (content.rawText === '' && content.sourceUrl) {
      try {
        const fetched = await extractUrl(content.sourceUrl);
        await prisma.content.update({
          where: { id: contentId },
          data: {
            rawText: fetched.text,
            wordCount: fetched.wordCount,
            title: fetched.title || content.title,
            sourceType: 'url',
            contentHash: contentHash(fetched.text),
          },
        });
        // Reload with updated data
        content = await prisma.content.findUnique({ where: { id: contentId }, include: { scripts: true } }) ?? content;
      } catch (fetchError) {
        console.error('Failed to fetch Pocket article:', { contentId, url: content.sourceUrl, fetchError });
        return NextResponse.json(
          { error: "Couldn't fetch the article from that URL. Check the link is still accessible." },
          { status: 422 },
        );
      }
    }

    // Step 1: Analyze content
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI provider not configured' },
        { status: 500 },
      );
    }
    const ai = new ClaudeProvider();
    const analysis = await ai.analyze(content.rawText);

    // Auto-apply smart title when the current title looks like a filename
    const currentTitle = content.title ?? '';
    const looksLikeFilename =
      /\.\w{2,5}$/.test(currentTitle) ||           // has file extension
      /^[\w-]+$/.test(currentTitle) ||              // only word chars and dashes (e.g. "my-report")
      currentTitle.length <= 3;                     // very short / generic
    if (looksLikeFilename && analysis.suggestedTitle) {
      await prisma.content.update({
        where: { id: contentId },
        data: { title: analysis.suggestedTitle },
      });
    }

    // Step 2: Generate script using analysis results
    const generated = await ai.generateScript(content.rawText, {
      format: analysis.format,
      targetMinutes,
      contentType: analysis.contentType,
      themes: analysis.themes,
    });

    // Save script to DB
    const script = await prisma.script.create({
      data: {
        contentId,
        format: generated.format,
        targetDuration: targetMinutes,
        actualWordCount: generated.wordCount,
        compressionRatio: content.wordCount > 0
          ? generated.wordCount / content.wordCount
          : 0,
        scriptText: generated.text,
        contentType: analysis.contentType,
        themes: analysis.themes,
        summary: analysis.summary?.trim() || null,
      },
    });

    // Surface advisory when generated word count misses ±15% tolerance.
    // Never blocks playback — advisory only.
    const targetWords = targetMinutes * WORDS_PER_MINUTE;
    const deviation = Math.abs(generated.wordCount - targetWords) / targetWords;
    const durationAdvisory = deviation > 0.15
      ? `Note: Script is ${generated.wordCount < targetWords ? 'shorter' : 'longer'} than your ${targetMinutes}-minute target.`
      : null;

    return NextResponse.json({ ...script, durationAdvisory });
  } catch (error) {
    console.error('Process error:', { contentId, error });

    // Surface actionable messages instead of generic 500.
    let message = 'Something went wrong while processing your content.';
    if (error instanceof Error) {
      if (error.message.includes('prompt is too long')) {
        message = 'This document is too large to process. Try a shorter file or select a shorter duration.';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        message = 'AI service is busy. Please wait a moment and try again.';
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        message = 'AI service is not configured properly. Check your API keys.';
      }
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
