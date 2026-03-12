# Feature: Content Type Expansion

> Support `.docx`, Google Docs (public), GitHub READMEs, and Markdown files — expanding Ridecast beyond PDF/EPUB/TXT/URL with clean text extractors and updated native file picker.

## Motivation

Users have important content everywhere — not just PDFs and web articles. A Google Doc meeting summary, a GitHub repo README, or a `.docx` report are all real candidates for "I want to listen to this." Supporting these sources with clean text extraction means users don't have to convert manually before uploading.

## Scope

- **New server extractors** under `src/lib/extractors/` — docx, markdown, google-docs, github, notion stub
- **`src/lib/extractors/detect.ts`** — URL/filename → content type router
- **`src/app/api/upload/route.ts`** — route to new extractors based on detected type
- **`native/components/UploadModal.tsx`** — add `.docx` and `.md` to file picker; update hint text
- **`native/components/SourceIcon.tsx` / `EpisodeCard.tsx`** — add icons/colors for new source types
- **No** Notion OAuth integration — shows a helpful error message instead
- **No** Google Docs for private/authenticated documents
- **No** Google Sheets, Slides, or other Google Workspace types
- **No** Microsoft Word Online links — local `.docx` file upload only
- Markdown extraction is regex-based, not full AST parsing

## Changes

### 1. Extractor interface — `src/lib/extractors/types.ts` (new)

```typescript
// src/lib/extractors/types.ts

export interface ExtractResult {
  text: string;
  title: string;
  author: string | null;
  wordCount: number;
  sourceType: string;
}

export type FileExtractor = (buffer: Buffer) => Promise<ExtractResult>;
export type UrlExtractor  = (url: string)    => Promise<ExtractResult>;
export type TextExtractor = (content: string) => ExtractResult;
```

### 2. Markdown extractor — `src/lib/extractors/markdown.ts` (new)

```typescript
// src/lib/extractors/markdown.ts
import type { ExtractResult } from "./types";

/**
 * Strips common Markdown syntax to produce clean plain text for TTS.
 * Regex-based — handles the 95% case without a full AST parse.
 */
export function extractMarkdown(content: string): ExtractResult {
  const cleaned = content
    .replace(/^#{1,6}\s+/gm, "")              // remove heading markers
    .replace(/\*\*(.+?)\*\*/gs, "$1")          // **bold** → bold
    .replace(/\*(.+?)\*/gs, "$1")              // *italic* → italic
    .replace(/_{1,2}(.+?)_{1,2}/gs, "$1")      // _italic_ / __bold__
    .replace(/~~(.+?)~~/gs, "$1")              // ~~strikethrough~~
    .replace(/`{3}[\s\S]*?`{3}/g, "")          // remove fenced code blocks
    .replace(/`[^`]+`/g, "")                   // remove inline code
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")    // remove images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")   // [link text](url) → link text
    .replace(/^\s*[-*+]\s+/gm, "")             // unordered list bullets
    .replace(/^\s*\d+\.\s+/gm, "")             // ordered list numbers
    .replace(/^>\s*/gm, "")                    // blockquotes
    .replace(/^-{3,}$/gm, "")                  // horizontal rules
    .replace(/\n{3,}/g, "\n\n")                // collapse excess blank lines
    .trim();

  const lines = cleaned.split("\n").filter((l) => l.trim().length > 0);
  const title = lines[0]?.slice(0, 120) ?? "Untitled";

  return {
    text: cleaned,
    title,
    author: null,
    wordCount: cleaned.split(/\s+/).filter(Boolean).length,
    sourceType: "markdown",
  };
}
```

### 3. `.docx` extractor — `src/lib/extractors/docx.ts` (new)

```bash
# Install in server package
npm install mammoth
npm install --save-dev @types/mammoth
```

```typescript
// src/lib/extractors/docx.ts
import mammoth from "mammoth";
import type { ExtractResult } from "./types";

