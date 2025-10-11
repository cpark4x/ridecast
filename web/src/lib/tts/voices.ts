/**
 * Voice Management
 * Provides available TTS voices
 * Contract: web/docs/modules/tts-contract.md - Conformance Criteria #7
 */

import { Voice } from './types';

// Mock neural voices for development
// In production, these would come from Azure Cognitive Services API
const MOCK_VOICES: Voice[] = [
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (Female, US)',
    language: 'en-US',
    gender: 'female',
    description: 'Friendly, warm American female voice',
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (Male, US)',
    language: 'en-US',
    gender: 'male',
    description: 'Professional, clear American male voice',
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia (Female, UK)',
    language: 'en-GB',
    gender: 'female',
    description: 'Sophisticated British female voice',
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan (Male, UK)',
    language: 'en-GB',
    gender: 'male',
    description: 'Authoritative British male voice',
  },
  {
    id: 'en-US-AriaNeural',
    name: 'Aria (Female, US)',
    language: 'en-US',
    gender: 'female',
    description: 'Expressive, energetic American female voice',
  },
  {
    id: 'en-US-DavisNeural',
    name: 'Davis (Male, US)',
    language: 'en-US',
    gender: 'male',
    description: 'Calm, reassuring American male voice',
  },
];

/**
 * Get all available TTS voices
 * @returns Promise resolving to array of Voice objects
 */
export async function getAvailableVoices(): Promise<Voice[]> {
  // In development/offline mode, return mock voices
  if (process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_AZURE_TTS_KEY) {
    return Promise.resolve(MOCK_VOICES);
  }

  // TODO: Production implementation would call Azure API
  // const response = await fetch('https://[region].tts.speech.microsoft.com/cognitiveservices/voices/list', {
  //   headers: {
  //     'Ocp-Apim-Subscription-Key': process.env.NEXT_PUBLIC_AZURE_TTS_KEY,
  //   },
  // });
  // return response.json();

  return Promise.resolve(MOCK_VOICES);
}

/**
 * Get default voice for quick start
 */
export function getDefaultVoice(): Voice {
  return MOCK_VOICES[0]; // Jenny
}

/**
 * Find voice by ID
 */
export async function getVoiceById(voiceId: string): Promise<Voice | null> {
  const voices = await getAvailableVoices();
  return voices.find((v) => v.id === voiceId) || null;
}
