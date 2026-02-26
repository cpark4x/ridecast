import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAITTSProvider } from './openai';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class MockOpenAI {
    audio = {
      speech: {
        create: mockCreate,
      },
    };
  },
}));

describe('OpenAITTSProvider', () => {
  let provider: OpenAITTSProvider;

  beforeEach(() => {
    mockCreate.mockReset();
    provider = new OpenAITTSProvider('test-api-key');
  });

  it('generates speech from text and returns a Buffer with length > 0', async () => {
    const fakeArrayBuffer = new ArrayBuffer(100);
    mockCreate.mockResolvedValue({
      arrayBuffer: () => Promise.resolve(fakeArrayBuffer),
    });

    const result = await provider.generateSpeech('Hello world', {
      voice: 'alloy',
      instructions: 'Speak clearly',
    });

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});