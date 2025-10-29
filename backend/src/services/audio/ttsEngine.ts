import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { promises as fs } from 'fs';
import { createSpeechConfig } from '../../config/azure-tts';
import { TTSConfig } from '../../shared/types';
import logger from '../../shared/utils/logger';

export interface TTSOptions {
  voiceId: string;
  config: TTSConfig;
  outputPath: string;
}

/**
 * Convert text to speech using Azure Cognitive Services
 */
export async function convertTextToSpeech(
  text: string,
  options: TTSOptions
): Promise<{ audioPath: string; durationSeconds: number; fileSizeBytes: number }> {
  return new Promise((resolve, reject) => {
    try {
      const speechConfig = createSpeechConfig();
      speechConfig.speechSynthesisVoiceName = options.voiceId;

      // Configure audio output
      const audioConfig = sdk.AudioConfig.fromAudioFileOutput(options.outputPath);

      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

      // Build SSML with rate and pitch modifications
      const ssml = buildSSML(text, options.voiceId, options.config);

      logger.debug('Starting TTS conversion', {
        voiceId: options.voiceId,
        textLength: text.length
      });

      synthesizer.speakSsmlAsync(
        ssml,
        async (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            try {
              const stats = await fs.stat(options.outputPath);
              const durationSeconds = Math.round(result.audioDuration / 10000000); // Convert from 100-nanosecond units

              logger.info('TTS conversion completed', {
                durationSeconds,
                fileSizeBytes: stats.size
              });

              synthesizer.close();

              resolve({
                audioPath: options.outputPath,
                durationSeconds,
                fileSizeBytes: stats.size
              });
            } catch (error) {
              synthesizer.close();
              reject(error);
            }
          } else {
            const errorDetails = result.errorDetails;
            logger.error('TTS synthesis failed', { errorDetails });
            synthesizer.close();
            reject(new Error(`Speech synthesis failed: ${errorDetails}`));
          }
        },
        (error) => {
          logger.error('TTS synthesis error', { error });
          synthesizer.close();
          reject(error);
        }
      );
    } catch (error) {
      logger.error('TTS conversion error', { error });
      reject(error);
    }
  });
}

/**
 * Build SSML markup for Azure TTS
 */
function buildSSML(text: string, voiceId: string, config: TTSConfig): string {
  // Convert speed (0.5-2.0) to rate percentage
  const rate = ((config.speed - 1.0) * 100).toFixed(0);
  const rateStr = parseFloat(rate) >= 0 ? `+${rate}%` : `${rate}%`;

  // Convert pitch (-50 to +50) to Hz or percentage
  const pitchStr = config.pitch >= 0 ? `+${config.pitch}%` : `${config.pitch}%`;

  // Escape special XML characters in text
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
      <voice name="${voiceId}">
        <prosody rate="${rateStr}" pitch="${pitchStr}">
          ${escapedText}
        </prosody>
      </voice>
    </speak>
  `.trim();
}

/**
 * Chunk text into smaller segments for processing
 * Target: ~5 minutes of audio per chunk (800 words at 150 wpm = ~5.3 minutes)
 * Guarantees that no chunk exceeds wordsPerChunk words by splitting long sentences at word boundaries
 */
export function chunkText(text: string, wordsPerChunk: number = 800): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';
  let wordCount = 0;

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    const words = trimmedSentence.split(/\s+/);
    const sentenceWords = words.length;

    // If adding this sentence would exceed the limit AND we have content, start a new chunk
    if (wordCount + sentenceWords > wordsPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
      wordCount = 0;
    }

    // If the sentence itself exceeds the limit, split it at word boundaries
    if (sentenceWords > wordsPerChunk) {
      let i = 0;
      while (i < words.length) {
        const remainingSpace = wordsPerChunk - wordCount;
        const wordsToTake = Math.min(remainingSpace, words.length - i);
        const chunk = words.slice(i, i + wordsToTake).join(' ');

        currentChunk += (currentChunk.length > 0 ? ' ' : '') + chunk;
        wordCount += wordsToTake;
        i += wordsToTake;

        // If we've filled the current chunk, push it and start a new one
        if (wordCount >= wordsPerChunk && i < words.length) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
          wordCount = 0;
        }
      }
    } else {
      // Normal case: sentence fits, add it to current chunk
      currentChunk += (currentChunk.length > 0 ? ' ' : '') + trimmedSentence;
      wordCount += sentenceWords;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
