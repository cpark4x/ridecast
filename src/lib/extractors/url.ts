import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { ExtractionResult } from "./types";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Substack blocks requests from cloud IPs (Azure, AWS, etc.) even with
 * browser-like User-Agent headers. Their public API serves the same content
 * without bot protection, so we use it as a fallback.
 */
function getSubstackApiUrl(url: string): string | null {
  const match = url.match(
    /^https?:\/\/([^/]+\.)?substack\.com\/p\/([^/?#]+)/,
  );
  if (!match) return null;
  const parsed = new URL(url);
  const slug = parsed.pathname.replace(/^\/p\//, "").replace(/\/$/, "");
  return `${parsed.origin}/api/v1/posts/${slug}`;
}

async function extractViaSubstackApi(
  url: string,
  apiUrl: string,
): Promise<ExtractionResult> {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Substack API returned ${response.status}`);
  }
  const data = (await response.json()) as {
    title?: string;
    body_html?: string;
    publishedBylines?: { name?: string }[];
  };

  if (!data.body_html) {
    throw new Error("Substack API returned no content");
  }

  const dom = new JSDOM(data.body_html, { url });
  const text = dom.window.document.body?.textContent?.trim() ?? "";
  const wordCount = text === "" ? 0 : text.split(/\s+/).length;
  const title = data.title || new URL(url).hostname;
  const author = data.publishedBylines?.[0]?.name;

  return { title, text, wordCount, ...(author ? { author } : {}) };
}

export async function extractUrl(url: string): Promise<ExtractionResult> {
  const response = await fetch(url, { headers: BROWSER_HEADERS, redirect: "follow" });

  // If the site blocks us (common from cloud IPs), try platform-specific APIs
  if (response.status === 403) {
    const substackApi = getSubstackApiUrl(url);
    if (substackApi) {
      return extractViaSubstackApi(url, substackApi);
    }
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent) {
    throw new Error("Could not extract article content from URL");
  }

  const text = article.textContent.trim();
  const wordCount = text === "" ? 0 : text.split(/\s+/).length;
  const title = article.title || new URL(url).hostname;

  return { title, text, wordCount };
}
