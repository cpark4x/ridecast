import Anthropic from '@anthropic-ai/sdk';
import { stripJsonMarkdownFences } from '@/lib/utils/json';

/**
 * Extract the text content from the first block of a Claude response.
 * Throws if the block is missing or not a text block.
 */
export function extractClaudeText(response: Anthropic.Message): string {
  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }
  return block.text;
}

/**
 * Extract and JSON-parse the text content of a Claude response.
 * Strips markdown fences before parsing.
 *
 * @param response  The raw Anthropic.Message to parse.
 * @param context   A short label used in the parse-failure error message
 *                  (e.g. "analysis", "feedback analysis").
 */
export function parseClaudeJson(response: Anthropic.Message, context: string): unknown {
  const text = extractClaudeText(response);
  const cleaned = stripJsonMarkdownFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(
      `Failed to parse ${context} response from Claude: ${cleaned.slice(0, 200)}`,
    );
  }
}
