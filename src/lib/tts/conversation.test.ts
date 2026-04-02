import { describe, it, expect, vi } from 'vitest';
import type { TTSProvider } from './types';
import { generateConversationAudio } from './conversation';

describe('generateConversationAudio', () => {
  it('generates audio chunks per speaker and concatenates them', async () => {
    const chunkA1 = Buffer.from('chunk-a1');
    const chunkB1 = Buffer.from('chunk-b1');
    const chunkA2 = Buffer.from('chunk-a2');

    const mockProvider: TTSProvider = {
      providerId: 'mock',
      generateSpeech: vi
        .fn()
        .mockResolvedValueOnce(chunkA1)
        .mockResolvedValueOnce(chunkB1)
        .mockResolvedValueOnce(chunkA2),
    };

    const script = `[Host A] Welcome to the show!
[Host B] Thanks for having me.
[Host A] Let's get started.`;

    const result = await generateConversationAudio(mockProvider, script);

    expect(Buffer.isBuffer(result.audio)).toBe(true);
    expect(result.audio).toEqual(Buffer.concat([chunkA1, chunkB1, chunkA2]));
    expect(result.voices).toEqual(['echo', 'nova']);

    expect(mockProvider.generateSpeech).toHaveBeenCalledTimes(3);
    expect(mockProvider.generateSpeech).toHaveBeenNthCalledWith(
      1,
      'Welcome to the show!',
      expect.objectContaining({ voice: 'echo' }),
    );
    expect(mockProvider.generateSpeech).toHaveBeenNthCalledWith(
      2,
      'Thanks for having me.',
      expect.objectContaining({ voice: 'nova' }),
    );
    expect(mockProvider.generateSpeech).toHaveBeenNthCalledWith(
      3,
      "Let's get started.",
      expect.objectContaining({ voice: 'echo' }),
    );
  });

  it('returns empty buffer for empty script', async () => {
    const mockProvider: TTSProvider = {
      providerId: 'mock',
      generateSpeech: vi.fn(),
    };

    const result = await generateConversationAudio(mockProvider, '');

    expect(Buffer.isBuffer(result.audio)).toBe(true);
    expect(result.audio.length).toBe(0);
    expect(mockProvider.generateSpeech).not.toHaveBeenCalled();
  });
});