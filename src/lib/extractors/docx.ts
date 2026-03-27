import mammoth from 'mammoth';
import type { ExtractionResult } from './types';

/**
 * Extract plain text from a .docx (or .doc) buffer using mammoth.
 * Images are silently dropped — we only need prose for TTS.
 */
export async function extractDocx(
  buffer: Buffer,
  filename: string,
): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  const wordCount = text === '' ? 0 : text.split(/\s+/).length;
  const title = filename.replace(/\.docx?$/i, '');

  return { title, text, wordCount };
}