# Pipeline Resilience Implementation Plan

> **Execution:** Use the subagent-driven-development workflow to implement this plan.

**Goal:** Make the 3-step content pipeline resilient to dropped connections by adding idempotent steps, `pipelineStatus` DB tracking, and a fire-and-poll recovery pattern in ProcessingScreen.

**Architecture:** Each API route checks for already-completed work before calling external services (idempotency), and bookends its work with `pipelineStatus` updates on the Content record. ProcessingScreen fires API calls without awaiting them, then polls `/api/library` every 3s for `pipelineStatus` transitions — allowing it to resume automatically after a dropped connection.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma + PostgreSQL, Vitest (NOT Jest), React 19, Tailwind CSS

---

## Before You Start

Read these source files to understand the baseline:
- `prisma/schema.prisma` — Content model (does not yet have `pipelineStatus`/`pipelineError`)
- `src/app/api/process/route.ts` — Has a 409 duplicate-duration check (line 44–53) that will be replaced
- `src/app/api/audio/generate/route.ts` — `script` variable is declared inside the try block (must move before try to be accessible in catch)
- `src/app/api/library/route.ts` — `items.map()` does not yet include `pipelineStatus`/`pipelineError`
- `src/components/ProcessingScreen.tsx` — Sequential `await` pattern to be replaced with fire-and-poll

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add two fields to the Content model**

In `prisma/schema.prisma`, find the `model Content` block. After the `updatedAt` field (line 35) and before the relations block, add:

```prisma
  pipelineStatus String   @default("idle")
  pipelineError  String?
```

The Content model should look like this after the change:

```prisma
model Content {
  id          String   @id @default(uuid())
  userId      String
  title       String
  author      String?
  rawText     String
  wordCount   Int
  sourceType  String
  sourceUrl   String?
  contentHash String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  pipelineStatus String   @default("idle")
  pipelineError  String?

  user    User     @relation(fields: [userId], references: [id])
  scripts Script[]
}
```

**Step 2: Run the migration**

```bash
cd /Users/chrispark/Projects/ridecast2
npx prisma migrate dev --name add-pipeline-status
```

Expected: Migration file created and applied successfully.

**Step 3: Regenerate the Prisma client**

```bash
npx prisma generate
```

Expected: Client generated with the new fields.

**Step 4: Verify existing test suite still passes**

```bash
npm test
```

Expected: All existing tests pass. 0 failures. (The new fields have defaults, so no existing test is affected.)

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add pipelineStatus + pipelineError to Content"
```

---

## Task 2: Reset Route — Write Failing Test

**Files:**
- Create: `src/app/api/content/[id]/reset/route.test.ts`

**Step 1: Create the test file**

Create `src/app/api/content/[id]/reset/route.test.ts` with this exact content:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user_test123'),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    content: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';
import { POST } from './route';

const mockFindUnique = prisma.content.findUnique as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.content.update as ReturnType<typeof vi.fn>;

function createRequest(contentId: string): Request {
  return new Request(`http://localhost/api/content/${contentId}/reset`, {
    method: 'POST',
  });
}

