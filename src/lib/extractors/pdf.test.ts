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

    // extractPdf wraps the Buffer in a fresh Uint8Array to avoid pdf.js
    // byteOffset issues; verify the call received a Uint8Array with the
    // same bytes.
    const calledWith = mockedPdfParse.mock.calls[0][0] as Uint8Array;
    expect(calledWith).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(calledWith).equals(buffer)).toBe(true);
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

    // extractPdf wraps the Buffer in a fresh Uint8Array; verify same bytes.
    const calledWith = mockedPdfParse.mock.calls[1][0] as Uint8Array;
    expect(calledWith).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(calledWith).equals(buffer)).toBe(true);
    expect(result.title).toBe('my-report');
    expect(result.author).toBeUndefined();
    expect(result.text).toBe('Some simple content.');
    expect(result.wordCount).toBe(3);
  });

  it('throws a "password-protected" message for encrypted PDFs', async () => {
    mockedPdfParse.mockRejectedValue(new Error('PDF is encrypted'));

    await expect(extractPdf(Buffer.from('encrypted'), 'secret.pdf')).rejects.toThrow(
      'password-protected',
    );
  });

  it('throws a generic corrupted-file message for unreadable PDFs', async () => {
    mockedPdfParse.mockRejectedValue(new Error('bad XRef entry'));

    await expect(extractPdf(Buffer.from('corrupt'), 'bad.pdf')).rejects.toThrow(
      'corrupted',
    );
  });

  it('strips .PDF extension case-insensitively for title fallback', async () => {
    mockedPdfParse.mockResolvedValue({
      text: 'Content here.',
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.0',
    });

    const result = await extractPdf(Buffer.from('fake'), 'ANNUAL-REPORT.PDF');
    expect(result.title).toBe('ANNUAL-REPORT');
  });
});