import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/db';
import { OpenAITTSProvider } from '@/lib/tts/openai';
import { generateNarratorAudio } from '@/lib/tts/narrator';
import { generateConversationAudio } from '@/lib/tts/conversation';
import { WORDS_PER_MINUTE } from '@/lib/utils/duration';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scriptId } = body;

    if (!scriptId) {
      return NextResponse.json(
        { error: 'Missing required field: scriptId' },
        { status: 400 },
      );
    }

    const script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      return NextResponse.json(
        { error: 'Script not found' },
        { status: 404 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'TTS provider not configured' },
        { status: 500 },
      );
    }

    const provider = new OpenAITTSProvider();

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

    // Save MP3 to filesystem
    const filename = `${uuidv4()}.mp3`;
    const filePath = `audio/${filename}`;
    const absolutePath = path.join(process.cwd(), 'public', filePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, audioBuffer);

    // Estimate duration from file size. MP3 at 128kbps mono ≈ 16KB/sec.
    // Falls back to word-count estimate if file is unexpectedly small.
    const fileSizeBytes = audioBuffer.length;
    const durationFromFile = fileSizeBytes / 16000;
    const wordCount = script.scriptText.split(/\s+/).length;
    const durationFromWords = (wordCount / WORDS_PER_MINUTE) * 60;
    const durationSecs = durationFromFile > 10 ? Math.round(durationFromFile) : Math.round(durationFromWords);

    // Log duration accuracy for calibration
    const targetSecs = script.targetDuration * 60;
    const deltaSecs = durationSecs - targetSecs;
    const deltaPct = Math.round((deltaSecs / targetSecs) * 100);
    console.log(
      `[duration] Audio generated: ${durationSecs}s actual vs ${targetSecs}s target ` +
      `(${deltaSecs > 0 ? '+' : ''}${deltaSecs}s / ${deltaPct > 0 ? '+' : ''}${deltaPct}%). ` +
      `Script: ${wordCount} words at ${WORDS_PER_MINUTE} WPM assumption.`
    );

    // Create Audio record in DB
    const audio = await prisma.audio.create({
      data: {
        scriptId,
        filePath,
        durationSecs,
        voices,
        ttsProvider: 'openai',
      },
    });

    return NextResponse.json(audio);
  } catch (error) {
    console.error('Audio generation error:', error);

    let message = 'Something went wrong generating audio.';
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        message = 'Audio service is busy. Please wait a moment and try again.';
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        message = 'Audio service is not configured properly. Check your API keys.';
      }
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
