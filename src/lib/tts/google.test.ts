import { describe, it, expect, vi, beforeEach } from "vitest";

// Must be hoisted before GoogleCloudTTSProvider import so the mock is in place
const mockSynthesizeSpeech = vi
  .fn()
  .mockResolvedValue([{ audioContent: Buffer.from("fake-mp3") }]);

vi.mock("@google-cloud/text-to-speech", () => ({
  // Use regular function (not arrow) so it works as a constructor with `new`
  TextToSpeechClient: vi.fn(function () {
    return { synthesizeSpeech: mockSynthesizeSpeech };
  }),
}));

import { GoogleCloudTTSProvider } from "./google";

describe("GoogleCloudTTSProvider", () => {
  beforeEach(() => {
    mockSynthesizeSpeech.mockResolvedValue([
      { audioContent: Buffer.from("fake-mp3") },
    ]);
  });

  it("returns a Buffer from synthesizeSpeech", async () => {
    const provider = new GoogleCloudTTSProvider();
    const result = await provider.generateSpeech("Hello world", {
      voice: "en-US-Studio-O",
      instructions: "",
    });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("uses the voice name from VoiceConfig", async () => {
    const provider = new GoogleCloudTTSProvider();
    await provider.generateSpeech("test", {
      voice: "en-US-Studio-M",
      instructions: "",
    });

    expect(mockSynthesizeSpeech).toHaveBeenCalledWith(
      expect.objectContaining({
        voice: expect.objectContaining({ name: "en-US-Studio-M" }),
      }),
    );
  });

  it("throws if audioContent is empty", async () => {
    mockSynthesizeSpeech.mockResolvedValueOnce([{ audioContent: null }]);

    const provider = new GoogleCloudTTSProvider();
    await expect(
      provider.generateSpeech("test", {
        voice: "en-US-Studio-O",
        instructions: "",
      }),
    ).rejects.toThrow("empty audio content");
  });
});
