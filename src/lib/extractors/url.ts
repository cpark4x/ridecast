import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { ExtractionResult } from "./types";

export async function extractUrl(url: string): Promise<ExtractionResult> {
  const response = await fetch(url);
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
