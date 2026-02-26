import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenAITTSProvider } from "./openai";

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function () {
    return {
      audio: {
        speech: {
          create: vi.fn().mockResolvedValue({
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          }),
        },
      },
    };
  }),
}));

describe("OpenAITTSProvider", () => {
  let provider: OpenAITTSProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAITTSProvider();
  });

  it("generates speech from text and returns a Buffer", async () => {
    const result = await provider.generateSpeech(
      "Hello, this is a test of the text to speech system.",
      {
        voice: "alloy",
        instructions: "Speak clearly and warmly.",
      }
    );

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
