import { OpenAITTSProvider } from "./openai";
import { ElevenLabsTTSProvider } from "./elevenlabs";
import type { TTSProvider } from "./types";

export function createTTSProvider(elevenLabsKey?: string): TTSProvider {
  const key = elevenLabsKey || process.env.ELEVENLABS_API_KEY;
  if (key) {
    return new ElevenLabsTTSProvider(key);
  }
  return new OpenAITTSProvider();
}
