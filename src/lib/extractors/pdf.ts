import pdfParse from 'pdf-parse';
import type { ExtractionResult } from './types';

export async function extractPdf(buffer: Buffer, filename: string): Promise<ExtractionResult> {
  // pdf-parse / pdf.js mis-handles Node.js Buffer objects that have a non-zero
  // byteOffset into their underlying shared ArrayBuffer (common with pooled
  // allocations).  Wrapping in a fresh Uint8Array whose .buffer starts at
  // byte 0 avoids the "bad XRef entry" FormatError.
  const safeArray = new Uint8Array(buffer.length);
  buffer.copy(safeArray);

  let parsed: Awaited<ReturnType<typeof pdfParse>>;
  try {
    parsed = await pdfParse(safeArray as unknown as Buffer);
  } catch (err) {
    if (err instanceof Error && err.message.includes('encrypted')) {
      throw new Error('This PDF is password-protected. Please remove the password and try again.');
    }
    throw new Error('Could not read this PDF. The file may be corrupted or in an unsupported format.');
  }

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