describe('POST /api/content/[id]/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue('user_test123');
  });

  it('returns 200 and resets pipelineStatus to idle with pipelineError null', async () => {
    const contentRecord = {
      id: 'content-1',
      userId: 'user_test123',
      pipelineStatus: 'error',
      pipelineError: 'Something went wrong',
    };
    mockFindUnique.mockResolvedValue(contentRecord);
    const updatedRecord = { ...contentRecord, pipelineStatus: 'idle', pipelineError: null };
    mockUpdate.mockResolvedValue(updatedRecord);

    const response = await POST(
      createRequest('content-1'),
      { params: Promise.resolve({ id: 'content-1' }) },
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pipelineStatus).toBe('idle');
    expect(data.pipelineError).toBeNull();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { pipelineStatus: 'idle', pipelineError: null },
    });
  });

  it('returns 404 if content is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await POST(
      createRequest('nonexistent'),
      { params: Promise.resolve({ id: 'nonexistent' }) },
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Content not found');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 403 if content belongs to a different user', async () => {
    mockFindUnique.mockResolvedValue({
      id: 'content-1',
      userId: 'other_user',
      pipelineStatus: 'error',
      pipelineError: 'oops',
    });

    const response = await POST(
      createRequest('content-1'),
      { params: Promise.resolve({ id: 'content-1' }) },
    );
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run the test to verify it fails**

```bash
npm test src/app/api/content/\\[id\\]/reset/route.test.ts
```

Expected: FAIL — `Cannot find module './route'`

---

## Task 3: Reset Route — Implementation

**Files:**
- Create: `src/app/api/content/[id]/reset/route.ts`

**Step 1: Create the route handler**

Create `src/app/api/content/[id]/reset/route.ts` with this exact content:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/auth';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getCurrentUserId();
    const { id } = await params;

    const content = await prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    if (content.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.content.update({
      where: { id },
      data: { pipelineStatus: 'idle', pipelineError: null },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset pipeline status' },
      { status: 500 },
    );
  }
}
```

**Step 2: Run the test to verify it passes**

```bash
npm test src/app/api/content/\\[id\\]/reset/route.test.ts
```

Expected: PASS — 3 tests passing.

**Step 3: Commit**

```bash
git add src/app/api/content/\[id\]/reset/
git commit -m "feat(api): add POST /api/content/[id]/reset route"
```

---

## Task 4: /api/process Idempotency — Write Failing Tests

**Files:**
- Modify: `src/app/api/process/route.test.ts`

**Step 1: Update the existing 409 test — it must now expect 200**

The existing test `'verbatim mode still rejects duplicate duration'` (around line 382) tests the OLD behavior (returning 409). That 409 is being replaced by idempotent return. **Replace** the entire test with this updated version:

```typescript
it('verbatim mode returns existing script when duplicate duration requested (idempotent)', async () => {
  const existingScript = {
    id: 'script-existing',
    contentId: 'content-1',
    format: 'verbatim',
    targetDuration: 5,
    actualWordCount: 3,
    compressionRatio: 1,
    scriptText: 'Some content that is long enough to pass the minimum character guard check here.',
    contentType: null,
    themes: [],
    summary: null,
  };
  const contentRecord = {
    id: 'content-1',
    rawText: 'Some content that is long enough to pass the minimum character guard check here.',
    wordCount: 3,
    scripts: [existingScript],
  };

  mockFindUnique.mockResolvedValue(contentRecord);

  const request = createJsonRequest({
    contentId: 'content-1',
    targetMinutes: 5,
    format: 'verbatim',
  });
  const response = await POST(request);
  const data = await response.json();

  // Idempotent — returns existing script, no 409
  expect(response.status).toBe(200);
  expect(data.id).toBe('script-existing');
  // Must NOT create a duplicate script
  expect(mockScriptCreate).not.toHaveBeenCalled();
});
```

**Step 2: Add new tests for pipelineStatus tracking and idempotency**

At the end of the `describe('POST /api/process', ...)` block, add these new test cases:

```typescript
  it('sets pipelineStatus to scripting at start of processing', async () => {
    const mockContentUpdate = prisma.content.update as ReturnType<typeof vi.fn>;
    const contentRecord = {
      id: 'content-1',
      rawText: 'Some content that is long enough to pass the minimum character guard check here.',
      wordCount: 5000,
      scripts: [],
    };
    mockFindUnique.mockResolvedValue(contentRecord);
    mockAnalyze.mockResolvedValue({
      contentType: 'essay',
      format: 'narrator',
      themes: ['tech'],
      summary: 'A tech essay.',
      suggestedTitle: 'Tech Insights',
    });
    mockGenerateScript.mockResolvedValue({ text: 'word '.repeat(720), wordCount: 720, format: 'narrator' });
    mockScriptCreate.mockResolvedValue({ id: 'script-1' });

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    await POST(request);

    // The first content.update call should set status to 'scripting'
    const firstUpdateCall = mockContentUpdate.mock.calls[0];
    expect(firstUpdateCall[0]).toMatchObject({
      where: { id: 'content-1' },
      data: { pipelineStatus: 'scripting', pipelineError: null },
    });
  });

  it('sets pipelineStatus to generating after successful script creation', async () => {
    const mockContentUpdate = prisma.content.update as ReturnType<typeof vi.fn>;
    const contentRecord = {
      id: 'content-1',
      rawText: 'Some content that is long enough to pass the minimum character guard check here.',
      wordCount: 5000,
      scripts: [],
    };
    mockFindUnique.mockResolvedValue(contentRecord);
    mockAnalyze.mockResolvedValue({
      contentType: 'essay',
      format: 'narrator',
      themes: ['tech'],
      summary: 'A tech essay.',
      suggestedTitle: 'Tech Insights',
    });
    mockGenerateScript.mockResolvedValue({ text: 'word '.repeat(720), wordCount: 720, format: 'narrator' });
    mockScriptCreate.mockResolvedValue({ id: 'script-1' });

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    await POST(request);

    // A content.update call should set status to 'generating'
    const updateCalls = mockContentUpdate.mock.calls;
    const generatingCall = updateCalls.find(
      (call) => call[0]?.data?.pipelineStatus === 'generating',
    );
    expect(generatingCall).toBeDefined();
    expect(generatingCall[0]).toMatchObject({
      where: { id: 'content-1' },
      data: { pipelineStatus: 'generating' },
    });
  });

  it('sets pipelineStatus to error when Claude throws', async () => {
    const mockContentUpdate = prisma.content.update as ReturnType<typeof vi.fn>;
    const contentRecord = {
      id: 'content-1',
      rawText: 'Some content that is long enough to pass the minimum character guard check here.',
      wordCount: 5000,
      scripts: [],
    };
    mockFindUnique.mockResolvedValue(contentRecord);
    mockAnalyze.mockRejectedValue(new Error('rate limit exceeded 429'));

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    const response = await POST(request);

    expect(response.status).toBe(500);
    // content.update in catch should set status to 'error'
    const updateCalls = mockContentUpdate.mock.calls;
    const errorCall = updateCalls.find(
      (call) => call[0]?.data?.pipelineStatus === 'error',
    );
    expect(errorCall).toBeDefined();
    expect(errorCall[0].data.pipelineError).toBeTruthy();
    expect(errorCall[0].data.pipelineError).toContain('busy');
  });

  it('returns existing script idempotently when called again for same duration (AI mode)', async () => {
    const existingScript = {
      id: 'script-existing',
      contentId: 'content-1',
      format: 'narrator',
      targetDuration: 15,
      actualWordCount: 1500,
      compressionRatio: 0.15,
      scriptText: 'Existing script content.',
      contentType: 'essay',
      themes: ['tech'],
      summary: 'Tech summary.',
    };
    const contentRecord = {
      id: 'content-1',
      rawText: 'Some content that is long enough to pass the minimum character guard check here.',
      wordCount: 10000,
      scripts: [existingScript],
    };
    mockFindUnique.mockResolvedValue(contentRecord);

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 15 });
    const response = await POST(request);
    const data = await response.json();

    // Returns existing script, no duplicate Claude call
    expect(response.status).toBe(200);
    expect(data.id).toBe('script-existing');
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(mockScriptCreate).not.toHaveBeenCalled();
  });

  it('returns existing script when pipelineStatus is scripting (mid-flight recovery)', async () => {
    const existingScript = {
      id: 'script-in-progress',
      contentId: 'content-1',
      format: 'narrator',
      targetDuration: 10,
      actualWordCount: 1000,
      compressionRatio: 0.1,
      scriptText: 'Partially created script.',
      contentType: 'essay',
      themes: [],
      summary: null,
    };
    const contentRecord = {
      id: 'content-1',
      rawText: 'Some content that is long enough to pass the minimum character guard check here.',
      wordCount: 10000,
      scripts: [existingScript],
      pipelineStatus: 'scripting',
    };
    mockFindUnique.mockResolvedValue(contentRecord);

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 10 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('script-in-progress');
    expect(mockAnalyze).not.toHaveBeenCalled();
    expect(mockScriptCreate).not.toHaveBeenCalled();
  });
