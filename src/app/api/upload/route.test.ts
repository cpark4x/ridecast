import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    content: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock extractors
vi.mock('@/lib/extractors', () => ({
  extractContent: vi.fn(),
  extractUrl: vi.fn(),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
}));

// Mock subscription gate — pass-through in route tests (subscription logic tested separately)
vi.mock('@/lib/subscription', () => ({
  requireSubscription: vi.fn().mockResolvedValue(null),
}));

import { prisma } from '@/lib/db';
import { extractContent, extractUrl } from '@/lib/extractors';
import { getCurrentUserId } from '@/lib/auth';
import { POST } from './route';

const mockFindFirst = prisma.content.findFirst as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.content.findUnique as ReturnType<typeof vi.fn>;
const mockCreate = prisma.content.create as ReturnType<typeof vi.fn>;
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
