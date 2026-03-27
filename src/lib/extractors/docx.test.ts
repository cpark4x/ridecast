import { describe, it, expect, vi } from 'vitest';

// Mock mammoth before importing the module under test
vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(),
  },
}));

import mammoth from 'mammoth';
import { extractDocx } from './docx';

const mockExtractRawText = mammoth.extractRawText as ReturnType<typeof vi.fn>;

describe('extractDocx', () => {
  it('extracts text from a DOCX buffer and returns title from filename', async () => {
    mockExtractRawText.mockResolvedValue({
      value: 'This is the extracted text from a Word document.',
      messages: [],
    });

    const buffer = Buffer.from('fake docx content');
    const result = await extractDocx(buffer, 'my-report.docx');

    expect(result.title).toBe('my-report');
    expect(result.text).toBe('This is the extracted text from a Word document.');
    expect(result.wordCount).toBe(9);
    expect(mockExtractRawText).toHaveBeenCalledWith({ buffer });
  });

  it('handles empty DOCX (wordCount = 0)', async () => {
    mockExtractRawText.mockResolvedValue({
      value: '',
      messages: [],
    });

    const buffer = Buffer.from('fake empty docx');
    const result = await extractDocx(buffer, 'empty.docx');

    expect(result.title).toBe('empty');
    expect(result.text).toBe('');
    expect(result.wordCount).toBe(0);
  });

  it('strips .doc extension from legacy Word filenames', async () => {
    mockExtractRawText.mockResolvedValue({
      value: 'Some text from legacy doc.',
      messages: [],
    });

    const buffer = Buffer.from('fake doc content');
    const result = await extractDocx(buffer, 'legacy-file.doc');

    expect(result.title).toBe('legacy-file');
    expect(result.wordCount).toBe(5);
  });

  it('propagates mammoth error for corrupt DOCX', async () => {
    mockExtractRawText.mockRejectedValue(
      new Error("Can't find end of central directory : is this a zip file ?"),
    );

    const buffer = Buffer.from('not a real docx');
    await expect(extractDocx(buffer, 'corrupt.docx')).rejects.toThrow('central directory');
  });

  it('trims whitespace-only content to empty string with wordCount 0', async () => {
    mockExtractRawText.mockResolvedValue({
      value: '   \n\n  \t  ',
      messages: [],
    });

    const buffer = Buffer.from('fake docx');
    const result = await extractDocx(buffer, 'blank.docx');

    expect(result.text).toBe('');
    expect(result.wordCount).toBe(0);
  });
});