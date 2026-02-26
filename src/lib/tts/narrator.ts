import type { TTSProvider, VoiceConfig } from './types';

export const NARRATOR_VOICE: VoiceConfig = {
  voice: 'alloy',
  instructions:
    'Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.',
};

export async function generateNarratorAudio(
  provider: TTSProvider,
  scriptText: string,
): Promise<Buffer> {
  return provider.generateSpeech(scriptText, NARRATOR_VOICE);
}
