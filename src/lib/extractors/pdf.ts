import pdfParse from 'pdf-parse';
import type { ExtractionResult } from './types';

export async function extractPdf(buffer: Buffer, filename: string): Promise<ExtractionResult> {
  // pdf-parse / pdf.js mis-handles Node.js Buffer objects that have a non-zero
  // byteOffset into their underlying shared ArrayBuffer (common with pooled
  // allocations).  Wrapping in a fresh Uint8Array whose .buffer starts at
  // byte 0 avoids the "bad XRef entry" FormatError.
  const safeArray = new Uint8Array(buffer.length);
  buffer.copy(safeArray);
  const parsed = await pdfParse(safeArray as unknown as Buffer);
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