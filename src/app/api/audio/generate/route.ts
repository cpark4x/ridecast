import { NextResponse } from 'next/server';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { parseBuffer } from 'music-metadata';
import { prisma } from '@/lib/db';
import { createTTSProvider } from '@/lib/tts/provider';
import { generateNarratorAudio } from '@/lib/tts/narrator';
import { generateConversationAudio } from '@/lib/tts/conversation';
import { WORDS_PER_MINUTE } from '@/lib/utils/duration';
import { uploadAudio, isBlobStorageConfigured } from '@/lib/storage/blob';
import { getCurrentUserId } from '@/lib/auth';
import { requireSubscription } from '@/lib/subscription';

// 3 minutes — conversation TTS stitches many segments
export const maxDuration = 180;

export async function POST(request: Request) {
  let script: Awaited<ReturnType<typeof prisma.script.findUnique>> | null = null;
  try {
    const userId = await getCurrentUserId();
    const gate = await requireSubscription(userId);
    if (gate) return gate;

    const body = await request.json();
    const { scriptId } = body;

    if (!scriptId) {
      return NextResponse.json(
        { error: 'Missing required field: scriptId', code: 'INVALID_INPUT' },
        { status: 400 },
      );
    }

    script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      return NextResponse.json(
        { error: 'Script not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    const existingAudio = await prisma.audio.findFirst({
      where: { scriptId },
    });

    if (existingAudio) {
      await prisma.content.update({
        where: { id: script.contentId },
        data: { pipelineStatus: 'ready' },
      });
      return NextResponse.json(existingAudio);
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'TTS provider not configured', code: 'TTS_FAILED' },
        { status: 500 },
      );
    }

    const userElevenLabsKey = request.headers.get('x-elevenlabs-key') ?? undefined;
    const provider = createTTSProvider(userElevenLabsKey);

    let audioBuffer: Buffer;
    let voices: string[];

    if (script.format === 'conversation') {
      const result = await generateConversationAudio(provider, script.scriptText);
      audioBuffer = result.audio;
      voices = result.voices;
    } else {
      audioBuffer = await generateNarratorAudio(provider, script.scriptText);
      voices = ['alloy'];
    }

    // Save audio — blob storage in production, local filesystem in dev
    let filePath: string;

    if (isBlobStorageConfigured()) {
      // Production: upload to Azure Blob Storage
      const filename = `${uuidv4()}.mp3`;
      filePath = await uploadAudio(audioBuffer, filename);
    } else {
      // Development fallback: local filesystem
      const { writeFile, mkdir } = await import('fs/promises');
      const filename = `${uuidv4()}.mp3`;
      const relativePath = `audio/${filename}`;
      const absolutePath = path.join(process.cwd(), 'public', relativePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, audioBuffer);
      filePath = relativePath;
    }

    // Measure real duration from audio metadata (music-metadata reads MP3 headers).
    // Falls back to word-count estimate if metadata parse fails.
    let durationSecs: number;
    try {
      const metadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
      const parsed = metadata.format.duration;
      if (parsed && parsed > 0) {
        durationSecs = Math.round(parsed);
      } else {
        throw new Error('No duration in metadata');
      }
    } catch {
      // Fallback: word-count estimate (more accurate than buffer-size estimate)
      const wordCount = script.scriptText.split(/\s+/).length;
      durationSecs = Math.round((wordCount / WORDS_PER_MINUTE) * 60);
      console.warn('[duration] music-metadata parse failed; falling back to word-count estimate');
    }

    // Log duration accuracy for calibration
    const targetSecs = script.targetDuration * 60;
    const deltaSecs = durationSecs - targetSecs;
    const deltaPct = Math.round((deltaSecs / targetSecs) * 100);
    console.log(
      `[duration] Measured: ${durationSecs}s actual vs ${targetSecs}s target ` +
      `(${deltaSecs > 0 ? '+' : ''}${deltaSecs}s / ${deltaPct > 0 ? '+' : ''}${deltaPct}%). ` +
      `Source: music-metadata. Script: ${script.actualWordCount ?? '?'} words.`
    );

    // Create Audio record in DB
    const audio = await prisma.audio.create({
      data: {
        scriptId,
        filePath,
        durationSecs,
        voices,
        ttsProvider: provider.providerId,
      },
    });

    await prisma.content.update({
      where: { id: script.contentId },
      data: { pipelineStatus: 'ready' },
    });

    return NextResponse.json(audio);
  } catch (error) {
    console.error('Audio generation error:', error);

    let message = 'Something went wrong generating audio.';
    let code: string = 'TTS_FAILED';
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        message = 'Audio service is busy. Please wait a moment and try again.';
        code = 'RATE_LIMITED';
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        message = 'Audio service is not configured properly. Check your API keys.';
        code = 'TTS_FAILED';
      }
    }

    if (script?.contentId) {
      await prisma.content.update({
        where: { id: script.contentId },
        data: { pipelineStatus: 'error', pipelineError: message },
      }).catch(() => {});
    }

    return NextResponse.json(
      { error: message, code },
      { status: 500 },
    );
  }
}
