import pdfParse from 'pdf-parse';
import type { ExtractionResult } from './types';

export async function extractPdf(buffer: Buffer, filename: string): Promise<ExtractionResult> {
  const parsed = await pdfParse(buffer);
  const text = parsed.text.trim();
  const wordCount = text === '' ? 0 : text.split(/\s+/).length;
  const title = parsed.info?.Title || filename.replace(/\.pdf$/i, '');
  const author = parsed.info?.Author || undefined;

  return {
    title,
    text,
    wordCount,
    ...(author ? { author } : {}),
  };
}