import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import logger from '../shared/utils/logger';

export interface AzureTTSConfig {
  key: string;
  region: string;
}

export function getAzureTTSConfig(): AzureTTSConfig {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'eastus';

  if (!key) {
    logger.error('AZURE_SPEECH_KEY not configured');
    throw new Error('Azure TTS configuration missing');
  }

  return { key, region };
}

export function createSpeechConfig(): sdk.SpeechConfig {
  const { key, region } = getAzureTTSConfig();
  const config = sdk.SpeechConfig.fromSubscription(key, region);

  // Set default output format
  config.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  return config;
}

export const AVAILABLE_VOICES = [
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (Female, US)',
    locale: 'en-US',
    gender: 'Female' as const
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (Male, US)',
    locale: 'en-US',
    gender: 'Male' as const
  },
  {
    id: 'en-US-AriaNeural',
    name: 'Aria (Female, US)',
    locale: 'en-US',
    gender: 'Female' as const
  },
  {
    id: 'en-US-DavisNeural',
    name: 'Davis (Male, US)',
    locale: 'en-US',
    gender: 'Male' as const
  },
  {
    id: 'en-GB-SoniaNeural',
    name: 'Sonia (Female, UK)',
    locale: 'en-GB',
    gender: 'Female' as const
  },
  {
    id: 'en-GB-RyanNeural',
    name: 'Ryan (Male, UK)',
    locale: 'en-GB',
    gender: 'Male' as const
  }
];
