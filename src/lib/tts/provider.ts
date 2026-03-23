import { GoogleCloudTTSProvider } from "./google";
import { OpenAITTSProvider } from "./openai";
import { ElevenLabsTTSProvider } from "./elevenlabs";
import type { TTSProvider } from "./types";

export function createTTSProvider(elevenLabsKey?: string): TTSProvider {
  // 1. Google Cloud TTS — primary hosted provider (same voices as NotebookLM)
  if (
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_CLOUD_PROJECT
  ) {
    return new GoogleCloudTTSProvider();
  }
  // 2. ElevenLabs — BYOK premium option
  const elKey = elevenLabsKey || process.env.ELEVENLABS_API_KEY;
  if (elKey) return new ElevenLabsTTSProvider(elKey);
  // 3. OpenAI — fallback
  return new OpenAITTSProvider();
}
