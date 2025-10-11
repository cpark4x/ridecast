/**
 * Mock TTS Service for Development
 * Generates silent audio files for offline testing
 * Contract: web/docs/modules/tts-contract.md - Conformance Criteria #3
 */

import { TTSConfig, ConversionResult } from './types';
import { estimateDuration } from './chunker';

/**
 * Generate mock audio using Web Audio API
 * Creates a silent audio file with proper duration
 */
export async function generateMockAudio(
  text: string,
  config: TTSConfig,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  // Simulate processing time
  const duration = estimateDuration(text, config.speed);
  const processingTime = Math.min(duration * 100, 3000); // Max 3 seconds

  // Simulate progress
  if (onProgress) {
    for (let i = 0; i <= 100; i += 20) {
      await sleep(processingTime / 5);
      onProgress(i);
    }
  }

  // Generate silent audio file
  const audioBlob = await createSilentAudio(duration, config.outputFormat);
  const audioUrl = URL.createObjectURL(audioBlob);

  return {
    audioUrl,
    duration,
  };
}

/**
 * Create silent audio file using Web Audio API
 * @param duration - Duration in seconds
 * @param format - Output format (mp3 or wav)
 */
async function createSilentAudio(duration: number, format: 'mp3' | 'wav'): Promise<Blob> {
  // Create offline audio context
  const sampleRate = 44100;
  const numberOfChannels = 2; // Stereo
  const length = sampleRate * duration;

  const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);

  // Create silent buffer (all zeros)
  const buffer = offlineContext.createBuffer(numberOfChannels, length, sampleRate);

  // Optional: Add very low volume noise to make it a "valid" audio file
  for (let channel = 0; channel < numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      // Add tiny amount of noise so audio players recognize it
      channelData[i] = (Math.random() - 0.5) * 0.0001;
    }
  }

  // Create source and connect to destination
  const source = offlineContext.createBufferSource();
  source.buffer = buffer;
  source.connect(offlineContext.destination);
  source.start();

  // Render audio
  const renderedBuffer = await offlineContext.startRendering();

  // Convert to WAV blob
  const wav = audioBufferToWav(renderedBuffer);
  const blob = new Blob([wav], { type: format === 'wav' ? 'audio/wav' : 'audio/mpeg' });

  return blob;
}

/**
 * Convert AudioBuffer to WAV format
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // Write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return bufferArray;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
