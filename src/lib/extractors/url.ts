import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { ExtractionResult } from './types';

export async function extractUrl(url: string): Promise<ExtractionResult> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch URL');
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (!article) {
    throw new Error('Failed to extract article content');
  }

  const text = (article.textContent ?? '').trim();
  const wordCount = text === '' ? 0 : text.split(/\s+/).length;
  const title = article.title || new URL(url).hostname;

  return {
    title,
    text,
    wordCount,
  };
}