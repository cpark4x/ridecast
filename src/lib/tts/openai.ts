import OpenAI from "openai";
import { TTSProvider, VoiceConfig } from "./types";

export class OpenAITTSProvider implements TTSProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI();
  }

  async generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer> {
    const response = await this.client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: voice.voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
      input: text,
      instructions: voice.instructions,
      response_format: "mp3",
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}