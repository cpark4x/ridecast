import { describe, it, expect, vi } from 'vitest';
import type { TTSProvider } from './types';
import { generateNarratorAudio } from './narrator';

describe('generateNarratorAudio', () => {
  it('generates audio with narrator voice config', async () => {
    const fakeBuffer = Buffer.from('fake-audio-data');
    const mockProvider: TTSProvider = {
      generateSpeech: vi.fn().mockResolvedValue(fakeBuffer),
    };

    const result = await generateNarratorAudio(mockProvider, 'Hello listeners');

    expect(mockProvider.generateSpeech).toHaveBeenCalledWith('Hello listeners', {
      voice: 'alloy',
      instructions:
        'Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.',
    });
    expect(result).toBe(fakeBuffer);
  });
});
