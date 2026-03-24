import { setTokenProvider, deleteEpisode } from "../lib/api";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  setTokenProvider(async () => "test-token");
});

describe("api.deleteEpisode", () => {
  it("calls DELETE /api/library/{contentId}", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (key: string) => (key === "content-type" ? "application/json" : null) },
      json: async () => ({ ok: true }),
    });

    await deleteEpisode("content-abc");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/library/content-abc"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("includes Authorization header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (key: string) => (key === "content-type" ? "application/json" : null) },
      json: async () => ({ ok: true }),
    });

    await deleteEpisode("content-abc");

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer test-token");
  });

  it("throws when server returns 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    });

    await expect(deleteEpisode("missing")).rejects.toThrow();
  });

  it("throws when server returns 500", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    await expect(deleteEpisode("content-abc")).rejects.toThrow();
  });
});
