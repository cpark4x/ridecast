import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
}));

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    content: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

// Mock hash — deterministic
vi.mock('@/lib/utils/hash', () => ({
  contentHash: (input: string) => `hash:${input}`,
}));

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { POST } from './route';

const mockFindMany = prisma.content.findMany as ReturnType<typeof vi.fn>;
const mockCreateMany = prisma.content.createMany as ReturnType<typeof vi.fn>;

function createFormDataRequest(filename: string, content: string): Request {
  const file = {
    name: filename,
    text: async () => content,
  } as unknown as File;

  return {
    formData: async () => ({
      get: (key: string) => (key === 'file' ? file : null),
    }),
  } as unknown as Request;
}

function createEmptyFormDataRequest(): Request {
  return {
    formData: async () => ({
      get: () => null,
    }),
  } as unknown as Request;
}

describe('POST /api/pocket/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindMany.mockResolvedValue([]);
    mockCreateMany.mockResolvedValue({ count: 0 });
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- HTML parsing ---

  const POCKET_HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Pocket Export</TITLE>
<H1>Unread</H1>
<DL><p>
  <DT><A HREF="https://example.com/article-1" TIME_ADDED="1700000000" TAGS="tech">Article One</A>
  <DT><A HREF="https://example.com/article-2" TIME_ADDED="1700000001" TAGS="">Article Two</A>
  <DT><A HREF="https://example.com/article-3" TIME_ADDED="1700000002" TAGS="science,ai">Article Three</A>
</DL>`;

  it('parses HTML export and creates stub records', async () => {
    mockCreateMany.mockResolvedValue({ count: 3 });

    const request = createFormDataRequest('pocket-export.html', POCKET_HTML);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.imported).toBe(3);
    expect(data.skipped).toBe(0);

    const createCall = mockCreateMany.mock.calls[0][0];
    expect(createCall.data).toHaveLength(3);
    expect(createCall.data[0]).toMatchObject({
      userId: 'user_test123',
      title: 'Article One',
      rawText: '',
      wordCount: 0,
      sourceType: 'pocket',
      sourceUrl: 'https://example.com/article-1',
    });
    expect(createCall.skipDuplicates).toBe(true);
  });

  it('skips non-HTTP hrefs in HTML export', async () => {
    const html = `<DL>
  <DT><A HREF="javascript:void(0)">Bad Link</A>
  <DT><A HREF="ftp://files.example.com/doc.pdf">FTP Link</A>
  <DT><A HREF="https://example.com/good">Good Link</A>
</DL>`;
    mockCreateMany.mockResolvedValue({ count: 1 });

    const request = createFormDataRequest('export.html', html);
    const response = await POST(request);
    const data = await response.json();

    expect(data.imported).toBe(1);
    const createCall = mockCreateMany.mock.calls[0][0];
    expect(createCall.data).toHaveLength(1);
    expect(createCall.data[0].sourceUrl).toBe('https://example.com/good');
  });

  it('uses URL as title fallback when title is empty', async () => {
    const html = `<DL><DT><A HREF="https://example.com/no-title"></A></DL>`;
    mockCreateMany.mockResolvedValue({ count: 1 });

    const request = createFormDataRequest('export.html', html);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const createCall = mockCreateMany.mock.calls[0][0];
    expect(createCall.data[0].title).toBe('https://example.com/no-title');
  });

  it('accepts .htm extension', async () => {
    const html = `<DL><DT><A HREF="https://example.com/one">One</A></DL>`;
    mockCreateMany.mockResolvedValue({ count: 1 });

    const request = createFormDataRequest('export.htm', html);
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect((await response.json()).imported).toBe(1);
  });

  // --- CSV parsing ---

  const POCKET_CSV = `title,url,time_added,tags,status
"Article One",https://example.com/article-1,1700000000,"tech",unread
"Article Two",https://example.com/article-2,1700000001,,read
"Comma, In Title",https://example.com/article-3,1700000002,"science,ai",unread`;

  it('parses CSV export and creates stub records', async () => {
    mockCreateMany.mockResolvedValue({ count: 3 });

    const request = createFormDataRequest('pocket-export.csv', POCKET_CSV);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.imported).toBe(3);

    const createCall = mockCreateMany.mock.calls[0][0];
    expect(createCall.data).toHaveLength(3);
    // Quoted field with comma should be parsed correctly
    expect(createCall.data[2].title).toBe('Comma, In Title');
  });

  it('handles CSV with only header row (no data)', async () => {
    const csv = `title,url,time_added,tags,status`;
    const request = createFormDataRequest('empty.csv', csv);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.imported).toBe(0);
    expect(data.skipped).toBe(0);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it('returns empty result for CSV missing url column', async () => {
    const csv = `title,link,time_added\n"Article",https://example.com,1700000000`;
    const request = createFormDataRequest('bad.csv', csv);
    const response = await POST(request);
    const data = await response.json();

    expect(data.imported).toBe(0);
    expect(data.skipped).toBe(0);
  });

  it('skips non-HTTP rows in CSV', async () => {
    const csv = `title,url\n"Good",https://example.com/yes\n"Bad",ftp://files.com/no\n"Empty",`;
    mockCreateMany.mockResolvedValue({ count: 1 });

    const request = createFormDataRequest('export.csv', csv);
    const response = await POST(request);
    const data = await response.json();

    expect(data.imported).toBe(1);
  });

  it('handles CSV with Windows CRLF line endings', async () => {
    const csv = "title,url,time_added\r\n\"Article One\",https://example.com/one,1700000000\r\n\"Article Two\",https://example.com/two,1700000001";
    mockCreateMany.mockResolvedValue({ count: 2 });

    const request = createFormDataRequest('windows.csv', csv);
    const response = await POST(request);
    const data = await response.json();

    expect(data.imported).toBe(2);
  });

  // --- Deduplication ---

  it('skips already-imported URLs', async () => {
    mockFindMany.mockResolvedValue([
      { sourceUrl: 'https://example.com/article-1' },
      { sourceUrl: 'https://example.com/article-3' },
    ]);
    mockCreateMany.mockResolvedValue({ count: 1 });

    const request = createFormDataRequest('export.html', POCKET_HTML);
    const response = await POST(request);
    const data = await response.json();

    expect(data.imported).toBe(1);
    expect(data.skipped).toBe(2);

    const createCall = mockCreateMany.mock.calls[0][0];
    expect(createCall.data).toHaveLength(1);
    expect(createCall.data[0].sourceUrl).toBe('https://example.com/article-2');
  });

  it('skips all when every URL already exists', async () => {
    mockFindMany.mockResolvedValue([
      { sourceUrl: 'https://example.com/article-1' },
      { sourceUrl: 'https://example.com/article-2' },
      { sourceUrl: 'https://example.com/article-3' },
    ]);

    const request = createFormDataRequest('export.html', POCKET_HTML);
    const response = await POST(request);
    const data = await response.json();

    expect(data.imported).toBe(0);
    expect(data.skipped).toBe(3);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  // --- Empty file ---

  it('returns zero counts for empty HTML file', async () => {
    const request = createFormDataRequest('empty.html', '<html></html>');
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.imported).toBe(0);
    expect(data.skipped).toBe(0);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  // --- Error cases ---

  it('returns 400 when no file is provided', async () => {
    const request = createEmptyFormDataRequest();
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('No file');
  });

  it('returns 400 for unsupported file format', async () => {
    const request = createFormDataRequest('export.json', '{"items":[]}');
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Unrecognized file format');
  });

  it('returns 500 when createMany throws', async () => {
    const html = `<DL><DT><A HREF="https://example.com/one">One</A></DL>`;
    mockCreateMany.mockRejectedValue(new Error('DB connection lost'));

    const request = createFormDataRequest('export.html', html);
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Import failed.');
  });

  // --- Batching ---

  it('batches createMany calls for large imports', async () => {
    // Generate 1200 items — should produce 3 batches (500 + 500 + 200)
    const links = Array.from({ length: 1200 }, (_, i) =>
      `<DT><A HREF="https://example.com/${i}">Item ${i}</A>`
    ).join('\n');
    const html = `<DL>${links}</DL>`;

    mockCreateMany.mockResolvedValue({ count: 500 })
      .mockResolvedValueOnce({ count: 500 })
      .mockResolvedValueOnce({ count: 500 })
      .mockResolvedValueOnce({ count: 200 });

    const request = createFormDataRequest('big.html', html);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateMany).toHaveBeenCalledTimes(3);
    // First batch: 500 items
    expect(mockCreateMany.mock.calls[0][0].data).toHaveLength(500);
    // Second batch: 500 items
    expect(mockCreateMany.mock.calls[1][0].data).toHaveLength(500);
    // Third batch: 200 items
    expect(mockCreateMany.mock.calls[2][0].data).toHaveLength(200);
  });

});
