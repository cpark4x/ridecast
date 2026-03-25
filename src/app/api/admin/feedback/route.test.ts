import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    getCurrentUserId: vi.fn().mockResolvedValue('admin_user_1'),
  };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    feedback: {
      findMany: vi.fn(),
    },
  },
}));

// --- Imports ---

import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { GET } from './route';

const mockFindMany = prisma.feedback.findMany as ReturnType<typeof vi.fn>;

describe('GET /api/admin/feedback', () => {
  const originalAdminIds = process.env.ADMIN_USER_IDS;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_USER_IDS = 'admin_user_1,admin_user_2';
    vi.mocked(getCurrentUserId).mockResolvedValue('admin_user_1');
    mockFindMany.mockResolvedValue([
      { id: 'fb-1', category: 'Bug', summary: 'Crash on load', status: 'new', priority: 'High' },
      { id: 'fb-2', category: 'Feature Request', summary: 'Add dark mode', status: 'new', priority: 'Low' },
    ]);
  });

  afterEach(() => {
    if (originalAdminIds !== undefined) {
      process.env.ADMIN_USER_IDS = originalAdminIds;
    } else {
      delete process.env.ADMIN_USER_IDS;
    }
  });

  it('returns feedback list for admin users', async () => {
    const request = new Request('http://localhost/api/admin/feedback');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.feedback).toHaveLength(2);
    expect(data.feedback[0].category).toBe('Bug');
  });

  it('filters by status query param', async () => {
    const request = new Request('http://localhost/api/admin/feedback?status=new');
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'new' }),
      }),
    );
  });

  it('filters by category query param (case-insensitive)', async () => {
    const request = new Request('http://localhost/api/admin/feedback?category=bug');
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { equals: 'bug', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('filters by since query param', async () => {
    const request = new Request('http://localhost/api/admin/feedback?since=2026-03-20');
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: new Date('2026-03-20') },
        }),
      }),
    );
  });

  it('combines multiple filter params', async () => {
    const request = new Request('http://localhost/api/admin/feedback?status=new&category=bug');
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'new',
          category: { equals: 'bug', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('returns results ordered by createdAt desc with limit of 50', async () => {
    const request = new Request('http://localhost/api/admin/feedback');
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
  });

  it('returns 403 for non-admin users', async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue('regular_user');

    const request = new Request('http://localhost/api/admin/feedback');
    const response = await GET(request);

    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('returns 401 for unauthenticated requests', async () => {
    vi.mocked(getCurrentUserId).mockRejectedValue(new AuthenticationError());

    const request = new Request('http://localhost/api/admin/feedback');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
