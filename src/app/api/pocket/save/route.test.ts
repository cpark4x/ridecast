import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
}));

// Mock subscription gate — pass-through
vi.mock('@/lib/subscription', () => ({
  requireSubscription: vi.fn().mockResolvedValue(null),
}));

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    content: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  isUniqueConstraintViolation: (error: unknown) =>
    typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002',
}));

// Mock hash — deterministic
vi.mock('@/lib/utils/hash', () => ({
  contentHash: (input: string) => `hash:${input}`,
}));

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { requireSubscription } from '@/lib/subscription';
import { POST } from './route';
import { createJsonRequest } from '../../__tests__/test-utils';

const mockFindFirst = prisma.content.findFirst as ReturnType<typeof vi.fn>;
const mockCreate = prisma.content.create as ReturnType<typeof vi.fn>;

describe('POST /api/pocket/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: 'content-new',
      title: 'Example Article',
      sourceUrl: 'https://example.com/article',
    });
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
    vi.mocked(requireSubscription).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves a new URL as a stub record', async () => {
    const request = createJsonRequest({
      url: 'https://example.com/article',
      title: 'Example Article',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('content-new');
    expect(data.alreadySaved).toBe(false);

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_test123',
        title: 'Example Article',
        rawText: '',
        wordCount: 0,
        sourceType: 'pocket',
        sourceUrl: 'https://example.com/article',
      }),
    });
  });

  it('uses URL as title when title is not provided', async () => {
    const request = createJsonRequest({ url: 'https://example.com/no-title' });
    await POST(request);

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.title).toBe('https://example.com/no-title');
  });

  it('trims whitespace from title', async () => {
    const request = createJsonRequest({
      url: 'https://example.com/article',
      title: '  Spaces Around  ',
    });
    await POST(request);

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.title).toBe('Spaces Around');
  });

  it('uses URL as title when title is only whitespace', async () => {
    const request = createJsonRequest({
      url: 'https://example.com/article',
      title: '   ',
    });
    await POST(request);

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.title).toBe('https://example.com/article');
  });

  // --- Dedup ---

  it('returns alreadySaved when URL exists for this user', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'content-existing',
      title: 'Already Saved',
    });

    const request = createJsonRequest({ url: 'https://example.com/article' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('content-existing');
    expect(data.alreadySaved).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('handles P2002 unique constraint race gracefully', async () => {
    // First findFirst returns null (no existing), then create races
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'content-winner', title: 'Winner' });

    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockCreate.mockRejectedValue(p2002);

    const request = createJsonRequest({ url: 'https://example.com/article' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('content-winner');
    expect(data.alreadySaved).toBe(true);
  });

  it('rethrows when P2002 race but fallback findFirst returns null', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null); // winner was somehow deleted

    const p2002 = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    mockCreate.mockRejectedValue(p2002);

    const request = createJsonRequest({ url: 'https://example.com/article' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Failed to save.');
  });

  // --- Validation ---

  it('returns 400 when url is missing', async () => {
    const request = createJsonRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('url is required');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid URL', async () => {
    const request = createJsonRequest({ url: 'not-a-valid-url' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid URL');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- Error handling ---

  it('returns 500 when create throws non-P2002 error', async () => {
    mockCreate.mockRejectedValue(new Error('DB connection lost'));

    const request = createJsonRequest({ url: 'https://example.com/article' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Failed to save.');
  });

  // --- Auth / subscription ---

  it('returns subscription gate response when subscription required', async () => {
    const gateResponse = new Response(JSON.stringify({ error: 'Subscription required' }), {
      status: 402,
      headers: { 'Content-Type': 'application/json' },
    });
    vi.mocked(requireSubscription).mockResolvedValue(gateResponse);

    const request = createJsonRequest({ url: 'https://example.com/article' });
    const response = await POST(request);

    expect(response.status).toBe(402);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
