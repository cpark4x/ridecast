import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { extractEpub } from './epub';

async function createTestEpub(): Promise<Buffer> {
  const zip = new JSZip();

  // mimetype (must be first, uncompressed in real EPUBs)
  zip.file('mimetype', 'application/epub+zip');

  // META-INF/container.xml
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  // OEBPS/content.opf
  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>Test EPUB Book</dc:title>
    <dc:creator>Test Author</dc:creator>
  </metadata>
  <manifest>
    <item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`
  );

  // Chapter 1
  zip.file(
    'OEBPS/chapter1.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 1</title></head>
<body>
  <h1>Chapter One: The Beginning</h1>
  <p>This is the first paragraph of the first chapter.</p>
  <p>It contains important introductory material.</p>
</body>
</html>`
  );

  // Chapter 2
  zip.file(
    'OEBPS/chapter2.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 2</title></head>
<body>
  <h1>Chapter Two: The Middle</h1>
  <p>This is the second chapter with more content.</p>
  <script>alert("should be removed");</script>
  <style>.hidden { display: none; }</style>
</body>
</html>`
  );

  const arrayBuffer = await zip.generateAsync({ type: 'nodebuffer' });
  return Buffer.from(arrayBuffer);
}

describe('extractEpub', () => {
  it('extracts text, title, author, and wordCount from EPUB', async () => {
    const buffer = await createTestEpub();
    const result = await extractEpub(buffer, 'test-book.epub');

    expect(result.title).toBe('Test EPUB Book');
    expect(result.author).toBe('Test Author');
    expect(result.wordCount).toBeGreaterThan(10);
    expect(result.text).toContain('Chapter One');
    expect(result.text).toContain('second chapter');
  });

  it('strips HTML tags from content', async () => {
    const buffer = await createTestEpub();
    const result = await extractEpub(buffer, 'test-book.epub');

    expect(result.text).not.toContain('<h1>');
    expect(result.text).not.toContain('<p>');
    expect(result.text).not.toContain('</');
    expect(result.text).not.toContain('alert');
    expect(result.text).not.toContain('.hidden');
  });
});
