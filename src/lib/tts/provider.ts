import { GoogleCloudTTSProvider } from "./google";
import { OpenAITTSProvider } from "./openai";
import { ElevenLabsTTSProvider } from "./elevenlabs";
import type { TTSProvider } from "./types";

function hasConfiguredValue(value?: string | null): value is string {
  return Boolean(value?.trim());
}

export const TTS_PROVIDER_NOT_CONFIGURED_MESSAGE = "TTS provider not configured";

export function createTTSProvider(elevenLabsKey?: string): TTSProvider {
  // 1. Google Cloud TTS — primary hosted provider (same voices as NotebookLM)
  if (
    hasConfiguredValue(process.env.GOOGLE_APPLICATION_CREDENTIALS) ||
    hasConfiguredValue(process.env.GOOGLE_CLOUD_PROJECT)
  ) {
    return new GoogleCloudTTSProvider();
  }
  // 2. ElevenLabs — BYOK premium option
  if (hasConfiguredValue(elevenLabsKey)) {
    return new ElevenLabsTTSProvider(elevenLabsKey.trim());
  }
  if (hasConfiguredValue(process.env.ELEVENLABS_API_KEY)) {
    return new ElevenLabsTTSProvider(process.env.ELEVENLABS_API_KEY.trim());
  }
  // 3. OpenAI — fallback
  if (!hasConfiguredValue(process.env.OPENAI_API_KEY)) {
    throw new Error(TTS_PROVIDER_NOT_CONFIGURED_MESSAGE);
  }
  return new OpenAITTSProvider();
}
