import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions so they're available when vi.mock factories run
const { mockWriteFile, mockMkdir, mockGenerateSpeech, mockParseBuffer, DEFAULT_TTS_PROVIDER } = vi.hoisted(() => {
  const mockGenerateSpeech = vi.fn();
  return {
    mockWriteFile: vi.fn(),
    mockMkdir: vi.fn(),
    mockGenerateSpeech,
    mockParseBuffer: vi.fn(),
    DEFAULT_TTS_PROVIDER: { providerId: 'openai', generateSpeech: mockGenerateSpeech },
  };
});

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
}));

// Mock subscription gate — pass-through in route tests (subscription logic tested separately)
vi.mock('@/lib/subscription', () => ({
  requireSubscription: vi.fn().mockResolvedValue(null),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: { writeFile: mockWriteFile, mkdir: mockMkdir },
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
}));

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    script: {
      findUnique: vi.fn(),
    },
    audio: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    content: {
      update: vi.fn(),
    },
  },
}));

// Mock the TTS provider factory so we can inspect what key it's called with
// NOTE: default return value is set in beforeEach via mockReturnValue(DEFAULT_TTS_PROVIDER)
// to avoid a TDZ error from referencing the destructured const inside a hoisted factory.
vi.mock('@/lib/tts/provider', () => ({
  createTTSProvider: vi.fn(),
  TTS_PROVIDER_NOT_CONFIGURED_MESSAGE: 'TTS provider not configured',
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

// Mock music-metadata
vi.mock('music-metadata', () => ({
  parseBuffer: mockParseBuffer,
}));

import { prisma } from '@/lib/db';
import { createTTSProvider, TTS_PROVIDER_NOT_CONFIGURED_MESSAGE } from '@/lib/tts/provider';
import { getCurrentUserId } from '@/lib/auth';
import { POST } from './route';
import { createJsonRequest } from '../../__tests__/test-utils';

const mockFindUnique = prisma.script.findUnique as ReturnType<typeof vi.fn>;
const mockAudioCreate = prisma.audio.create as ReturnType<typeof vi.fn>;
const mockAudioFindFirst = prisma.audio.findFirst as ReturnType<typeof vi.fn>;
const mockContentUpdate = prisma.content.update as ReturnType<typeof vi.fn>;

describe('POST /api/audio/generate', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalElevenLabsKey = process.env.ELEVENLABS_API_KEY;
  const originalGoogleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const originalGoogleProject = process.env.GOOGLE_CLOUD_PROJECT;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    // Re-establish safe defaults for shared hoisted mocks.
    // vi.clearAllMocks() only clears call history — it does NOT reset implementations.
    // Without explicit resets, a test that sets mockGenerateSpeech.mockRejectedValue(...)
    // would leak that rejection into subsequent tests (causing order-dependent failures).
    mockFindUnique.mockResolvedValue(null);
    mockGenerateSpeech.mockResolvedValue(Buffer.from('fake-audio'));
    mockParseBuffer.mockResolvedValue({ format: { duration: 60 } });
    mockAudioCreate.mockResolvedValue({
      id: 'audio-default',
      scriptId: 'script-default',
      filePath: 'audio/default.mp3',
      durationSecs: 60,
      voices: ['alloy'],
      ttsProvider: 'openai',
    });
    // Re-establish the default provider in case a prior test overrides the mock implementation.
    vi.mocked(createTTSProvider).mockReturnValue(DEFAULT_TTS_PROVIDER);
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
    mockAudioFindFirst.mockResolvedValue(null);
    mockContentUpdate.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.ELEVENLABS_API_KEY = originalElevenLabsKey;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = originalGoogleCredentials;
    process.env.GOOGLE_CLOUD_PROJECT = originalGoogleProject;
  });

  const BASE_SCRIPT_RECORD = {
    id: 'script-1',
    contentId: 'content-1',
    format: 'narrator',
    scriptText: 'Hello world.',
    targetDuration: 5,
    actualWordCount: 2,
  };

  it('generates narrator audio and saves to filesystem', async () => {
    const scriptRecord = {
      id: 'script-1',
      format: 'narrator',
      scriptText: 'Welcome to this episode about technology. ' + 'word '.repeat(299),
      actualWordCount: 300,
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockGenerateSpeech.mockResolvedValue(Buffer.from('fake-mp3-data'));
    mockParseBuffer.mockResolvedValue({ format: { duration: 120 } });

    const audioRecord = {
      id: 'audio-1',
      scriptId: 'script-1',
      filePath: 'audio/test-uuid-1234.mp3',
      durationSecs: 120,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };
    mockAudioCreate.mockResolvedValue(audioRecord);

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.filePath).toMatch(/audio\/.+\.mp3$/);
    expect(data.ttsProvider).toBe('openai');
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('returns 400 when scriptId is missing', async () => {
    const request = createJsonRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('scriptId');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown script', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = createJsonRequest({ scriptId: 'nonexistent' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Script not found');
  });

  it('uses music-metadata parseBuffer to measure real audio duration', async () => {
    const scriptRecord = {
      id: 'script-1',
      format: 'narrator',
      scriptText: 'Test script content.',
      targetDuration: 5,
      actualWordCount: 3,
    };

    // parseBuffer returns a real duration of 287 seconds
    mockParseBuffer.mockResolvedValue({ format: { duration: 287.4 } });
    mockFindUnique.mockResolvedValue(scriptRecord);
    mockGenerateSpeech.mockResolvedValue(Buffer.alloc(100)); // tiny fake buffer

    const audioRecord = {
      id: 'audio-1',
      scriptId: 'script-1',
      filePath: 'audio/test-uuid-1234.mp3',
      durationSecs: 287,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };
    mockAudioCreate.mockResolvedValue(audioRecord);

    const request = createJsonRequest({ scriptId: 'script-1' });
    await POST(request);

    // The audio record should have been created with the metadata duration (287), NOT
    // the buffer-size estimate (100 bytes / 16000 ≈ 0 seconds, which would fall back to word-count)
    const createCall = mockAudioCreate.mock.calls[0][0];
    expect(createCall.data.durationSecs).toBe(287);
  });

  it('passes x-elevenlabs-key header to createTTSProvider', async () => {
    const scriptRecord = {
      id: 's1',
      format: 'narrator',
      scriptText: 'Hello world.',
      targetDuration: 5,
      actualWordCount: 2,
    };
    mockFindUnique.mockResolvedValue(scriptRecord);
    mockGenerateSpeech.mockResolvedValue(Buffer.from('audio'));
    mockParseBuffer.mockResolvedValue({ format: { duration: 60 } });
    mockAudioCreate.mockResolvedValue({ id: 'a1', filePath: 'audio/x.mp3', durationSecs: 60, voices: ['alloy'], ttsProvider: 'openai' });

    const req = createJsonRequest(
      { scriptId: 's1' },
      {
        url: 'http://localhost/api/audio/generate',
        headers: { 'x-elevenlabs-key': 'sk_from_header' },
      },
    );

    await POST(req);
    expect(vi.mocked(createTTSProvider)).toHaveBeenCalledWith('sk_from_header');
  });

  it('allows a request-scoped ElevenLabs key when OPENAI_API_KEY is not configured', async () => {
    const scriptRecord = {
      id: 's1',
      contentId: 'content-1',
      format: 'narrator',
      scriptText: 'Hello world.',
      targetDuration: 5,
      actualWordCount: 2,
    };

    process.env.OPENAI_API_KEY = '';
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    mockFindUnique.mockResolvedValue(scriptRecord);
    mockGenerateSpeech.mockResolvedValue(Buffer.from('audio'));
    mockParseBuffer.mockResolvedValue({ format: { duration: 60 } });
    mockAudioCreate.mockResolvedValue({
      id: 'a1',
      scriptId: 's1',
      filePath: 'audio/x.mp3',
      durationSecs: 60,
      voices: ['alloy'],
      ttsProvider: 'openai',
    });

    const req = createJsonRequest(
      { scriptId: 's1' },
      {
        url: 'http://localhost/api/audio/generate',
        headers: { 'x-elevenlabs-key': 'sk_from_header' },
      },
    );

    const response = await POST(req);

    expect(response.status).toBe(200);
    expect(vi.mocked(createTTSProvider)).toHaveBeenCalledWith('sk_from_header');
  });

  it('falls back to word-count estimate when parseBuffer fails', async () => {
    const scriptRecord = {
      id: 'script-1',
      format: 'narrator',
      // 300 words at 150 WPM = 120 seconds
      scriptText: 'word '.repeat(300),
      targetDuration: 5,
      actualWordCount: 300,
    };

    // parseBuffer throws an error
    mockParseBuffer.mockRejectedValue(new Error('Could not parse audio metadata'));
    mockFindUnique.mockResolvedValue(scriptRecord);
    mockGenerateSpeech.mockResolvedValue(Buffer.alloc(100)); // tiny fake buffer

    const audioRecord = {
      id: 'audio-1',
      scriptId: 'script-1',
      filePath: 'audio/test-uuid-1234.mp3',
      durationSecs: 120,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };
    mockAudioCreate.mockResolvedValue(audioRecord);

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);

    // Request must succeed (fallback used, no crash)
    expect(response.status).toBe(200);

    // Word-count estimate: 300 words / 150 WPM * 60 = 120 seconds
    const createCall = mockAudioCreate.mock.calls[0][0];
    expect(createCall.data.durationSecs).toBe(120);
  });

  it('returns existing audio idempotently when audio already exists for scriptId', async () => {
    const scriptRecord = BASE_SCRIPT_RECORD;
    const existingAudio = {
      id: 'audio-existing',
      scriptId: 'script-1',
      filePath: 'audio/existing.mp3',
      durationSecs: 60,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockAudioFindFirst.mockResolvedValue(existingAudio);

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('audio-existing');
    expect(mockAudioFindFirst).toHaveBeenCalledWith({
      where: { scriptId: 'script-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(mockGenerateSpeech).not.toHaveBeenCalled();
    expect(mockAudioCreate).not.toHaveBeenCalled();
  });

  it('sets Content.pipelineStatus to ready after successful audio creation', async () => {
    const scriptRecord = {
      ...BASE_SCRIPT_RECORD,
      content: { pipelineStatus: 'generating', pipelineError: 'previous failure' },
    };
    const audioRecord = {
      id: 'audio-1',
      scriptId: 'script-1',
      filePath: 'audio/test-uuid-1234.mp3',
      durationSecs: 60,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockGenerateSpeech.mockResolvedValue(Buffer.from('fake-audio'));
    mockParseBuffer.mockResolvedValue({ format: { duration: 60 } });
    mockAudioCreate.mockResolvedValue(audioRecord);

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockContentUpdate).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { pipelineStatus: 'ready', pipelineError: null },
    });
  });

  it('sets Content.pipelineStatus to error when TTS fails', async () => {
    const scriptRecord = {
      ...BASE_SCRIPT_RECORD,
      content: { pipelineStatus: 'generating', pipelineError: null },
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockGenerateSpeech.mockRejectedValue(new Error('rate limit exceeded 429'));

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(mockContentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'content-1' },
        data: expect.objectContaining({
          pipelineStatus: 'error',
          pipelineError: expect.stringContaining('busy'),
        }),
      }),
    );
  });

  it('heals Content.pipelineStatus when returning existing audio for stale content', async () => {
    const scriptRecord = {
      ...BASE_SCRIPT_RECORD,
      content: { pipelineStatus: 'generating', pipelineError: 'previous failure' },
    };
    const existingAudio = {
      id: 'audio-existing',
      scriptId: 'script-1',
      filePath: 'audio/existing.mp3',
      durationSecs: 60,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockAudioFindFirst.mockResolvedValue(existingAudio);

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockContentUpdate).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { pipelineStatus: 'ready', pipelineError: null },
    });
  });

  it('heals to ready when audio.create succeeded but markContentReady fails', async () => {
    // Bug 2: If audio.create commits but markContentReady throws (e.g. DB blip),
    // the catch block must attempt to heal to 'ready' instead of clobbering with 'error'.
    const scriptRecord = {
      ...BASE_SCRIPT_RECORD,
      content: { pipelineStatus: 'generating', pipelineError: null },
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockGenerateSpeech.mockResolvedValue(Buffer.from('fake-audio'));
    mockParseBuffer.mockResolvedValue({ format: { duration: 60 } });

    // audio.create succeeds
    mockAudioCreate.mockResolvedValue({
      id: 'audio-1',
      scriptId: 'script-1',
      filePath: 'audio/test-uuid-1234.mp3',
      durationSecs: 60,
      voices: ['alloy'],
      ttsProvider: 'openai',
    });

    // markContentReady (first call) fails — simulates DB blip after audio committed
    // markContentReady (second call in catch block) succeeds — heals the state
    mockContentUpdate
      .mockRejectedValueOnce(new Error('DB connection lost'))
      .mockResolvedValueOnce({});

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    // Catch block must attempt to heal via markContentReady (pipelineStatus: 'ready'),
    // NOT set pipelineStatus to 'error'
    expect(mockContentUpdate).toHaveBeenCalledTimes(2);
    expect(mockContentUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'content-1' },
      data: { pipelineStatus: 'ready', pipelineError: null },
    });
  });

  it('sets Content.pipelineStatus to error when audio.create has NOT succeeded', async () => {
    // Counterpart: when audio.create itself throws, the catch block should still
    // set pipelineStatus to 'error' (not attempt heal).
    const scriptRecord = {
      ...BASE_SCRIPT_RECORD,
      content: { pipelineStatus: 'generating', pipelineError: null },
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockGenerateSpeech.mockResolvedValue(Buffer.from('fake-audio'));
    mockParseBuffer.mockResolvedValue({ format: { duration: 60 } });

    // audio.create fails
    mockAudioCreate.mockRejectedValue(new Error('DB write failed'));

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(mockContentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pipelineStatus: 'error' }),
      }),
    );
  });

  it('sets Content.pipelineStatus to error when the TTS provider is not configured', async () => {
    const scriptRecord = {
      ...BASE_SCRIPT_RECORD,
      content: { pipelineStatus: 'generating', pipelineError: null },
    };

    process.env.OPENAI_API_KEY = '';
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    mockFindUnique.mockResolvedValue(scriptRecord);
    vi.mocked(createTTSProvider).mockImplementation(() => {
      throw new Error(TTS_PROVIDER_NOT_CONFIGURED_MESSAGE);
    });

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe(TTS_PROVIDER_NOT_CONFIGURED_MESSAGE);
  });

  it('recovery — Audio already exists for scriptId → returns existing Audio, sets pipelineStatus to ready', async () => {
    // Simulates a dropped-connection recovery: audio was already generated and persisted
    // but pipelineStatus is stuck at 'generating'. On retry, we return the existing audio
    // and heal the pipeline status to 'ready'.
    const scriptRecord = {
      id: 'script-recovery',
      contentId: 'content-recovery',
      format: 'narrator',
      scriptText: 'Hello world.',
      targetDuration: 5,
      actualWordCount: 2,
      content: {
        pipelineStatus: 'generating',
        pipelineError: null,
      },
    };
    const existingAudio = {
      id: 'audio-recovery',
      scriptId: 'script-recovery',
      filePath: 'audio/recovery.mp3',
      durationSecs: 60,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockAudioFindFirst.mockResolvedValue(existingAudio);

    const request = createJsonRequest({ scriptId: 'script-recovery' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('audio-recovery');
    // TTS must NOT be called — audio already exists
    expect(mockGenerateSpeech).not.toHaveBeenCalled();
    // Pipeline must be healed to 'ready'
    expect(mockContentUpdate).toHaveBeenCalledWith({
      where: { id: 'content-recovery' },
      data: { pipelineStatus: 'ready', pipelineError: null },
    });
  });
});
