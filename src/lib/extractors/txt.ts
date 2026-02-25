import type { ExtractionResult } from './types';

export function extractTxt(content: string, filename: string): ExtractionResult {
  const text = content.trim();
  const title = filename.replace(/\.txt$/, '');
  const wordCount = text === '' ? 0 : text.split(/\s+/).length;

  return {
    title,
    text,
    wordCount,
  };
}