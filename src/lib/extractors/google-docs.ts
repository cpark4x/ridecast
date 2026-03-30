import type { ExtractionResult } from './types';

/**
 * Exports a publicly-shared Google Doc as plain text.
 * Only works for docs with "Anyone with the link can view" sharing.
 */
export async function extractGoogleDoc(url: string): Promise<ExtractionResult> {
  const match = url.match(/\/document\/d\/([-\w]+)/);
  if (!match) {
    throw new Error(
      'Invalid Google Docs URL. Expected: https://docs.google.com/document/d/DOCUMENT_ID/...',
    );
  }
  const docId = match[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  const response = await fetch(exportUrl, {
    headers: { 'User-Agent': 'Ridecast/1.0 (+https://ridecast.app)' },
    redirect: 'follow',
  });

  if (response.status === 403 || response.status === 401) {
    throw new Error(
      "This Google Doc is private. Change sharing to 'Anyone with the link can view' and try again.",
    );
  }
  if (!response.ok) {
    throw new Error(
      `Failed to export Google Doc (status ${response.status}). Ensure the document is publicly shared.`,
    );
  }

  const text = (await response.text()).trim();
  if (!text) throw new Error('Google Doc appears to be empty.');

  const title =
    text
      .split('\n')
      .find((l) => l.trim().length > 0)
      ?.slice(0, 120) ?? 'Google Doc';

  return {
    text,
    title,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}
