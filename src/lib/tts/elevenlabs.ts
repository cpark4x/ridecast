import { ElevenLabsClient } from "elevenlabs";
import type { TTSProvider, VoiceConfig } from "./types";
import { retryWithBackoff } from "@/lib/utils/retry";

export class ElevenLabsTTSProvider implements TTSProvider {
  private client: ElevenLabsClient;

  constructor(apiKey?: string) {
    this.client = new ElevenLabsClient({
      apiKey: apiKey || process.env.ELEVENLABS_API_KEY,
    });
  }

  async generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer> {
    const audioStream = await retryWithBackoff(() =>
      this.client.textToSpeech.convert(voice.voice, {
        text,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
      })
    );

    // ElevenLabs returns a ReadableStream — collect into Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
