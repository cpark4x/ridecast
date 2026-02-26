import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock functions so they're available when vi.mock factories run
const { mockWriteFile, mockMkdir, mockGenerateSpeech } = vi.hoisted(() => ({
  mockWriteFile: vi.fn(),
  mockMkdir: vi.fn(),
  mockGenerateSpeech: vi.fn(),
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

// Mock OpenAITTSProvider
vi.mock('@/lib/tts/openai', () => ({
  OpenAITTSProvider: class MockOpenAITTSProvider {
    generateSpeech = mockGenerateSpeech;
  },
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}));

import { prisma } from '@/lib/db';
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
});
