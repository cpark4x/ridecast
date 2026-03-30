export type ContentType =
  | 'google-doc'
  | 'github'
  | 'notion'
  | 'docx'
  | 'markdown'
  | 'pdf'
  | 'epub'
  | 'txt'
  | 'url';

/**
 * Detects content type from a URL and/or filename.
 * URL takes precedence over filename for hosted content.
 */
export function detectContentType(url: string, filename: string): ContentType {
  const normalizedUrl = url.toLowerCase().trim();
  const normalizedFilename = filename.toLowerCase().trim();

  // URL-based detection (takes precedence)
  if (normalizedUrl.includes('docs.google.com/document')) return 'google-doc';
  if (normalizedUrl.includes('github.com'))               return 'github';
  if (
    normalizedUrl.includes('notion.so') ||
    normalizedUrl.includes('notion.site')
  )
    return 'notion';

  // Filename-based detection
  if (normalizedFilename.endsWith('.docx'))               return 'docx';
  if (
    normalizedFilename.endsWith('.md') ||
    normalizedFilename.endsWith('.markdown')
  )
    return 'markdown';
  if (normalizedFilename.endsWith('.pdf'))                return 'pdf';
  if (normalizedFilename.endsWith('.epub'))               return 'epub';
  if (normalizedFilename.endsWith('.txt'))                return 'txt';

  // Default: treat as webpage URL to scrape
  return 'url';
}
