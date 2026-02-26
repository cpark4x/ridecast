import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/db';
import { OpenAITTSProvider } from '@/lib/tts/openai';
import { generateNarratorAudio } from '@/lib/tts/narrator';
import { generateConversationAudio } from '@/lib/tts/conversation';

const WORDS_PER_MINUTE = 150;

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

    // Estimate duration from word count (150 wpm)
    const wordCount = script.scriptText.split(/\s+/).length;
    const durationSecs = (wordCount / WORDS_PER_MINUTE) * 60;

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