export async function extractDocx(buffer: Buffer): Promise<ExtractResult> {
  const result = await mammoth.extractRawText({ buffer });

  if (result.messages.some((m) => m.type === "error")) {
    const errors = result.messages
      .filter((m) => m.type === "error")
      .map((m) => m.message)
      .join("; ");
    throw new Error(`DOCX extraction errors: ${errors}`);
  }

  const text = result.value.trim();
  if (!text) throw new Error("DOCX file appears to be empty or unreadable.");

  // First non-empty line as title
  const title =
    text
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.slice(0, 120) ?? "Untitled Document";

  return {
    text,
    title,
    author: null,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    sourceType: "docx",
  };
}
```

### 4. Google Docs extractor — `src/lib/extractors/google-docs.ts` (new)

```typescript
// src/lib/extractors/google-docs.ts
import type { ExtractResult } from "./types";

/**
 * Exports a publicly-shared Google Doc as plain text.
 * Only works for docs with "Anyone with the link can view" sharing.
 */
export async function extractGoogleDoc(url: string): Promise<ExtractResult> {
  const match = url.match(/\/document\/d\/([-\w]+)/);
  if (!match) {
    throw new Error(
      "Invalid Google Docs URL. Expected: https://docs.google.com/document/d/DOCUMENT_ID/...",
    );
  }
  const docId = match[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  const response = await fetch(exportUrl, {
    headers: { "User-Agent": "Ridecast/1.0 (+https://ridecast.app)" },
    redirect: "follow",
  });

  if (response.status === 403 || response.status === 401) {
    throw new Error(
      "This Google Doc is private. Change sharing to 'Anyone with the link can view' and try again.",
    );
  }
  if (!response.ok) {
    throw new Error(
      `Failed to export Google Doc (status ${response.status}). Ensure the document is publicly shared.`,
    );
  }

  const text = (await response.text()).trim();
  if (!text) throw new Error("Google Doc appears to be empty.");

  const title =
    text
      .split("\n")
      .find((l) => l.trim().length > 0)
      ?.slice(0, 120) ?? "Google Doc";

  return {
    text,
    title,
    author: null,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    sourceType: "google-doc",
  };
}
```

### 5. GitHub extractor — `src/lib/extractors/github.ts` (new)

```typescript
// src/lib/extractors/github.ts
import { extractMarkdown } from "./markdown";
import type { ExtractResult } from "./types";

/**
 * Fetches a GitHub file or repo README as raw text.
 * Supports:
 *   - Blob URLs: github.com/owner/repo/blob/branch/path/to/file.md
 *   - Root repo: github.com/owner/repo  →  fetches README.md
 */
export async function extractGithub(url: string): Promise<ExtractResult> {
  const rawUrl = githubUrlToRaw(url);

  const response = await fetch(rawUrl, {
    headers: { "User-Agent": "Ridecast/1.0 (+https://ridecast.app)" },
  });

  if (response.status === 404) {
    throw new Error(
      `GitHub file not found. If this is a repo URL, make sure it has a README.md on the main branch.`,
    );
  }
  if (!response.ok) {
    throw new Error(`GitHub fetch failed (status ${response.status}).`);
  }

  const content = await response.text();
  const result = extractMarkdown(content);

  // Override sourceType for provenance
  return { ...result, sourceType: "github" };
}

function githubUrlToRaw(url: string): string {
  // Blob URL: github.com/owner/repo/blob/branch/path → raw.githubusercontent.com/owner/repo/branch/path
  const blobMatch = url.match(
    /github\.com\/([\w-]+\/[\w.-]+)\/blob\/([\w.-]+)\/(.+)/,
  );
  if (blobMatch) {
    const [, repo, branch, path] = blobMatch;
    return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
  }

  // Root repo URL: github.com/owner/repo — fetch main README
  const repoMatch = url.match(/github\.com\/([\w-]+\/[\w.-]+)\/?$/);
  if (repoMatch) {
    const [, repo] = repoMatch;
    // Try main then master
    return `https://raw.githubusercontent.com/${repo}/main/README.md`;
  }

  throw new Error(
    `Unrecognized GitHub URL format. Try: github.com/owner/repo or github.com/owner/repo/blob/main/README.md`,
  );
}
```

### 6. Notion placeholder — `src/lib/extractors/notion.ts` (new)

```typescript
// src/lib/extractors/notion.ts
import type { ExtractResult } from "./types";

/**
 * Notion API integration requires OAuth and is out of scope for v1.
 * This extractor throws a helpful user-facing message.
 */
export async function extractNotion(_url: string): Promise<ExtractResult> {
  throw new Error(
    "Notion pages require API integration which is not yet supported. " +
      "Export your Notion page as PDF or Markdown: " +
      "Notion → ⋯ → Export → PDF or Markdown & CSV, then upload that file.",
  );
}
```

### 7. Content type detection — `src/lib/extractors/detect.ts` (new)

```typescript
// src/lib/extractors/detect.ts

export type ContentType =
  | "google-doc"
  | "github"
  | "notion"
  | "docx"
  | "markdown"
  | "pdf"
  | "epub"
  | "txt"
  | "url";

/**
 * Detects content type from a URL and/or filename.
 * URL takes precedence over filename for hosted content.
 */
export function detectContentType(url: string, filename: string): ContentType {
  const normalizedUrl = url.toLowerCase().trim();
  const normalizedFilename = filename.toLowerCase().trim();

  // URL-based detection (takes precedence)
  if (normalizedUrl.includes("docs.google.com/document")) return "google-doc";
  if (normalizedUrl.includes("github.com"))              return "github";
  if (
    normalizedUrl.includes("notion.so") ||
    normalizedUrl.includes("notion.site")
  )
    return "notion";

  // Filename-based detection
  if (normalizedFilename.endsWith(".docx"))              return "docx";
  if (normalizedFilename.endsWith(".md") ||
      normalizedFilename.endsWith(".markdown"))          return "markdown";
  if (normalizedFilename.endsWith(".pdf"))               return "pdf";
  if (normalizedFilename.endsWith(".epub"))              return "epub";
  if (normalizedFilename.endsWith(".txt"))               return "txt";

  // Default: treat as webpage URL to scrape
  return "url";
}
```

### 8. Upload route update — `src/app/api/upload/route.ts`

**Before** (extractor dispatch section, approximate):
```typescript
// Existing routing — only handles pdf, epub, txt, url
```

**After** — insert new cases before the default `url` handler:
```typescript
import { detectContentType } from "@/lib/extractors/detect";
import { extractMarkdown }   from "@/lib/extractors/markdown";
import { extractDocx }       from "@/lib/extractors/docx";
import { extractGoogleDoc }  from "@/lib/extractors/google-docs";
import { extractGithub }     from "@/lib/extractors/github";
import { extractNotion }     from "@/lib/extractors/notion";

// Inside POST handler, after receiving url/file:
const detectedType = detectContentType(url ?? "", file?.name ?? "");

let extracted: ExtractResult;

switch (detectedType) {
  case "google-doc":
    extracted = await extractGoogleDoc(url!);
    break;

  case "github":
    extracted = await extractGithub(url!);
    break;

  case "notion":
    // Throws with helpful message — caught below and returned as 422
    extracted = await extractNotion(url!);
    break;

  case "docx": {
    const buffer = Buffer.from(await file!.arrayBuffer());
    extracted = await extractDocx(buffer);
    break;
  }

  case "markdown": {
    const content = await file!.text();
    extracted = extractMarkdown(content);
    break;
  }

  // Existing cases: pdf, epub, txt, url
  default:
    extracted = await existingExtractor(detectedType, url, file);
    break;
}
```

Wrap the switch in a try/catch that returns a 422 with `error` for user-facing extraction failures:
```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : "Extraction failed";
  return Response.json({ error: message }, { status: 422 });
}
```

### 9. Native file picker update — `native/components/UploadModal.tsx`

**Before** (`DocumentPicker.getDocumentAsync` call):
```typescript
result = await DocumentPicker.getDocumentAsync({
  type: [
    "application/pdf",
    "application/epub+zip",
    "text/plain",
  ],
  copyToCacheDirectory: true,
});
```

**After:**
```typescript
result = await DocumentPicker.getDocumentAsync({
  type: [
    "application/pdf",
    "application/epub+zip",
    "text/plain",
    "text/markdown",
    // .docx MIME type
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  copyToCacheDirectory: true,
});
```

**Before** (format hint text below file picker button):
```tsx
<Text className="text-xs text-gray-400">(PDF, EPUB, TXT)</Text>
```

**After:**
```tsx
<Text className="text-xs text-gray-400">(PDF, EPUB, TXT, Markdown, Word .docx)</Text>
```

### 10. New source type icons/colors — `native/components/SourceIcon.tsx`

**Before** (SOURCE_META map, approximate):
```typescript
const SOURCE_META: Record<string, { color: string; label: string }> = {
  pdf:  { color: "#DC2626", label: "PDF"  },
  epub: { color: "#7C3AED", label: "EPUB" },
  txt:  { color: "#374151", label: "TXT"  },
  url:  { color: "#EA580C", label: "WEB"  },
};
```

**After** — add new source types:
```typescript
const SOURCE_META: Record<string, { color: string; label: string }> = {
  // Existing
  pdf:          { color: "#DC2626", label: "PDF"        },
  epub:         { color: "#7C3AED", label: "EPUB"       },
  txt:          { color: "#374151", label: "TXT"        },
  url:          { color: "#EA580C", label: "WEB"        },
  // New
  docx:         { color: "#2563EB", label: "DOCX"       },
  markdown:     { color: "#374151", label: "MD"         },
  "google-doc": { color: "#4285F4", label: "GDOC"       },
  github:       { color: "#1F2937", label: "GH"         },
  notion:       { color: "#000000", label: "N"          },
};
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/lib/extractors/types.ts` | **New** — `ExtractResult`, `FileExtractor`, `UrlExtractor`, `TextExtractor` interfaces |
| `src/lib/extractors/markdown.ts` | **New** — regex-based Markdown → plain text |
| `src/lib/extractors/docx.ts` | **New** — mammoth `.docx` text extraction |
| `src/lib/extractors/google-docs.ts` | **New** — Google Docs public export |
| `src/lib/extractors/github.ts` | **New** — GitHub blob/repo raw fetch + reuse markdown extractor |
| `src/lib/extractors/notion.ts` | **New** — helpful error message placeholder |
| `src/lib/extractors/detect.ts` | **New** — URL/filename → `ContentType` detection |
| `src/app/api/upload/route.ts` | Route to new extractors via `detectContentType`; wrap in try/catch → 422 |
| `native/components/UploadModal.tsx` | Add `.docx` and `.md` MIME types to `DocumentPicker`; update hint text |
| `native/components/SourceIcon.tsx` | Add `docx`, `markdown`, `google-doc`, `github`, `notion` to `SOURCE_META` |
| `package.json` (server root) | Add `mammoth` |

## Tests

```typescript
// src/lib/extractors/detect.test.ts
import { detectContentType } from "./detect";

describe("detectContentType", () => {
  it("detects Google Docs URL", () => {
    expect(
      detectContentType("https://docs.google.com/document/d/abc123/edit", ""),
    ).toBe("google-doc");
  });

  it("detects GitHub blob URL", () => {
    expect(
      detectContentType("https://github.com/owner/repo/blob/main/README.md", ""),
    ).toBe("github");
  });

  it("detects GitHub root repo URL", () => {
    expect(detectContentType("https://github.com/vercel/next.js", "")).toBe("github");
  });

  it("detects Notion URL (.so)", () => {
    expect(detectContentType("https://www.notion.so/myworkspace/Page-abc", "")).toBe("notion");
  });

  it("detects Notion URL (.site)", () => {
    expect(detectContentType("https://myspace.notion.site/page", "")).toBe("notion");
  });

  it("detects .docx by filename", () => {
    expect(detectContentType("", "report.docx")).toBe("docx");
  });

  it("detects .md by filename", () => {
    expect(detectContentType("", "README.md")).toBe("markdown");
  });

  it("detects .markdown by filename", () => {
    expect(detectContentType("", "notes.markdown")).toBe("markdown");
  });

  it("detects .pdf by filename", () => {
    expect(detectContentType("", "paper.pdf")).toBe("pdf");
  });

  it("detects .epub by filename", () => {
    expect(detectContentType("", "book.epub")).toBe("epub");
  });

  it("falls back to url for unrecognized input", () => {
    expect(detectContentType("https://example.com/article", "")).toBe("url");
  });

  it("URL detection takes precedence over filename", () => {
    // URL clearly google-doc even if filename is .txt
    expect(
      detectContentType("https://docs.google.com/document/d/abc/edit", "something.txt"),
    ).toBe("google-doc");
  });
});

// src/lib/extractors/markdown.test.ts
import { extractMarkdown } from "./markdown";

describe("extractMarkdown", () => {
  it("strips H1 headers", () => {
    const { text } = extractMarkdown("# Title\n\nContent here.");
    expect(text).toBe("Title\n\nContent here.");
  });

  it("strips H2 headers", () => {
    const { text } = extractMarkdown("## Section\n\nText.");
    expect(text).toBe("Section\n\nText.");
  });

  it("strips bold markers", () => {
    const { text } = extractMarkdown("**bold word** in a sentence.");
    expect(text).toBe("bold word in a sentence.");
  });

  it("strips italic markers", () => {
    const { text } = extractMarkdown("*italic* text here.");
    expect(text).toBe("italic text here.");
  });

  it("strips inline code", () => {
    const { text } = extractMarkdown("Use `npm install` to install.");
    expect(text).toBe("Use  to install.");
  });

  it("strips fenced code blocks", () => {
    const { text } = extractMarkdown("```\nconst x = 1;\n```\nAfter code.");
    expect(text).not.toContain("const x");
    expect(text).toContain("After code.");
  });

  it("converts link text but removes URL", () => {
    const { text } = extractMarkdown("[click here](https://example.com)");
    expect(text).toBe("click here");
  });

  it("removes images", () => {
    const { text } = extractMarkdown("Before ![alt](img.png) after.");
    expect(text).toBe("Before  after.");
  });

  it("strips unordered list bullets", () => {
    const { text } = extractMarkdown("- Item one\n- Item two");
    expect(text).toBe("Item one\nItem two");
  });

  it("uses first non-empty line as title", () => {
    const { title } = extractMarkdown("# My Doc\n\nIntro paragraph.");
    expect(title).toBe("My Doc");
  });

  it("computes word count from cleaned text", () => {
    const { wordCount } = extractMarkdown("# Title\n\nOne two three.");
    expect(wordCount).toBe(4); // Title + One + two + three
  });
});
```

## Success Criteria

```bash
# Server unit tests
npm run test -- --testPathPattern="extractors"
# → detect.test.ts: 12 tests passed
# → markdown.test.ts: 11 tests passed

# Type check server
npm run build
# → 0 type errors

# Manual end-to-end:
# 1. Upload README.md from any local repo → Library shows source type "MD" icon (dark gray)
# 2. Upload a .docx file → Library shows source type "DOCX" icon (blue)
# 3. Paste https://docs.google.com/document/d/PUBLIC_DOC_ID/edit → extracts and shows "GDOC" icon
# 4. Paste https://github.com/vercel/next.js → extracts README, shows "GH" icon
# 5. Paste any notion.so URL → shows 422 error with helpful message about exporting
# 6. Native file picker: ".docx" and ".md" files are selectable (test on device)
```

- `.docx` upload extracts text correctly and creates an episode
- Google Docs URL (public doc) extracts text and creates an episode
- GitHub README URL extracts markdown content and creates an episode
- Notion URL returns a helpful 422 error message — not a crash
- New source types show correct icons/colors in `EpisodeCard` and `SourceCard`
