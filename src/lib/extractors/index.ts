import { extractTxt } from './txt';
import { extractPdf } from './pdf';
import { extractEpub } from './epub';
import type { ExtractionResult } from './types';

export { extractUrl } from './url';
export { extractTxt } from './txt';
export type { ExtractionResult } from './types';

export async function extractContent(
  input: Buffer | string,
  filename: string,
  sourceType: 'txt' | 'pdf' | 'epub',
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
  }
}
