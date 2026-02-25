import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClaudeProvider } from './claude';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    mockCreate.mockReset();
    provider = new ClaudeProvider('test-api-key');
  });

  describe('analyze()', () => {
    it('returns content analysis with contentType, format, themes, and summary', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              contentType: 'business_book',
              format: 'conversation',
              themes: ['productivity', 'management', 'leadership'],
              summary: 'A book about effective business practices and productivity.',
            }),
          },
        ],
      });

      const result = await provider.analyze('Some text about business and productivity...');

      expect(result.contentType).toBe('business_book');
      expect(result.format).toBe('conversation');
      expect(result.themes).toContain('productivity');
      expect(result.summary).toBeTruthy();
    });
  });

  describe('generateScript()', () => {
    it('returns narrator script with text, format, and wordCount > 0', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Welcome to this episode where we explore the key ideas from this fascinating book about productivity and management.',
          },
        ],
      });

      const result = await provider.generateScript('Some source text...', {
        format: 'narrator',
        targetMinutes: 5,
        contentType: 'business_book',
        themes: ['productivity'],
      });

      expect(result.text).toBeTruthy();
      expect(result.format).toBe('narrator');
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('returns conversation script with [Host A] and [Host B] labels', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '[Host A] Hey, welcome to the show! Today we are diving into something really cool.\n[Host B] Absolutely. This book has some fascinating insights about productivity.\n[Host A] Let us break it down for our listeners.',
          },
        ],
      });

      const result = await provider.generateScript('Some source text...', {
        format: 'conversation',
        targetMinutes: 5,
        contentType: 'business_book',
        themes: ['productivity'],
      });

      expect(result.text).toContain('[Host A]');
      expect(result.text).toContain('[Host B]');
      expect(result.format).toBe('conversation');
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('throws on empty content array from analyze()', async () => {
      mockCreate.mockResolvedValue({ content: [] });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Unexpected response type from Claude',
      );
    });

    it('throws on non-text content block from generateScript()', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
      });

      await expect(
        provider.generateScript('Some text', {
          format: 'narrator',
          targetMinutes: 5,
          contentType: 'business_book',
          themes: ['productivity'],
        }),
      ).rejects.toThrow('Unexpected response type from Claude');
    });

    it('throws descriptive error on malformed JSON from analyze()', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Not valid JSON at all' }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Failed to parse analysis response: Not valid JSON at all',
      );
    });

    it('throws on malformed analysis missing required fields', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ contentType: 'business_book' }),
          },
        ],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Invalid analysis response: missing required fields',
      );
    });
  });
});