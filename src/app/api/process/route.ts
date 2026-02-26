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
    const ai = new ClaudeProvider(process.env.ANTHROPIC_API_KEY);
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}