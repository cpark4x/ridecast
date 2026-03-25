import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks (must be before imports) ---

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    feedback: {
      create: vi.fn(),
    },
    telemetryEvent: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/lib/ai/feedback', () => ({
  categorizeFeedback: vi.fn().mockResolvedValue({
    category: 'Bug',
    summary: 'App crashes on library screen',
    priority: 'High',
    duplicateOf: null,
  }),
}));

vi.mock('@/lib/storage/blob', () => ({
  uploadAudio: vi.fn().mockResolvedValue('https://blob.example.com/feedback-123.webm'),
  isBlobStorageConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    audio = {
      transcriptions: {
        create: vi.fn().mockResolvedValue({ text: 'Transcribed voice feedback' }),
      },
    };
  },
}));

// --- Imports (after mocks) ---

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { categorizeFeedback } from '@/lib/ai/feedback';
import { POST } from './route';

const mockFeedbackCreate = prisma.feedback.create as ReturnType<typeof vi.fn>;
const mockTelemetryFindMany = prisma.telemetryEvent.findMany as ReturnType<typeof vi.fn>;

function createJsonRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
    mockTelemetryFindMany.mockResolvedValue([]);
    mockFeedbackCreate.mockResolvedValue({
      id: 'fb-1',
      userId: 'user_test123',
      type: 'text',
      rawText: 'The app crashes',
      category: 'Bug',
      summary: 'App crashes on library screen',
      priority: 'High',
      status: 'new',
    });
  });

  it('creates text feedback and returns id, summary, category', async () => {
    const request = createJsonRequest({
      text: 'The app crashes when I open my library',
      screenContext: 'Library',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('fb-1');
    expect(data.summary).toBe('App crashes on library screen');
    expect(data.category).toBe('Bug');
  });

  it('stores feedback with correct user ID and status "new"', async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue('user_abc');

    const request = createJsonRequest({
      text: 'Something broke',
      screenContext: 'Home',
    });

    await POST(request);

    expect(mockFeedbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user_abc',
          type: 'text',
          status: 'new',
        }),
      }),
    );
  });

  it('rejects text feedback when text field is missing', async () => {
    const request = createJsonRequest({ screenContext: 'Home' });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('text and screenContext are required');
  });

  it('rejects text feedback when screenContext is missing', async () => {
    const request = createJsonRequest({ text: 'Some feedback' });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('passes recent telemetry events to categorization', async () => {
    const telemetry = [
      { id: 't-1', eventType: 'api_error', metadata: { status: 500 }, createdAt: new Date() },
    ];
    mockTelemetryFindMany.mockResolvedValue(telemetry);

    const request = createJsonRequest({
      text: 'Something went wrong',
      screenContext: 'Library',
    });

    await POST(request);

    expect(categorizeFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        telemetryEvents: telemetry,
      }),
    );
  });

  it('passes episodeId through to categorization and storage', async () => {
    const request = createJsonRequest({
      text: 'Narration sounds weird',
      screenContext: 'Player',
      episodeId: 'ep-42',
    });

    await POST(request);

    expect(categorizeFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ episodeId: 'ep-42' }),
    );
    expect(mockFeedbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ relatedEpisodeId: 'ep-42' }),
      }),
    );
  });

  it('handles voice feedback via FormData with audio transcription', async () => {
    const audioBlob = new Blob(['fake-audio-data'], { type: 'audio/webm' });
    const audioFile = Object.assign(audioBlob, {
      name: 'recording.webm',
      lastModified: Date.now(),
      arrayBuffer: async () => new ArrayBuffer(16),
    });

    const request = {
      headers: new Headers({ 'content-type': 'multipart/form-data; boundary=test' }),
      formData: async () => ({
        get: (key: string) => {
          if (key === 'screenContext') return 'Player';
          if (key === 'audioFile') return audioFile;
          if (key === 'episodeId') return null;
          return null;
        },
      }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockFeedbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'voice' }),
      }),
    );
  });

  it('stores feedback with null category when categorization fails', async () => {
    vi.mocked(categorizeFeedback).mockRejectedValue(new Error('Claude API down'));

    const request = createJsonRequest({
      text: 'Something is broken',
      screenContext: 'Home',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    expect(mockFeedbackCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: null,
          summary: null,
          priority: null,
        }),
      }),
    );
  });

  it('returns 401 for unauthenticated requests', async () => {
    vi.mocked(getCurrentUserId).mockRejectedValue(new Error('Unauthenticated'));

    const request = createJsonRequest({
      text: 'Test feedback',
      screenContext: 'Home',
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});