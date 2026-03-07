import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions so they're available when vi.mock factories run
const { mockWriteFile, mockMkdir, mockGenerateSpeech, mockParseBuffer } = vi.hoisted(() => ({
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
  mockGenerateSpeech: vi.fn(),
  mockParseBuffer: vi.fn(),
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
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
    },
  },
}));

// Mock the TTS provider factory so we can inspect what key it's called with
vi.mock('@/lib/tts/provider', () => ({
  createTTSProvider: vi.fn().mockReturnValue({ generateSpeech: mockGenerateSpeech }),
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
import { createTTSProvider } from '@/lib/tts/provider';
import { getCurrentUserId } from '@/lib/auth';
import { POST } from './route';

const mockFindUnique = prisma.script.findUnique as ReturnType<typeof vi.fn>;
const mockAudioCreate = prisma.audio.create as ReturnType<typeof vi.fn>;

function createJsonRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/audio/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/audio/generate', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-key';
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    // Restore default mock for createTTSProvider after vi.clearAllMocks()
    vi.mocked(createTTSProvider).mockReturnValue({ generateSpeech: mockGenerateSpeech });
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
  });

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
  });

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

    const req = new Request('http://localhost/api/audio/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-elevenlabs-key': 'sk_from_header',
      },
      body: JSON.stringify({ scriptId: 's1' }),
    });

    await POST(req);
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
});
