/**
 * Text Chunking for TTS
 * Splits long text into optimal chunks respecting sentence boundaries
 * Contract: web/docs/modules/tts-contract.md - Conformance Criteria #2
 */

import { TTSChunk } from './types';

const MAX_CHUNK_SIZE = 5000; // characters
const SENTENCE_ENDINGS = /[.!?]+[\s\n]/g;

/**
 * Split text into chunks that respect sentence boundaries
 * @param text - Full text to chunk
 * @param maxChunkSize - Maximum characters per chunk (default 5000)
 * @returns Array of TTSChunk objects
 */
export function chunkText(text: string, maxChunkSize: number = MAX_CHUNK_SIZE): TTSChunk[] {
  const chunks: TTSChunk[] = [];

  // Find all sentence boundaries
  const sentences: string[] = [];
  let lastIndex = 0;
  let match;

  // Reset regex state
  SENTENCE_ENDINGS.lastIndex = 0;

  while ((match = SENTENCE_ENDINGS.exec(text)) !== null) {
    const sentence = text.substring(lastIndex, match.index + match[0].length).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text as final sentence
  if (lastIndex < text.length) {
    const remaining = text.substring(lastIndex).trim();
    if (remaining) {
      sentences.push(remaining);
    }
  }

  // Group sentences into chunks
  let currentChunk = '';
  let currentStartIndex = 0;

  for (const sentence of sentences) {
    // If single sentence exceeds max, split it forcefully
    if (sentence.length > maxChunkSize) {
      // Save current chunk if any
      if (currentChunk) {
        chunks.push(createChunk(chunks.length, currentChunk, currentStartIndex, currentStartIndex + currentChunk.length));
        currentStartIndex += currentChunk.length;
        currentChunk = '';
      }

      // Force-split long sentence at word boundaries
      const words = sentence.split(/\s+/);
      let forcedChunk = '';

      for (const word of words) {
        if ((forcedChunk + ' ' + word).length > maxChunkSize) {
          chunks.push(createChunk(chunks.length, forcedChunk.trim(), currentStartIndex, currentStartIndex + forcedChunk.length));
          currentStartIndex += forcedChunk.length;
          forcedChunk = word;
        } else {
          forcedChunk += (forcedChunk ? ' ' : '') + word;
        }
      }

      if (forcedChunk) {
        chunks.push(createChunk(chunks.length, forcedChunk.trim(), currentStartIndex, currentStartIndex + forcedChunk.length));
        currentStartIndex += forcedChunk.length;
      }
      continue;
    }

    // Check if adding this sentence exceeds limit
    const testChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

    if (testChunk.length > maxChunkSize && currentChunk) {
      // Save current chunk and start new one
      chunks.push(createChunk(chunks.length, currentChunk.trim(), currentStartIndex, currentStartIndex + currentChunk.length));
      currentStartIndex += currentChunk.length;
      currentChunk = sentence;
    } else {
      // Add sentence to current chunk
      currentChunk = testChunk;
    }
  }

  // Add final chunk
  if (currentChunk) {
    chunks.push(createChunk(chunks.length, currentChunk.trim(), currentStartIndex, currentStartIndex + currentChunk.length));
  }

  return chunks;
}

function createChunk(index: number, text: string, startIndex: number, endIndex: number): TTSChunk {
  return {
    id: `chunk-${index}`,
    text,
    startIndex,
    endIndex,
    duration: estimateChunkDuration(text, 1.0), // Default speed
  };
}

/**
 * Estimate audio duration from text
 * Average speaking rate: ~150 words per minute
 */
export function estimateDuration(text: string, speed: number = 1.0): number {
  const words = text.split(/\s+/).length;
  const wordsPerMinute = 150 * speed;
  const minutes = words / wordsPerMinute;
  return Math.ceil(minutes * 60); // Return seconds
}

function estimateChunkDuration(text: string, speed: number): number {
  return estimateDuration(text, speed);
}
