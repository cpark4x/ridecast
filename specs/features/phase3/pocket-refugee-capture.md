# Feature: Pocket Refugee Capture

> Three surfaces targeting displaced Pocket users: a bulk importer for their saved history, a browser bookmarklet replacing their daily save habit, and a marketing landing page capturing organic "Pocket alternative" search traffic.

## Motivation

Mozilla shut Pocket down in July 2025. 10M+ users lost their read-later tool overnight. Every replacement app they're evaluating is still fundamentally a reading app. None of them claim "your saved articles become a personal podcast feed." That positioning is wide open, and it's exactly what Ridecast already does.

The three components reinforce each other:
- `/pocket` landing page captures search traffic and converts cold visitors
- Import flow converts them immediately — gives first-session value before they reconsider
- Bookmarklet replaces the muscle memory that made Pocket sticky

## What We're Building

| Component | Entry Point | Purpose |
|---|---|---|
| Pocket Import API | `POST /api/pocket/import` | Parse export file, batch-create Content stubs |
| Pocket Save API | `POST /api/pocket/save` | Single-URL save (used by bookmarklet page) |
| Import UI | `PocketImportScreen` component | Drag+drop import, progress, success state |
| Bookmarklet landing | `GET /save?url=&title=` | Popup target for bookmarklet clicks |
| Marketing page | `/pocket` | SEO landing, pitch, import CTA, bookmarklet copy |

---

## Data Model

**No schema migration required.** Pocket-imported items are "stub" Content records:

```
rawText     = ""          (empty string — valid for String field)
wordCount   = 0
sourceType  = "pocket"    (new value — signals "not yet fetched")
sourceUrl   = <the url>   (required — needed to fetch text later)
title       = <from export file>
contentHash = sha256(userId + ":" + url)  (unique per user+URL)
```

When a user later initiates audio generation for a stub, the process route detects `rawText === ""` and fetches the URL on-demand before continuing. See [Process Route Enhancement](#4-process-route-enhancement-srcappapipro cessroutets).

**Why this approach over a schema change:**
- No migration, no downtime
- `sourceType = "pocket"` is a clear, unambiguous signal
- The Library already handles content with no audio versions — stubs appear naturally
- `wordCount = 0` renders as "0 words" in the Library; that's acceptable for stubs

---

## Component 1 — Import API

**File:** `src/app/api/pocket/import/route.ts` *(create)*

### Request

```
POST /api/pocket/import
Content-Type: multipart/form-data

file: <.html or .csv file>
```

### Response

```typescript
// 200 OK
{ imported: number; skipped: number }

// 400 Bad Request
{ error: "No file provided" }
{ error: "Unrecognized file format. Upload a .html or .csv Pocket export." }

// 403 Forbidden (no active subscription)
{ error: "Subscription required", upgrade_url: "/upgrade" }

// 500 Internal Server Error
{ error: "Import failed." }
```

### Implementation

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contentHash } from '@/lib/utils/hash';
import { getCurrentUserId } from '@/lib/auth';
import { requireSubscription } from '@/lib/subscription';

// Large files need more time than the default 10s
export const maxDuration = 60;

const BATCH_SIZE = 500;

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const gate = await requireSubscription(userId);
    if (gate) return gate;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const filename = file.name.toLowerCase();

    let items: ParsedItem[];
    if (filename.endsWith('.html') || filename.endsWith('.htm')) {
      items = parseHtml(text);
    } else if (filename.endsWith('.csv')) {
      items = parseCsv(text);
    } else {
      return NextResponse.json(
        { error: 'Unrecognized file format. Upload a .html or .csv Pocket export.' },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0 });
    }

    // Load all existing sourceUrls for this user in one query
    // to avoid per-item DB round trips
    const existingUrls = new Set(
      (await prisma.content.findMany({
        where: { userId, sourceUrl: { in: items.map((i) => i.url) } },
        select: { sourceUrl: true },
      })).map((r) => r.sourceUrl as string),
    );

    const newItems = items.filter((i) => !existingUrls.has(i.url));
    const skipped = items.length - newItems.length;

    // Batch createMany to handle 30K+ item files without timeout
    let imported = 0;
    for (let i = 0; i < newItems.length; i += BATCH_SIZE) {
      const batch = newItems.slice(i, i + BATCH_SIZE);
      const result = await prisma.content.createMany({
        data: batch.map((item) => ({
          userId,
          title: item.title || item.url,
          rawText: '',
          wordCount: 0,
          sourceType: 'pocket',
          sourceUrl: item.url,
          contentHash: contentHash(userId + ':' + item.url),
        })),
        skipDuplicates: true, // guard against hash collisions within same batch
      });
      imported += result.count;
    }

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    console.error('Pocket import error:', error);
    return NextResponse.json({ error: 'Import failed.' }, { status: 500 });
  }
}
```

### Parsing Helpers (same file, below the handler)

```typescript
interface ParsedItem {
  url: string;
  title: string;
}

