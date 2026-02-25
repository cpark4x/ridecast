import { describe, it, expect, vi } from 'vitest';

vi.mock('pdf-parse', () => ({
  default: vi.fn(),
}));

import pdfParse from 'pdf-parse';
import { extractPdf } from './pdf';

const mockedPdfParse = vi.mocked(pdfParse);

describe('extractPdf', () => {
  it('extracts text, title, author, and word count from PDF buffer', async () => {
    mockedPdfParse.mockResolvedValue({
      text: '\n  Chapter 1: Introduction\nMachine learning is a subset of artificial intelligence.\n\nChapter 2: Methods\nSupervised learning uses labeled data.\n  ',
      numpages: 2,
      numrender: 2,
      info: {
        Title: 'Machine Learning Basics',
        Author: 'Jane Smith',
      },
      metadata: null,
      version: '1.0',
    });

    const buffer = Buffer.from('fake-pdf-content');
    const result = await extractPdf(buffer, 'fallback-name.pdf');

    expect(result.title).toBe('Machine Learning Basics');
    expect(result.author).toBe('Jane Smith');
    expect(result.text).toBe(
      'Chapter 1: Introduction\nMachine learning is a subset of artificial intelligence.\n\nChapter 2: Methods\nSupervised learning uses labeled data.'
    );
    expect(result.wordCount).toBe(19);
  });

  it('falls back to filename for title when PDF metadata is missing', async () => {
    mockedPdfParse.mockResolvedValue({
      text: 'Some simple content.',
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.0',
    });

    const buffer = Buffer.from('fake-pdf-content');
    const result = await extractPdf(buffer, 'my-report.pdf');

    expect(result.title).toBe('my-report');
    expect(result.author).toBeUndefined();
    expect(result.text).toBe('Some simple content.');
    expect(result.wordCount).toBe(3);
  });
});