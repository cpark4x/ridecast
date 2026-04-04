import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Hoisted mock refs (must be before any vi.mock calls) ---

const { mockUploadAudio, mockTranscriptionCreate } = vi.hoisted(() => {
  return {
    mockUploadAudio: vi.fn().mockResolvedValue('https://blob.example.com/feedback-123.webm'),
    mockTranscriptionCreate: vi.fn().mockResolvedValue({ text: 'Transcribed voice feedback' }),
  };
});

// --- Mocks (must be before imports) ---

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
  };
});

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
  uploadAudio: mockUploadAudio,
  isBlobStorageConfigured: vi.fn().mockReturnValue(true),
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    audio = {
      transcriptions: {
        create: mockTranscriptionCreate,
      },
    };
  },
}));

// --- Imports (after mocks) ---

import { prisma } from '@/lib/db';
import { getCurrentUserId, AuthenticationError } from '@/lib/auth';
import { categorizeFeedback } from '@/lib/ai/feedback';
import { POST } from './route';
import { createJsonRequest } from '../__tests__/test-utils';

const mockFeedbackCreate = prisma.feedback.create as ReturnType<typeof vi.fn>;
const mockTelemetryFindMany = prisma.telemetryEvent.findMany as ReturnType<typeof vi.fn>;

function createVoiceRequest(opts?: { screenContext?: string; episodeId?: string | null }): Request {
  const audioFile = new File([new ArrayBuffer(16)], 'recording.webm', { type: 'audio/webm' });
  const screenContext = opts?.screenContext ?? 'Player';
  const episodeId = opts?.episodeId ?? null;
  return {
    headers: new Headers({ 'content-type': 'multipart/form-data; boundary=test' }),
    formData: async () => ({
      get: (key: string) => {
        if (key === 'screenContext') return screenContext;
        if (key === 'audioFile') return audioFile;
        if (key === 'episodeId') return episodeId;
        return null;
      },
    }),
  } as unknown as Request;
}

