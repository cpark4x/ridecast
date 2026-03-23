import { ExtractionResult } from "./types";

export function extractTxt(content: string, filename: string): ExtractionResult {
  const text = content.trim();
  const wordCount = text === "" ? 0 : text.split(/\s+/).length;
  const title = filename.replace(/\.txt$/i, "");

  return { title, text, wordCount };
}
