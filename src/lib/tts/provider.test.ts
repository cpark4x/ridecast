import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./openai", () => ({ OpenAITTSProvider: vi.fn() }));
vi.mock("./elevenlabs", () => ({ ElevenLabsTTSProvider: vi.fn() }));

describe("createTTSProvider", () => {
  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
    vi.resetModules();
  });

  it("returns OpenAITTSProvider when ELEVENLABS_API_KEY is not set", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const { createTTSProvider } = await import("./provider");
    const { OpenAITTSProvider } = await import("./openai");
    const provider = createTTSProvider();
    expect(provider).toBeInstanceOf(OpenAITTSProvider);
  });

  it("returns ElevenLabsTTSProvider when ELEVENLABS_API_KEY is set", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    vi.resetModules();
    const { createTTSProvider } = await import("./provider");
    const { ElevenLabsTTSProvider } = await import("./elevenlabs");
    const provider = createTTSProvider();
    expect(provider).toBeInstanceOf(ElevenLabsTTSProvider);
  });
});
