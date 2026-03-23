# Feature: Pipeline Error Resilience

> Every failure in the Upload → Process → Audio pipeline produces a clear, actionable user-facing message. No unhandled crashes. No silent hangs.

## Motivation

The pipeline has three stages, each depending on external services (Claude, OpenAI) and user-provided content that can be malformed. Current state:

- Route handlers catch errors and return user-friendly messages ✅
- No retry logic for transient failures (rate limits, network blips) ❌
- Large document truncation is silent — user doesn't know their content was cut ❌
- TTS generation for long conversation scripts can exceed Next.js's default 30s route timeout ❌
- `ProcessingScreen.tsx` has no per-stage error state — any failure shows the same generic message ❌

The goal: every failure produces an actionable message. Transient errors retry automatically. The user is never left wondering what happened.

---

## Change 1: Rate limit retry with backoff (`src/lib/ai/claude.ts`, `src/lib/tts/openai.ts`)

Add a `retryWithBackoff` utility that retries on 429 responses with exponential backoff (2 retries max, 1s → 3s delay):

```typescript
// src/lib/utils/retry.ts  (new file)
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('rate limit') || err.message.includes('429'));
      if (!isRateLimit || attempt === maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(3, attempt);
      console.log(`[retry] Rate limited. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
```

Wrap Claude API calls in `claude.ts` and OpenAI TTS calls in `openai.ts`:

```typescript
// In ClaudeProvider.analyze() and callGenerateScript():
import { retryWithBackoff } from '@/lib/utils/retry';
const response = await retryWithBackoff(() =>
  this.client.messages.create({ ... })
);

// In OpenAITTSProvider.generateSpeech():
const response = await retryWithBackoff(() =>
  this.client.audio.speech.create({ ... })
);
```

---

## Change 2: Surface document truncation to user (`src/app/api/upload/route.ts`)

When extracted text exceeds the script generation limit, tell the user in the upload response. Define the threshold constant:

```typescript
// Max chars sent to Claude for script generation (from claude.ts)
const MAX_SCRIPT_SOURCE_CHARS = 600_000; // ~150K words / ~500 pages
const TRUNCATION_WARNING_CHARS = 400_000; // warn above ~100K words / ~330 pages

// After extractContent():
const wasTruncated = text.length > TRUNCATION_WARNING_CHARS;

return NextResponse.json({
  ...record,
  truncationWarning: wasTruncated
    ? `This document is very long (${Math.round(text.length / 6)} words). Only the first ~100,000 words will be used for audio generation.`
    : null,
});
```

In `UploadScreen.tsx`, display the warning in the content preview card if present:

```tsx
{preview.truncationWarning && (
  <div className="text-xs text-amber-400/80 mt-2 leading-snug">
    ⚠ {preview.truncationWarning}
  </div>
)}
```

Update the `ContentPreview` interface in `UploadScreen.tsx` to include `truncationWarning?: string | null`.

---

## Change 3: Route timeout configuration (`src/app/api/process/route.ts`, `src/app/api/audio/generate/route.ts`)

Next.js App Router routes default to a 30-second execution limit in production. Claude script generation and multi-voice TTS can exceed this for long content. Export `maxDuration` from each route:

```typescript
// src/app/api/process/route.ts
export const maxDuration = 120; // 2 minutes — Claude can be slow on long content

// src/app/api/audio/generate/route.ts
export const maxDuration = 180; // 3 minutes — conversation TTS stitches many segments
```

---

## Change 4: Per-stage error state in ProcessingScreen (`src/components/ProcessingScreen.tsx`)

Currently `ProcessingScreen` has a single error state. Each API call can fail independently. Update to track which stage failed so the error message is specific:

```typescript
type Stage = 'processing' | 'audio' | null;
const [errorStage, setErrorStage] = useState<Stage>(null);

// On process failure:
setErrorStage('processing');
setError('Script generation failed. Please try again.');

// On audio failure:
setErrorStage('audio');
setError('Audio generation failed. Please try again.');
```

Show a "Try again" button that retries only the failed stage (not the full pipeline):

```tsx
{error && errorStage === 'audio' && (
  <button onClick={retryAudio} className="...">
    Retry Audio Generation
  </button>
)}
```

Add `retryAudio` function that calls `/api/audio/generate` with the existing `scriptId` without re-running the Claude stage.

---

## Change 5: Malformed file error messages (`src/lib/extractors/pdf.ts`, `src/lib/extractors/epub.ts`)

Wrap extraction in try/catch and throw typed errors:

```typescript
// In pdf.ts
try {
  const data = await pdfParse(buffer);
  // ...
} catch (err) {
  if (err instanceof Error && err.message.includes('encrypted')) {
    throw new Error('This PDF is password-protected. Please remove the password and try again.');
  }
  throw new Error('Could not read this PDF. The file may be corrupted or in an unsupported format.');
}

// In epub.ts
try {
  // ...
} catch {
  throw new Error('Could not read this EPUB. The file may be corrupted or use an unsupported format.');
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/utils/retry.ts` | New file — `retryWithBackoff` utility |
| `src/lib/ai/claude.ts` | Wrap Claude API calls in `retryWithBackoff` |
| `src/lib/tts/openai.ts` | Wrap OpenAI TTS calls in `retryWithBackoff` |
| `src/app/api/upload/route.ts` | Add `truncationWarning` to response |
| `src/app/api/process/route.ts` | Export `maxDuration = 120` |
| `src/app/api/audio/generate/route.ts` | Export `maxDuration = 180` |
| `src/components/UploadScreen.tsx` | Display `truncationWarning` in content preview |
| `src/components/ProcessingScreen.tsx` | Per-stage error state + retry audio button |
| `src/lib/extractors/pdf.ts` | Typed error messages for encrypted/corrupt PDFs |
| `src/lib/extractors/epub.ts` | Typed error messages for corrupt EPUBs |

---

## Success Criteria

```bash
npm run test
# All existing tests pass

npm run build
# Build succeeds with no new type errors
```

Unit tests to add:
- `src/lib/utils/retry.test.ts`: verify retries on 429, stops after maxRetries, does not retry on non-rate-limit errors
- `src/lib/extractors/pdf.test.ts`: verify encrypted PDF throws message containing "password-protected"

Manual verification checklist:
- [ ] Upload a URL with a temporarily bad network → friendly error, no crash
- [ ] Upload a very long document (>100K words) → truncation warning appears in preview
- [ ] If audio generation fails → "Retry Audio Generation" button appears, retries without re-running Claude

## Scope

No changes to data model or database schema. No changes to the audio player. `retryWithBackoff` is used only for external API calls — not for database operations. The `maxDuration` exports only affect production deployments (Vercel); local dev is unaffected.
