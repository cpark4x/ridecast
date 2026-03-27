import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    content: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock extractors
vi.mock('@/lib/extractors', () => ({
  extractContent: vi.fn(),
  extractUrl: vi.fn(),
}));

// Mock auth
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
  };
});

// Mock subscription gate — pass-through in route tests (subscription logic tested separately)
vi.mock('@/lib/subscription', () => ({
  requireSubscription: vi.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/db';
import { extractContent, extractUrl } from '@/lib/extractors';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { POST } from './route';

const mockFindFirst = prisma.content.findFirst as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.content.findUnique as ReturnType<typeof vi.fn>;
const mockCreate = prisma.content.create as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.content.update as ReturnType<typeof vi.fn>;
const mockExtractContent = extractContent as ReturnType<typeof vi.fn>;
const mockExtractUrl = extractUrl as ReturnType<typeof vi.fn>;

function createMockFile(content: string, filename: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  return {
    name: filename,
    arrayBuffer: async () => bytes.buffer,
  };
}

function createMockRequest(fields: Record<string, unknown>): Request {
  return {
    formData: async () => ({
      get: (key: string) => fields[key] ?? null,
    }),
  } as unknown as Request;
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(null);
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
  });

  it('accepts TXT file upload via FormData, returns content record', async () => {
    const txtContent = 'The quick brown fox jumps over the lazy dog';
    const file = createMockFile(txtContent, 'test.txt');

    mockExtractContent.mockResolvedValue({
      title: 'test',
      text: txtContent,
      wordCount: 9,
    });

    const mockRecord = {
      id: 'test-id',
      title: 'test',
      wordCount: 9,
      sourceType: 'txt',
      contentHash: expect.any(String),
    };
    mockCreate.mockResolvedValue(mockRecord);

    const request = createMockRequest({ file });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe('test');
    expect(data.wordCount).toBe(9);
    expect(data.sourceType).toBe('txt');
  });

  it('accepts URL via FormData, returns sourceType url', async () => {
    mockExtractUrl.mockResolvedValue({
      title: 'Test Article',
      text: 'Article body content here',
      wordCount: 4,
    });

    const mockRecord = {
      id: 'url-id',
      title: 'Test Article',
      wordCount: 4,
      sourceType: 'url',
      contentHash: expect.any(String),
    };
    mockCreate.mockResolvedValue(mockRecord);

    const request = createMockRequest({ url: 'https://example.com/article' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sourceType).toBe('url');
  });

  it('rejects duplicate content with 409', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'existing-id',
      contentHash: 'abc123',
    });

    const file = createMockFile('duplicate content', 'dup.txt');

    mockExtractContent.mockResolvedValue({
      title: 'dup',
      text: 'duplicate content',
      wordCount: 2,
    });

    const request = createMockRequest({ file });
    const response = await POST(request);
    expect(response.status).toBe(409);
  });

  it('returns 401 for unauthenticated requests', async () => {
    vi.mocked(getCurrentUserId).mockRejectedValue(new AuthenticationError());

    const request = createMockRequest({ url: 'https://example.com/article' });
    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it('pocket stub: returns 422 with user-friendly message when extraction fails', async () => {
    // When a pocket stub exists and extractUrl throws, the new try/catch
    // returns 422 with a clear message instead of propagating to outer handler.
    mockFindFirst.mockResolvedValue({
      id: 'stub-1',
      userId: 'user_test123',
      sourceType: 'pocket',
      rawText: '',
      title: 'Saved Article',
    });

    mockExtractUrl.mockRejectedValue(new Error('Could not extract article content from URL'));

    const request = createMockRequest({ url: 'https://example.com/pocket-article' });
    const response = await POST(request);

    // extractUrl must have been called exactly once — no second attempt
    expect(mockExtractUrl).toHaveBeenCalledTimes(1);

    // The new try/catch returns 422 with specific message
    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBe("We couldn't extract content from this URL. Try pasting the article text directly.");
  });

  it('pocket stub: updates stub record and returns populated content when extraction succeeds', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'stub-1',
      userId: 'user_test123',
      sourceType: 'pocket',
      rawText: '',
      title: 'Saved Article',
    });

    mockExtractUrl.mockResolvedValue({
      title: 'Real Title',
      text: 'Full article body',
      wordCount: 3,
    });

    mockUpdate.mockResolvedValue({
      id: 'stub-1',
      title: 'Real Title',
      rawText: 'Full article body',
      sourceType: 'url',
    });

    const request = createMockRequest({ url: 'https://example.com/pocket-article' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockExtractUrl).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'stub-1' },
        data: expect.objectContaining({ sourceType: 'url' }),
      }),
    );
  });

  it('accepts PDF file upload, passes sourceType "pdf" to extractContent', async () => {
    const file = createMockFile('%PDF-1.4 fake pdf content', 'document.pdf');

    mockExtractContent.mockResolvedValue({
      title: 'My PDF',
      text: 'Extracted PDF text',
      wordCount: 3,
    });

    const mockRecord = {
      id: 'pdf-id',
      title: 'My PDF',
      wordCount: 3,
      sourceType: 'pdf',
      contentHash: expect.any(String),
    };
    mockCreate.mockResolvedValue(mockRecord);

    const request = createMockRequest({ file });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sourceType).toBe('pdf');
    expect(mockExtractContent).toHaveBeenCalledWith(
      expect.any(Buffer),
      'document.pdf',
      'pdf',
    );
  });

  it('accepts EPUB file upload, passes sourceType "epub" to extractContent', async () => {
    const file = createMockFile('PK fake epub content', 'book.epub');

    mockExtractContent.mockResolvedValue({
      title: 'My Book',
      text: 'Extracted EPUB text',
      wordCount: 3,
    });

    const mockRecord = {
      id: 'epub-id',
      title: 'My Book',
      wordCount: 3,
      sourceType: 'epub',
      contentHash: expect.any(String),
    };
    mockCreate.mockResolvedValue(mockRecord);

    const request = createMockRequest({ file });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sourceType).toBe('epub');
    expect(mockExtractContent).toHaveBeenCalledWith(
      expect.any(Buffer),
      'book.epub',
      'epub',
    );
  });

  it('associates uploaded content with authenticated user ID', async () => {
    vi.mocked(getCurrentUserId).mockResolvedValueOnce('user_abc');

    mockExtractContent.mockResolvedValue({
      title: 'test',
      text: 'some content',
      wordCount: 2,
    });

    const mockRecord = { id: 'rec-1', userId: 'user_abc', title: 'test' };
    mockCreate.mockResolvedValue(mockRecord);

    const file = createMockFile('some content', 'test.txt');
    const request = createMockRequest({ file });
    await POST(request);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user_abc' }),
      })
    );
  });
});