```

**Step 3: Run the tests to verify they fail**

```bash
npm test src/app/api/process/route.test.ts
```

Expected: Multiple FAIL — the 409 test now expects 200 but still gets 409. The new status-tracking tests fail because `content.update` is never called.

---

## Task 5: /api/process — Add Idempotency + Status Bookends

**Files:**
- Modify: `src/app/api/process/route.ts`

**Step 1: Add the pipelineStatus='scripting' bookend after the 404 check**

Find the block that checks `if (!content)` (around line 37). Immediately after its closing brace, add the status update:

```typescript
    if (!content) {
      return NextResponse.json(
        { error: 'Content not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    // Mark pipeline as started — visible to polling clients immediately
    await prisma.content.update({
      where: { id: contentId },
      data: { pipelineStatus: 'scripting', pipelineError: null },
    });
```

**Step 2: Replace the 409 duplicate-duration check with an idempotent return**

Find and **replace** the entire duplicate-duration block (lines 44–53 of the original):

```typescript
    // Reject duplicate duration — no point generating the same length twice
    const existingDuration = content.scripts.find(
      (s) => s.targetDuration === targetMinutes,
    );
    if (existingDuration) {
      return NextResponse.json(
        { error: `You already have a ${targetMinutes}-minute version of this episode.` },
        { status: 409 },
      );
    }
```

Replace with:

```typescript
    // Idempotency: return existing script for this duration (supports recovery after dropped connections)
    const existingScript = content.scripts.find(
      (s) => s.targetDuration === targetMinutes,
    );
    if (existingScript) {
      return NextResponse.json({ ...existingScript, durationAdvisory: null });
    }
```

**Step 3: Add pipelineStatus='generating' after verbatim script creation**

In the verbatim mode block, after `prisma.script.create` succeeds and before the return, add the status update:

```typescript
    if (format === 'verbatim') {
      const script = await prisma.script.create({
        data: {
          contentId,
          format: 'verbatim',
          targetDuration: targetMinutes,
          actualWordCount: content.wordCount,
          compressionRatio: 1,
          scriptText: content.rawText,
          contentType: null,
          themes: [],
          summary: null,
        },
      });

      await prisma.content.update({
        where: { id: contentId },
        data: { pipelineStatus: 'generating' },
      });

      return NextResponse.json({ ...script, durationAdvisory: null });
    }
```

**Step 4: Add pipelineStatus='generating' after AI script creation**

In the AI mode, find the block where `prisma.script.create` saves the script (around line 140). After `script` is assigned, add the status update before the advisory calculation:

```typescript
    const script = await prisma.script.create({
      data: {
        contentId,
        format: generated.format,
        targetDuration: targetMinutes,
        actualWordCount: generated.wordCount,
        compressionRatio: content.wordCount > 0
          ? generated.wordCount / content.wordCount
          : 0,
        scriptText: generated.text,
        contentType: analysis.contentType,
        themes: analysis.themes,
        summary: analysis.summary?.trim() || null,
      },
    });

    await prisma.content.update({
      where: { id: contentId },
      data: { pipelineStatus: 'generating' },
    });

    // Surface advisory when generated word count misses ±15% tolerance.
```

**Step 5: Add pipelineStatus='error' in the catch block**

In the `catch` block, after `message` and `code` are resolved but before the `return`, add a best-effort status update. The `contentId` variable is declared before the try block so it's accessible here:

```typescript
  } catch (error) {
    console.error('Process error:', { contentId, error });

    let message = 'Something went wrong while processing your content.';
    let code: string = 'PROCESSING_FAILED';
    if (error instanceof Error) {
      if (error.message.includes('prompt is too long')) {
        message = 'This document is too large to process. Try a shorter file or select a shorter duration.';
        code = 'CONTENT_TOO_LONG';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        message = 'AI service is busy. Please wait a moment and try again.';
        code = 'RATE_LIMITED';
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        message = 'AI service is not configured properly. Check your API keys.';
        code = 'AI_UNAVAILABLE';
      } else if (error.message.toLowerCase().includes('overloaded') || error.message.includes('529')) {
        message = "Couldn't reach the AI service — try again in a moment.";
        code = 'AI_UNAVAILABLE';
      }
    }

    // Best-effort status update — don't mask the original error
    if (contentId) {
      await prisma.content.update({
        where: { id: contentId },
        data: { pipelineStatus: 'error', pipelineError: message },
      }).catch(() => {});
    }

    return NextResponse.json(
      { error: message, code },
      { status: 500 },
    );
  }
```

**Step 6: Run the tests to verify they pass**

```bash
npm test src/app/api/process/route.test.ts
```

Expected: PASS — all tests passing including the updated 409→idempotent test and the new status-tracking tests.

**Step 7: Commit**

```bash
git add src/app/api/process/route.ts src/app/api/process/route.test.ts
git commit -m "feat(api): add idempotency + status tracking to /api/process"
```

---

## Task 6: /api/audio/generate Idempotency — Write Failing Tests

**Files:**
- Modify: `src/app/api/audio/generate/route.test.ts`

**Step 1: Expand the prisma mock to include `content.update` and `audio.findFirst`**

Find the prisma mock block (around line 29–38) and replace it:

```typescript
// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    script: {
      findUnique: vi.fn(),
    },
    audio: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    content: {
      update: vi.fn(),
    },
  },
}));
```

**Step 2: Add references to the new mock functions after the existing import block**

After the existing lines:
```typescript
const mockFindUnique = prisma.script.findUnique as ReturnType<typeof vi.fn>;
const mockAudioCreate = prisma.audio.create as ReturnType<typeof vi.fn>;
```

Add:
```typescript
const mockAudioFindFirst = prisma.audio.findFirst as ReturnType<typeof vi.fn>;
const mockContentUpdate = prisma.content.update as ReturnType<typeof vi.fn>;
```

**Step 3: Initialize the new mocks in `beforeEach`**

Add to the `beforeEach` block:
```typescript
    mockAudioFindFirst.mockResolvedValue(null); // no existing audio by default
    mockContentUpdate.mockResolvedValue({});
```

**Step 4: Add the new test cases**

At the end of the `describe('POST /api/audio/generate', ...)` block, add:

```typescript
  it('returns existing audio idempotently when audio already exists for scriptId', async () => {
    const scriptRecord = {
      id: 'script-1',
      contentId: 'content-1',
      format: 'narrator',
      scriptText: 'Hello world.',
      targetDuration: 5,
      actualWordCount: 2,
    };
    const existingAudio = {
      id: 'audio-existing',
      scriptId: 'script-1',
      filePath: 'audio/existing.mp3',
      durationSecs: 300,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockAudioFindFirst.mockResolvedValue(existingAudio);

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('audio-existing');
    // TTS must NOT have been called
    expect(mockGenerateSpeech).not.toHaveBeenCalled();
    expect(mockAudioCreate).not.toHaveBeenCalled();
  });

  it('sets Content.pipelineStatus to ready after successful audio creation', async () => {
    const scriptRecord = {
      id: 'script-1',
      contentId: 'content-1',
      format: 'narrator',
      scriptText: 'Hello world.',
      targetDuration: 5,
      actualWordCount: 2,
    };
    mockFindUnique.mockResolvedValue(scriptRecord);
    mockAudioFindFirst.mockResolvedValue(null);
    mockGenerateSpeech.mockResolvedValue(Buffer.from('audio'));
    mockParseBuffer.mockResolvedValue({ format: { duration: 60 } });
    mockAudioCreate.mockResolvedValue({
      id: 'audio-1',
      scriptId: 'script-1',
      filePath: 'audio/test.mp3',
      durationSecs: 60,
      voices: ['alloy'],
      ttsProvider: 'openai',
    });

    const request = createJsonRequest({ scriptId: 'script-1' });
    await POST(request);

    const readyCall = mockContentUpdate.mock.calls.find(
      (call) => call[0]?.data?.pipelineStatus === 'ready',
    );
    expect(readyCall).toBeDefined();
    expect(readyCall[0]).toMatchObject({
      where: { id: 'content-1' },
      data: { pipelineStatus: 'ready' },
    });
  });

  it('sets Content.pipelineStatus to error when TTS fails', async () => {
    const scriptRecord = {
      id: 'script-1',
      contentId: 'content-1',
      format: 'narrator',
      scriptText: 'Hello world.',
      targetDuration: 5,
      actualWordCount: 2,
    };
    mockFindUnique.mockResolvedValue(scriptRecord);
    mockAudioFindFirst.mockResolvedValue(null);
    mockGenerateSpeech.mockRejectedValue(new Error('rate limit exceeded 429'));

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const errorCall = mockContentUpdate.mock.calls.find(
      (call) => call[0]?.data?.pipelineStatus === 'error',
    );
    expect(errorCall).toBeDefined();
    expect(errorCall[0].data.pipelineError).toBeTruthy();
  });

  it('sets pipelineStatus ready when returning existing audio (idempotency path)', async () => {
    const scriptRecord = {
      id: 'script-1',
      contentId: 'content-1',
      format: 'narrator',
      scriptText: 'Hello world.',
      targetDuration: 5,
      actualWordCount: 2,
    };
    const existingAudio = {
      id: 'audio-existing',
      scriptId: 'script-1',
      filePath: 'audio/existing.mp3',
      durationSecs: 300,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };
    mockFindUnique.mockResolvedValue(scriptRecord);
    mockAudioFindFirst.mockResolvedValue(existingAudio);

    const request = createJsonRequest({ scriptId: 'script-1' });
    await POST(request);

    // Even on idempotent return, pipelineStatus must be 'ready'
    expect(mockContentUpdate).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { pipelineStatus: 'ready' },
    });
  });
