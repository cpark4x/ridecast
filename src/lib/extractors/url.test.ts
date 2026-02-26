import { describe, it, expect, vi } from "vitest";
import { extractUrl } from "./url";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("extractUrl", () => {
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

  it("throws on failed fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(extractUrl("https://example.com/404")).rejects.toThrow(
      "Failed to fetch URL"
    );
  });
});
