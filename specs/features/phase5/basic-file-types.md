# Spec: Basic File Type Expansion (DOCX + Markdown)

**Size:** M — 2 pts  
**Phase:** 5  
**Status:** Ready for implementation

---

## Overview

Extend the upload pipeline to accept `.docx` (Word) and `.md` / `.markdown` (Markdown) files. PDF and EPUB already work. Plain `.txt` already works.

New file types:
- `.docx` / `.doc` — Word documents, extracted via the `mammoth` library (converts to plain text via CommonMark Markdown intermediate, images stripped)
- `.md` / `.markdown` — treated as plain text via the existing `extractTxt` function; no Markdown parsing needed

Changes span four layers: the new extractor, the extractor dispatcher, the server-side upload route extension sniff, and the native DocumentPicker MIME filter.

---

## Requirements

### Interfaces

#### `ExtractionResult` (unchanged, `src/lib/extractors/types.ts`)
```ts
export interface ExtractionResult {
  title: string;
  text: string;
  wordCount: number;
  author?: string;
}
```

#### `extractContent` dispatcher signature update (`src/lib/extractors/index.ts`)

Current:
```ts
export async function extractContent(
  input: Buffer | string,
  filename: string,
  sourceType: 'txt' | 'pdf' | 'epub',
): Promise<ExtractionResult>
```

After:
```ts
export async function extractContent(
  input: Buffer | string,
  filename: string,
  sourceType: 'txt' | 'pdf' | 'epub' | 'docx',
): Promise<ExtractionResult>
```

#### New extractor function (`src/lib/extractors/docx.ts`)

```ts
export async function extractDocx(
  buffer: Buffer,
  filename: string,
): Promise<ExtractionResult>
```

Returns `ExtractionResult` with:
- `title`: filename with extension stripped (e.g. `"my-report"` from `"my-report.docx"`)
- `text`: plain text derived from Mammoth's `extractRawText()` output, trimmed
- `wordCount`: `text.split(/\s+/).length` (0 if empty)
- `author`: not available from DOCX metadata via mammoth; omit the field

### Behavior

#### `extractDocx` implementation

Use `mammoth.extractRawText({ buffer })`. This returns `{ value: string, messages: Message[] }` where `value` is the plain-text content and `messages` contains any parse warnings (ignore them).

```ts
import mammoth from 'mammoth';
import type { ExtractionResult } from './types';

export async function extractDocx(
  buffer: Buffer,
  filename: string,
): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  const wordCount = text === '' ? 0 : text.split(/\s+/).length;
  const title = filename.replace(/\.docx?$/i, '');
  return { title, text, wordCount };
}
```

**Why `extractRawText` over `convertToHtml`**: We want clean text for TTS script generation. HTML tags add noise. Raw text extraction gives paragraphs separated by newlines — sufficient for Readability and Claude.

**Images**: Mammoth strips images by default in `extractRawText` — no additional config needed.

**Empty documents**: If `result.value` is empty string, `wordCount = 0`. The upload will succeed and create a content record. The process step may warn about short content — that's acceptable.

#### Extension sniff logic (`src/app/api/upload/route.ts`)

Current logic (lines 72–81):
```ts
if (extension === 'pdf') {
  fileSourceType = 'pdf';
} else if (extension === 'epub') {
  fileSourceType = 'epub';
} else {
  fileSourceType = 'txt';
}
```

New logic:
```ts
if (extension === 'pdf') {
  fileSourceType = 'pdf';
} else if (extension === 'epub') {
  fileSourceType = 'epub';
} else if (extension === 'docx' || extension === 'doc') {
  fileSourceType = 'docx';
} else {
  // txt, md, markdown, and unknown extensions all fall through to plain text
  fileSourceType = 'txt';
}
```

**Note**: `.doc` (legacy Word 97–2003) is included for UX completeness. Mammoth handles `.doc` buffers as well as `.docx` — it auto-detects the format from the binary header. Behaviour is best-effort for `.doc` since the format is undocumented; extraction may be incomplete.

#### `sourceType` in DB for DOCX

Store as `'txt'` in the Prisma `Content.sourceType` field — the schema currently uses `'txt' | 'pdf' | 'epub' | 'url' | 'pocket'`. Adding a `'docx'` enum value requires a Prisma migration, which is out of scope for this S/M feature. Store as `'txt'` — DOCX content is functionally equivalent to plain text once extracted.

