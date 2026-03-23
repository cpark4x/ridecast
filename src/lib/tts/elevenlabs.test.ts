import { describe, it, expect, vi, beforeEach } from "vitest";
import { ElevenLabsTTSProvider } from "./elevenlabs";

// Mock the elevenlabs SDK — use regular function (not arrow fn) so it works as a constructor
const mockConvert = vi.fn();

vi.mock("elevenlabs", () => ({
  ElevenLabsClient: vi.fn().mockImplementation(function () {
    return {
      textToSpeech: { convert: mockConvert },
    };
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockConvert.mockResolvedValue(
    (async function* () {
      yield Buffer.from("fake-mp3-audio");
    })()
  );
});

describe("ElevenLabsTTSProvider", () => {
  it("calls textToSpeech.convert with the correct voice ID and text", async () => {
    const provider = new ElevenLabsTTSProvider();
    const result = await provider.generateSpeech("Hello world", {
      voice: "21m00Tcm4TlvDq8ikWAM",
      instructions: "Warm narrator",
    });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(mockConvert).toHaveBeenCalledWith(
      "21m00Tcm4TlvDq8ikWAM",
      expect.objectContaining({ text: "Hello world" })
    );
  });

  it("uses eleven_multilingual_v2 model", async () => {
    const provider = new ElevenLabsTTSProvider();
    await provider.generateSpeech("test", { voice: "abc123", instructions: "" });

    expect(mockConvert).toHaveBeenCalledWith(
      "abc123",
      expect.objectContaining({ model_id: "eleven_multilingual_v2" })
    );
  });

  it("collects stream chunks into a single Buffer", async () => {
    mockConvert.mockResolvedValue(
      (async function* () {
        yield Buffer.from("chunk1");
        yield Buffer.from("chunk2");
      })()
    );
    const provider = new ElevenLabsTTSProvider();
    const result = await provider.generateSpeech("test", {
      voice: "voice-id",
      instructions: "",
    });
    expect(result.toString()).toBe("chunk1chunk2");
  });
});