```

**Step 5: Run the tests to verify they fail**

```bash
npm test src/app/api/audio/generate/route.test.ts
```

Expected: FAIL — new tests fail because the route doesn't have `audio.findFirst` check or `content.update` calls yet.

---

## Task 7: /api/audio/generate — Add Idempotency + Status Updates

**Files:**
- Modify: `src/app/api/audio/generate/route.ts`

**Step 1: Move `script` declaration before the try block**

The current code declares the script lookup *inside* the try block. Move the declaration before `try` so the catch block can access `script.contentId`. Replace the beginning of the `POST` function with:

```typescript
export async function POST(request: Request) {
  let script: Awaited<ReturnType<typeof prisma.script.findUnique>> | null = null;
  try {
    const userId = await getCurrentUserId();
    const gate = await requireSubscription(userId);
    if (gate) return gate;

    const body = await request.json();
    const { scriptId } = body;

    if (!scriptId) {
      return NextResponse.json(
        { error: 'Missing required field: scriptId', code: 'INVALID_INPUT' },
        { status: 400 },
      );
    }

    script = await prisma.script.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      return NextResponse.json(
        { error: 'Script not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
```

**Step 2: Add the idempotency check after the script null check**

After the `if (!script)` return, add:

```typescript
    // Idempotency: return existing audio if already generated (supports recovery)
    const existingAudio = await prisma.audio.findFirst({
      where: { scriptId },
    });
    if (existingAudio) {
      await prisma.content.update({
        where: { id: script.contentId },
        data: { pipelineStatus: 'ready' },
      });
      return NextResponse.json(existingAudio);
    }
```

**Step 3: Add pipelineStatus='ready' after `prisma.audio.create` succeeds**

Find the `prisma.audio.create` call and the `return NextResponse.json(audio)` after it. Between those two lines, add:

```typescript
    const audio = await prisma.audio.create({
      data: {
        scriptId,
        filePath,
        durationSecs,
        voices,
        ttsProvider: provider.providerId,
      },
    });

    await prisma.content.update({
      where: { id: script.contentId },
      data: { pipelineStatus: 'ready' },
    });

    return NextResponse.json(audio);
```

**Step 4: Add pipelineStatus='error' in the catch block**

Replace the existing catch block with:

```typescript
  } catch (error) {
    console.error('Audio generation error:', error);

    let message = 'Something went wrong generating audio.';
    let code: string = 'TTS_FAILED';
    if (error instanceof Error) {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        message = 'Audio service is busy. Please wait a moment and try again.';
        code = 'RATE_LIMITED';
      } else if (error.message.includes('authentication') || error.message.includes('401')) {
        message = 'Audio service is not configured properly. Check your API keys.';
        code = 'TTS_FAILED';
      }
    }

    // Best-effort status update — script.contentId is accessible because `script` is declared before try
    if (script?.contentId) {
      await prisma.content.update({
        where: { id: script.contentId },
        data: { pipelineStatus: 'error', pipelineError: message },
      }).catch(() => {});
    }

    return NextResponse.json(
      { error: message, code },
      { status: 500 },
    );
  }
```

**Step 5: Run the tests to verify they pass**

```bash
npm test src/app/api/audio/generate/route.test.ts
```

Expected: PASS — all tests passing including the new idempotency and status tests.

**Step 6: Commit**

```bash
git add src/app/api/audio/generate/route.ts src/app/api/audio/generate/route.test.ts
git commit -m "feat(api): add idempotency + status tracking to /api/audio/generate"
```

---

## Task 8: /api/library — Write Failing pipelineStatus Tests

**Files:**
- Modify: `src/app/api/library/route.test.ts`

**Step 1: Add `pipelineStatus` and `pipelineError` to the `twoScriptItem` fixture**

Find the `twoScriptItem` fixture (around line 22). Add `pipelineStatus` and `pipelineError` to the content object:

```typescript
const twoScriptItem = [
  {
    id: "c1",
    title: "Test Article",
    author: "Jane Doe",
    sourceType: "url",
    sourceUrl: "https://example.com/article",
    createdAt: new Date("2026-03-01"),
    wordCount: 3000,
    pipelineStatus: "ready",
    pipelineError: null,
    scripts: [
      // ... existing scripts array unchanged ...
    ],
  },
];
```

**Step 2: Add new test cases at the end of the describe block**

```typescript
  it("returns pipelineStatus field on each library item", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].pipelineStatus).toBe("ready");
  });

  it("returns pipelineError field as null when no error", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].pipelineError).toBeNull();
  });

  it("returns pipelineStatus 'scripting' for items mid-pipeline with no scripts", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c5",
        title: "Processing Now",
        author: null,
        sourceType: "pdf",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 2000,
        pipelineStatus: "scripting",
        pipelineError: null,
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].pipelineStatus).toBe("scripting");
    expect(data[0].versions).toHaveLength(0);
  });

  it("returns pipelineError message when pipeline is in error state", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c6",
        title: "Failed Item",
        author: null,
        sourceType: "txt",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 500,
        pipelineStatus: "error",
        pipelineError: "AI service is busy. Please wait a moment and try again.",
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].pipelineStatus).toBe("error");
    expect(data[0].pipelineError).toBe("AI service is busy. Please wait a moment and try again.");
  });
