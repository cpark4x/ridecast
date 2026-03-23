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
 * Jina Reader (r.jina.ai) extracts article content from any URL, bypassing
 * bot protection that blocks cloud IPs. Free, no auth needed. Used as a
 * fallback when direct fetch returns 403.
 */
async function extractViaJinaReader(url: string): Promise<ExtractionResult> {
  const response = await fetch(`https://r.jina.ai/${url}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Jina Reader returned ${response.status}`);
  }
  const data = (await response.json()) as {
    data?: { title?: string; content?: string; author?: string };
  };
  const content = data.data?.content;
  if (!content) {
    throw new Error("Jina Reader returned no content");
  }

  // Strip markdown image/link syntax for a cleaner word count
  const plainText = content
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .trim();
  const wordCount = plainText === "" ? 0 : plainText.split(/\s+/).length;
  const title = data.data?.title || new URL(url).hostname;
  const author = data.data?.author;

  return { title, text: plainText, wordCount, ...(author ? { author } : {}) };
}

export async function extractUrl(url: string): Promise<ExtractionResult> {
  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: "follow",
  });

  // If the site blocks us (common from cloud IPs), fall back to Jina Reader
  if (response.status === 403) {
    return extractViaJinaReader(url);
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
