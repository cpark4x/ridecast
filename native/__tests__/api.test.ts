import {
  setTokenProvider,
  uploadUrl,
  fetchLibrary,
  processContent,
  generateAudio,
  getPlaybackState,
  savePlaybackState,
} from "../lib/api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  setTokenProvider(async () => "test-token-123");
});

describe("api client", () => {
  describe("uploadUrl", () => {
    it("sends URL in FormData with auth header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "content-1",
          title: "Test Article",
          wordCount: 500,
        }),
      });

      const result = await uploadUrl("https://example.com/article");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/upload");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBe("Bearer test-token-123");
      expect(result.id).toBe("content-1");
    });

    it("treats 409 as success (duplicate content)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          id: "content-1",
          title: "Existing Article",
          error: "This content has already been uploaded.",
        }),
      });

      const result = await uploadUrl("https://example.com/existing");
      expect(result.id).toBe("content-1");
      expect(result.error).toContain("already been uploaded");
    });

    it("throws on server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server exploded" }),
      });

      await expect(uploadUrl("https://bad.com")).rejects.toThrow("Server exploded");
    });

    it("attaches statusCode to thrown error on non-409 failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ error: "Unprocessable entity" }),
      });

      let caughtError: unknown;
      try {
        await uploadUrl("https://bad.com");
      } catch (e) {
        caughtError = e;
      }

      expect(caughtError).toBeInstanceOf(Error);
      expect((caughtError as Error & { statusCode: number }).statusCode).toBe(422);
    });
  });

  describe("fetchLibrary", () => {
    it("returns library items with auth header", async () => {
      const mockLibrary = [
        {
          id: "c1",
          title: "Episode 1",
          author: null,
          sourceType: "url",
          sourceUrl: "https://example.com",
          createdAt: "2026-01-01T00:00:00Z",
          wordCount: 1000,
          versions: [],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (key: string) => (key === "content-type" ? "application/json" : null) },
        json: async () => mockLibrary,
      });

      const result = await fetchLibrary();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Episode 1");
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer test-token-123");
    });
  });

  describe("processContent", () => {
    it("sends contentId and targetMinutes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (key: string) => (key === "content-type" ? "application/json" : null) },
        json: async () => ({
          id: "script-1",
          contentId: "content-1",
          format: "narrator",
          targetDuration: 5,
        }),
      });

      const result = await processContent("content-1", 5);
      expect(result.id).toBe("script-1");
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.contentId).toBe("content-1");
      expect(body.targetMinutes).toBe(5);
    });
  });

  describe("generateAudio", () => {
    it("sends scriptId and optional ElevenLabs key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (key: string) => (key === "content-type" ? "application/json" : null) },
        json: async () => ({
          id: "audio-1",
          scriptId: "script-1",
          durationSecs: 300,
        }),
      });

      const result = await generateAudio("script-1", "el-key-123");
      expect(result.id).toBe("audio-1");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["x-elevenlabs-key"]).toBe("el-key-123");
    });
  });

  describe("playback state", () => {
    it("getPlaybackState fetches by audioId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (key: string) => (key === "content-type" ? "application/json" : null) },
        json: async () => ({
          audioId: "audio-1",
          position: 42.5,
          speed: 1.5,
          completed: false,
        }),
      });

      const result = await getPlaybackState("audio-1");
      expect(result.position).toBe(42.5);
      expect(result.speed).toBe(1.5);
    });

    it("savePlaybackState sends partial update", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: (key: string) => (key === "content-type" ? "application/json" : null) },
        json: async () => ({
          audioId: "audio-1",
          position: 100,
          speed: 1.0,
          completed: false,
        }),
      });

      await savePlaybackState({ audioId: "audio-1", position: 100 });
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.audioId).toBe("audio-1");
      expect(body.position).toBe(100);
    });
  });

  describe("auth", () => {
    it("throws when token provider returns null", async () => {
      setTokenProvider(async () => null);

      await expect(fetchLibrary()).rejects.toThrow("Not authenticated");
    });
  });
});
