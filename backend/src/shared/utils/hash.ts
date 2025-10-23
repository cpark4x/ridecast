import crypto from 'crypto';
import { TTSConfig } from '../types';

/**
 * Generate SHA-256 hash for text content
 */
export function generateTextHash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Generate content hash for audio caching
 * Combines text content, voice ID, and TTS configuration
 */
export function generateContentHash(
  text: string,
  voiceId: string,
  config: TTSConfig
): string {
  const data = `${text}|${voiceId}|${config.speed}|${config.pitch}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate random token for password reset, email verification, etc.
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
