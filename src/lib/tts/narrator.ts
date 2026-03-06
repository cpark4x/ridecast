import { TTSProvider } from "./types";
import { ElevenLabsTTSProvider } from "./elevenlabs";
import { chunkText } from "./chunk";

const OPENAI_NARRATOR_VOICE = {
  voice: "alloy",
  instructions:
    "Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.",
};

const ELEVENLABS_NARRATOR_VOICE = {
  voice: "21m00Tcm4TlvDq8ikWAM", // Rachel — warm, natural female narrator
  instructions:
    "Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.",
};

export async function generateNarratorAudio(
  provider: TTSProvider,
  scriptText: string
): Promise<Buffer> {
  const voice =
    provider instanceof ElevenLabsTTSProvider
      ? ELEVENLABS_NARRATOR_VOICE
      : OPENAI_NARRATOR_VOICE;

  const chunks = chunkText(scriptText);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    buffers.push(await provider.generateSpeech(chunk, voice));
  }

  return Buffer.concat(buffers);
}
