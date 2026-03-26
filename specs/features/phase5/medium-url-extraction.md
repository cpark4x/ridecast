# Spec: Medium URL Extraction Fix & Graceful Error Handling

**Size:** S — 1 pt  
**Phase:** 5  
**Status:** Ready for implementation

---

## Overview

Two related fixes for URL extraction failures:

1. **Extractor hardening** (`src/lib/extractors/url.ts`): Jina Reader is currently only used as a fallback for HTTP 403. Medium (and many other sites) return 200 with bot-detection walls or JS-only shells — Readability then returns `null`. The fix: try Jina Reader for *any* extraction failure, not just 403.

2. **Upload route error handling** (`src/app/api/upload/route.ts`): When the Pocket stub fast-path calls `extractUrl()` and it throws (lines 33–34), the error propagates to the outer catch block, which pattern-matches on `'Failed to fetch URL: 403'` — a pattern that won't match Medium failures. The upload route needs a dedicated catch around the Pocket stub hydration that returns HTTP 422 with a user-friendly message instead of falling through to a 500.

The net user-visible outcome: pasting a Medium URL shows "We couldn't extract content from this URL. Try pasting the article text directly." instead of the cryptic "Missing required field: scriptID" seen downstream.

---

## Requirements

### Interfaces

No new types. All changes are within existing function bodies.

**`ExtractionResult`** (unchanged, `src/lib/extractors/types.ts`):
```ts
export interface ExtractionResult {
  title: string;
  text: string;
  wordCount: number;
  author?: string;
}
```

### Behavior

#### Fix 1 — `src/lib/extractors/url.ts`

Current logic (lines 44–73):
```
fetch(url)
  → if 403: extractViaJinaReader(url)
  → if !ok: throw "Failed to fetch URL: {status}"
  → parse HTML with JSDOM + Readability
  → if article === null: throw "Could not extract article content from URL"
```

New logic:
```
fetch(url)
  → if 403: extractViaJinaReader(url)           ← unchanged
  → if !ok: try extractViaJinaReader(url)        ← was: throw
      → if Jina also fails: throw "Failed to fetch URL: {status}"
  → parse HTML with JSDOM + Readability
  → if article === null || !article.textContent:
        try extractViaJinaReader(url)            ← NEW
          → if Jina also fails: throw "Could not extract article content from URL"
```

The Jina fallback call is always wrapped in its own try/catch. If Jina fails, re-throw the *original* error so error messages stay meaningful.

#### Fix 2 — `src/app/api/upload/route.ts`

The Pocket stub fast-path (lines 25–53) currently has no catch around the `extractUrl()` call at line 33. An extraction failure bubbles to the outer catch handler at line 134, which only matches:
- `'Failed to fetch URL: 403'` → specific message
- `'ENOTFOUND'` → DNS message
- `'Invalid URL'` → URL shape message
- `'Unsupported'` / `'extract'` → generic extract message

Medium failures produce `"Could not extract article content from URL"` — this matches none of the patterns, so the user sees `"Something went wrong processing your upload."` with HTTP 500.

The fix: wrap the `extractUrl(url)` call at line 33 in a `try/catch` that returns HTTP 422 with a specific user message. This mirrors the identical pattern already implemented in `src/app/api/process/route.ts` at lines 57–77.

**Target message**: `"We couldn't extract content from this URL. Try pasting the article text directly."`

---

## Acceptance Criteria

| # | Scenario | Expected |
|---|----------|----------|
| AC-1 | Medium URL submitted via upload modal | Jina Reader fallback attempted; if Jina succeeds, preview card shown with title/wordCount |
| AC-2 | Medium URL submitted, both direct fetch and Jina fail | HTTP 422 returned from `/api/upload` with `{ error: "We couldn't extract content from this URL. Try pasting the article text directly." }` |
| AC-3 | Any URL returning 200 but Readability yields `null` (JS-wall) | Same Jina fallback attempted |
| AC-4 | URL returning non-403 HTTP error (e.g. 500 from origin) | Jina fallback attempted; if Jina fails, original status code error propagated |
| AC-5 | Valid URL that works normally | Behaviour unchanged — Jina fallback never called |
| AC-6 | Pocket stub URL in upload fast-path fails extraction | HTTP 422 with user-friendly message; no 500; outer catch not reached |
| AC-7 | Pocket stub URL in `process/route.ts` (lines 56–78) fails extraction | Still returns HTTP 422 — this path already has a catch; no change needed |
| AC-8 | `extractViaJinaReader` itself throws | Error propagates as `Error` with message `"Jina Reader returned {status}"` or `"Jina Reader returned no content"` |

---

## Edge Cases

- **Jina rate-limits or is down**: `extractViaJinaReader` throws. In the fallback context, this must re-throw a clear error, not swallow it. In Fix 2 (upload route), this will be caught by the outer `catch` and return 500 — acceptable, since it is truly a server-side service failure.
- **Partial Jina content** (e.g. 10 words returned): Jina succeeds — no minimum word count enforced here. The processing layer handles short content.
- **Medium paywall articles**: Jina Reader also cannot bypass Medium's paywall (it just gets the teaser). The error message "Try pasting the article text directly" is the correct UX outcome.
- **Redirect chains**: `fetch(url, { redirect: 'follow' })` handles these at line 47 — no change needed.
- **URL already in library (non-stub)**: The `byUrl.sourceType !== 'pocket'` branch returns 409 at line 48 — no extraction attempted, not affected.

