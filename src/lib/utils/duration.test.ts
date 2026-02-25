import { describe, it, expect } from 'vitest';
import { minutesToWords, wordsToMinutes, formatDuration } from './duration';

describe('minutesToWords', () => {
  it('converts minutes to word count at 150 wpm', () => {
    expect(minutesToWords(5)).toBe(750);
    expect(minutesToWords(15)).toBe(2250);
    expect(minutesToWords(20)).toBe(3000);
    expect(minutesToWords(30)).toBe(4500);
  });
});

describe('wordsToMinutes', () => {
  it('converts word count to minutes, rounding', () => {
    expect(wordsToMinutes(3000)).toBe(20);
    expect(wordsToMinutes(1000)).toBe(7);
  });
});

describe('formatDuration', () => {
  it('formats 0 seconds as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats seconds with zero-padded seconds', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('formats larger durations correctly', () => {
    expect(formatDuration(768)).toBe('12:48');
  });

  it('formats exact hour boundary', () => {
    expect(formatDuration(3600)).toBe('60:00');
  });
});
