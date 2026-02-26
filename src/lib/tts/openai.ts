import OpenAI from 'openai';
import type { TTSProvider, VoiceConfig } from './types';

type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export class OpenAITTSProvider implements TTSProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer> {
    const response = await this.client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: voice.voice as TTSVoice,
      input: text,
      instructions: voice.instructions,
      response_format: 'mp3',
    });
    return Buffer.from(await response.arrayBuffer());
  }
}