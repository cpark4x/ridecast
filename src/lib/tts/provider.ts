import { OpenAITTSProvider } from "./openai";
import { ElevenLabsTTSProvider } from "./elevenlabs";
import type { TTSProvider } from "./types";

export function createTTSProvider(): TTSProvider {
  if (process.env.ELEVENLABS_API_KEY) {
    return new ElevenLabsTTSProvider();
  }
  return new OpenAITTSProvider();
}
