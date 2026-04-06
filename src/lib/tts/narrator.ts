import { TTSProvider } from "./types";
import { ElevenLabsTTSProvider } from "./elevenlabs";
import { GoogleCloudTTSProvider } from "./google";
import { chunkText } from "./chunk";
import { mapWithConcurrency } from "@/lib/utils/concurrency";

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

const GOOGLE_NARRATOR_VOICE = {
  voice: "en-US-Studio-O", // warm, natural female narrator (same as NotebookLM)
  instructions: "", // Google uses voice name only, not instructions
};

export async function generateNarratorAudio(
  provider: TTSProvider,
  scriptText: string,
): Promise<Buffer> {
  const voice =
    provider instanceof GoogleCloudTTSProvider
      ? GOOGLE_NARRATOR_VOICE
      : provider instanceof ElevenLabsTTSProvider
        ? ELEVENLABS_NARRATOR_VOICE
        : OPENAI_NARRATOR_VOICE;

  const chunks = chunkText(scriptText);
  const buffers = await mapWithConcurrency(
    chunks.map((chunk) => () => provider.generateSpeech(chunk, voice)),
  );

  return Buffer.concat(buffers);
}