**Update**: Change `fileSourceType` variable type in `upload/route.ts` — currently `'txt' | 'pdf' | 'epub'` (line 73). After change: `'txt' | 'pdf' | 'epub' | 'docx'`. But `sourceType` written to the DB must remain `'txt' | 'pdf' | 'epub' | 'url' | 'pocket'`. Use a local coercion:

```ts
// Map docx → txt for storage (no schema migration needed)
const dbSourceType: 'txt' | 'pdf' | 'epub' = fileSourceType === 'docx' ? 'txt' : fileSourceType;
```

Then write `dbSourceType` to `prisma.content.create` instead of `fileSourceType`.

#### DocumentPicker MIME types (`native/components/UploadModal.tsx`)

Current (line 177):
```ts
type: ['application/pdf', 'application/epub+zip', 'text/plain'],
```

Replace with:
```ts
type: [
  'application/pdf',
  'application/epub+zip',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc (legacy)
],
```

**Also update** the file picker label (line 324) — already covered by Spec 3 Change 7, but if Spec 3 is not yet applied:

```tsx
<Text className="text-xs text-gray-400">(PDF, EPUB, TXT, DOCX)</Text>
```

---

## Acceptance Criteria

| # | Scenario | Expected |
|---|----------|----------|
| AC-1 | User picks a `.docx` file from DocumentPicker | DOCX appears in OS file picker; selected and uploaded successfully |
| AC-2 | Valid `.docx` with text content uploaded | Preview card shows extracted title (filename without extension), word count |
| AC-3 | Valid `.docx` uploaded | `Content.sourceType` stored as `'txt'` in DB |
| AC-4 | `.doc` (legacy Word) file uploaded | Extraction attempted via Mammoth; result returned if successful |
| AC-5 | `.md` file uploaded | Treated as plain text; `extractTxt` called; content extracted correctly |
| AC-6 | `.markdown` file uploaded | Same as AC-5 |
| AC-7 | DOCX with embedded images uploaded | Images silently stripped; text extracted; no error |
| AC-8 | Empty DOCX uploaded | Returns `wordCount: 0`, title from filename; no crash |
| AC-9 | Mammoth throws on corrupt `.docx` | Error propagates to upload route catch block; user sees "Could not extract text from this content." |
| AC-10 | `extractContent` called with `sourceType: 'docx'` | Routes to `extractDocx`; TypeScript type-checks cleanly |
| AC-11 | Existing PDF/EPUB/TXT uploads | Behaviour unchanged — regression test |

---

## Edge Cases

- **Password-protected DOCX**: Mammoth throws `Error: File is encrypted`. This propagates to the upload route catch, which returns 500 with the generic "Could not extract text" message. Acceptable for now.
- **`.docx` with only images/tables and no prose**: `extractRawText` may return only whitespace. `wordCount = 0`. The file uploads but the process step will generate a very short or empty script. No crash.
- **`.md` with frontmatter** (YAML `---` blocks): Treated as plain text; frontmatter appears in the extracted text. Acceptable — Claude handles YAML-like preamble gracefully.
- **`.doc` (97-2003 format)**: Mammoth supports it, but extraction quality varies. The upload succeeds or fails — no special error message for this case.
- **MIME type mismatch** (e.g. a file named `.docx` but with wrong MIME): Extension sniff takes precedence over MIME type — the extension is checked at line 72, not the MIME. A `.docx` file with `application/octet-stream` MIME still routes correctly.
- **Large DOCX** (> 400K extracted chars): `truncationWarning` fires at the existing 400K char check in `upload/route.ts` line 129. No new handling needed.
- **Concurrent `extractContent` type union**: Other callers of `extractContent` (if any) pass `'txt' | 'pdf' | 'epub'` — adding `'docx'` to the union is backward-compatible since TypeScript will not widen existing call sites.

---

## Files to Create / Modify

### CREATE `src/lib/extractors/docx.ts`

Full file content:

