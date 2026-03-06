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
    provider = new ClaudeProvider();
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

  describe('generateScript() — duration accuracy', () => {
    it('retries when first result is below ±15% tolerance', async () => {
      // targetMinutes=5 → targetWords=750, min=638, max=863
      // 637 words is below the ±15% floor (638) but above the old ±30% floor (525)
      // — so this test only passes with the tightened tolerance
      const shortText = Array(637).fill('word').join(' ');
      const inRangeText = Array(700).fill('word').join(' ');

      mockCreate
        .mockResolvedValueOnce({ content: [{ type: 'text', text: shortText }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: inRangeText }] });

      const result = await provider.generateScript('source text', {
        format: 'narrator',
        targetMinutes: 5,
        contentType: 'business_book',
        themes: ['productivity'],
      });

      expect(result.wordCount).toBe(700);
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });

    it('performs a second retry with hard constraint when first retry is still out of range', async () => {
      // 3 calls total: initial + 1st retry + 2nd retry (hard constraint)
      const shortText = Array(600).fill('word').join(' ');
      const finalText = Array(640).fill('word').join(' ');

      mockCreate
        .mockResolvedValueOnce({ content: [{ type: 'text', text: shortText }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: shortText }] })
        .mockResolvedValueOnce({ content: [{ type: 'text', text: finalText }] });

      const result = await provider.generateScript('source text', {
        format: 'narrator',
        targetMinutes: 5,
        contentType: 'business_book',
        themes: ['productivity'],
      });

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(result.wordCount).toBe(640);
    });

    it('returns best effort after all retries miss and does not throw', async () => {
      const shortText = Array(500).fill('word').join(' ');

      mockCreate.mockResolvedValue({ content: [{ type: 'text', text: shortText }] });

      const result = await provider.generateScript('source text', {
        format: 'narrator',
        targetMinutes: 5,
        contentType: 'business_book',
        themes: ['productivity'],
      });

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(result.wordCount).toBe(500);
      expect(result.text).toBeTruthy();
    });

    it('raises max_tokens floor to 2048 for short targets', async () => {
      // targetMinutes=5 → targetWords=750, targetWords*2=1500 < 2048
      // New code: max_tokens = Math.max(750*2, 2048) = 2048
      const text = Array(750).fill('word').join(' ');
      mockCreate.mockResolvedValue({ content: [{ type: 'text', text }] });

      await provider.generateScript('source text', {
        format: 'narrator',
        targetMinutes: 5,
        contentType: 'business_book',
        themes: ['productivity'],
      });

      const callArgs = mockCreate.mock.calls[0][0] as { max_tokens: number };
      expect(callArgs.max_tokens).toBe(2048);
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