import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    content: {
      findUnique: vi.fn(),
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
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  it('analyzes content and generates a script', async () => {
    const contentRecord = {
      id: 'content-1',
      rawText: 'A long essay about technology and innovation...',
      wordCount: 10000,
    };

    mockFindUnique.mockResolvedValue(contentRecord);

    mockAnalyze.mockResolvedValue({
      contentType: 'essay',
      format: 'narrator',
      themes: ['technology', 'innovation', 'future'],
      summary: 'An essay exploring technology and its impact on society.',
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

  it('returns 500 when API key is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    mockFindUnique.mockResolvedValue({
      id: 'content-1',
      rawText: 'Some text',
      wordCount: 500,
    });

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 10 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('AI provider not configured');
  });
});