/**
 * Parse Pocket's Netscape Bookmark HTML export.
 * Format: <a href="URL" time_added="..." tags="...">Title</a>
 */
function parseHtml(html: string): ParsedItem[] {
  const results: ParsedItem[] = [];
  // Match <a> tags — Pocket export uses one per line, no nesting
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const url = match[1].trim();
    const title = match[2].trim();
    if (url.startsWith('http')) {
      results.push({ url, title: title || url });
    }
  }
  return results;
}

/**
 * Parse Pocket's CSV export.
 * Header row: title,url,time_added,tags,status
 * Values may be quoted with double-quotes.
 */
function parseCsv(csv: string): ParsedItem[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];

  // Detect column positions from header
  const header = parseCsvLine(lines[0]);
  const titleIdx = header.findIndex((h) => h.toLowerCase() === 'title');
  const urlIdx = header.findIndex((h) => h.toLowerCase() === 'url');

  if (urlIdx === -1) return [];

  const results: ParsedItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const url = cols[urlIdx]?.trim();
    if (!url || !url.startsWith('http')) continue;
    const title = titleIdx !== -1 ? (cols[titleIdx]?.trim() || url) : url;
    results.push({ url, title });
  }
  return results;
}

/** Minimal CSV line parser — handles double-quoted fields containing commas. */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
```

### Middleware

Add to public routes in `src/middleware.ts` — **nothing to add here**. This route requires auth (Pocket import is for logged-in users only). It is already protected by default.

---

## Component 2 — Pocket Save API (Bookmarklet Endpoint)

**File:** `src/app/api/pocket/save/route.ts` *(create)*

Called by the `/save` bookmarklet landing page. Creates a single Content stub.

### Request

```
POST /api/pocket/save
Content-Type: application/json

{ "url": "https://example.com/article", "title": "Article Title" }
```

### Response

```typescript
// 200 OK — newly saved
{ id: string; title: string; alreadySaved: false }

// 200 OK — already exists
{ id: string; title: string; alreadySaved: true }

// 400 Bad Request
{ error: "url is required" }
{ error: "Invalid URL" }

// 403 Forbidden
{ error: "Subscription required", upgrade_url: "/upgrade" }

// 500 Internal Server Error
{ error: "Failed to save." }
```

### Implementation

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { contentHash } from '@/lib/utils/hash';
import { getCurrentUserId } from '@/lib/auth';
import { requireSubscription } from '@/lib/subscription';

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    const gate = await requireSubscription(userId);
    if (gate) return gate;

    const body = await request.json();
    const { url, title } = body as { url?: string; title?: string };

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Basic URL validation
    try { new URL(url); } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Dedup by (userId, sourceUrl)
    const existing = await prisma.content.findFirst({
      where: { userId, sourceUrl: url },
      select: { id: true, title: true },
    });

    if (existing) {
      return NextResponse.json({ id: existing.id, title: existing.title, alreadySaved: true });
    }

    const record = await prisma.content.create({
      data: {
        userId,
        title: title?.trim() || url,
        rawText: '',
        wordCount: 0,
        sourceType: 'pocket',
        sourceUrl: url,
        contentHash: contentHash(userId + ':' + url),
      },
    });

    return NextResponse.json({ id: record.id, title: record.title, alreadySaved: false });
  } catch (error) {
    console.error('Pocket save error:', error);
    return NextResponse.json({ error: 'Failed to save.' }, { status: 500 });
  }
}
```

