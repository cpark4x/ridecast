# Feature: Content Type Expansion

> Support .docx, Google Docs, Notion pages, GitHub READMEs/docs, and Markdown files — expanding Ridecast beyond PDF/EPUB/TXT/URL.

## Motivation

Users have important content everywhere — not just PDFs and web articles. A Google Doc meeting summary, a Notion project brief, a GitHub repo README, or a `.docx` report are all real candidates for "I want to listen to this." Supporting these sources with clean text extraction means users don't have to convert manually before uploading.

## Changes

### 1. Backend: new content extractors (`src/lib/extractors/`)

Each new content type gets its own extractor module following the same interface:

```typescript
// src/lib/extractors/types.ts
export interface ExtractResult {
  text: string;
  title: string;
  author: string | null;
  wordCount: number;
  sourceType: string;
}

export type Extractor = (input: string) => Promise<ExtractResult>;
// input = URL string or file Buffer depending on extractor
```

#### 1a. `.docx` extractor (`src/lib/extractors/docx.ts`)

```bash
npm install mammoth
```

```typescript
import mammoth from "mammoth";

export async function extractDocx(buffer: Buffer): Promise<ExtractResult> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  const title = text.split("\n")[0].slice(0, 120) || "Untitled Document";
  return {
    text,
    title,
    author: null,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    sourceType: "docx",
  };
}
```

#### 1b. Markdown extractor (`src/lib/extractors/markdown.ts`)

Strip Markdown syntax to extract plain text. Use `remark` + `remark-strip-markdown` or a simple regex approach:

```typescript
// Simple approach — remove common Markdown syntax
export function extractMarkdown(content: string): ExtractResult {
  const cleaned = content
    .replace(/^#{1,6}\s+/gm, "")          // headers
    .replace(/\*\*(.+?)\*\*/g, "$1")       // bold
    .replace(/\*(.+?)\*/g, "$1")           // italic
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "") // code blocks
    .replace(/!?\[([^\]]*)\]\([^\)]*\)/g, "$1") // links/images
    .replace(/^[-*+]\s+/gm, "")           // unordered lists
    .replace(/^\d+\.\s+/gm, "")           // ordered lists
    .replace(/^>\s+/gm, "")               // blockquotes
    .replace(/\n{3,}/g, "\n\n")           // excess whitespace
    .trim();

  const lines = cleaned.split("\n");
  const title = lines[0].slice(0, 120) || "Untitled";
  return {
    text: cleaned,
    title,
    author: null,
    wordCount: cleaned.split(/\s+/).filter(Boolean).length,
    sourceType: "markdown",
  };
}
```

#### 1c. Google Docs extractor (`src/lib/extractors/google-docs.ts`)

Google Docs URLs follow the pattern `docs.google.com/document/d/DOCUMENT_ID/edit`. Use the Google Docs export API (no OAuth required for public docs):

```typescript
export async function extractGoogleDoc(url: string): Promise<ExtractResult> {
  // Extract document ID from URL
  const match = url.match(/\/document\/d\/([-\w]+)/);
  if (!match) throw new Error("Invalid Google Docs URL");
  const docId = match[1];

  // Export as plain text (works for publicly shared docs)
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const response = await fetch(exportUrl);
  if (!response.ok) {
    throw new Error(`Failed to export Google Doc: ${response.status}. The document may not be publicly shared.`);
  }

  const text = await response.text();
  const title = text.split("\n").find(l => l.trim())?.slice(0, 120) ?? "Google Doc";
  return {
    text: text.trim(),
    title,
    author: null,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    sourceType: "google-doc",
  };
}
```

> **Limitation:** Works for publicly-shared documents only. Authenticated Google Docs requires OAuth and is out of scope for this spec.

#### 1d. GitHub README/docs extractor (`src/lib/extractors/github.ts`)

GitHub URLs like `github.com/owner/repo` or `github.com/owner/repo/blob/main/README.md`:

```typescript
export async function extractGithub(url: string): Promise<ExtractResult> {
  // Convert blob URL to raw content URL
  // https://github.com/owner/repo/blob/main/README.md
  // → https://raw.githubusercontent.com/owner/repo/main/README.md
  let rawUrl = url
    .replace("github.com", "raw.githubusercontent.com")
    .replace("/blob/", "/");

  // If root repo URL, fetch README
  if (!rawUrl.includes("/raw.githubusercontent.com")) {
    const match = url.match(/github\.com\/([\w-]+\/[\w-]+)/);
    if (!match) throw new Error("Invalid GitHub URL");
    rawUrl = `https://raw.githubusercontent.com/${match[1]}/main/README.md`;
  }

  const response = await fetch(rawUrl);
  if (!response.ok) throw new Error(`GitHub fetch failed: ${response.status}`);

  const content = await response.text();
  return extractMarkdown(content); // reuse markdown extractor
}
```

#### 1e. Notion extractor (`src/lib/extractors/notion.ts`)

Notion pages require the Notion API with integration token. For now, support public Notion pages via the unofficial `notion-to-md` or HTML scraping approach:

```typescript
// Option A: Use Notion API (requires NOTION_API_KEY + page shared to integration)
// Option B: Scrape the public page HTML (fragile, not recommended)
// Option C: Ask user to export as Markdown or PDF and upload directly