```

**Step 3: Run the tests to verify the new ones fail**

```bash
npm test src/app/api/library/route.test.ts
```

Expected: The existing tests PASS (they don't check `pipelineStatus`). The 4 new tests FAIL because `pipelineStatus` is not yet in the response.

---

## Task 9: /api/library — Add pipelineStatus + pipelineError to Response

**Files:**
- Modify: `src/app/api/library/route.ts`

**Step 1: Add the two fields to the `items.map()` output**

Find the `library` map (around line 48). Add `pipelineStatus` and `pipelineError` to each item. The updated map should read:

```typescript
    const library = items.map((item) => ({
      id: item.id,
      title: item.title,
      author: item.author ?? null,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl ?? null,
      createdAt: item.createdAt.toISOString(),
      wordCount: item.wordCount,
      pipelineStatus: item.pipelineStatus,
      pipelineError: item.pipelineError ?? null,
      versions: item.scripts
        .flatMap((script): AudioVersion[] => {
```

**Step 2: Run the tests to verify they pass**

```bash
npm test src/app/api/library/route.test.ts
```

Expected: PASS — all tests passing including the 4 new `pipelineStatus` tests.

**Step 3: Commit**

```bash
git add src/app/api/library/route.ts src/app/api/library/route.test.ts
git commit -m "feat(api): expose pipelineStatus + pipelineError in /api/library response"
```

---

## Task 10: ProcessingScreen — Write Failing Tests for Fire-and-Poll

**Files:**
- Modify: `src/components/ProcessingScreen.test.tsx`

**Step 1: Replace the entire test file with updated content**

The current test file is minimal (only checks initial render). Replace it entirely with this version that retains the existing tests and adds fire-and-poll tests:

```typescript
"use client";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProcessingScreen } from "./ProcessingScreen";

// ─── Initial render tests (unchanged from original) ─────────────────────────

// For initial render tests: fetch never resolves, so no state changes occur.
describe("ProcessingScreen — initial render", () => {
  beforeEach(() => {
    vi.spyOn(global, "fetch").mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderProcessingScreen() {
    return render(
      <ProcessingScreen
        contentId="content-test"
        targetMinutes={15}
        onComplete={vi.fn()}
      />,
    );
  }

  it('shows "Analyzing" as the active stage label on initial render', () => {
    renderProcessingScreen();
    expect(screen.getAllByText("Analyzing").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the analyzing copy text on initial render", () => {
    renderProcessingScreen();
    expect(screen.getByText(/Reading your content/i)).toBeInTheDocument();
  });

  it("renders all 4 stage labels in the step bar", () => {
    renderProcessingScreen();
    expect(screen.getByText("Scripting")).toBeInTheDocument();
    expect(screen.getByText("Generating Audio")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("does not render old stage label 'Analyzing content...'", () => {
    renderProcessingScreen();
    expect(screen.queryByText(/Analyzing content/)).not.toBeInTheDocument();
  });
});

// ─── Fire-and-poll behavior tests ───────────────────────────────────────────

// Library response factory — builds the minimal shape ProcessingScreen needs
function makeLibraryItem(overrides: {
  pipelineStatus: string;
  pipelineError?: string | null;
  versions?: { scriptId: string; audioId: string | null; durationSecs: number | null }[];
}) {
  return [
    {
      id: "content-test",
      title: "Test Article",
      pipelineStatus: overrides.pipelineStatus,
      pipelineError: overrides.pipelineError ?? null,
      versions: overrides.versions ?? [],
    },
  ];
}

describe("ProcessingScreen — fire-and-poll", () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    onComplete.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("fires POST /api/process on mount", async () => {
    const mockFetch = vi.spyOn(global, "fetch").mockImplementation(
      () => new Promise(() => {}),
    );

    render(
      <ProcessingScreen
        contentId="content-test"
        targetMinutes={15}
        onComplete={onComplete}
      />,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/process",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("starts polling /api/library after mount", async () => {
    const mockFetch = vi.spyOn(global, "fetch").mockImplementation(
      (url) => {
        if (url === "/api/library") {
          return Promise.resolve(
            new Response(JSON.stringify(makeLibraryItem({ pipelineStatus: "scripting" })), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        return new Promise(() => {});
      },
    );

    render(
      <ProcessingScreen
        contentId="content-test"
        targetMinutes={15}
        onComplete={onComplete}
      />,
    );

    // Advance clock past first poll interval
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/library");
  });

  it("fires POST /api/audio/generate when poll sees pipelineStatus='generating'", async () => {
    const mockFetch = vi.spyOn(global, "fetch").mockImplementation(
      (url) => {
        if (url === "/api/library") {
          return Promise.resolve(
            new Response(
              JSON.stringify(
                makeLibraryItem({
                  pipelineStatus: "generating",
                  versions: [{ scriptId: "script-abc", audioId: null, durationSecs: null }],
                }),
              ),
              { status: 200, headers: { "Content-Type": "application/json" } },
            ),
          );
        }
        return new Promise(() => {});
      },
    );

    render(
      <ProcessingScreen
        contentId="content-test"
        targetMinutes={15}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/audio/generate",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("script-abc"),
        }),
      );
    });
  });

  it("calls onComplete when poll sees pipelineStatus='ready'", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (url === "/api/library") {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              makeLibraryItem({
                pipelineStatus: "ready",
                versions: [{ scriptId: "script-abc", audioId: "audio-xyz", durationSecs: 300 }],
              }),
            ),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return new Promise(() => {});
    });

    render(
      <ProcessingScreen
        contentId="content-test"
        targetMinutes={15}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith("audio-xyz");
    });
  });

  it("shows pipelineError message when poll sees pipelineStatus='error'", async () => {
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      if (url === "/api/library") {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              makeLibraryItem({
                pipelineStatus: "error",
                pipelineError: "AI service is busy. Please wait a moment and try again.",
              }),
            ),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return new Promise(() => {});
    });

    render(
      <ProcessingScreen
        contentId="content-test"
        targetMinutes={15}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/AI service is busy/i),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("Try Again button calls POST /api/content/[id]/reset then re-fires pipeline", async () => {
    const fetchCalls: string[] = [];
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      fetchCalls.push(String(url));
      if (url === "/api/library") {
        return Promise.resolve(
          new Response(
            JSON.stringify(
              makeLibraryItem({
                pipelineStatus: "error",
                pipelineError: "Something failed.",
              }),
            ),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (String(url).includes("/reset")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ pipelineStatus: "idle", pipelineError: null }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return new Promise(() => {});
    });

    render(
      <ProcessingScreen
        contentId="content-test"
        targetMinutes={15}
        onComplete={onComplete}
      />,
    );

    // Wait for error state to appear
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    // Click Try Again
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => {
      expect(fetchCalls.some((url) => url.includes("/reset"))).toBe(true);
    });

    // After reset, /api/process should be fired again
    await waitFor(() => {
      const processCalls = fetchCalls.filter((url) => url === "/api/process");
      expect(processCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
```

**Step 2: Run the tests to verify the new ones fail**

```bash
npm test src/components/ProcessingScreen.test.tsx
```

Expected: The initial-render tests PASS. The fire-and-poll tests FAIL — the current component uses sequential `await` not fire-and-poll, so fetch calls and state transitions don't match.

---

## Task 11: ProcessingScreen — Implement Fire-and-Poll

**Files:**
- Modify: `src/components/ProcessingScreen.tsx`

**Step 1: Replace the component implementation**

Replace the entire contents of `src/components/ProcessingScreen.tsx` with the following. The key changes are: (1) remove `errorStage`/`handleRetryAudio`, (2) replace the sequential-await `run()` with fire-and-poll, (3) add reset + re-fire for "Try Again".

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useElevenLabsKey } from "./SettingsScreen";

interface ProcessingScreenProps {
  contentId: string;
  targetMinutes: number;
  format?: string;
  onComplete: (audioId: string) => void;
}

type Stage = "analyzing" | "scripting" | "generating" | "ready";

interface AudioRecord {
  id: string;
  durationSecs: number;
}

interface ScriptRecord {
  id: string;
  contentType?: string;
  format: string;
  durationAdvisory?: string | null;
}

const STAGE_CONFIG = {
  analyzing: {
    icon: "🔍",
    label: "Analyzing",
    copy: "Reading your content — extracting key ideas and structure",
  },
  scripting: {
    icon: "✍️",
    label: "Scripting",
    copy: "Writing your episode — shaping key ideas into narrative",
  },
  generating: {
    icon: "🎙️",
    label: "Generating Audio",
    copy: "Recording your episode — this takes 20–40 seconds",
  },
  ready: {
    icon: "✅",
    label: "Ready",
    copy: null,
  },
} as const;

const STAGE_ORDER: Stage[] = ["analyzing", "scripting", "generating", "ready"];

export function ProcessingScreen({ contentId, targetMinutes, format, onComplete }: ProcessingScreenProps) {
  const [stage, setStage] = useState<Stage>("analyzing");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [scriptRecord, setScriptRecord] = useState<ScriptRecord | null>(null);
  const [audioRecord, setAudioRecord] = useState<AudioRecord | null>(null);
  const [durationAdvisory, setDurationAdvisory] = useState<string | null>(null);
  const elevenLabsKey = useElevenLabsKey();

  // Ref-guard prevents React Strict Mode from double-firing the pipeline.
  // Without this, two /api/process calls are made (creating duplicate scripts).
  const runningRef = useRef(false);

  useEffect(() => {
    // Skip if already running (Strict Mode re-mount)
    if (runningRef.current) return;
    runningRef.current = true;

    const abort = new AbortController();
    setError(null);
    setStage("analyzing");

    async function run() {
      // Optimistic local state: show scripting immediately to avoid race where
      // first poll sees 'idle' before server sets status
      setStage("scripting");

      // Fire /api/process without awaiting — server will update pipelineStatus in DB.
      // Capture response if it arrives before a poll, for durationAdvisory.
      fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, targetMinutes, ...(format ? { format } : {}) }),
        signal: abort.signal,
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data?.id) setScriptRecord(data);
            if (data?.durationAdvisory) setDurationAdvisory(data.durationAdvisory);
          }
        })
        .catch(() => {
          // Ignore — polling will detect error state from DB
        });

      // Poll /api/library every 3s — DB state drives all UI transitions
      let audioStartedRef = false;
      const pollInterval = setInterval(async () => {
        if (abort.signal.aborted) {
          clearInterval(pollInterval);
          return;
        }

        const res = await fetch("/api/library").catch(() => null);
        if (!res?.ok) return;
        const library = await res.json().catch(() => null);
        if (!library) return;

        const item = library.find((i: { id: string }) => i.id === contentId);
        if (!item) return;

        const status: string = item.pipelineStatus;

        if (status === "scripting") {
          setStage("scripting");
        } else if (status === "generating" && !audioStartedRef) {
          audioStartedRef = true;
          setStage("generating");

          // Get latest scriptId from versions — fire audio generation
          const versions = item.versions ?? [];
          const latestScript = versions[versions.length - 1];
          if (latestScript?.scriptId) {
            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (elevenLabsKey) headers["x-elevenlabs-key"] = elevenLabsKey;
            fetch("/api/audio/generate", {
              method: "POST",
              headers,
              body: JSON.stringify({ scriptId: latestScript.scriptId }),
              signal: abort.signal,
            }).catch(() => {
              // Ignore — polling will detect ready/error state from DB
            });
          }
        } else if (status === "ready") {
          clearInterval(pollInterval);
          const readyVersion = (item.versions ?? []).find(
            (v: { audioId: string | null }) => v.audioId,
          );
          if (readyVersion?.audioId) {
            setAudioRecord({
              id: readyVersion.audioId,
              durationSecs: readyVersion.durationSecs ?? 0,
            });
            setStage("ready");
          }
        } else if (status === "error") {
          clearInterval(pollInterval);
          setError(item.pipelineError || "Processing failed. Please try again.");
        }
      }, 3000);

      return () => {
        clearInterval(pollInterval);
      };
    }

    run();
    return () => {
      abort.abort();
      runningRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId, targetMinutes, onComplete, attempt]);

  // Auto-navigate to library once audio is ready
  const autoCompleteDelay =
    process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true" ? 15000 : 1500;

  useEffect(() => {
    if (stage !== "ready" || !audioRecord) return;
    const timer = setTimeout(() => {
      onComplete(audioRecord.id);
    }, autoCompleteDelay);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, audioRecord, onComplete]);

  async function handleTryAgain() {
    // Reset pipeline status in DB, then increment attempt to re-fire the effect
    try {
      await fetch(`/api/content/${contentId}/reset`, { method: "POST" });
    } catch {
      // Best-effort — re-fire anyway
    }
    setError(null);
    setStage("analyzing");
    setDurationAdvisory(null);
    setScriptRecord(null);
    setAudioRecord(null);
    setAttempt((a) => a + 1);
  }

  function addToQueue(audioId: string) {
    // Stub: queue management is a future feature
    console.log("[queue] Added to queue:", audioId);
  }

  const currentIndex = STAGE_ORDER.indexOf(stage);
  const activeConfig = STAGE_CONFIG[stage];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 py-10">
      {/* Artwork */}
      <div
        className="w-[120px] h-[120px] rounded-[28px] flex items-center justify-center mb-9"
        style={{
          background: "linear-gradient(135deg, #EA580C, #F97316, #FCD34D)",
          backgroundSize: "200% 200%",
          animation: stage === "ready" ? "none" : "gradientShift 3s ease infinite",
          boxShadow: "0 0 60px rgba(234,88,12,0.3)",
        }}
      >
        {stage === "ready" ? (
          <span className="text-4xl">✅</span>
        ) : (
          <svg viewBox="0 0 24 24" className="w-12 h-12 fill-white opacity-90">
            <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" opacity="0.7" />
            <circle cx="18" cy="16" r="3" opacity="0.7" />
          </svg>
        )}
      </div>

      {/* Stage Display — active stage copy */}
      {stage !== "ready" && !error && (
        <div className="text-center mb-8 w-full max-w-[280px]">
          <p className="text-lg font-bold text-[var(--text)] mb-1">{activeConfig.label}</p>
          {activeConfig.copy && (
            <p className="text-sm text-[var(--text-mid)] leading-snug">{activeConfig.copy}</p>
          )}
        </div>
      )}

      {/* 4-Step Progress Bar */}
      <div className="w-full max-w-[280px] mb-8">
        {STAGE_ORDER.map((s) => {
          const stepIdx = STAGE_ORDER.indexOf(s);
          const isDone = currentIndex > stepIdx;
          const isActive = currentIndex === stepIdx;
          const config = STAGE_CONFIG[s];

          return (
            <div key={s} className="flex items-center gap-3 py-2 transition-all">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                isDone ? "border-[var(--green)] bg-[var(--green-dim)]" : isActive ? "border-[#EA580C] bg-[#EA580C]/20" : "border-black/[0.08] bg-black/[0.04]"
              } ${isActive && stage !== "ready" ? "animate-[pulseDot_1.5s_ease_infinite]" : ""}`}>
                <svg viewBox="0 0 24 24" className={`w-3 h-3 fill-none stroke-2 ${isDone ? "stroke-[var(--green)]" : "stroke-black/30"}`} strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className={`text-sm font-medium transition-all ${
                isDone ? "text-[var(--text-mid)]" : isActive ? "text-[var(--text)]" : "text-[var(--text-dim)]"
              }`}>{config.label}</span>
            </div>
          );
        })}
      </div>

      {/* AI format decision */}
      {scriptRecord && (
        <p className="text-sm text-[#EA580C]/80 mb-4 text-center">
          AI chose: {scriptRecord.format}
        </p>
      )}

      {/* Ready State — Episode Card */}
      {stage === "ready" && audioRecord && (
        <div className="w-full max-w-[280px] bg-[var(--surface)] border border-black/[0.07] rounded-[14px] p-5 mb-4">
          <div className="text-center mb-4">
            <div className="text-[13px] text-[var(--text-mid)] uppercase tracking-wider font-semibold mb-0.5">
              {scriptRecord?.contentType?.replace(/_/g, " ") ?? "Episode"}
            </div>
            <div className="text-[var(--text-mid)] text-xs">
              ~{Math.round(audioRecord.durationSecs / 60)} min
            </div>
          </div>
          <button
            onClick={() => onComplete(audioRecord.id)}
            className="w-full py-3 rounded-[10px] text-sm font-semibold text-white bg-gradient-to-br from-[#EA580C] to-[#F97316] shadow-[0_4px_20px_rgba(234,88,12,0.35)] hover:shadow-[0_6px_28px_rgba(234,88,12,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-2"
          >
            ▶ Play Now
          </button>
          <button
            onClick={() => { addToQueue(audioRecord.id); onComplete(audioRecord.id); }}
            className="w-full py-3 rounded-[10px] text-sm font-semibold text-[var(--text-mid)] bg-[var(--surface-2)] border border-black/[0.07] hover:bg-[var(--surface-2)]/80 active:scale-[0.98] transition-all"
          >
            Add to Queue
          </button>

          {/* Duration Advisory */}
          {durationAdvisory && (
            <div className="text-xs text-[var(--amber)] text-center mt-3 leading-snug">{durationAdvisory}</div>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="w-full max-w-[280px] mb-6 text-center">
          <p className="text-red-600 text-sm mb-4">Something went wrong during processing.</p>
          <p className="text-[var(--text-dim)] text-xs mb-4">{error}</p>
          <button
            onClick={handleTryAgain}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-[#EA580C]/20 text-[#EA580C] hover:bg-[#EA580C]/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Run the ProcessingScreen tests**

```bash
npm test src/components/ProcessingScreen.test.tsx
```

Expected: PASS — all tests passing including the fire-and-poll tests.

**Step 3: Run the full test suite**

```bash
npm test
```

Expected: All tests pass, 0 failures.

**Step 4: Commit**

```bash
git add src/components/ProcessingScreen.tsx src/components/ProcessingScreen.test.tsx
git commit -m "feat(client): refactor ProcessingScreen to fire-and-poll with auto-recovery"
```

---

## Task 12: Recovery Integration Tests

**Files:**
- Modify: `src/app/api/process/route.test.ts`
- Modify: `src/app/api/audio/generate/route.test.ts`

**Step 1: Add recovery scenario to process route test**

At the end of the `describe('POST /api/process', ...)` block, add:

```typescript
  it('recovery: pipelineStatus is scripting but Script already exists — returns it cleanly', async () => {
    // Simulates: server was mid-process (status='scripting'), client dropped.
    // Script was created before the drop. /api/process called again.
    const existingScript = {
      id: 'script-recovery',
      contentId: 'content-1',
      format: 'narrator',
      targetDuration: 15,
      actualWordCount: 1500,
      compressionRatio: 0.15,
      scriptText: 'Recovered script text.',
      contentType: 'essay',
      themes: ['tech'],
      summary: 'Recovery summary.',
    };
    mockFindUnique.mockResolvedValue({
      id: 'content-1',
      rawText: 'Some content that is long enough to pass the minimum character guard check here.',
      wordCount: 10000,
      scripts: [existingScript],
      pipelineStatus: 'scripting',
    });

    const mockContentUpdate = prisma.content.update as ReturnType<typeof vi.fn>;

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 15 });
    const response = await POST(request);
    const data = await response.json();

    // Returns existing script — no duplicate Claude call
    expect(response.status).toBe(200);
    expect(data.id).toBe('script-recovery');
    expect(mockAnalyze).not.toHaveBeenCalled();

    // Status is set to scripting at start (normal bookend)
    const scriptingCall = mockContentUpdate.mock.calls.find(
      (call) => call[0]?.data?.pipelineStatus === 'scripting',
    );
    expect(scriptingCall).toBeDefined();
  });

  it('recovery: pipelineStatus is scripting but Script does not exist — creates new one', async () => {
    // Simulates: server set status='scripting' but dropped before creating Script.
    // /api/process called again — should create Script and set status='generating'.
    mockFindUnique.mockResolvedValue({
      id: 'content-1',
      rawText: 'Some content that is long enough to pass the minimum character guard check here.',
      wordCount: 5000,
      scripts: [],  // No script yet
      pipelineStatus: 'scripting',
    });

    mockAnalyze.mockResolvedValue({
      contentType: 'essay',
      format: 'narrator',
      themes: ['tech'],
      summary: 'A tech essay.',
      suggestedTitle: 'Tech Insights',
    });
    mockGenerateScript.mockResolvedValue({ text: 'word '.repeat(720), wordCount: 720, format: 'narrator' });
    mockScriptCreate.mockResolvedValue({ id: 'script-new', contentId: 'content-1', format: 'narrator', targetDuration: 5 });

    const mockContentUpdate = prisma.content.update as ReturnType<typeof vi.fn>;

    const request = createJsonRequest({ contentId: 'content-1', targetMinutes: 5 });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockScriptCreate).toHaveBeenCalled();

    // Status transitions: scripting → generating
    const generatingCall = mockContentUpdate.mock.calls.find(
      (call) => call[0]?.data?.pipelineStatus === 'generating',
    );
    expect(generatingCall).toBeDefined();
  });
```

**Step 2: Add recovery scenario to audio/generate route test**

At the end of the `describe('POST /api/audio/generate', ...)` block, add:

```typescript
  it('recovery: pipelineStatus is generating and Audio already exists — returns it and sets ready', async () => {
    // Simulates: server completed TTS and saved Audio, but client dropped before receiving response.
    // /api/audio/generate called again — should return existing Audio and set status='ready'.
    const scriptRecord = {
      id: 'script-1',
      contentId: 'content-1',
      format: 'narrator',
      scriptText: 'Hello world.',
      targetDuration: 5,
      actualWordCount: 2,
    };
    const existingAudio = {
      id: 'audio-recovered',
      scriptId: 'script-1',
      filePath: 'audio/recovered.mp3',
      durationSecs: 300,
      voices: ['alloy'],
      ttsProvider: 'openai',
    };

    mockFindUnique.mockResolvedValue(scriptRecord);
    mockAudioFindFirst.mockResolvedValue(existingAudio);

    const request = createJsonRequest({ scriptId: 'script-1' });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('audio-recovered');

    // TTS must NOT have been called — idempotent return
    expect(mockGenerateSpeech).not.toHaveBeenCalled();

    // Status must be set to 'ready' on idempotent path
    expect(mockContentUpdate).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { pipelineStatus: 'ready' },
    });
  });
```

**Step 3: Run the tests to verify they pass**

```bash
npm test src/app/api/process/route.test.ts src/app/api/audio/generate/route.test.ts
```

Expected: PASS — all tests passing.

---

## Task 13: Full Test Suite

**Step 1: Run the complete test suite**

```bash
npm test
```

Expected: All tests pass, 0 failures. If there are any failures, read the error output carefully and fix them before proceeding. Common issues to look for:
- TypeScript type errors on new fields (ensure `prisma generate` was run)
- Mock data missing `pipelineStatus`/`pipelineError` in existing fixture objects
- ProcessingScreen tests timing out (ensure `vi.useRealTimers()` is called in `afterEach`)

**Step 2: Commit**

```bash
git add -A
git commit -m "test: add recovery integration tests for pipeline resilience"
```

---

## Task 14: Final Verification

**Step 1: Build the app**

```bash
npm run build
```

Expected: Build succeeds with 0 TypeScript errors. If you see errors about `pipelineStatus` not existing on the Prisma type, run `npx prisma generate` again.

**Step 2: Lint**

```bash
npm run lint
```

Expected: Passes (warnings OK, errors not OK).

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: pipeline resilience — idempotent steps + fire-and-poll recovery (complete)"
```

---

## Implementation Notes for the Implementer

**Things that are easy to get wrong:**

1. **`script` variable scope in `audio/generate/route.ts`:** Must be declared with `let` *before* the `try` block. If declared inside `try`, the `catch` block can't access `script.contentId` for the error status update. The type is `Awaited<ReturnType<typeof prisma.script.findUnique>> | null`.

2. **`runningRef` in ProcessingScreen:** Do not remove this. Without it, React Strict Mode double-invokes `useEffect` in development, causing two `/api/process` calls and duplicate scripts. The `if (runningRef.current) return` guard is critical.

3. **`elevenLabsKey` header on audio calls:** The `x-elevenlabs-key` header on `/api/audio/generate` requests must be preserved. This routes BYOK users to ElevenLabs instead of OpenAI.

4. **Polling cleanup:** The `clearInterval(pollInterval)` call inside the `setInterval` callback (on `ready` and `error` states) must happen. Also the abort signal check inside the interval body prevents polling after the component unmounts.

5. **`audioStartedRef` inside `run()`:** This prevents `/api/audio/generate` from being fired multiple times if the poll fires while a previous audio generation is still in-flight. It's a local variable inside `run()`, not a React ref — that's intentional.

6. **Test mock for `prisma.content.update` in audio test:** The existing `audio/generate/route.test.ts` mock only has `script.findUnique` and `audio.create`. You must add `audio.findFirst` and `content.update` to the mock (Task 6 covers this).

7. **Existing 409 test:** The test `'verbatim mode still rejects duplicate duration'` in `process/route.test.ts` must be *replaced* (not just supplemented) with the idempotent version in Task 4. If you only add new tests without updating the old one, the old test will fail when you change the implementation in Task 5.

8. **`twoScriptItem` fixture in library test:** You must add `pipelineStatus: "ready", pipelineError: null` to this fixture in Task 8. If you don't, the tests that assert on `pipelineStatus` will fail (the field will be `undefined` in the response).

**Success criteria before closing:**
- `npm test` → 0 failures
- `npm run build` → 0 errors
- `/api/process` called twice for same `contentId`+`targetMinutes` → returns existing Script (no duplicate Claude call)
- `/api/audio/generate` called twice for same `scriptId` → returns existing Audio (no duplicate TTS call)
- `pipelineStatus` appears in `/api/library` response
- ProcessingScreen "Try Again" button calls `/api/content/[id]/reset` before re-firing