---

## Component 3 — Bookmarklet Landing Page

**File:** `src/app/save/page.tsx` *(create)*

A small popup window opened by the bookmarklet. POSTs to `/api/pocket/save` on mount, shows a success/error state, auto-closes after 2 seconds on success.

### Behavior

1. Opens as a popup (~480×280px)
2. Reads `url` and `title` from search params
3. On mount, POSTs to `/api/pocket/save`
4. Shows loading → "✓ Saved to Ridecast" (with "Close" button)
5. Auto-closes after 2 seconds on success
6. On error: shows error message with a "Try Again" button

### Implementation

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SavePageInner() {
  const params = useSearchParams();
  const url = params.get('url') ?? '';
  const title = params.get('title') ?? '';

  const [status, setStatus] = useState<'loading' | 'saved' | 'duplicate' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!url) { setStatus('error'); setErrorMsg('No URL provided.'); return; }

    fetch('/api/pocket/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setStatus('error'); setErrorMsg(data.error); return; }
        setStatus(data.alreadySaved ? 'duplicate' : 'saved');
        if (!data.alreadySaved) {
          setTimeout(() => window.close(), 2000);
        }
      })
      .catch(() => { setStatus('error'); setErrorMsg('Something went wrong.'); });
  }, [url, title]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 text-center gap-4">
      {/* Logo mark */}
      <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center mb-1">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
          <circle cx="12" cy="12" r="9" opacity="0.3" />
          <polygon points="10,8 16,12 10,16" />
        </svg>
      </div>

      {status === 'loading' && (
        <p className="text-white/55 text-sm">Saving…</p>
      )}

      {status === 'saved' && (
        <>
          <p className="text-lg font-bold">✓ Saved to Ridecast</p>
          <p className="text-white/55 text-xs">Ready to convert to audio. Closing…</p>
        </>
      )}

      {status === 'duplicate' && (
        <>
          <p className="text-lg font-bold">Already in your library</p>
          <p className="text-white/55 text-xs truncate max-w-xs">{title || url}</p>
          <button onClick={() => window.close()}
            className="mt-2 px-5 py-2 rounded-[10px] bg-white/[0.08] text-sm font-semibold">
            Close
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <p className="text-red-400 font-semibold">Couldn't save</p>
          <p className="text-white/55 text-xs">{errorMsg}</p>
          <a href={`/sign-in?redirect_url=${encodeURIComponent('/save?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title))}`}
            className="mt-2 px-5 py-2 rounded-[10px] bg-indigo-500 text-sm font-semibold">
            Sign in to Ridecast
          </a>
        </>
      )}
    </div>
  );
}

