import { describe, it, expect, vi } from "vitest";
import { generateNarratorAudio } from "./narrator";
import { TTSProvider } from "./types";

describe("generateNarratorAudio", () => {
  it("generates audio with narrator voice config", async () => {
    const mockProvider: TTSProvider = {
      providerId: 'mock',
      generateSpeech: vi.fn().mockResolvedValue(Buffer.from("audio-data")),
    };

    const result = await generateNarratorAudio(
      mockProvider,
      "Welcome to your audio summary. The key insight is about systems thinking."
    );

    expect(result).toBeInstanceOf(Buffer);
    expect(mockProvider.generateSpeech).toHaveBeenCalledWith(
      "Welcome to your audio summary. The key insight is about systems thinking.",
      {
        voice: "alloy",
        instructions:
          "Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.",
      }
    );
  });
});
