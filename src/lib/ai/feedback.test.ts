import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

vi.mock('@/lib/utils/retry', () => ({
  retryWithBackoff: (fn: () => Promise<unknown>) => fn(),
}));

import { categorizeFeedback, type FeedbackCategory } from './feedback';

describe('categorizeFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns category, summary, priority, and duplicateOf from Claude response', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: 'Bug',
          summary: 'App crashes when opening library',
          priority: 'Critical',
          duplicateOf: null,
        }),
      }],
    });

    const result = await categorizeFeedback({
      text: 'The app crashes every time I open my library',
      screenContext: 'Library',
    });

    expect(result.category).toBe('Bug');
    expect(result.summary).toBe('App crashes when opening library');
    expect(result.priority).toBe('Critical');
    expect(result.duplicateOf).toBeNull();
  });

  it('strips markdown fences from Claude response before parsing', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: '```json\n{"category":"Feature Request","summary":"Wants dark mode","priority":"Low","duplicateOf":null}\n```',
      }],
    });

    const result = await categorizeFeedback({
      text: 'Can you add dark mode?',
      screenContext: 'Settings',
    });

    expect(result.category).toBe('Feature Request');
    expect(result.summary).toBe('Wants dark mode');
  });

  it('includes telemetry context in Claude prompt when provided', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: 'Playback Issue',
          summary: 'Audio stops during playback',
          priority: 'High',
          duplicateOf: null,
        }),
      }],
    });

    await categorizeFeedback({
      text: 'Audio keeps stopping',
      screenContext: 'Player',
      telemetryEvents: [{
        eventType: 'playback_failure',
        metadata: { error: 'buffer underrun' },
      }],
    });

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('playback_failure');
    expect(prompt).toContain('buffer underrun');
  });

  it('includes episodeId in prompt when provided', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category: 'Content Quality',
          summary: 'Bad narration quality',
          priority: 'Medium',
          duplicateOf: null,
        }),
      }],
    });

    await categorizeFeedback({
      text: 'The narration sounds robotic',
      screenContext: 'Player',
      episodeId: 'episode-123',
    });

    const prompt = mockCreate.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain('episode-123');
  });

  it('throws on empty content array from Claude', async () => {
    mockCreate.mockResolvedValue({ content: [] });

    await expect(categorizeFeedback({
      text: 'Test',
      screenContext: 'Home',
    })).rejects.toThrow('Unexpected response type from Claude');
  });

  it('throws on malformed JSON response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Not valid JSON' }],
    });

    await expect(categorizeFeedback({
      text: 'Test',
      screenContext: 'Home',
    })).rejects.toThrow('Failed to parse feedback analysis');
  });

  it('throws when response is missing required fields', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ category: 'Bug' }) }],
    });

    await expect(categorizeFeedback({
      text: 'Test',
      screenContext: 'Home',
    })).rejects.toThrow('Invalid feedback analysis: missing required fields');
  });

  it.each([
    ['category', { category: 'InvalidCategory', summary: 'Some summary', priority: 'High', duplicateOf: null }],
    ['priority', { category: 'Bug', summary: 'Some summary', priority: 'Urgent', duplicateOf: null }],
  ])('throws when %s is an invalid enum value', async (_field, payload) => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(payload) }],
    });

    await expect(categorizeFeedback({
      text: 'Test',
      screenContext: 'Home',
    })).rejects.toThrow('Invalid feedback analysis');
  });

  it('rejects with validation error when Claude returns literal "null" payload (regression: null-guard crash)', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'null' }],
    });

    await expect(categorizeFeedback({
      text: 'Test',
      screenContext: 'Home',
    })).rejects.toThrow('Invalid feedback analysis');
  });

  it.each<FeedbackCategory>([
    'Bug',
    'UX Friction',
    'Feature Request',
    'Content Quality',
    'Playback Issue',
  ])('accepts valid category: %s', async (category) => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          category,
          summary: 'Some summary',
          priority: 'High',
          duplicateOf: null,
        }),
      }],
    });

    const result = await categorizeFeedback({ text: 'Test', screenContext: 'Home' });
    expect(result.category).toBe(category);
  });
});
