import { describe, it, expect } from 'vitest';
import { extractTxt } from './txt';

describe('extractTxt', () => {
  it('extracts text and counts words', () => {
    const result = extractTxt('The quick brown fox jumps over the lazy dog', 'sample.txt');
    expect(result.text).toBe('The quick brown fox jumps over the lazy dog');
    expect(result.wordCount).toBe(9);
  });

  it('derives title from filename without extension', () => {
    const result = extractTxt('Hello world', 'my-document.txt');
    expect(result.title).toBe('my-document');
  });

  it('trims whitespace from text', () => {
    const result = extractTxt('  hello world  \n', 'test.txt');
    expect(result.text).toBe('hello world');
    expect(result.wordCount).toBe(2);
  });

  it('handles empty text', () => {
    const result = extractTxt('', 'empty.txt');
    expect(result.text).toBe('');
    expect(result.wordCount).toBe(0);
    expect(result.title).toBe('empty');
  });
});