---

## Files to Create / Modify

### MODIFY `src/lib/extractors/url.ts`

**Current file**: 73 lines  
**Change**: Replace the body of `extractUrl` (lines 44–73) with the version below.

```diff
 export async function extractUrl(url: string): Promise<ExtractionResult> {
   const response = await fetch(url, {
     headers: BROWSER_HEADERS,
     redirect: 'follow',
   });

   // If the site blocks us (common from cloud IPs), fall back to Jina Reader
   if (response.status === 403) {
     return extractViaJinaReader(url);
   }

-  if (!response.ok) {
-    throw new Error(`Failed to fetch URL: ${response.status}`);
-  }
  if (!response.ok) {
    // Non-403 HTTP errors — try Jina before giving up
    try {
      return await extractViaJinaReader(url);
    } catch {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
  }

   const html = await response.text();
   const dom = new JSDOM(html, { url });
   const reader = new Readability(dom.window.document);
   const article = reader.parse();

-  if (!article || !article.textContent) {
-    throw new Error('Could not extract article content from URL');
-  }
  if (!article || !article.textContent) {
    // Readability failed — site may be JS-rendered (e.g. Medium). Try Jina.
    try {
      return await extractViaJinaReader(url);
    } catch {
      throw new Error('Could not extract article content from URL');
    }
  }

   const text = article.textContent.trim();
   const wordCount = text === '' ? 0 : text.split(/\s+/).length;
   const title = article.title || new URL(url).hostname;

   return { title, text, wordCount };
 }
```

**Insertion point**: Replace lines 55–73 (the two `!response.ok` and `!article` branches) with the diff above. The `extractViaJinaReader` function (lines 17–42) is untouched.

---

### MODIFY `src/app/api/upload/route.ts`

**Current file**: 160 lines  
**Change**: Wrap the `extractUrl(url)` call inside the Pocket stub fast-path (lines 30–44) with a try/catch that returns 422.

**Locate**: Lines 30–44 inside `src/app/api/upload/route.ts`:
```ts
      if (byUrl.sourceType === 'pocket' && byUrl.rawText === '') {
        // Stub — fetch and populate it now so the caller gets a real preview.
        // If extraction fails, let it propagate to the outer handler (no double-fetch).
        const fetched = await extractUrl(url);
        const hash = contentHash(fetched.text);
        const updated = await prisma.content.update({
          where: { id: byUrl.id },
          data: {
            rawText: fetched.text,
            wordCount: fetched.wordCount,
            title: fetched.title || byUrl.title,
            sourceType: 'url',
            contentHash: hash,
          },
        });
        return NextResponse.json(updated);
```

**Replace with**:
```ts
      if (byUrl.sourceType === 'pocket' && byUrl.rawText === '') {
        // Stub — fetch and populate it now so the caller gets a real preview.
        let fetched;
        try {
          fetched = await extractUrl(url);
        } catch (extractErr) {
          console.error('Upload: failed to hydrate Pocket stub', { url, extractErr });
          return NextResponse.json(
            { error: "We couldn't extract content from this URL. Try pasting the article text directly." },
            { status: 422 },
          );
        }
        const hash = contentHash(fetched.text);
        const updated = await prisma.content.update({
          where: { id: byUrl.id },
          data: {
            rawText: fetched.text,
            wordCount: fetched.wordCount,
            title: fetched.title || byUrl.title,
            sourceType: 'url',
            contentHash: hash,
          },
        });
        return NextResponse.json(updated);
```

**Old comment** (`// If extraction fails, let it propagate to the outer handler (no double-fetch).`) — **remove it**. It was the documented intention to propagate; the fix reverses that intention.

---

## Dependencies

- No new packages.
- `extractViaJinaReader` (already in `url.ts`) — no changes needed to that function.
- Jina Reader API (`https://r.jina.ai/`) — free, no API key. Rate limits apply per IP.

---

## Notes

- `process/route.ts` lines 56–78 already have the correct `try/catch` pattern around the Pocket stub hydration. No change needed there.
- The outer catch block in `upload/route.ts` (lines 134–158) still handles other errors (auth, DNS, invalid URL). The new 422 path bypasses it entirely via early return.
- Do **not** add the Jina fallback to `url.ts` for the case where `response.status === 403` — that path already uses Jina directly and should remain unchanged to avoid double Jina calls.
- Jina Reader returns Markdown-formatted content. The existing `plainText` strip regex in `extractViaJinaReader` (lines 33–36) handles this. No change to `extractViaJinaReader`.

---

## Implementation Map

> _Filled in by the implementing agent during platform grounding._

| Step | File | Location | Action |
|------|------|----------|--------|
| 1 | `src/lib/extractors/url.ts` | Lines 55–57 (`if (!response.ok)`) | Replace throw with Jina try/catch |
| 2 | `src/lib/extractors/url.ts` | Lines 64–66 (`if (!article \|\| !article.textContent)`) | Replace throw with Jina try/catch |
| 3 | `src/app/api/upload/route.ts` | Lines 30–45 (Pocket stub fast-path) | Wrap `extractUrl` in try/catch → 422 |
| 4 | `src/lib/extractors/url.test.ts` | New test cases | Add: Readability-null triggers Jina, Jina success returns result, both fail throws |
| 5 | `src/app/api/upload/route.test.ts` | Existing test file | Add: Pocket stub extraction failure → 422 with correct message |