```ts
import mammoth from 'mammoth';
import type { ExtractionResult } from './types';

/**
 * Extract plain text from a .docx (or .doc) buffer using mammoth.
 * Images are silently dropped — we only need prose for TTS.
 */
export async function extractDocx(
  buffer: Buffer,
  filename: string,
): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  const wordCount = text === '' ? 0 : text.split(/\s+/).length;
  const title = filename.replace(/\.docx?$/i, '');

  return { title, text, wordCount };
}
```

---

### MODIFY `src/lib/extractors/index.ts`

**Current file** (24 lines):
```ts
import { extractTxt } from './txt';
import { extractPdf } from './pdf';
import { extractEpub } from './epub';
import type { ExtractionResult } from './types';

export { extractUrl } from './url';
export type { ExtractionResult } from './types';

export async function extractContent(
  input: Buffer | string,
  filename: string,
  sourceType: 'txt' | 'pdf' | 'epub',
): Promise<ExtractionResult> {
  switch (sourceType) {
    case 'txt': {
      const text = typeof input === 'string' ? input : input.toString('utf-8');
      return extractTxt(text, filename);
    }
    case 'pdf':
      return extractPdf(Buffer.isBuffer(input) ? input : Buffer.from(input), filename);
    case 'epub':
      return extractEpub(Buffer.isBuffer(input) ? input : Buffer.from(input), filename);
  }
}
```

**Replace with**:
```ts
import { extractTxt } from './txt';
import { extractPdf } from './pdf';
import { extractEpub } from './epub';
import { extractDocx } from './docx';
import type { ExtractionResult } from './types';

export { extractUrl } from './url';
export { extractTxt } from './txt';
export type { ExtractionResult } from './types';

export async function extractContent(
  input: Buffer | string,
  filename: string,
  sourceType: 'txt' | 'pdf' | 'epub' | 'docx',
): Promise<ExtractionResult> {
  switch (sourceType) {
    case 'txt': {
      const text = typeof input === 'string' ? input : input.toString('utf-8');
      return extractTxt(text, filename);
    }
    case 'pdf':
      return extractPdf(Buffer.isBuffer(input) ? input : Buffer.from(input), filename);
    case 'epub':
      return extractEpub(Buffer.isBuffer(input) ? input : Buffer.from(input), filename);
    case 'docx':
      return extractDocx(Buffer.isBuffer(input) ? input : Buffer.from(input), filename);
  }
}
```

**Note**: `export { extractTxt }` added here — required by Spec 3 (paste-raw-text). Include regardless of Spec 3 implementation order.

---

### MODIFY `src/app/api/upload/route.ts`

**Change 1** — Import `extractDocx` (line 3):

If Spec 3 is not yet applied:
```ts
import { extractContent, extractDocx, extractUrl } from '@/lib/extractors';
```

If Spec 3 is already applied (adds `extractTxt`):
```ts
import { extractContent, extractDocx, extractTxt, extractUrl } from '@/lib/extractors';
```

**Change 2** — Extension sniff (lines 72–81):

Current:
```ts
      if (extension === 'pdf') {
        fileSourceType = 'pdf';
      } else if (extension === 'epub') {
        fileSourceType = 'epub';
      } else {
        fileSourceType = 'txt';
      }
```

Replace with:
```ts
      if (extension === 'pdf') {
        fileSourceType = 'pdf';
      } else if (extension === 'epub') {
        fileSourceType = 'epub';
      } else if (extension === 'docx' || extension === 'doc') {
        fileSourceType = 'docx';
      } else {
        // txt, md, markdown, and unknown extensions → plain text
        fileSourceType = 'txt';
      }
```

**Change 3** — Update `fileSourceType` variable type (line 73):

Current:
```ts
      let fileSourceType: 'txt' | 'pdf' | 'epub';
```

Replace with:
```ts
      let fileSourceType: 'txt' | 'pdf' | 'epub' | 'docx';
```

**Change 4** — Map `docx` → `txt` for DB storage (after line 89 `sourceType = fileSourceType;`):

After:
```ts
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await extractContent(buffer, file.name, fileSourceType);

      title = result.title;
      text = result.text;
      wordCount = result.wordCount;
      sourceType = fileSourceType;
      author = result.author;
```

Replace the `sourceType = fileSourceType;` line:
```ts
      // DOCX maps to 'txt' in the DB — no schema migration needed
      sourceType = fileSourceType === 'docx' ? 'txt' : fileSourceType;
```

