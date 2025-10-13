/**
 * TTS Converter - Main Entry Point
 * Converts text to audio using chunking and TTS service
 * Contract: web/docs/modules/tts-contract.md
 */

import { TTSConfig, ConversionResult, TTSChunk } from './types';
import { chunkText } from './chunker';
import { generateMockAudio } from './mock-tts';
import { generateSpeech } from './browser-speech';
import ePub from 'epubjs';

/**
 * Convert text to audio
 * @param text - Full text to convert
 * @param config - TTS configuration
 * @param onProgress - Optional progress callback (0-100)
 * @returns Promise with audio URL and duration
 */
export async function convertTextToAudio(
  text: string,
  config: TTSConfig,
  onProgress?: (progress: number) => void
): Promise<ConversionResult> {
  // Validate input
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  if (config.speed < 0.5 || config.speed > 2.0) {
    throw new Error('Speed must be between 0.5 and 2.0');
  }

  if (config.pitch < -50 || config.pitch > 50) {
    throw new Error('Pitch must be between -50 and 50');
  }

  // Chunk the text for optimal TTS processing
  const chunks = chunkText(text);

  // Process all chunks
  const chunkResults: Blob[] = [];
  let totalDuration = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    // Report progress for this chunk
    const chunkProgress = (i / chunks.length) * 100;
    if (onProgress) {
      onProgress(Math.floor(chunkProgress));
    }

    // Convert chunk to audio
    const result = await convertChunk(chunk, config);

    // Fetch the blob from the URL
    const response = await fetch(result.audioUrl);
    const blob = await response.blob();
    chunkResults.push(blob);
    totalDuration += result.duration;

    // Clean up chunk URL
    URL.revokeObjectURL(result.audioUrl);
  }

  // Report 100% progress
  if (onProgress) {
    onProgress(100);
  }

  // Combine all audio chunks into single file
  const combinedBlob = new Blob(chunkResults, {
    type: config.outputFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav',
  });

  const audioUrl = URL.createObjectURL(combinedBlob);

  return {
    audioUrl,
    duration: totalDuration,
  };
}

/**
 * Convert single chunk to audio
 */
async function convertChunk(chunk: TTSChunk, config: TTSConfig): Promise<ConversionResult> {
  // Note: Web Speech API cannot be recorded (outputs directly to speakers)
  // Using mock audio with tone until a real TTS backend is implemented
  // Options for real TTS: Google Cloud TTS, Amazon Polly, ElevenLabs, etc.
  return generateMockAudio(chunk.text, config);
}

/**
 * Extract text from uploaded file
 * @param file - File to extract text from (.txt, .epub, .pdf)
 * @returns Extracted text content
 */
export async function extractText(file: File): Promise<string> {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();

  switch (fileExtension) {
    case 'txt':
      return extractFromText(file);
    case 'epub':
      return extractFromEpub(file);
    case 'pdf':
      // TODO: Implement PDF extraction with pdf.js
      throw new Error('PDF extraction not yet implemented');
    default:
      throw new Error(`Unsupported file type: ${fileExtension}`);
  }
}

/**
 * Extract text from plain text file
 */
async function extractFromText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      resolve(text);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Extract text from EPUB file
 */
async function extractFromEpub(file: File): Promise<string> {
  try {
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load EPUB
    const book = ePub(arrayBuffer);
    await book.ready;

    // Get all spine items (chapters)
    const spine = await book.loaded.spine;
    const textChunks: string[] = [];

    // Extract text from each chapter
    // @ts-expect-error - epub.js types are incomplete
    for (const item of spine.items) {
      try {
        const doc = await book.load(item.href);

        // Extract text content from the document
        // @ts-expect-error - epub.js returns Document but types don't match
        const text = extractTextFromDocument(doc);
        if (text && text.trim()) {
          textChunks.push(text.trim());
        }
      } catch (error) {
        console.warn(`Failed to extract chapter ${item.href}:`, error);
        // Continue with other chapters even if one fails
      }
    }

    if (textChunks.length === 0) {
      throw new Error('No text content found in EPUB file');
    }

    // Join all chapters with double newline
    return textChunks.join('\n\n');
  } catch (error) {
    console.error('EPUB extraction error:', error);
    throw new Error(`Failed to extract text from EPUB: ${(error as Error).message}`);
  }
}

/**
 * Extract text from HTML/XML document
 */
function extractTextFromDocument(doc: Document | XMLDocument): string {
  // Remove script and style elements
  const scripts = doc.querySelectorAll('script, style');
  scripts.forEach((el) => el.remove());

  // Get text content
  const text = doc.body?.textContent || doc.documentElement?.textContent || '';

  // Clean up whitespace
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Validate file before processing
 * Security: Prevent malicious files
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_TYPES = ['text/plain', 'application/epub+zip', 'application/pdf'];

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'File size exceeds 50MB limit',
    };
  }

  if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(txt|epub|pdf)$/i)) {
    return {
      valid: false,
      error: 'File type not supported. Please upload .txt, .epub, or .pdf files',
    };
  }

  return { valid: true };
}
