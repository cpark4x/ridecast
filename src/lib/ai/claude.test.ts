import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: mockCreate,
    };
  },
}));

vi.mock('@/lib/utils/retry', () => ({
  retryWithBackoff: (fn: () => Promise<unknown>) => fn(),
}));

import { ClaudeProvider } from './claude';

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ClaudeProvider();
  });

  describe('analyze', () => {
    it('returns structured analysis from valid Claude JSON', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            contentType: 'business_book',
            format: 'narrator',
            themes: ['leadership', 'strategy'],
            summary: 'A book about leadership strategy',
            suggestedTitle: 'Leadership Strategy Explained',
          }),
        }],
      });

      const result = await provider.analyze('Some book text');

      expect(result).toEqual({
        contentType: 'business_book',
        format: 'narrator',
        themes: ['leadership', 'strategy'],
        summary: 'A book about leadership strategy',
        suggestedTitle: 'Leadership Strategy Explained',
      });
    });

    it('truncates long input to 3000 characters', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            contentType: 'news_article',
            format: 'narrator',
            themes: ['news'],
            summary: 'Summary',
            suggestedTitle: 'Title',
          }),
        }],
      });

      const longText = 'a'.repeat(5000);
      await provider.analyze(longText);

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const prompt = mockCreate.mock.calls[0]?.[0]?.messages?.[0]?.content as string;
      expect(prompt.length).toBeLessThan(5000);
      expect(prompt).toContain('a'.repeat(3000));
    });

    it('throws on empty content array', async () => {
      mockCreate.mockResolvedValue({
        content: [],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Unexpected response type from Claude',
      );
    });

    it('throws on non-text content', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'tool_use',
          id: 'tool-1',
          name: 'search',
          input: {},
        }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Unexpected response type from Claude',
      );
    });

    it('strips markdown json fences before parsing', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: '```json\n{"contentType":"news_article","format":"narrator","themes":["news"],"summary":"Summary","suggestedTitle":"Title"}\n```',
        }],
      });

      const result = await provider.analyze('Some text');

      expect(result.contentType).toBe('news_article');
      expect(result.suggestedTitle).toBe('Title');
    });

    it('throws validation error on malformed JSON', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: '{not-json}',
        }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Failed to parse analysis response from Claude',
      );
    });

    it('throws validation error on invalid content type', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            contentType: 'invalid-type',
            format: 'narrator',
            themes: ['theme'],
            summary: 'Summary',
            suggestedTitle: 'Title',
          }),
        }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Invalid analysis response: missing required fields',
      );
    });

    it('throws validation error when themes is missing', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            contentType: 'business_book',
            format: 'narrator',
            summary: 'Summary',
            suggestedTitle: 'Title',
          }),
        }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Invalid analysis response: missing required fields',
      );
    });

    it('throws validation error when themes is not an array', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            contentType: 'business_book',
            format: 'narrator',
            themes: 'not-an-array',
            summary: 'Summary',
            suggestedTitle: 'Title',
          }),
        }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Invalid analysis response: missing required fields',
      );
    });

    it('throws validation error when a theme is not a string', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            contentType: 'business_book',
            format: 'narrator',
            themes: ['ok', 123],
            summary: 'Summary',
            suggestedTitle: 'Title',
          }),
        }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Invalid analysis response: missing required fields',
      );
    });

    it('throws validation error when format is invalid', async () => {
      mockCreate.mockResolvedValue({
        content: [{
          type: 'text',
          text: JSON.stringify({
            contentType: 'business_book',
            format: 'invalid-format',
            themes: ['theme'],
            summary: 'Summary',
            suggestedTitle: 'Title',
          }),
        }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow(
        'Invalid analysis response: missing required fields',
      );
    });

    it('throws validation error when analyze() text payload is literal "null" (regression: null-guard crash)', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'null' }],
      });

      await expect(provider.analyze('Some text')).rejects.toThrow('Invalid analysis response');
    });
  });
});
