const mockFetch = jest.fn();
global.fetch = mockFetch;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let submitTextFeedback: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let submitVoiceFeedback: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sendTelemetryBatch: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let setTokenProvider: any;

beforeAll(async () => {
  // Dynamic import so the module picks up global.fetch = mockFetch
  const api = await import("../lib/api");
  submitTextFeedback = (api as Record<string, unknown>).submitTextFeedback;
  submitVoiceFeedback = (api as Record<string, unknown>).submitVoiceFeedback;
  sendTelemetryBatch = (api as Record<string, unknown>).sendTelemetryBatch;
  setTokenProvider = api.setTokenProvider;
});

beforeEach(() => {
  mockFetch.mockReset();
  setTokenProvider(async () => "test-token-123");
});

describe("submitTextFeedback", () => {
  it("sends JSON body with text, screenContext, and episodeId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (key: string) =>
          key === "content-type" ? "application/json" : null,
      },
      json: async () => ({
        id: "fb-1",
        summary: "Button doesn't work",
        category: "Bug",
      }),
    });

    const result = await submitTextFeedback({
      text: "The play button doesn't respond",
      screenContext: "/library",
      episodeId: "ep-123",
    });

    expect(result.id).toBe("fb-1");
    expect(result.category).toBe("Bug");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/feedback");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(options.headers.Authorization).toBe("Bearer test-token-123");

    const body = JSON.parse(options.body);
    expect(body.text).toBe("The play button doesn't respond");
    expect(body.screenContext).toBe("/library");
    expect(body.episodeId).toBe("ep-123");
  });

  it("sends without episodeId when not provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (key: string) =>
          key === "content-type" ? "application/json" : null,
      },
      json: async () => ({ id: "fb-2", summary: "Test", category: "Other" }),
    });

    await submitTextFeedback({
      text: "Some feedback",
      screenContext: "/home",
    });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.episodeId).toBeUndefined();
  });

  it("throws on server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: {
        get: (key: string) =>
          key === "content-type" ? "application/json" : null,
      },
      json: async () => ({ error: "Failed to submit feedback" }),
    });

    await expect(
      submitTextFeedback({ text: "Test", screenContext: "/home" })
    ).rejects.toThrow("Failed to submit feedback");
  });
});

describe("submitVoiceFeedback", () => {
  it("sends FormData with audioFile, screenContext, and episodeId", async () => {
    const appendSpy = jest.spyOn(FormData.prototype, "append");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: "fb-3",
        summary: "Voice feedback",
        category: "Feature",
      }),
    });

    const result = await submitVoiceFeedback({
      fileUri: "file:///tmp/recording.m4a",
      screenContext: "/player",
      episodeId: "ep-456",
    });

    expect(result.id).toBe("fb-3");

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/feedback");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer test-token-123");
    // FormData sets the Content-Type with multipart boundary — do not set it manually
    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(options.body).toBeInstanceOf(FormData);

    // Verify actual FormData fields were appended
    expect(appendSpy).toHaveBeenCalledWith("audioFile", expect.anything());
    expect(appendSpy).toHaveBeenCalledWith("screenContext", "/player");
    expect(appendSpy).toHaveBeenCalledWith("episodeId", "ep-456");

    appendSpy.mockRestore();
  });

  it("throws on server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Upload failed" }),
    });

    await expect(
      submitVoiceFeedback({
        fileUri: "file:///tmp/recording.m4a",
        screenContext: "/player",
      })
    ).rejects.toThrow("Upload failed");
  });
});

describe("sendTelemetryBatch", () => {
  it("sends array of events as JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (key: string) =>
          key === "content-type" ? "application/json" : null,
      },
      json: async () => ({ ok: true }),
    });

    const events: import("../lib/types").TelemetryEventPayload[] = [
      { eventType: "api_error", metadata: { audioId: "audio-1" } },
      { eventType: "playback_failure", metadata: { position: 42.5 } },
    ];

    await sendTelemetryBatch(events);

    // One fetch call per event
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/api/telemetry");
    expect(options.method).toBe("POST");

    const body = JSON.parse(options.body);
    expect(body.eventType).toBeDefined();
    expect(body.metadata).toBeDefined();
  });

  it("does nothing for empty array", async () => {
    await sendTelemetryBatch([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
