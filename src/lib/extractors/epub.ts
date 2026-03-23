import JSZip from 'jszip';
import type { ExtractionResult } from './types';

export async function extractEpub(buffer: Buffer, filename: string): Promise<ExtractionResult> {
  let zip: Awaited<ReturnType<typeof JSZip.loadAsync>>;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error('Could not read this EPUB. The file may be corrupted or use an unsupported format.');
  }

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
  const itemRegex = /<item\s+[^>]*\/?>/g;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(opfXml)) !== null) {
    const tag = itemMatch[0];
    const idMatch = tag.match(/id="([^"]+)"/);
    const hrefMatch = tag.match(/href="([^"]+)"/);
    if (idMatch && hrefMatch) {
      manifest[idMatch[1]] = hrefMatch[1];
    }
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

  // Decode numeric HTML entities (decimal &#8212; and hex &#x2014;)
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
  result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));

  // Decode named HTML entities
  const namedEntities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'",
    '&nbsp;': ' ', '&mdash;': '\u2014', '&ndash;': '\u2013',
    '&lsquo;': '\u2018', '&rsquo;': '\u2019', '&ldquo;': '\u201C', '&rdquo;': '\u201D',
    '&hellip;': '\u2026', '&copy;': '\u00A9', '&reg;': '\u00AE', '&trade;': '\u2122',
  };
  result = result.replace(/&[a-zA-Z]+;/g, (entity) => namedEntities[entity] ?? entity);

  // Normalize whitespace
  result = result.replace(/\s+/g, ' ');

  return result.trim();
}
