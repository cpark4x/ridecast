import JSZip from 'jszip';
import type { ExtractionResult } from './types';

export async function extractEpub(buffer: Buffer, filename: string): Promise<ExtractionResult> {
  const zip = await JSZip.loadAsync(buffer);

  // Parse container.xml to find OPF path
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) {
    throw new Error('Invalid EPUB: missing META-INF/container.xml');
  }
  const opfPathMatch = containerXml.match(/full-path="([^"]+)"/);
  if (!opfPathMatch) {
    throw new Error('Invalid EPUB: cannot find OPF path in container.xml');
  }
  const opfPath = opfPathMatch[1];
  const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

  // Parse OPF for metadata and spine
  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) {
    throw new Error(`Invalid EPUB: missing OPF file at ${opfPath}`);
  }

  // Extract metadata
  const titleMatch = opfXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
  const creatorMatch = opfXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/);
  const title = titleMatch ? titleMatch[1] : filename.replace(/\.epub$/, '');
  const author = creatorMatch ? creatorMatch[1] : undefined;

  // Build manifest map: id -> href
  const manifest: Record<string, string> = {};
  const itemRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*\/?>(?:<\/item>)?/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
    manifest[itemMatch[1]] = itemMatch[2];
  }

  // Get spine order
  const spineIds: string[] = [];
  const itemrefRegex = /<itemref\s+[^>]*idref="([^"]+)"[^>]*\/?>/g;
  let itemrefMatch;
  while ((itemrefMatch = itemrefRegex.exec(opfXml)) !== null) {
    spineIds.push(itemrefMatch[1]);
  }

  // Read content files in spine order and strip HTML
  const chapters: string[] = [];
  for (const id of spineIds) {
    const href = manifest[id];
    if (!href) continue;
    const filePath = opfDir + href;
    const content = await zip.file(filePath)?.async('string');
    if (!content) continue;
    chapters.push(stripHtml(content));
  }

  const text = chapters.join('\n\n').trim();
  const wordCount = text === '' ? 0 : text.split(/\s+/).length;

  return {
    title,
    text,
    wordCount,
    ...(author ? { author } : {}),
  };
}

function stripHtml(html: string): string {
  let result = html;

  // Remove script tags and their content
  result = result.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Remove style tags and their content
  result = result.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Remove all HTML tags
  result = result.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  result = result.replace(/&amp;/g, '&');
  result = result.replace(/&lt;/g, '<');
  result = result.replace(/&gt;/g, '>');
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&#39;/g, "'");
  result = result.replace(/&nbsp;/g, ' ');

  // Normalize whitespace
  result = result.replace(/\s+/g, ' ');

  return result.trim();
}
