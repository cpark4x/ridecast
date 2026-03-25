import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { categorizeFeedback, type FeedbackCategory, type FeedbackPriority } from '@/lib/ai/feedback';
import { WHISPER_MODEL } from '@/lib/ai/types';
import { uploadAudio, isBlobStorageConfigured } from '@/lib/storage/blob';
import OpenAI from 'openai';

// Voice transcription + Claude categorization can be slow
export const maxDuration = 60;

// The ambient FormData type in this TS config lacks the get() overload; this
// local shape covers exactly the surface used in the voice-feedback branch.
interface FormDataReader {
  get(name: string): string | File | null;
}

// Lazy singleton — only instantiated when a voice request needs it,
// so text-only requests don't require OPENAI_API_KEY to be set.
let _openai: OpenAI | undefined;
function getOpenAI(): OpenAI {
  return (_openai ??= new OpenAI());
}

function startTelemetryQuery(userId: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return prisma.telemetryEvent.findMany({
    where: { userId, createdAt: { gte: oneHourAgo } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    // Only fetch the two fields actually consumed by categorizeFeedback.
    select: { eventType: true, metadata: true },
  });
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    // Start telemetry immediately so it runs concurrently with body parsing in
    // both paths. Invalid requests may fire this bounded query early — that is
    // an intentional tradeoff for simpler, more effective concurrency.
    const telemetryPromise = startTelemetryQuery(userId);
    // Guard against unhandled rejections on early 400 returns; the main path
    // still awaits and surfaces the error normally.
    void telemetryPromise.catch((err) => { console.warn('[feedback] Telemetry pre-fetch failed:', err); });

    const contentType = request.headers.get('content-type') || '';

    let type: 'voice' | 'text';
    let rawText: string;
    let audioUrl: string | null = null;
    let screenContext: string;
    let episodeId: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      // --- Voice feedback ---
      type = 'voice';
      const formData = (await request.formData()) as unknown as FormDataReader;
      screenContext = formData.get('screenContext') as string;
      episodeId = (formData.get('episodeId') as string) || null;

      const audioFile = formData.get('audioFile') as File | null;
      if (!audioFile || !screenContext) {
        return NextResponse.json(
          { error: 'audioFile and screenContext are required for voice feedback' },
          { status: 400 },
        );
      }

      // Upload and transcribe concurrently — both read from the same buffer
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const [uploadedUrl, transcription] = await Promise.all([
        isBlobStorageConfigured()
          ? uploadAudio(buffer, `feedback-${Date.now()}.webm`)
          : Promise.resolve(null),
        getOpenAI().audio.transcriptions.create({
          model: WHISPER_MODEL,
          file: new File([buffer], audioFile.name, { type: audioFile.type }),
        }),
      ]);
      audioUrl = uploadedUrl;
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

    // Await telemetry result (started concurrently with body parsing above)
    const recentTelemetry = await telemetryPromise;

    // Categorize with Claude (graceful failure — store raw feedback even if AI fails)
    let category: FeedbackCategory | null = null;
    let summary: string | null = null;
    let priority: FeedbackPriority | null = null;

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

    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 },
    );
  }
}
