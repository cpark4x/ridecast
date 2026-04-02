import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import type { TTSProvider, VoiceConfig } from "./types";
import { retryWithBackoff } from "@/lib/utils/retry";

export class GoogleCloudTTSProvider implements TTSProvider {
  readonly providerId = 'google';
  private client: TextToSpeechClient;

  constructor() {
    // Credentials auto-loaded from GOOGLE_APPLICATION_CREDENTIALS env var
    this.client = new TextToSpeechClient();
  }

  async generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer> {
    const [response] = await retryWithBackoff(() =>
      this.client.synthesizeSpeech({
        input: { text },
        voice: {
          name: voice.voice, // e.g. "en-US-Studio-O"
          languageCode: "en-US",
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 1.0,
        },
      }),
    );

    if (!response.audioContent) {
      throw new Error("Google Cloud TTS returned empty audio content");
    }

    return Buffer.from(response.audioContent as Uint8Array);
  }
}
