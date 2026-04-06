import type { TTSProvider, VoiceConfig } from './types';
import { ElevenLabsTTSProvider } from './elevenlabs';
import { GoogleCloudTTSProvider } from './google';
import { parseConversationScript } from '@/lib/utils/script-parser';
import { chunkText } from './chunk';
import { mapWithConcurrency } from '@/lib/utils/concurrency';

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

const GOOGLE_VOICE_MAP: Record<string, VoiceConfig> = {
  'Host A': { voice: 'en-US-Studio-M', instructions: '' }, // male, energetic
  'Host B': { voice: 'en-US-Studio-O', instructions: '' }, // female, thoughtful
};

const OPENAI_DEFAULT_VOICE: VoiceConfig = {
  voice: 'alloy',
  instructions: 'Clear, natural speaking voice.',
};

const ELEVENLABS_DEFAULT_VOICE: VoiceConfig = {
  voice: '21m00Tcm4TlvDq8ikWAM', // Rachel
  instructions: 'Clear, natural speaking voice.',
};

const GOOGLE_DEFAULT_VOICE: VoiceConfig = {
  voice: 'en-US-Studio-O',
  instructions: '',
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

  const isGoogle = provider instanceof GoogleCloudTTSProvider;
  const isElevenLabs = provider instanceof ElevenLabsTTSProvider;

  const voiceMap = isGoogle
    ? GOOGLE_VOICE_MAP
    : isElevenLabs
      ? ELEVENLABS_VOICE_MAP
      : OPENAI_VOICE_MAP;
  const defaultVoice = isGoogle
    ? GOOGLE_DEFAULT_VOICE
    : isElevenLabs
      ? ELEVENLABS_DEFAULT_VOICE
      : OPENAI_DEFAULT_VOICE;

  const usedVoices = new Set<string>();

  // Flatten all segments × chunks into an ordered task list for parallel dispatch.
  // Promise ordering in mapWithConcurrency preserves segment/chunk sequence.
  const tasks: Array<() => Promise<Buffer>> = [];
  for (const segment of segments) {
    const voiceConfig = voiceMap[segment.speaker] ?? defaultVoice;
    usedVoices.add(voiceConfig.voice);
    for (const part of chunkText(segment.text)) {
      tasks.push(() => provider.generateSpeech(part, voiceConfig));
    }
  }

  const buffers = await mapWithConcurrency(tasks);

  return { audio: Buffer.concat(buffers), voices: [...usedVoices] };
}
