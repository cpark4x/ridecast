import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ClaudeProvider } from '@/lib/ai/claude';

export async function POST(request: Request) {
  let contentId: string | undefined;
  try {
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
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 },
      );
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
      },
    });

    return NextResponse.json(script);
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