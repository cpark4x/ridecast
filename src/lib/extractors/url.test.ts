import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractUrl } from './url';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('extractUrl', () => {
  it('extracts article content from HTML, filtering out nav and footer', async () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Article Title</title></head>
        <body>
          <nav>Navigation links: Home About Contact</nav>
          <article>
            <h1>Test Article Title</h1>
            <p>This is the main article content with several important words that should be extracted by the readability parser.</p>
            <p>It contains multiple paragraphs of meaningful text content for proper extraction testing.</p>
          </article>
          <footer>Footer content and copyright info</footer>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml),
    });

    const result = await extractUrl('https://example.com/article');

    expect(result.title).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.text).not.toContain('Navigation links');
  });

  it("throws 'Failed to fetch URL' on 404 response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not Found'),
    });

    await expect(extractUrl('https://example.com/missing')).rejects.toThrow(
      'Failed to fetch URL'
    );
  });
});