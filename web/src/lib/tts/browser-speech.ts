/**
 * Browser Speech API Implementation
 * Uses Web Speech API to generate real speech
 * Records the output using MediaRecorder
 */

import { TTSConfig, ConversionResult } from './types';

/**
 * Generate speech audio using browser's Web Speech API
 */
export async function generateSpeech(
  text: string,
  config: TTSConfig,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  if (!('speechSynthesis' in window)) {
    throw new Error('Text-to-speech is not supported in this browser');
  }

  // Wait for voices to load
  await waitForVoices();

  return new Promise((resolve, reject) => {
    try {
      // Create audio context for recording
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);

      // Find and set voice
      const voices = speechSynthesis.getVoices();
      const voice = voices.find(v => v.name === config.voice || v.voiceURI === config.voice);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.rate = config.speed;
      utterance.pitch = 1 + (config.pitch / 100);

      // Set up media recorder
      const chunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(destination.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Estimate duration (Web Speech doesn't provide it)
        const wordsPerMinute = 150 * config.speed;
        const wordCount = text.split(/\s+/).length;
        const duration = (wordCount / wordsPerMinute) * 60;

        if (onProgress) onProgress(100);

        audioContext.close();
        resolve({
          audioUrl,
          duration,
        });
      };

      // Progress tracking
      const startTime = Date.now();
      let progressInterval: NodeJS.Timeout | null = null;

      utterance.onstart = () => {
        mediaRecorder.start();

        if (onProgress) {
          const estimatedDuration = (text.split(/\s+/).length / (150 * config.speed)) * 60000;
          progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(95, (elapsed / estimatedDuration) * 100);
            onProgress(Math.floor(progress));
          }, 100);
        }
      };

      utterance.onend = () => {
        if (progressInterval) clearInterval(progressInterval);
        // Give it a moment to finish recording
        setTimeout(() => {
          mediaRecorder.stop();
        }, 100);
      };

      utterance.onerror = (event) => {
        if (progressInterval) clearInterval(progressInterval);
        audioContext.close();
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      };

      // Start speaking
      speechSynthesis.speak(utterance);

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Wait for voices to be loaded
 */
function waitForVoices(): Promise<void> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve();
      return;
    }

    speechSynthesis.onvoiceschanged = () => {
      resolve();
    };

    // Fallback timeout
    setTimeout(resolve, 1000);
  });
}
