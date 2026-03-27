import { extractTxt } from './txt';
import { extractPdf } from './pdf';
import { extractEpub } from './epub';
import { extractDocx } from './docx';
import type { ExtractionResult } from './types';

export { extractUrl } from './url';
export { extractTxt } from './txt';
export type { ExtractionResult } from './types';

export async function extractContent(
  input: Buffer | string,
  filename: string,
  sourceType: 'txt' | 'pdf' | 'epub' | 'docx',
): Promise<ExtractionResult> {
  switch (sourceType) {
    case 'txt': {
      const text = typeof input === 'string' ? input : input.toString('utf-8');
      return extractTxt(text, filename);
    }
    case 'pdf':
      return extractPdf(Buffer.isBuffer(input) ? input : Buffer.from(input), filename);
    case 'epub':
      return extractEpub(Buffer.isBuffer(input) ? input : Buffer.from(input), filename);
    case 'docx':
      return extractDocx(Buffer.isBuffer(input) ? input : Buffer.from(input), filename);
  }
}