// For this spec: implement as a helpful error message suggesting PDF export
export async function extractNotion(url: string): Promise<ExtractResult> {
  throw new Error(
    "Notion pages require Notion API integration. " +
    "For now, export your Notion page as PDF or Markdown and upload that file instead."
  );
}
```

> Notion API integration (with OAuth) is a follow-up. This spec adds the routing and a helpful fallback message.

### 2. Backend: URL routing to correct extractor (`src/app/api/upload/route.ts`)

Update the upload route to detect content type and route to the correct extractor:

```typescript
import { detectContentType } from "@/lib/extractors/detect";

// In POST /api/upload:
const contentType = detectContentType(url ?? "", file?.name ?? "");

switch (contentType) {
  case "google-doc":   return extractGoogleDoc(url);
  case "github":       return extractGithub(url);
  case "notion":       return extractNotion(url);  // throws with helpful message
  case "docx":         return extractDocx(fileBuffer);
  case "markdown":     return extractMarkdown(fileContent);
  default:             // existing PDF/EPUB/TXT/URL handling
}
```

**`detectContentType` function:**
```typescript
export function detectContentType(url: string, filename: string): string {
  if (url.includes("docs.google.com/document")) return "google-doc";
  if (url.includes("github.com")) return "github";
  if (url.includes("notion.so") || url.includes("notion.site")) return "notion";
  if (filename.endsWith(".docx")) return "docx";
  if (filename.endsWith(".md") || filename.endsWith(".markdown")) return "markdown";
  if (filename.endsWith(".pdf")) return "pdf";
  if (filename.endsWith(".epub")) return "epub";
  if (filename.endsWith(".txt")) return "txt";
  return "url"; // default: scrape as webpage
}
```

### 3. Native: update UploadModal to handle new file types

In `native/components/UploadModal.tsx`, update the file picker to accept new types:

```typescript
import * as DocumentPicker from "expo-document-picker";

async function handleFilePick() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/pdf",
      "application/epub+zip",
      "text/plain",
      "text/markdown",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    ],
    multiple: false,
  });
  ...
}
```

Update the "supported formats" hint text below the file picker button:
```
PDF, EPUB, TXT, Markdown, Word (.docx)
```

### 4. Update `sourceType` values

`sourceType` in `types.ts` is currently a free-form string. Document the new valid values:

```typescript
// Valid sourceType values (not enforced as a union type, but documented):
// "pdf" | "epub" | "txt" | "url" | "docx" | "markdown" | "google-doc" | "github" | "notion"
```

Update `SOURCE_BADGE` in `EpisodeCard.tsx` and `SourceIcon.tsx` to handle new types:

```typescript
const SOURCE_META: Record<string, { icon: string; color: string; label: string }> = {
  ...existing,
  docx:        { icon: "📝", color: "#2563EB", label: "DOCX"       },
  markdown:    { icon: "📋", color: "#374151", label: "Markdown"   },
  "google-doc":{ icon: "📊", color: "#4285F4", label: "Google Doc" },
  github:      { icon: "⚙️", color: "#1F2937", label: "GitHub"     },
  notion:      { icon: "⬜", color: "#000000", label: "Notion"     },
};
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/lib/extractors/docx.ts` | New — mammoth-based .docx text extraction |
| `src/lib/extractors/markdown.ts` | New — Markdown stripping to plain text |
| `src/lib/extractors/google-docs.ts` | New — Google Docs export API |
| `src/lib/extractors/github.ts` | New — GitHub raw content + README fetching |
| `src/lib/extractors/notion.ts` | New — helpful error message, placeholder |
| `src/lib/extractors/detect.ts` | New — URL/filename → content type detection |
| `src/app/api/upload/route.ts` | Route to correct extractor based on detected type |
| `native/components/UploadModal.tsx` | Accept .docx and .md in file picker |
| `native/components/EpisodeCard.tsx` | Add new sourceType badge styles |
| `native/components/SourceIcon.tsx` | Add new sourceType icons |
| `package.json` | Add `mammoth` |

## Tests

```typescript
// src/lib/extractors/extractors.test.ts
describe("detectContentType", () => {
  it("detects Google Docs URL", () => {
    expect(detectContentType("https://docs.google.com/document/d/abc/edit", "")).toBe("google-doc");
  });
  it("detects GitHub URL", () => {
    expect(detectContentType("https://github.com/owner/repo", "")).toBe("github");
  });
  it("detects .docx by filename", () => {
    expect(detectContentType("", "report.docx")).toBe("docx");
  });
  it("detects .md by filename", () => {
    expect(detectContentType("", "README.md")).toBe("markdown");
  });
});

describe("extractMarkdown", () => {
  it("strips headers", () => {
    const result = extractMarkdown("# Title\n\nContent here.");
    expect(result.text).toBe("Title\n\nContent here.");
  });
  it("strips bold/italic", () => {
    const result = extractMarkdown("**bold** and *italic*");
    expect(result.text).toBe("bold and italic");
  });
});
```

## Success Criteria

```bash
npm run test  # extractors.test.ts passes
npm run build # no type errors
```

- [ ] .docx upload extracts text correctly
- [ ] Google Docs URL (public doc) extracts text
- [ ] GitHub README URL shows markdown content
- [ ] Notion URL returns helpful error message
- [ ] New source types show correct icons in EpisodeCard

## Scope

- **No** Notion OAuth integration
- **No** Google Docs for private/authenticated documents
- **No** Google Sheets, Slides, or other Google Workspace types
- **No** Microsoft Word online (Office 365) links — local .docx file upload only
- Markdown extraction is regex-based, not full AST parsing (good enough for plain text)
