/**
 * Audio API
 * TTS conversion and audio management
 */

import { fetchAPI } from './client';
import { Voice, ConversionJob, ConversionRequest, ConversionResponse } from './types';

/**
 * Get available TTS voices
 */
export async function getVoices(): Promise<Voice[]> {
  return fetchAPI<Voice[]>('/audio/voices');
}

/**
 * Start audio conversion job
 */
export async function startConversion(
  contentId: string,
  voiceId: string,
  config?: { speed?: number; pitch?: number }
): Promise<any> {
  const request = {
    contentId,
    voiceId,
    config: config || { speed: 1.0, pitch: 0 },
  };

  const response = await fetchAPI<any>('/audio/convert', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  // Backend returns the result directly (synchronous conversion)
  return response;
}

/**
 * Get conversion job status
 */
export async function getConversionStatus(jobId: string): Promise<ConversionJob> {
  return fetchAPI<ConversionJob>(`/audio/status/${jobId}`);
}

/**
 * Poll conversion job until complete
 * @param jobId - Job ID to poll
 * @param onProgress - Optional callback for progress updates
 * @param pollInterval - Polling interval in milliseconds (default 2000)
 * @returns Audio URL when complete
 */
export async function pollConversionJob(
  jobId: string,
  onProgress?: (progress: number) => void,
  pollInterval: number = 2000
): Promise<string> {
  while (true) {
    const status = await getConversionStatus(jobId);

    // Update progress callback
    if (onProgress) {
      onProgress(status.progress);
    }

    // Check if completed
    if (status.status === 'completed') {
      if (!status.audioUrl) {
        throw new Error('Conversion completed but no audio URL provided');
      }
      return status.audioUrl;
    }

    // Check if failed
    if (status.status === 'failed') {
      throw new Error(status.errorMessage || 'Audio conversion failed');
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}

/**
 * Convert content to audio (all-in-one function)
 * Starts conversion and polls until complete
 */
export async function convertToAudio(
  contentId: string,
  voiceId: string,
  config?: { speed?: number; pitch?: number },
  onProgress?: (progress: number) => void
): Promise<any> {
  // Start conversion
  const job = await startConversion(contentId, voiceId, config);

  // Since conversion is now synchronous, just return the job result
  return job;
}

/**
 * Download audio file from URL
 */
export async function downloadAudio(audioUrl: string): Promise<Blob> {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error('Failed to download audio file');
  }
  return response.blob();
}
