import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./openai", () => ({ OpenAITTSProvider: vi.fn() }));
vi.mock("./elevenlabs", () => ({ ElevenLabsTTSProvider: vi.fn() }));
vi.mock("./google", () => ({ GoogleCloudTTSProvider: vi.fn() }));

describe("createTTSProvider", () => {
  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    vi.resetModules();
  });

  it("returns OpenAITTSProvider when no keys are set", async () => {
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