export default function SavePage() {
  return (
    <Suspense>
      <SavePageInner />
    </Suspense>
  );
}
```

### Bookmarklet Source Code

The bookmarklet JS that users drag to their bookmark bar. Replace `<DOMAIN>` with `process.env.NEXT_PUBLIC_APP_URL` at render time on the `/pocket` page.

```javascript
javascript:(function(){
  var w=window.open(
    '<DOMAIN>/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),
    'ridecast_save',
    'width=480,height=280,left='+(screen.width/2-240)+',top='+(screen.height/2-140)
  );
  if(!w){location.href='<DOMAIN>/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title);}
})()
```

The `if(!w)` fallback handles popup blockers — falls back to navigation if the popup is blocked.

**Environment variable required:** Add `NEXT_PUBLIC_APP_URL=https://your-domain.com` to `.env.local` and production config. Used exclusively to generate the bookmarklet string on the `/pocket` page.

---

## Component 4 — Import UI

### 4a. PocketImportScreen Component

**File:** `src/components/PocketImportScreen.tsx` *(create)*

```typescript
'use client';

import { useState, useRef, DragEvent } from 'react';

interface PocketImportScreenProps {
  onComplete: () => void; // navigate to Library when done
}

type ImportState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'done'; imported: number; skipped: number }
  | { phase: 'error'; message: string };

export function PocketImportScreen({ onComplete }: PocketImportScreenProps) {
  const [state, setState] = useState<ImportState>({ phase: 'idle' });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setState({ phase: 'uploading' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/pocket/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setState({ phase: 'error', message: data.error || 'Import failed.' });
        return;
      }
      setState({ phase: 'done', imported: data.imported, skipped: data.skipped });
    } catch {
      setState({ phase: 'error', message: 'Import failed. Please try again.' });
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="p-6 pt-0">
      {/* Header */}
      <div className="text-center pt-4 mb-8">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <circle cx="12" cy="12" r="9" opacity="0.3" />
              <polygon points="10,8 16,12 10,16" />
            </svg>
          </div>
          <span className="text-[22px] font-extrabold tracking-tight bg-gradient-to-br from-white to-white/55 bg-clip-text text-transparent">
            Import from Pocket
          </span>
        </div>
        <p className="text-sm text-white/55">
          Your reading list, finally heard
        </p>
      </div>

      {/* Idle / drop zone */}
      {state.phase === 'idle' && (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-[14px] p-9 text-center cursor-pointer transition-all mb-6 ${
              dragOver
                ? 'border-indigo-500 bg-indigo-500/[0.08]'
                : 'border-indigo-500/30 bg-indigo-500/[0.03]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-10 h-10 stroke-violet-400 fill-none mx-auto mb-3"
              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div className="text-[15px] font-semibold mb-1">Drop your Pocket export here</div>
            <div className="text-xs text-white/55">or tap to browse · .html or .csv</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Instructions */}
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-[12px] p-4">
            <p className="text-[12px] font-semibold text-white/55 uppercase tracking-wider mb-3">
              How to get your Pocket export
            </p>
            <ol className="space-y-2">
              {[
                'Go to getpocket.com/export (while it still works)',
                'Download your list as HTML or CSV',
                'Upload that file here',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {/* Uploading */}
      {state.phase === 'uploading' && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-[15px] font-semibold">Importing your articles…</p>
          <p className="text-sm text-white/55 mt-1">This may take a moment for large libraries</p>
        </div>
      )}

      {/* Done */}
      {state.phase === 'done' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-indigo-500/15 flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" className="w-8 h-8 stroke-indigo-400 fill-none"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[22px] font-bold mb-1">
            {state.imported.toLocaleString()} articles imported
          </p>
          {state.skipped > 0 && (
            <p className="text-sm text-white/40 mb-6">
              {state.skipped.toLocaleString()} already in your library
            </p>
          )}
          {state.skipped === 0 && <div className="mb-6" />}
          <p className="text-sm text-white/55 mb-8">
            Your articles are ready to convert to audio.
            <br />Pick anything from your library to get started.
          </p>
          <button
            onClick={onComplete}
            className="w-full py-3.5 px-7 rounded-[14px] text-[15px] font-semibold text-white bg-gradient-to-br from-indigo-500 to-violet-500 shadow-[0_4px_20px_rgba(99,102,241,0.35)]"
          >
            Go to My Library
          </button>
        </div>
      )}

      {/* Error */}
      {state.phase === 'error' && (
        <div className="text-center py-8">
          <p className="text-red-400 font-semibold text-[15px] mb-2">Import failed</p>
          <p className="text-sm text-white/55 mb-6">{state.message}</p>
          <button
            onClick={() => setState({ phase: 'idle' })}
            className="px-6 py-3 rounded-[12px] bg-white/[0.08] text-sm font-semibold"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
```

### 4b. AppShell — Add `pocket-import` Tab State

**File:** `src/components/AppShell.tsx` *(modify)*

**Add to imports:**
```typescript
import { PocketImportScreen } from './PocketImportScreen';
```

**Add `pocket-import` screen div** (after the Library screen div, before the Player Tab div):
```typescript
{/* Pocket Import Screen */}
<div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "pocket-import" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
  style={{ bottom: "64px" }}>
  <PocketImportScreen onComplete={() => setActiveTab("library")} />
</div>
```

No BottomNav change needed — `pocket-import` is a sub-state of the upload flow, not a top-level nav item.

### 4c. UploadScreen — Add Import from Pocket CTA

**File:** `src/components/UploadScreen.tsx` *(modify)*

**Add `onImportPocket` prop to interface:**
```typescript
interface UploadScreenProps {
  onProcess: (contentId: string, targetMinutes: number) => void;
  onImportPocket: () => void;  // <-- add this
}
```

**Add `onImportPocket` to function signature:**
```typescript
export function UploadScreen({ onProcess, onImportPocket }: UploadScreenProps) {
```

**Add Pocket CTA block** inside the `{!preview && (...)}` section, after the "Works with" grid:

```typescript
{/* Pocket Import CTA */}
<div className="mt-5 p-3.5 rounded-[12px] bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
  <span className="text-xl">📥</span>
  <div className="flex-1 min-w-0">
    <div className="text-[13px] font-semibold">Coming from Pocket?</div>
    <div className="text-[11px] text-white/40">Import your entire reading list</div>
  </div>
  <button
    onClick={onImportPocket}
    className="shrink-0 px-3.5 py-2 rounded-[9px] bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[12px] font-semibold"
  >
    Import
  </button>
</div>
```

**Update AppShell.tsx call site** (the UploadScreen render):
```typescript
<UploadScreen onProcess={handleProcess} onImportPocket={() => setActiveTab("pocket-import")} />
```

---

## Component 5 — Process Route Enhancement

**File:** `src/app/api/process/route.ts` *(modify)*

When a stub Content record (rawText === "") is processed, the route must fetch the article text before generating a script.

**Add import at top of file:**
```typescript
import { extractUrl } from '@/lib/extractors';
import { contentHash } from '@/lib/utils/hash';
```

**Insert after the `content` lookup (after `if (!content)` block), before the AI analysis:**

```typescript
// Pocket stubs: rawText is empty — fetch the URL now on demand
if (content.rawText === '' && content.sourceUrl) {
  try {
    const fetched = await extractUrl(content.sourceUrl);
    await prisma.content.update({
      where: { id: contentId },
      data: {
        rawText: fetched.text,
        wordCount: fetched.wordCount,
        title: fetched.title || content.title,
        sourceType: 'url',
        contentHash: contentHash(fetched.text),
      },
    });
    // Reload with updated data
    content = await prisma.content.findUnique({ where: { id: contentId } }) ?? content;
  } catch (fetchError) {
    console.error('Failed to fetch Pocket article:', { contentId, url: content.sourceUrl, fetchError });
    return NextResponse.json(
      { error: "Couldn't fetch the article from that URL. Check the link is still accessible." },
      { status: 422 },
    );
  }
}
```

**Change `const content` to `let content`** on line where it's declared:
```typescript
// Before:
const content = await prisma.content.findUnique({ where: { id: contentId } });
// After:
let content = await prisma.content.findUnique({ where: { id: contentId } });
```

---

## Component 6 — Upload Route: URL Pre-check for Pocket Dedup

**File:** `src/app/api/upload/route.ts` *(modify)*

When a user pastes a Pocket-imported URL into the upload form, the existing hash-based dedup won't catch it (the stub has a different hash than the extracted text). Add a URL pre-check to return the existing record immediately.

**Insert after `const userId = ...` and gate check, before `const formData = ...`:**

```typescript
// Fast-path: if URL is already in this user's library (including Pocket stubs),
// re-use it so we don't create a duplicate.
// We check before extraction to avoid the network cost of re-fetching.
const rawBody = await request.formData();
const file = rawBody.get('file') as File | null;
const url = rawBody.get('url') as string | null;

if (url) {
  const byUrl = await prisma.content.findFirst({
    where: { userId, sourceUrl: url },
  });
  if (byUrl) {
    if (byUrl.sourceType === 'pocket' && byUrl.rawText === '') {
      // Stub — fetch and populate it now so the caller gets a real preview
      try {
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
      } catch {
        // Fetch failed — fall through to normal upload flow
      }
    } else {
      // Already fully populated — return as 409 dedup
      return NextResponse.json(
        { ...byUrl, error: 'This content has already been uploaded.' },
        { status: 409 },
      );
    }
  }
}
```

> **Note for implementer:** Because `formData()` can only be read once, the existing `const formData = await request.formData()` must be replaced with the `rawBody` declared above. Update all references from `formData` to `rawBody` in the rest of the handler.

---

## Component 7 — Marketing Landing Page

**File:** `src/app/pocket/page.tsx` *(create)*

Standalone page (no AppShell). Public route. Targets "Pocket alternative" search traffic.

### Middleware Update

**File:** `src/middleware.ts` *(modify)*

Add to the `isPublicRoute` matcher:
```typescript
'/pocket',    // marketing landing page — no auth required
```

### Env Variable

`NEXT_PUBLIC_APP_URL` — used to construct the bookmarklet. Add to `.env.local`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
And to production config:
```
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

### Page Implementation

```typescript
import Link from 'next/link';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ridecast.app';

// Bookmarklet — single line, using APP_URL
const BOOKMARKLET = `javascript:(function(){var w=window.open('${APP_URL}/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title),'ridecast_save','width=480,height=280,left='+(screen.width/2-240)+',top='+(screen.height/2-140));if(!w){location.href='${APP_URL}/save?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title);}})()`;

export default function PocketPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <circle cx="12" cy="12" r="9" opacity="0.3" />
              <polygon points="10,8 16,12 10,16" />
            </svg>
          </div>
          <span className="font-bold tracking-tight">Ridecast</span>
        </div>
        <Link href="/sign-up"
          className="px-4 py-2 rounded-[9px] bg-indigo-500 text-sm font-semibold">
          Get Started Free
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-20">

        {/* Hero */}
        <section className="pt-16 pb-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-medium mb-6">
            Pocket closed July 2025
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Your reading list,<br />
            <span className="bg-gradient-to-br from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              finally heard
            </span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed max-w-md mx-auto mb-8">
            Ridecast turns your saved articles into AI-narrated podcast episodes. Stop saving to read later. Start listening on your commute.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/sign-up"
              className="px-7 py-3.5 rounded-[12px] bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-[15px] shadow-[0_4px_20px_rgba(99,102,241,0.4)]">
              Start Free
            </Link>
            <a href="#import"
              className="px-7 py-3.5 rounded-[12px] bg-white/[0.07] border border-white/[0.1] font-semibold text-[15px]">
              Import from Pocket
            </a>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-14">
          <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-wider text-center mb-6">
            How it works
          </h2>
          <div className="grid gap-4">
            {[
              {
                step: '1',
                title: 'Import your Pocket list',
                desc: 'Download your Pocket export and upload it. Your entire reading history appears in Ridecast instantly.',
              },
              {
                step: '2',
                title: 'Pick an article',
                desc: 'Choose anything from your library. Set how long you want the episode — 5, 15, or 30 minutes.',
              },
              {
                step: '3',
                title: 'Listen on your commute',
                desc: 'Ridecast generates a natural-sounding audio episode. Play it anywhere — no headphone cord required.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 p-4 rounded-[12px] bg-white/[0.04] border border-white/[0.06]">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm flex items-center justify-center shrink-0">
                  {step}
                </div>
                <div>
                  <div className="font-semibold mb-0.5">{title}</div>
                  <div className="text-sm text-white/55 leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Import CTA */}
        <section id="import" className="pb-14 text-center">
          <div className="bg-gradient-to-br from-indigo-500/[0.08] to-violet-500/[0.06] border border-indigo-500/20 rounded-[16px] p-8">
            <h2 className="text-xl font-bold mb-2">Import your Pocket history</h2>
            <p className="text-white/55 text-sm mb-6">
              Create an account, then upload your Pocket export file (.html or .csv).
              Your full reading list will be waiting in your library.
            </p>
            <Link href="/sign-up"
              className="inline-block px-7 py-3.5 rounded-[12px] bg-gradient-to-br from-indigo-500 to-violet-500 font-semibold text-[15px] shadow-[0_4px_20px_rgba(99,102,241,0.35)]">
              Create Free Account & Import
            </Link>
          </div>
        </section>

        {/* Bookmarklet */}
        <section className="pb-14">
          <h2 className="text-lg font-bold mb-2">Replace your Pocket button</h2>
          <p className="text-white/55 text-sm mb-5">
            Drag this to your bookmark bar. One click from any article saves it to Ridecast — just like Pocket did.
          </p>

          {/* Draggable bookmarklet link */}
          <div className="flex items-center gap-3 p-4 rounded-[12px] bg-white/[0.04] border border-white/[0.1] border-dashed">
            <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <circle cx="12" cy="12" r="9" opacity="0.3" />
                <polygon points="10,8 16,12 10,16" />
              </svg>
            </div>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href={BOOKMARKLET}
              onClick={(e) => e.preventDefault()}
              draggable
              className="flex-1 font-semibold text-sm text-indigo-300 cursor-grab select-none"
            >
              Save to Ridecast
            </a>
            <span className="text-[11px] text-white/30">← drag to bookmarks bar</span>
          </div>

          <p className="text-xs text-white/30 mt-3 text-center">
            Requires signing in to Ridecast first. Works in Chrome, Firefox, Safari, and Edge.
          </p>
        </section>

        {/* Pricing */}
        <section className="pb-6 text-center">
          <h2 className="text-lg font-bold mb-4">Simple pricing</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-[14px] bg-white/[0.04] border border-white/[0.08] text-left">
              <div className="font-bold mb-1">Free</div>
              <div className="text-2xl font-extrabold mb-3">$0</div>
              <ul className="space-y-1.5 text-sm text-white/60">
                <li>✓ Import your Pocket library</li>
                <li>✓ Save articles via bookmarklet</li>
                <li>✓ Browse the Ridecast catalog</li>
              </ul>
            </div>
            <div className="p-5 rounded-[14px] bg-gradient-to-br from-indigo-500/[0.1] to-violet-500/[0.08] border border-indigo-500/30 text-left">
              <div className="font-bold mb-1">Pro</div>
              <div className="text-2xl font-extrabold mb-3">$10<span className="text-base font-normal text-white/40">/mo</span></div>
              <ul className="space-y-1.5 text-sm text-white/60">
                <li>✓ Convert any article to audio</li>
                <li>✓ Custom episode lengths</li>
                <li>✓ Your full Pocket library, heard</li>
              </ul>
              <Link href="/upgrade"
                className="mt-4 block text-center py-2.5 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
```

---

## Files Summary

### Create

| File | Purpose |
|---|---|
| `src/app/api/pocket/import/route.ts` | Batch import API |
| `src/app/api/pocket/save/route.ts` | Single-URL save API |
| `src/app/save/page.tsx` | Bookmarklet popup landing page |
| `src/app/pocket/page.tsx` | Marketing landing page |
| `src/components/PocketImportScreen.tsx` | Import UI component |

### Modify

| File | Change |
|---|---|
| `src/components/AppShell.tsx` | Import `PocketImportScreen`; add `pocket-import` tab div; pass `onImportPocket` to `UploadScreen` |
| `src/components/UploadScreen.tsx` | Add `onImportPocket` prop; add Pocket CTA block in `{!preview}` section |
| `src/app/api/process/route.ts` | Change `const content` → `let content`; add stub-fetch block after content lookup |
| `src/app/api/upload/route.ts` | Add URL pre-check before extraction; read `formData` once and store as `rawBody` |
| `src/middleware.ts` | Add `'/pocket'` to `isPublicRoute` matcher |
| `.env.local` | Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` |

---

## No Schema Migration Required

The existing `Content` model handles stub records without changes:
- `rawText String` — stores `""` (empty string is valid)
- `sourceType String` — `"pocket"` is a new value, not enum-constrained
- `contentHash String @unique` — use `sha256(userId + ":" + url)` for stubs

The `contentHash` uniqueness contract is satisfied. When a stub is later fetched and populated (by the process route or upload URL pre-check), it updates `contentHash` to `sha256(rawText)` and `sourceType` to `"url"`.

---

## Success Criteria

### Import API

```bash
# Upload a 100-item HTML export
curl -X POST /api/pocket/import -F "file=@pocket_export.html"
# → { "imported": 98, "skipped": 2 }

# Upload same file again — all skipped
curl -X POST /api/pocket/import -F "file=@pocket_export.html"
# → { "imported": 0, "skipped": 100 }

# Upload CSV
curl -X POST /api/pocket/import -F "file=@pocket_export.csv"
# → { "imported": N, "skipped": N }
```

- [ ] HTML export with 100 items → correct `imported` + `skipped` counts
- [ ] CSV export with 100 items → correct counts
- [ ] Re-import same file → 0 imported, all skipped
- [ ] A Content record exists in DB: `sourceType = "pocket"`, `rawText = ""`, `wordCount = 0`, `sourceUrl = <url>`
- [ ] No timeout for 1000-item file (set `maxDuration = 60` on route)

### Pocket Save API

- [ ] POST `{ url: "https://example.com", title: "Test" }` → creates Content record, returns `{ id, title, alreadySaved: false }`
- [ ] Same POST again → returns `{ alreadySaved: true }`, no duplicate record created
- [ ] POST without `url` → 400

### Process Route Enhancement

- [ ] Process a Pocket stub (rawText = "") → route fetches URL, updates record, generates script successfully
- [ ] Process fails gracefully if URL is unreachable → 422 with message "Couldn't fetch the article from that URL."
- [ ] After process, Content record has `rawText` populated, `sourceType = "url"`, `wordCount > 0`
- [ ] Existing non-Pocket content processes without change (rawText !== "" path untouched)

### Upload Route Dedup

- [ ] User imports Pocket URL → later pastes same URL in Upload screen → returns populated content (not a duplicate)
- [ ] If stub is returned, it gets populated with real rawText before returning

### Import UI

- [ ] Pocket CTA appears in UploadScreen when no preview is active
- [ ] Clicking "Import" navigates to PocketImportScreen
- [ ] PocketImportScreen accepts .html and .csv drag+drop and file picker
- [ ] Uploading state shown during API call
- [ ] Success state shows article count and "Go to My Library" button
- [ ] Library tab shows Pocket-imported items (with `wordCount = 0` and no audio versions)

### Bookmarklet

- [ ] Dragging "Save to Ridecast" link to bookmark bar produces a working bookmark
- [ ] Clicking bookmark on any article opens ~480×280 popup
- [ ] Popup shows "✓ Saved to Ridecast" and auto-closes after 2 seconds
- [ ] Clicking the same bookmark again shows "Already in your library"
- [ ] If user is not logged in, popup shows sign-in link

### `/pocket` Landing Page

- [ ] Accessible at `/pocket` without authentication
- [ ] Renders without error: `npm run build && open http://localhost:3000/pocket`
- [ ] "Save to Ridecast" bookmarklet link is draggable
- [ ] "Create Free Account & Import" links to `/sign-up`
- [ ] "Upgrade to Pro" links to `/upgrade`

---

## Out of Scope

The following are explicitly NOT included in this spec:

| What | Why |
|---|---|
| "Convert to Audio" button in Library for Pocket stubs | The existing upload flow (paste URL → get preview → Create Audio) handles this. A dedicated Library convert button is a UX improvement for a follow-up spec. |
| Browser extension (Chrome/Firefox) | An extension requires app store review, a manifest, and ongoing updates. A bookmarklet ships immediately with zero approval friction. It's the right MVP. |
| Tag import / organization | Pocket tags become a library management feature. Not needed for the acquisition flow. |
| OPML or other export formats | Pocket only exported HTML and CSV. No other services use these. |
| Email capture / waitlist | Sign-up flow already exists. `/pocket` links directly to it. |
| RSS feed import | Different user need. Different spec. |
| Scheduled/background URL fetching for stubs | Fetch-on-demand (at process time) is simpler and more reliable than a background job. Users choose what to convert anyway. |
| `wordCount` display in Library for stubs | "0 words" is acceptable. A "Not yet fetched" indicator is a polish improvement, not blocking. |
