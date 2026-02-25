import { describe, it, expect } from 'vitest';
import { parseConversationScript, ScriptSegment } from './script-parser';

describe('parseConversationScript', () => {
  it('splits conversation by [Host A]/[Host B] labels into segments with correct speaker and text', () => {
    const script = `[Host A] Welcome to the show!
[Host B] Thanks for having me.
[Host A] Let's get started.`;

    const result = parseConversationScript(script);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ speaker: 'Host A', text: 'Welcome to the show!' });
    expect(result[1]).toEqual({ speaker: 'Host B', text: 'Thanks for having me.' });
    expect(result[2]).toEqual({ speaker: 'Host A', text: "Let's get started." });
  });

  it('handles multi-line speaker turns (text continues until next label)', () => {
    const script = `[Host A] This is the first line.
And this continues the same turn.
Still going.
[Host B] Now it's my turn.`;

    const result = parseConversationScript(script);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      speaker: 'Host A',
      text: 'This is the first line.\nAnd this continues the same turn.\nStill going.',
    });
    expect(result[1]).toEqual({
      speaker: 'Host B',
      text: "Now it's my turn.",
    });
  });

  it('returns empty array for empty input', () => {
    expect(parseConversationScript('')).toEqual([]);
  });

  it('handles text without speaker labels as narrator speaker', () => {
    const script = `Welcome to today's episode.
We have a great show for you.`;

    const result = parseConversationScript(script);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      speaker: 'narrator',
      text: "Welcome to today's episode.\nWe have a great show for you.",
    });
  });
});