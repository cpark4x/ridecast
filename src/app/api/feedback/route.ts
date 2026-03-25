import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { categorizeFeedback } from '@/lib/ai/feedback';
import { uploadAudio, isBlobStorageConfigured } from '@/lib/storage/blob';
import OpenAI from 'openai';

// Voice transcription + Claude categorization can be slow
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const contentType = request.headers.get('content-type') || '';

    let type: string;
    let rawText: string;
    let audioUrl: string | null = null;
    let screenContext: string;
    let episodeId: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // --- Voice feedback ---
      type = 'voice';
      const formData = await request.formData();
      screenContext = formData.get('screenContext') as string;
      episodeId = (formData.get('episodeId') as string) || null;

      const audioFile = formData.get('audioFile') as File | null;
      if (!audioFile || !screenContext) {
        return NextResponse.json(
          { error: 'audioFile and screenContext are required for voice feedback' },
          { status: 400 },
        );
      }

      // Upload to Azure Blob
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      if (isBlobStorageConfigured()) {
        audioUrl = await uploadAudio(buffer, `feedback-${Date.now()}.webm`);
      }

      // Transcribe with Whisper
      const openai = new OpenAI();
      const transcription = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        file: new File([buffer], audioFile.name, { type: audioFile.type }),
      });
      rawText = transcription.text;
    } else {
      // --- Text feedback ---
      type = 'text';
      const body = await request.json();
      rawText = body.text;
      screenContext = body.screenContext;
      episodeId = body.episodeId || null;

      if (!rawText || !screenContext) {
        return NextResponse.json(
          { error: 'text and screenContext are required' },
          { status: 400 },
        );
      }
    }

    // Fetch recent telemetry for context enrichment
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTelemetry = await prisma.telemetryEvent.findMany({
      where: { userId, createdAt: { gte: oneHourAgo } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Categorize with Claude (graceful failure — store raw feedback even if AI fails)
    let category: string | null = null;
    let summary: string | null = null;
    let priority: string | null = null;

    try {
      const analysis = await categorizeFeedback({
        text: rawText,
        screenContext,
        episodeId,
        telemetryEvents: recentTelemetry,
      });
      category = analysis.category;
      summary = analysis.summary;
      priority = analysis.priority;
    } catch (error) {
      console.error('Feedback categorization failed, storing raw feedback:', error);
    }

    // Store feedback row
    const feedback = await prisma.feedback.create({
      data: {
        userId,
        type,
        rawText,
        audioUrl,
        screenContext,
        category,
        summary,
        priority,
        status: 'new',
        relatedEpisodeId: episodeId,
      },
    });

    return NextResponse.json({
      id: feedback.id,
      summary: summary ?? rawText.slice(0, 100),
      category: category ?? 'Uncategorized',
    });
  } catch (error) {
    console.error('Feedback submission error:', error);

    if (error instanceof Error && error.message === 'Unauthenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 },
    );
  }
}
