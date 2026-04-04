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
import { createJsonRequest } from '../__tests__/test-utils';

const mockFindUnique = prisma.content.findUnique as ReturnType<typeof vi.fn>;
const mockScriptCreate = prisma.script.create as ReturnType<typeof vi.fn>;
const mockContentUpdate = prisma.content.update as ReturnType<typeof vi.fn>;

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

  const BASE_CONTENT = {
    id: 'content-1',
    rawText: 'Some content that is long enough to pass the minimum character guard check here.',
    wordCount: 5000,
    scripts: [],
  };

  const BASE_AI_ANALYSIS = {
    contentType: 'essay',
    format: 'narrator',
    themes: ['tech'],
    summary: 'A tech essay.',
    suggestedTitle: 'Tech Insights',
  };

  const BASE_SCRIPT_RESULT = {
    text: 'word '.repeat(720),
    wordCount: 720,
    format: 'narrator',
  };

  function mockStandardAiRun() {
    mockFindUnique.mockResolvedValue(BASE_CONTENT);
    mockContentUpdate.mockResolvedValue({});
    mockAnalyze.mockResolvedValue(BASE_AI_ANALYSIS);
    mockGenerateScript.mockResolvedValue(BASE_SCRIPT_RESULT);
    mockScriptCreate.mockResolvedValue({ id: 'script-1' });
  }

  it('analyzes content and generates a script', async () => {
    const contentRecord = {
      id: 'content-1',
      rawText: 'A long essay about technology and innovation in the modern era.',
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

    // Verify pipelineStatus is set to 'scripting' before AI work begins (ordering fix:
    // this update must happen AFTER the idempotency check, not before, so a retry that
    // finds an existing script never overwrites pipelineStatus with 'scripting').
    expect(mockContentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pipelineStatus: 'scripting' }),
      }),
    );
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
    mockFindUnique.mockResolvedValue(BASE_CONTENT);
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
    mockFindUnique.mockResolvedValue(BASE_CONTENT);
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
    mockFindUnique.mockResolvedValue(BASE_CONTENT);
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
    mockFindUnique.mockResolvedValue(BASE_CONTENT);
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
      rawText: 'Some text to read verbatim in full without any AI modification whatsoever.',
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

  it('verbatim mode returns existing script when duplicate duration requested (idempotent)', async () => {
    const existingScript = {
      id: 'script-existing',
      targetDuration: 5,
      format: 'verbatim',
      scriptText: 'Some content that is long enough to pass the minimum character guard check here.',
      actualWordCount: 3,
      compressionRatio: 1,
      contentType: null,
      themes: [],
      summary: null,
      durationAdvisory: null,
    };
    const contentRecord = {
      ...BASE_CONTENT,
      wordCount: 3,
      scripts: [existingScript],
    };

    mockFindUnique.mockResolvedValue(contentRecord);

    const request = createJsonRequest({
      contentId: 'content-1',
      targetMinutes: 5,
      format: 'verbatim',
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('script-existing');
    expect(mockScriptCreate).not.toHaveBeenCalled();
  });

  it('sets pipelineStatus to scripting at start of processing', async () => {
    mockStandardAiRun();

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    await POST(request);

    expect(mockContentUpdate).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        data: { pipelineStatus: 'scripting', pipelineError: null },
      })
    );
  });

  it('sets pipelineStatus to generating after successful script creation', async () => {
    mockStandardAiRun();

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    await POST(request);

    expect(mockContentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pipelineStatus: 'generating' }),
      })
    );
  });

  it('sets pipelineStatus to error when Claude throws', async () => {
    mockStandardAiRun();
    mockAnalyze.mockRejectedValue(new Error('rate limit exceeded 429'));

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(mockContentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          pipelineStatus: 'error',
          pipelineError: expect.stringContaining('busy'),
        }),
      })
    );
  });

  it('returns existing script idempotently when called again for same duration (AI mode)', async () => {
    const existingScript = {
      id: 'script-existing',
      targetDuration: 15,
      format: 'narrator',
      scriptText: 'word '.repeat(1500),
      actualWordCount: 1500,
      compressionRatio: 0.15,
      contentType: 'essay',
      themes: ['tech'],
      summary: 'A tech summary.',
      durationAdvisory: null,
    };
    const contentRecord = {
      ...BASE_CONTENT,
      wordCount: 10000,
      scripts: [existingScript],
    };

    mockFindUnique.mockResolvedValue(contentRecord);

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 15 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('script-existing');
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(mockScriptCreate).not.toHaveBeenCalled();
  });

  it('returns existing script when matching targetDuration exists (regardless of pipelineStatus)', async () => {
    const existingScript = {
      id: 'script-in-progress',
      targetDuration: 10,
      format: 'narrator',
      scriptText: 'word '.repeat(1200),
      actualWordCount: 1200,
      compressionRatio: 0.12,
      contentType: 'essay',
      themes: ['tech'],
      summary: 'A tech summary.',
      durationAdvisory: null,
    };
    const contentRecord = {
      ...BASE_CONTENT,
      wordCount: 10000,
      pipelineStatus: 'scripting',
      scripts: [existingScript],
    };

    mockFindUnique.mockResolvedValue(contentRecord);

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 10 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('script-in-progress');
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('returns 500 when API key is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;

    mockFindUnique.mockResolvedValue({
      id: 'content-1',
      rawText: 'Some text that is long enough to pass the content minimum character guard.',
      wordCount: 500,
      scripts: [],
    });

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 10 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('AI provider not configured');
  });

  it('recovery — pipelineStatus scripting + Script exists → returns Script, sets pipelineStatus to generating', async () => {
    // Simulates a dropped-connection recovery: the connection dropped while the script was
    // being generated, so pipelineStatus is stuck at 'scripting'. On retry the client
    // finds the completed script and the route must advance the status to 'generating'
    // so the client knows to proceed to audio generation.
    const existingScript = {
      id: 'script-recovering',
      targetDuration: 10,
      format: 'narrator',
      scriptText: 'word '.repeat(1200),
      actualWordCount: 1200,
      compressionRatio: 0.12,
      contentType: 'essay',
      themes: ['tech'],
      summary: 'A tech summary.',
      durationAdvisory: null,
    };
    const contentRecord = {
      ...BASE_CONTENT,
      wordCount: 10000,
      pipelineStatus: 'scripting',
      scripts: [existingScript],
    };

    mockFindUnique.mockResolvedValue(contentRecord);
    mockContentUpdate.mockResolvedValue({});

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 10 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('script-recovering');
    // Claude must NOT be called — we already have a script
    expect(mockAnalyze).not.toHaveBeenCalled();
    // Pipeline must advance to 'generating' so the client proceeds to audio generation
    expect(mockContentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pipelineStatus: 'generating', pipelineError: null }),
      }),
    );
    expect(mockContentUpdate).toHaveBeenCalledTimes(1);
  });

  it('recovery — pipelineStatus scripting + no Script exists → runs Claude, creates new Script', async () => {
    // Simulates the case where the connection dropped before scripting completed.
    // No script was persisted, so the route must run Claude and create a new one.
    const contentRecord = {
      ...BASE_CONTENT,
      wordCount: 10000,
      pipelineStatus: 'scripting',
      scripts: [],
    };

    mockFindUnique.mockResolvedValue(contentRecord);
    mockContentUpdate.mockResolvedValue({});
    mockAnalyze.mockResolvedValue(BASE_AI_ANALYSIS);
    mockGenerateScript.mockResolvedValue(BASE_SCRIPT_RESULT);
    mockScriptCreate.mockResolvedValue({ id: 'script-new' });

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    const response = await POST(request);

    expect(response.status).toBe(200);
    // Script didn't exist — Claude must be invoked to generate a new one
    expect(mockAnalyze).toHaveBeenCalled();
    expect(mockScriptCreate).toHaveBeenCalled();
  });
});
