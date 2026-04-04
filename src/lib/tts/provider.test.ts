import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./openai", () => ({ OpenAITTSProvider: vi.fn() }));
vi.mock("./elevenlabs", () => ({ ElevenLabsTTSProvider: vi.fn() }));
vi.mock("./google", () => ({ GoogleCloudTTSProvider: vi.fn() }));

describe("createTTSProvider", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    vi.resetModules();
  });

  it("returns OpenAITTSProvider when OPENAI_API_KEY is set", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    delete process.env.ELEVENLABS_API_KEY;
    const { createTTSProvider } = await import("./provider");
    const { OpenAITTSProvider } = await import("./openai");
    const provider = createTTSProvider();
    expect(provider).toBeInstanceOf(OpenAITTSProvider);
  });

  it("throws when no TTS credentials are configured", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;

    const { createTTSProvider, TTS_PROVIDER_NOT_CONFIGURED_MESSAGE } = await import("./provider");

    expect(() => createTTSProvider()).toThrow(TTS_PROVIDER_NOT_CONFIGURED_MESSAGE);
  });

  it("returns ElevenLabsTTSProvider when ELEVENLABS_API_KEY is set", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    vi.resetModules();
    const { createTTSProvider } = await import("./provider");
    const { ElevenLabsTTSProvider } = await import("./elevenlabs");
    const provider = createTTSProvider();
    expect(provider).toBeInstanceOf(ElevenLabsTTSProvider);
  });

  it("returns ElevenLabsTTSProvider when a user key is provided", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { createTTSProvider } = await import("./provider");
    const { ElevenLabsTTSProvider } = await import("./elevenlabs");
    const provider = createTTSProvider("user-key");
    expect(provider).toBeInstanceOf(ElevenLabsTTSProvider);
  });

  it("returns GoogleCloudTTSProvider when GOOGLE_APPLICATION_CREDENTIALS is set", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/path/to/creds.json";
    vi.resetModules();
    const { createTTSProvider } = await import("./provider");
    const { GoogleCloudTTSProvider } = await import("./google");
    expect(createTTSProvider()).toBeInstanceOf(GoogleCloudTTSProvider);
  });

  it("returns GoogleCloudTTSProvider when GOOGLE_CLOUD_PROJECT is set", async () => {
    process.env.GOOGLE_CLOUD_PROJECT = "my-project";
    vi.resetModules();
    const { createTTSProvider } = await import("./provider");
    const { GoogleCloudTTSProvider } = await import("./google");
    expect(createTTSProvider()).toBeInstanceOf(GoogleCloudTTSProvider);
  });

  it("prefers Google over ElevenLabs when both are set", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = "/path/to/creds.json";
    process.env.ELEVENLABS_API_KEY = "el-key";
    vi.resetModules();
    const { createTTSProvider } = await import("./provider");
    const { GoogleCloudTTSProvider } = await import("./google");
    expect(createTTSProvider()).toBeInstanceOf(GoogleCloudTTSProvider);
  });
});
