import type { TTSProvider, VoiceConfig } from './types';
import { ElevenLabsTTSProvider } from './elevenlabs';
import { parseConversationScript } from '@/lib/utils/script-parser';
import { chunkText } from './chunk';

const OPENAI_VOICE_MAP: Record<string, VoiceConfig> = {
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

const ELEVENLABS_VOICE_MAP: Record<string, VoiceConfig> = {
  'Host A': {
    voice: 'pNInz6obpgDQGcFmaJgB', // Adam — energetic, curious
    instructions:
      'Energetic, curious podcast host. Ask questions with genuine interest.',
  },
  'Host B': {
    voice: '21m00Tcm4TlvDq8ikWAM', // Rachel — thoughtful, expert
    instructions:
      'Thoughtful, expert podcast host. Give clear, insightful answers.',
  },
};

const OPENAI_DEFAULT_VOICE: VoiceConfig = {
  voice: 'alloy',
  instructions: 'Clear, natural speaking voice.',
};

const ELEVENLABS_DEFAULT_VOICE: VoiceConfig = {
  voice: '21m00Tcm4TlvDq8ikWAM', // Rachel
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

  const isElevenLabs = provider instanceof ElevenLabsTTSProvider;
  const voiceMap = isElevenLabs ? ELEVENLABS_VOICE_MAP : OPENAI_VOICE_MAP;
  const defaultVoice = isElevenLabs ? ELEVENLABS_DEFAULT_VOICE : OPENAI_DEFAULT_VOICE;

  const usedVoices = new Set<string>();
  const chunks: Buffer[] = [];

  for (const segment of segments) {
    const voiceConfig = voiceMap[segment.speaker] ?? defaultVoice;
    usedVoices.add(voiceConfig.voice);
    // Split long speaker segments to stay within TTS input limits.
    for (const part of chunkText(segment.text)) {
      chunks.push(await provider.generateSpeech(part, voiceConfig));
    }
  }

  return { audio: Buffer.concat(chunks), voices: [...usedVoices] };
}
