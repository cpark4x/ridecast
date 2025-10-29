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
): Promise<ConversionJob> {
  const request = {
    contentId,
    voiceId,
    config: config || { speed: 1.0, pitch: 0 },
  };

  const response = await fetchAPI<ConversionJob>('/audio/convert', {
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
 * Poll conversion job until complete with exponential backoff
 * @param jobId - Job ID to poll
 * @param onProgress - Optional callback for progress updates
 * @returns Audio URL when complete
 */
export async function pollConversionJob(
  jobId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  let pollInterval = 1000; // Start at 1 second
  const maxPollInterval = 10000; // Cap at 10 seconds

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

    // Wait before polling again with exponential backoff
    await new Promise((resolve) => setTimeout(resolve, pollInterval));

    // Increase poll interval exponentially: 1s → 2s → 4s → 8s → 10s max
    pollInterval = Math.min(pollInterval * 2, maxPollInterval);
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
): Promise<string> {
  // Start conversion
  const job = await startConversion(contentId, voiceId, config);

  // If cache hit, return audio URL immediately
  if (job.status === 'completed' && job.audioUrl) {
    if (onProgress) onProgress(100);
    return job.audioUrl;
  }

  // Otherwise, poll for completion
  const audioUrl = await pollConversionJob(job.id, onProgress);
  return audioUrl;
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
