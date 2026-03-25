import { describe, it, expect, vi } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({}));

import { extractClaudeText, parseClaudeJson } from './utils';
import type Anthropic from '@anthropic-ai/sdk';

// Minimal helper to construct a typed fake Anthropic.Message
function makeMessage(content: Anthropic.Message['content']): Anthropic.Message {
  return {
    id: 'msg-test',
    type: 'message',
    role: 'assistant',
    content,
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 10 },
  };
}

describe('extractClaudeText', () => {
  it('returns the text of the first content block', () => {
    const msg = makeMessage([{ type: 'text', text: 'Hello, world!' }]);
    expect(extractClaudeText(msg)).toBe('Hello, world!');
  });

  it('throws when content array is empty', () => {
    const msg = makeMessage([]);
    expect(() => extractClaudeText(msg)).toThrow('Unexpected response type from Claude');
  });

  it('throws when first block is non-text (tool_use)', () => {
    const msg = makeMessage([
      { type: 'tool_use', id: 'tool-1', name: 'search', input: {} },
    ]);
    expect(() => extractClaudeText(msg)).toThrow('Unexpected response type from Claude');
  });
});

describe('parseClaudeJson', () => {
  it('parses valid JSON from a text block', () => {
    const msg = makeMessage([{ type: 'text', text: '{"key":"value"}' }]);
    expect(parseClaudeJson(msg, 'test')).toEqual({ key: 'value' });
  });

  it('strips markdown fences before parsing', () => {
    const msg = makeMessage([
      { type: 'text', text: '```json\n{"wrapped":true}\n```' },
    ]);
    expect(parseClaudeJson(msg, 'test')).toEqual({ wrapped: true });
  });

  it('strips plain ``` fences (no language tag)', () => {
    const msg = makeMessage([
      { type: 'text', text: '```\n{"plain":1}\n```' },
    ]);
    expect(parseClaudeJson(msg, 'test')).toEqual({ plain: 1 });
  });

  it('throws with context label on invalid JSON', () => {
    const msg = makeMessage([{ type: 'text', text: '{not valid json}' }]);
    expect(() => parseClaudeJson(msg, 'analysis')).toThrow(
      'Failed to parse analysis response from Claude',
    );
  });

  it('includes up to 200 chars of the cleaned text in the error', () => {
    const badJson = 'x'.repeat(300);
    const msg = makeMessage([{ type: 'text', text: badJson }]);
    let caught: Error | undefined;
    try {
      parseClaudeJson(msg, 'feedback analysis');
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).toBeDefined();
    expect(caught!.message).toContain('Failed to parse feedback analysis response from Claude');
    // Error must not blow up the message with the full 300-char payload
    expect(caught!.message.length).toBeLessThan(300);
  });

  it('propagates extractClaudeText errors (empty content)', () => {
    const msg = makeMessage([]);
    expect(() => parseClaudeJson(msg, 'test')).toThrow(
      'Unexpected response type from Claude',
    );
  });
});