**Note on line numbers**: If Spec 3 (paste-raw-text) has already been applied, the line numbers in `upload/route.ts` will have shifted. The implementing agent must locate the extension sniff by pattern, not line number. The search string `if (extension === 'pdf')` uniquely identifies the block.

---

### MODIFY `native/components/UploadModal.tsx`

**Change 1** — Update DocumentPicker MIME types (line 177):

Current:
```ts
        type: ['application/pdf', 'application/epub+zip', 'text/plain'],
```

Replace with:
```ts
        type: [
          'application/pdf',
          'application/epub+zip',
          'text/plain',
          'text/markdown',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ],
```

**Change 2** — Update file picker label (line 324, if not already updated by Spec 3):

```tsx
                  <Text className="text-xs text-gray-400">(PDF, EPUB, TXT, DOCX)</Text>
```

---

## Dependencies

### New npm package: `mammoth`

```bash
npm install mammoth
```

```bash
npm install --save-dev @types/mammoth
```

Check if `@types/mammoth` is needed: Mammoth ships with its own TypeScript declarations as of v1.6. Run `npm install mammoth` and verify `node_modules/mammoth/typings/` exists. If it does, skip `@types/mammoth`.

**Version**: Use `mammoth@^1.8.0` (latest stable as of early 2025). No known breaking changes from v1.6+.

**Bundle size note**: Mammoth is a Node.js library — it is only used in server-side route handlers (`src/app/api/upload/route.ts`), not in the React Native client bundle. No bundle-size impact on the mobile app.

---

## Notes

- The `'docx'` sourceType is intentionally **not** added to the Prisma schema in this spec. The DB always stores `'txt'`. If a future spec adds a dedicated `docx` sourceType to the schema, the coercion at Change 4 can be removed and the gradient/icon logic in `SourceThumbnail` can be updated separately.
- `SourceThumbnail.tsx` (Spec 2) adds a `'docx': 'document-outline'` entry to `SOURCE_TYPE_ICONS`. Since the DB stores `'txt'`, this entry will never be matched in practice until the schema is updated. It is safe to include now as a forward-compatible placeholder.
- Mammoth's `extractRawText` preserves paragraph structure with `\n` separators. The existing `split(/\s+/)` word count algorithm handles this correctly.
- `.doc` (97-2003 binary format) support is best-effort. Mammoth uses a JavaScript `cfb` (Compound File Binary) parser. Complex formatting may be lost; content should survive in most cases.

---

## Implementation Map

> _Filled in by the implementing agent during platform grounding._

| Step | File | Location | Action |
|------|------|----------|--------|
| 1 | — | Shell | Run `npm install mammoth` in project root |
| 2 | `src/lib/extractors/docx.ts` | Create new file | Full `extractDocx` implementation |
| 3 | `src/lib/extractors/index.ts` | Lines 1–3 (imports) | Add `import { extractDocx }` |
| 4 | `src/lib/extractors/index.ts` | Line 7 (exports) | Add `export { extractTxt }` |
| 5 | `src/lib/extractors/index.ts` | Function signature line 12 | Add `'docx'` to `sourceType` union |
| 6 | `src/lib/extractors/index.ts` | Switch statement | Add `case 'docx': return extractDocx(...)` |
| 7 | `src/app/api/upload/route.ts` | Import line 3 | Add `extractDocx` (or `extractTxt` if Spec 3 active) |
| 8 | `src/app/api/upload/route.ts` | `let fileSourceType` declaration | Widen union to include `'docx'` |
| 9 | `src/app/api/upload/route.ts` | Extension sniff `if/else if` block | Add `docx`/`doc` branch |
| 10 | `src/app/api/upload/route.ts` | `sourceType = fileSourceType` line | Add `docx → 'txt'` coercion |
| 11 | `native/components/UploadModal.tsx` | Line 177 (DocumentPicker type array) | Add 3 new MIME types |
| 12 | `native/components/UploadModal.tsx` | Line 324 (label text) | Add DOCX to label (if not done by Spec 3) |
| 13 | `src/lib/extractors/docx.test.ts` | Create new file | Test: valid docx extracted, empty docx wordCount=0, title stripped |
| 14 | `src/app/api/upload/route.test.ts` | Existing file | Add: .docx upload → success with wordCount; .md upload → txt extraction |
