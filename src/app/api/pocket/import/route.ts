import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contentHash } from '@/lib/utils/hash';
import { getCurrentUserId } from '@/lib/auth';
import { requireSubscription } from '@/lib/subscription';

// Large files need more time than the default 10s
export const maxDuration = 60;

const BATCH_SIZE = 500;

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const gate = await requireSubscription(userId);
    if (gate) return gate;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formData: any = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const filename = file.name.toLowerCase();

    let items: ParsedItem[];
    if (filename.endsWith('.html') || filename.endsWith('.htm')) {
      items = parseHtml(text);
    } else if (filename.endsWith('.csv')) {
      items = parseCsv(text);
    } else {
      return NextResponse.json(
        { error: 'Unrecognized file format. Upload a .html or .csv Pocket export.' },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0 });
    }

    // Load all existing sourceUrls for this user in one query
    // to avoid per-item DB round trips
    const existingUrls = new Set(
      (await prisma.content.findMany({
        where: { userId, sourceUrl: { in: items.map((i) => i.url) } },
        select: { sourceUrl: true },
      })).map((r) => r.sourceUrl as string),
    );

    const newItems = items.filter((i) => !existingUrls.has(i.url));
    const skipped = items.length - newItems.length;

    // Batch createMany to handle 30K+ item files without timeout
    let imported = 0;
    for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
      const batch = newItems.slice(i, i + BATCH_SIZE);
      const result = await prisma.content.createMany({
        data: batch.map((item) => ({
          userId,
          title: item.title || item.url,
          rawText: '',
          wordCount: 0,
          sourceType: 'pocket',
          sourceUrl: item.url,
          contentHash: contentHash(userId + ':' + item.url),
        })),
        skipDuplicates: true, // guard against hash collisions within same batch
      });
      imported += result.count;
    }

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    console.error('Pocket import error:', error);
    return NextResponse.json({ error: 'Import failed.' }, { status: 500 });
  }
}

interface ParsedItem {
  url: string;
  title: string;
}

/**
 * Parse Pocket's Netscape Bookmark HTML export.
 * Format: <a href="URL" time_added="..." tags="...">Title</a>
 */
function parseHtml(html: string): ParsedItem[] {
  const results: ParsedItem[] = [];
  // Match <a> tags — Pocket export uses one per line, no nesting
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const url = match[1].trim();
    const title = match[2].trim();
    if (url.startsWith('http')) {
      results.push({ url, title: title || url });
    }
  }
  return results;
}

/**
 * Parse Pocket's CSV export.
 * Header row: title,url,time_added,tags,status
 * Values may be quoted with double-quotes.
 */
function parseCsv(csv: string): ParsedItem[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];

  // Detect column positions from header
  const header = parseCsvLine(lines[0]);
  const titleIdx = header.findIndex((h) => h.toLowerCase() === 'title');
  const urlIdx = header.findIndex((h) => h.toLowerCase() === 'url');

  if (urlIdx === -1) return [];

  const results: ParsedItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const url = cols[urlIdx]?.trim();
    if (!url || !url.startsWith('http')) continue;
    const title = titleIdx !== -1 ? (cols[titleIdx]?.trim() || url) : url;
    results.push({ url, title });
  }
  return results;
}

/** Minimal CSV line parser — handles double-quoted fields containing commas. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