function makeDeferredVoiceOps() {
  let resolveUpload!: (url: string) => void;
  let resolveTranscription!: (result: { text: string }) => void;
  const uploadPromise = new Promise<string>((resolve) => { resolveUpload = resolve; });
  const transcriptionPromise = new Promise<{ text: string }>((resolve) => { resolveTranscription = resolve; });
  return { uploadPromise, transcriptionPromise, resolveUpload, resolveTranscription };
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
    vi.mocked(categorizeFeedback).mockResolvedValue({
      category: 'Bug',
      summary: 'App crashes on library screen',
      priority: 'High',
      duplicateOf: null,
    });
    mockUploadAudio.mockResolvedValue('https://blob.example.com/feedback-123.webm');
    mockTranscriptionCreate.mockResolvedValue({ text: 'Transcribed voice feedback' });
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
    // Telemetry is started eagerly after auth (before body parsing) — a bounded
    // query on invalid requests is an intentional tradeoff for concurrency.

    const data = await response.json();
    expect(data.error).toContain('text and screenContext are required');
  });

  it('rejects text feedback when screenContext is missing', async () => {
    const request = createJsonRequest({ text: 'Some feedback' });

    const response = await POST(request);
    expect(response.status).toBe(400);
    // Telemetry is started eagerly after auth (before body parsing) — a bounded
    // query on invalid requests is an intentional tradeoff for concurrency.
  });

  it('telemetry query selects only the fields consumed by categorizeFeedback', async () => {
    const request = createJsonRequest({
      text: 'Something went wrong',
      screenContext: 'Library',
    });

    await POST(request);

    expect(mockTelemetryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { eventType: true, metadata: true },
      }),
    );
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
    const request = createVoiceRequest();

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
    vi.mocked(getCurrentUserId).mockRejectedValue(new AuthenticationError());

    const request = createJsonRequest({
      text: 'Test feedback',
      screenContext: 'Home',
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('starts telemetry lookup before upload and transcription resolve for voice feedback (regression: telemetry concurrency)', async () => {
    // Track the order in which async work is kicked off. Telemetry is started
    // immediately after getCurrentUserId resolves; upload/transcription are
    // started only after formData() + arrayBuffer() also resolve — so telemetry
    // must always appear first in the call order.
    const callOrder: string[] = [];
    const { uploadPromise, transcriptionPromise, resolveUpload, resolveTranscription } = makeDeferredVoiceOps();

    mockTelemetryFindMany.mockImplementationOnce(() => {
      callOrder.push('telemetry');
      return Promise.resolve([]);
    });
    mockUploadAudio.mockImplementationOnce(() => {
      callOrder.push('upload');
      return uploadPromise;
    });
    mockTranscriptionCreate.mockImplementationOnce(() => {
      callOrder.push('transcription');
      return transcriptionPromise;
    });

    const request = createVoiceRequest();

    const postPromise = POST(request);
    resolveUpload('https://blob.example.com/feedback-concurrent.webm');
    resolveTranscription({ text: 'Voice feedback transcribed concurrently' });
    const response = await postPromise;
    expect(response.status).toBe(200);

    // Telemetry must have been kicked off before upload/transcription were called
    expect(callOrder[0]).toBe('telemetry');
    expect(callOrder).toContain('upload');
    expect(callOrder).toContain('transcription');
  });

  it('starts telemetry lookup before JSON body parsing resolves for text feedback (regression: telemetry concurrency)', async () => {
    // Prove that the telemetry DB query is kicked off before request.json()
    // resolves. With the pre-fix implementation telemetry was only started
    // after validation passed (i.e., after json resolved + body was checked),
    // so callOrder[0] would never be 'telemetry' while json was still pending.
    // After the fix startTelemetryQuery fires right after getCurrentUserId()
    // resolves, so it must appear first regardless of when the body arrives.
    const callOrder: string[] = [];

    let resolveJson!: (body: Record<string, unknown>) => void;
    const jsonPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveJson = resolve;
    });

    mockTelemetryFindMany.mockImplementationOnce(() => {
      callOrder.push('telemetry');
      return Promise.resolve([]);
    });

    const deferredRequest = {
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockReturnValue(jsonPromise),
    } as unknown as Request;

    const postPromise = POST(deferredRequest);

    // Yield until getCurrentUserId() resolves and the handler's next
    // synchronous block runs (startTelemetryQuery + request.json() call).
    await Promise.resolve();
    await Promise.resolve();

    // Telemetry must be in flight even though the json body has not resolved.
    expect(callOrder).toContain('telemetry');
    expect(mockFeedbackCreate).not.toHaveBeenCalled(); // handler still suspended

    // Let the body resolve so the handler can complete.
    resolveJson({ text: 'Concurrent text feedback', screenContext: 'Library' });

    const response = await postPromise;
    expect(response.status).toBe(200);

    expect(callOrder[0]).toBe('telemetry');
  });

  it('does NOT return 500 when the telemetry query rejects (graceful degradation)', async () => {
    // The telemetry query is best-effort context for Claude.
    // A DB error must not bring down the user's feedback submission.
    mockTelemetryFindMany.mockRejectedValue(new Error('DB connection lost'));

    const request = createJsonRequest({
      text: 'Something is broken',
      screenContext: 'Home',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    // Feedback must still be stored even without telemetry context.
    expect(mockFeedbackCreate).toHaveBeenCalled();
    // categorizeFeedback receives an empty array, not a rejection.
    expect(categorizeFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ telemetryEvents: [] }),
    );
  });

  it('no unhandled rejection when telemetry rejects and request body is invalid (early-400 regression)', async () => {
    // Regression: the telemetry promise was created without an attached .catch(),
    // so if the route returned early (400) before reaching the later
    // `await telemetryPromise.catch(...)`, the rejection was unhandled and
    // console.warn was never called.
    // After the fix, .catch() is attached at creation time so the warning fires
    // even on early returns, and no unhandled rejection escapes.
    const rejections: unknown[] = [];
    const onUnhandled = (reason: unknown) => { rejections.push(reason); };
    process.on('unhandledRejection', onUnhandled);

    // Spy on console.warn: the .catch() must fire at creation time so the warning
    // appears even when the route returns 400 before reaching the later await.
    // This gives a reliable RED signal for the buggy code path in this environment.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      mockTelemetryFindMany.mockRejectedValue(new Error('DB error'));

      // Missing `text` triggers the early 400 return before the telemetry await.
      const request = createJsonRequest({ screenContext: 'Home' });
      const response = await POST(request);
      expect(response.status).toBe(400);

      // Wait one macrotask tick so any unhandled rejection has a chance to surface.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));

      // .catch() must fire at creation time so the warning appears even on early-400.
      expect(warnSpy).toHaveBeenCalledWith(
        '[feedback] Telemetry pre-fetch failed:',
        expect.any(Error),
      );
      expect(rejections).toHaveLength(0);
    } finally {
      process.off('unhandledRejection', onUnhandled);
      warnSpy.mockRestore();
    }
  });

  it('starts blob upload and transcription concurrently for voice feedback', async () => {
    // When uploadAudio is called (synchronously inside Promise.all), we fire a
    // signal. Since Promise.all evaluates all its arguments synchronously before
    // awaiting, transcriptions.create must also have been called by the time
    // that signal resolves — proving both were started in the same tick.
    let notifyUploadCalled!: () => void;
    const uploadCalledSignal = new Promise<void>((resolve) => { notifyUploadCalled = resolve; });
    const { uploadPromise, transcriptionPromise, resolveUpload, resolveTranscription } = makeDeferredVoiceOps();

    mockUploadAudio.mockImplementationOnce(() => {
      notifyUploadCalled();
      return uploadPromise;
    });
    mockTranscriptionCreate.mockReturnValueOnce(transcriptionPromise);

    const request = createVoiceRequest();

    const postPromise = POST(request);

    // Wait until the handler reaches Promise.all (signalled by uploadAudio being called).
    // At this point transcriptions.create must also have been called — it's in the
    // same synchronous Promise.all argument list.
    await uploadCalledSignal;
    expect(mockTranscriptionCreate).toHaveBeenCalledTimes(1);

    // Resolve both deferred operations and confirm the request completes
    resolveUpload('https://blob.example.com/feedback-concurrent.webm');
    resolveTranscription({ text: 'Voice feedback transcribed concurrently' });

    const response = await postPromise;
    expect(response.status).toBe(200);
  });
});
