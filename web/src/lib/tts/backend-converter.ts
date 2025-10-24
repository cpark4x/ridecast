/**
 * Backend TTS Converter
 * Converts text to audio using the backend API
 */

import * as audioApi from '@/lib/api/audio';
import { isOnline } from '@/lib/sync';

/**
 * Convert content to audio using backend API
 * @param contentId - Backend content ID
 * @param voiceId - Voice ID from backend
 * @param onProgress - Progress callback (0-100)
 * @returns Audio blob and duration
 */
export async function convertWithBackend(
  contentId: string,
  voiceId: string,
  speed: number = 1.0,
  pitch: number = 0,
  onProgress?: (progress: number) => void
): Promise<{ audioBlob: Blob; duration: number }> {
  if (!isOnline()) {
    throw new Error('Backend conversion requires internet connection');
  }

  // Start conversion and poll for completion
  const audioUrl = await audioApi.convertToAudio(
    contentId,
    voiceId,
    { speed, pitch },
    onProgress
  );

  // Download audio file
  const audioBlob = await audioApi.downloadAudio(audioUrl);

  // Get duration from audio blob
  const duration = await getAudioDuration(audioBlob);

  return { audioBlob, duration };
}

/**
 * Get audio duration from blob
 */
async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    };

    audio.src = url;
  });
}

/**
 * Check if backend TTS is available
 */
export function isBackendAvailable(): boolean {
  return isOnline();
}
