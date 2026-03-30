import { describe, it, expect } from 'vitest';
import { detectContentType } from './detect';

describe('detectContentType', () => {
  it('detects Google Docs URL', () => {
    expect(
      detectContentType('https://docs.google.com/document/d/abc123/edit', ''),
    ).toBe('google-doc');
  });

  it('detects GitHub blob URL', () => {
    expect(
      detectContentType('https://github.com/owner/repo/blob/main/README.md', ''),
    ).toBe('github');
  });

  it('detects GitHub root repo URL', () => {
    expect(detectContentType('https://github.com/vercel/next.js', '')).toBe('github');
  });

  it('detects Notion URL (.so)', () => {
    expect(detectContentType('https://www.notion.so/myworkspace/Page-abc', '')).toBe('notion');
  });

  it('detects Notion URL (.site)', () => {
    expect(detectContentType('https://myspace.notion.site/page', '')).toBe('notion');
  });

  it('detects .docx by filename', () => {
    expect(detectContentType('', 'report.docx')).toBe('docx');
  });

  it('detects .md by filename', () => {
    expect(detectContentType('', 'README.md')).toBe('markdown');
  });

  it('detects .markdown by filename', () => {
    expect(detectContentType('', 'notes.markdown')).toBe('markdown');
  });

  it('detects .pdf by filename', () => {
    expect(detectContentType('', 'paper.pdf')).toBe('pdf');
  });

  it('detects .epub by filename', () => {
    expect(detectContentType('', 'book.epub')).toBe('epub');
  });

  it('falls back to url for unrecognized input', () => {
    expect(detectContentType('https://example.com/article', '')).toBe('url');
  });

  it('URL detection takes precedence over filename', () => {
    expect(
      detectContentType('https://docs.google.com/document/d/abc/edit', 'something.txt'),
    ).toBe('google-doc');
  });
});
