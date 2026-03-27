import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
}));

// Mock subscription gate — pass-through in route tests (subscription logic tested separately)
vi.mock('@/lib/subscription', () => ({
  requireSubscription: vi.fn().mockResolvedValue(null),
}));

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    content: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    script: {
      create: vi.fn(),
    },
  },
}));

const mockAnalyze = vi.fn();
const mockGenerateScript = vi.fn();

// Mock ClaudeProvider
vi.mock('@/lib/ai/claude', () => ({
  ClaudeProvider: class MockClaudeProvider {
    analyze = mockAnalyze;
    generateScript = mockGenerateScript;
  },
}));

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { POST } from './route';

const mockFindUnique = prisma.content.findUnique as ReturnType<typeof vi.fn>;
const mockScriptCreate = prisma.script.create as ReturnType<typeof vi.fn>;

function createJsonRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/process', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  it('analyzes content and generates a script', async () => {
    const contentRecord = {
      id: 'content-1',
      rawText: 'A long essay about technology and innovation...',
      wordCount: 10000,
      scripts: [],
    };

    mockFindUnique.mockResolvedValue(contentRecord);

    mockAnalyze.mockResolvedValue({
      contentType: 'essay',
      format: 'narrator',
      themes: ['technology', 'innovation', 'future'],
      summary: 'An essay exploring technology and its impact on society.',
      suggestedTitle: 'Technology and the Future of Innovation',
    });

    const scriptText = 'Welcome to this episode. ' + 'word '.repeat(1499);
    mockGenerateScript.mockResolvedValue({
      text: scriptText,
      wordCount: 1500,
      format: 'narrator',
    });

    const savedScript = {
      id: 'script-1',
      contentId: 'content-1',
      format: 'narrator',
      targetDuration: 15,
      actualWordCount: 1500,
      compressionRatio: 1500 / 10000,
      scriptText,
      contentType: 'essay',
      themes: ['technology', 'innovation', 'future'],
    };
    mockScriptCreate.mockResolvedValue(savedScript);

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 15 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.format).toBe('narrator');
    expect(data.scriptText).toContain('Welcome to this episode');
    expect(data.actualWordCount).toBe(1500);

    // Verify analyze was called with content text
    expect(mockAnalyze).toHaveBeenCalledWith(contentRecord.rawText);

    // Verify generateScript was called with correct config
    expect(mockGenerateScript).toHaveBeenCalledWith(contentRecord.rawText, {
      format: 'narrator',
      targetMinutes: 15,
      contentType: 'essay',
      themes: ['technology', 'innovation', 'future'],
    });

    // Verify script was saved with compression ratio
    expect(mockScriptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        compressionRatio: 1500 / 10000,
      }),
    });
  });

  it('returns 404 for unknown content', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = createJsonRequest({ contentId: 'nonexistent', targetMinutes: 15 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Content not found');
  });

  it('returns 400 when required params are missing', async () => {
    const request = createJsonRequest({ contentId: 'content-1' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Missing required fields');
  });

  it('includes durationAdvisory when generated word count is outside ±15% tolerance', async () => {
    // targetMinutes=5 → targetWords=750, ±15% → min=638
    // wordCount=600 is ~80% of target → advisory should say "shorter"
    const contentRecord = {
      id: 'content-1',
      rawText: 'Some text.',
      wordCount: 5000,
      scripts: [],
    };

    mockFindUnique.mockResolvedValue(contentRecord);
    mockAnalyze.mockResolvedValue({
      contentType: 'essay',
      format: 'narrator',
      themes: ['tech'],
      summary: 'A tech essay.',
      suggestedTitle: 'Exploring Modern Technology',
    });

    const shortText = Array(600).fill('word').join(' ');
    mockGenerateScript.mockResolvedValue({
      text: shortText,
      wordCount: 600,
      format: 'narrator',
    });

    const savedScript = {
      id: 'script-1',
      contentId: 'content-1',
      format: 'narrator',
      targetDuration: 5,
      actualWordCount: 600,
      compressionRatio: 0.12,
      scriptText: shortText,
      contentType: 'essay',
      themes: ['tech'],
    };
    mockScriptCreate.mockResolvedValue(savedScript);

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.durationAdvisory).toBeTruthy();
    expect(data.durationAdvisory).toContain('shorter');
  });

  it('does not include durationAdvisory when word count is within ±15%', async () => {
    const contentRecord = { id: 'content-1', rawText: 'Some text.', wordCount: 5000, scripts: [] };

    mockFindUnique.mockResolvedValue(contentRecord);
    mockAnalyze.mockResolvedValue({
      contentType: 'essay',
      format: 'narrator',
      themes: ['tech'],
      summary: 'A tech essay.',
      suggestedTitle: 'Exploring Modern Technology',
    });

    // 720 words for 5-min target (750 words): 720/750 = 96% — within ±15%
    const normalText = Array(720).fill('word').join(' ');
    mockGenerateScript.mockResolvedValue({
      text: normalText,
      wordCount: 720,
      format: 'narrator',
    });

    const savedScript = {
      id: 'script-2',
      contentId: 'content-1',
      format: 'narrator',
      targetDuration: 5,
      actualWordCount: 720,
      compressionRatio: 720 / 5000,
      scriptText: normalText,
      contentType: 'essay',
      themes: ['tech'],
    };
    mockScriptCreate.mockResolvedValue(savedScript);

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.durationAdvisory).toBeNull();
  });

  it('saves summary from AI analysis to the script record', async () => {
    const contentRecord = { id: 'content-1', rawText: 'Some text.', wordCount: 5000, scripts: [] };
    mockFindUnique.mockResolvedValue(contentRecord);
    mockAnalyze.mockResolvedValue({
      contentType: 'essay',
      format: 'narrator',
      themes: ['tech'],
      summary: 'A fascinating exploration of technology.',
      suggestedTitle: 'A Fascinating Look at Technology',
    });
    mockGenerateScript.mockResolvedValue({
      text: 'word '.repeat(720),
      wordCount: 720,
      format: 'narrator',
    });
    mockScriptCreate.mockResolvedValue({ id: 'script-1' });

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    await POST(request);

    expect(mockScriptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        summary: 'A fascinating exploration of technology.',
      }),
    });
  });

  it('saves null when analysis returns empty summary', async () => {
    const contentRecord = { id: 'content-1', rawText: 'Some text.', wordCount: 5000, scripts: [] };
    mockFindUnique.mockResolvedValue(contentRecord);
    mockAnalyze.mockResolvedValue({
      contentType: 'essay',
      format: 'narrator',
      themes: ['tech'],
      summary: '',
      suggestedTitle: 'Tech Insights',
    });
    mockGenerateScript.mockResolvedValue({
      text: 'word '.repeat(720),
      wordCount: 720,
      format: 'narrator',
    });
    mockScriptCreate.mockResolvedValue({ id: 'script-1' });

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    await POST(request);

    expect(mockScriptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        summary: null,
      }),
    });
  });

  it('verbatim mode skips AI and creates script directly from raw text', async () => {
    const contentRecord = {
      id: 'content-1',
      rawText: 'This is the original source text that should be read verbatim without any AI processing.',
      wordCount: 16,
      scripts: [],
    };

    mockFindUnique.mockResolvedValue(contentRecord);

    const savedScript = {
      id: 'script-v1',
      contentId: 'content-1',
      format: 'verbatim',
      targetDuration: 5,
      actualWordCount: 16,
      compressionRatio: 1,
      scriptText: contentRecord.rawText,
      contentType: null,
      themes: [],
      summary: null,
    };
    mockScriptCreate.mockResolvedValue(savedScript);

    const request = createJsonRequest({
      contentId: 'content-1',
      targetMinutes: 5,
      format: 'verbatim',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.format).toBe('verbatim');
    expect(data.scriptText).toBe(contentRecord.rawText);
    expect(data.compressionRatio).toBe(1);

    // AI should NOT have been called
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(mockGenerateScript).not.toHaveBeenCalled();

    // Script should be created with raw text
    expect(mockScriptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        format: 'verbatim',
        scriptText: contentRecord.rawText,
        actualWordCount: 16,
        compressionRatio: 1,
        contentType: null,
        themes: [],
        summary: null,
      }),
    });
  });

  it('verbatim mode does not require ANTHROPIC_API_KEY', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const contentRecord = {
      id: 'content-1',
      rawText: 'Some text to read verbatim.',
      wordCount: 6,
      scripts: [],
    };

    mockFindUnique.mockResolvedValue(contentRecord);
    mockScriptCreate.mockResolvedValue({
      id: 'script-v2',
      contentId: 'content-1',
      format: 'verbatim',
      targetDuration: 5,
      actualWordCount: 6,
      compressionRatio: 1,
      scriptText: contentRecord.rawText,
    });

    const request = createJsonRequest({
      contentId: 'content-1',
      targetMinutes: 5,
      format: 'verbatim',
    });
    const response = await POST(request);

    // Should succeed without API key since no AI is called
    expect(response.status).toBe(200);
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('verbatim mode still rejects duplicate duration', async () => {
    const contentRecord = {
      id: 'content-1',
      rawText: 'Some text.',
      wordCount: 3,
      scripts: [{ targetDuration: 5 }],
    };

    mockFindUnique.mockResolvedValue(contentRecord);

    const request = createJsonRequest({
      contentId: 'content-1',
      targetMinutes: 5,
      format: 'verbatim',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toContain('already have a 5-minute version');
  });

  it('returns 500 when API key is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    mockFindUnique.mockResolvedValue({
      id: 'content-1',
      rawText: 'Some text',
      wordCount: 500,
      scripts: [],
    });

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 10 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('AI provider not configured');
  });
});
