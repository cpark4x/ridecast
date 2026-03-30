import type { ExtractionResult } from './types';

/**
 * Strips common Markdown syntax to produce clean plain text for TTS.
 * Regex-based — handles the 95% case without a full AST parse.
 */
export function extractMarkdown(content: string): ExtractionResult {
  const cleaned = content
    .replace(/^#{1,6}\s+/gm, '')                      // remove heading markers
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')              // **bold** → bold
    .replace(/\*([\s\S]+?)\*/g, '$1')                  // *italic* → italic
    .replace(/_{1,2}([\s\S]+?)_{1,2}/g, '$1')          // _italic_ / __bold__
    .replace(/~~([\s\S]+?)~~/g, '$1')                  // ~~strikethrough~~
    .replace(/`{3}[\s\S]*?`{3}/g, '')                  // remove fenced code blocks
    .replace(/`[^`]+`/g, '')                   // remove inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')    // remove images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [link text](url) → link text
    .replace(/^\s*[-*+]\s+/gm, '')             // unordered list bullets
    .replace(/^\s*\d+\.\s+/gm, '')             // ordered list numbers
    .replace(/^>\s*/gm, '')                    // blockquotes
    .replace(/^-{3,}$/gm, '')                  // horizontal rules
    .replace(/\n{3,}/g, '\n\n')                // collapse excess blank lines
    .trim();

  const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
  const title = lines[0]?.slice(0, 120) ?? 'Untitled';

  return {
    text: cleaned,
    title,
    wordCount: cleaned.split(/\s+/).filter(Boolean).length,
  };
}
