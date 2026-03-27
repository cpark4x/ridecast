import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractUrl } from "./url";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("extractUrl", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });
  it("extracts article content from HTML", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(`
        <html>
          <head><title>Great Article</title></head>
          <body>
            <article>
              <h1>Great Article Title</h1>
              <p>This is the main content of the article. It has several paragraphs
              of meaningful text that should be extracted by the readability parser.</p>
              <p>Here is another paragraph with more details about the topic at hand.
              The content continues with additional information that makes this a
              substantial article worth reading and listening to.</p>
            </article>
            <nav>Navigation links that should be ignored</nav>
            <footer>Footer content to ignore</footer>
          </body>
        </html>
      `),
    });

    const result = await extractUrl("https://example.com/article");

    expect(result.title).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.text).not.toContain("Navigation links");
  });

  it("falls back to Jina Reader on non-403 HTTP error, returns Jina result on success", async () => {
    // Direct fetch returns 500
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    // Jina Reader succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            title: "Jina Article",
            content: "Jina extracted content for this article",
          },
        }),
    });

    const result = await extractUrl("https://example.com/500");
    expect(result.title).toBe("Jina Article");
    expect(result.text).toContain("Jina extracted content");
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it("throws original error when non-403 HTTP error AND Jina also fails", async () => {
    // Direct fetch returns 500
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    // Jina Reader also fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(extractUrl("https://example.com/500")).rejects.toThrow(
      "Failed to fetch URL: 500"
    );
  });

  it("falls back to Jina when Readability returns null (JS-wall site)", async () => {
    // Direct fetch returns 200 but with empty/JS-only content
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(`
        <html>
          <head><title>Loading...</title></head>
          <body>
            <div id="app"></div>
            <script>/* JS-only SPA */</script>
          </body>
        </html>
      `),
    });
    // Jina Reader succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            title: "Medium Article",
            content: "Full article extracted via Jina Reader with useful content",
          },
        }),
    });

    const result = await extractUrl("https://medium.com/@author/article");
    expect(result.title).toBe("Medium Article");
    expect(result.text).toContain("Full article extracted via Jina");
    expect(result.wordCount).toBeGreaterThan(0);
  });

  it("throws original error when Readability null AND Jina also fails", async () => {
    // Direct fetch returns 200 but Readability yields null
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(`
        <html><body><div id="app"></div></body></html>
      `),
    });
    // Jina also fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(
      extractUrl("https://medium.com/@author/article")
    ).rejects.toThrow("Could not extract article content from URL");
  });

  it("does not call Jina when direct fetch and Readability both succeed", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve(`
        <html>
          <head><title>Normal Article</title></head>
          <body>
            <article>
              <h1>Normal Article</h1>
              <p>This article has plenty of content that Readability can extract
              successfully without needing any fallback mechanism.</p>
            </article>
          </body>
        </html>
      `),
    });

    await extractUrl("https://example.com/normal");
    // Only one fetch call (direct) — Jina never called
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws on failed fetch when Jina fallback not available (non-403)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    // Jina fails too
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(extractUrl("https://example.com/404")).rejects.toThrow(
      "Failed to fetch URL"
    );
  });
});
