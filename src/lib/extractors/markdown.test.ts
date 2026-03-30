import { describe, it, expect } from 'vitest';
import { extractMarkdown } from './markdown';

describe('extractMarkdown', () => {
  it('strips H1 headers', () => {
    const { text } = extractMarkdown('# Title\n\nContent here.');
    expect(text).toBe('Title\n\nContent here.');
  });

  it('strips H2 headers', () => {
    const { text } = extractMarkdown('## Section\n\nText.');
    expect(text).toBe('Section\n\nText.');
  });

  it('strips bold markers', () => {
    const { text } = extractMarkdown('**bold word** in a sentence.');
    expect(text).toBe('bold word in a sentence.');
  });

  it('strips italic markers', () => {
    const { text } = extractMarkdown('*italic* text here.');
    expect(text).toBe('italic text here.');
  });

  it('strips inline code', () => {
    const { text } = extractMarkdown('Use `npm install` to install.');
    expect(text).toBe('Use  to install.');
  });

  it('strips fenced code blocks', () => {
    const { text } = extractMarkdown('```\nconst x = 1;\n```\nAfter code.');
    expect(text).not.toContain('const x');
    expect(text).toContain('After code.');
  });

  it('converts link text but removes URL', () => {
    const { text } = extractMarkdown('[click here](https://example.com)');
    expect(text).toBe('click here');
  });

  it('removes images', () => {
    const { text } = extractMarkdown('Before ![alt](img.png) after.');
    expect(text).toBe('Before  after.');
  });

  it('strips unordered list bullets', () => {
    const { text } = extractMarkdown('- Item one\n- Item two');
    expect(text).toBe('Item one\nItem two');
  });

  it('uses first non-empty line as title', () => {
    const { title } = extractMarkdown('# My Doc\n\nIntro paragraph.');
    expect(title).toBe('My Doc');
  });

  it('computes word count from cleaned text', () => {
    const { wordCount } = extractMarkdown('# Title\n\nOne two three.');
    expect(wordCount).toBe(4); // Title + One + two + three
  });
});
