/**
 * TTS Module Types
 * Contract: web/docs/modules/tts-contract.md
 */

export interface TTSConfig {
  voice: string; // Voice ID (e.g., "en-US-JennyNeural")
  speed: number; // 0.5 to 2.0
  pitch: number; // -50 to 50 Hz
  outputFormat: 'mp3' | 'wav';
}

export interface ConversionJob {
  id: string;
  contentId: string;
  text: string;
  config: TTSConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0 to 100
  audioUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface TTSChunk {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  duration?: number; // estimated duration in seconds
}

export interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  description: string;
}

export interface ConversionResult {
  audioUrl: string;
  duration: number; // in seconds
}
