import type { TTSProvider, VoiceConfig } from './types';
import { parseConversationScript } from '@/lib/utils/script-parser';

const VOICE_MAP: Record<string, VoiceConfig> = {
  'Host A': {
    voice: 'echo',
    instructions:
      'Curious, energetic co-host. Speak with enthusiasm and natural curiosity. Ask follow-up questions naturally.',
  },
  'Host B': {
    voice: 'nova',
    instructions:
      'Thoughtful, knowledgeable expert. Speak with confidence and warmth. Explain concepts clearly with good pacing.',
  },
};

const DEFAULT_VOICE: VoiceConfig = {
  voice: 'alloy',
  instructions: 'Clear, natural speaking voice.',
};

export interface ConversationAudioResult {
  audio: Buffer;
  voices: string[];
}

export async function generateConversationAudio(
  provider: TTSProvider,
  scriptText: string,
): Promise<ConversationAudioResult> {
  const segments = parseConversationScript(scriptText);

  if (segments.length === 0) {
    return { audio: Buffer.alloc(0), voices: [] };
  }

  const usedVoices = new Set<string>();
  const chunks: Buffer[] = [];

  for (const segment of segments) {
    const voiceConfig = VOICE_MAP[segment.speaker] ?? DEFAULT_VOICE;
    usedVoices.add(voiceConfig.voice);
    chunks.push(await provider.generateSpeech(segment.text, voiceConfig));
  }

  return { audio: Buffer.concat(chunks), voices: [...usedVoices] };
}