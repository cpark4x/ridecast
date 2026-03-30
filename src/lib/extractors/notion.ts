import type { ExtractionResult } from './types';

/**
 * Notion API integration requires OAuth and is out of scope for v1.
 * This extractor throws a helpful user-facing message.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function extractNotion(_url: string): Promise<ExtractionResult> {
  throw new Error(
    'Notion pages require API integration which is not yet supported. ' +
      'Export your Notion page as PDF or Markdown: ' +
      'Notion → ⋯ → Export → PDF or Markdown & CSV, then upload that file.',
  );
}
