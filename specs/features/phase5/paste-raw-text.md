# Spec: Paste Raw Text Input in Upload Modal

**Size:** S — 1 pt  
**Phase:** 5  
**Status:** Ready for implementation

---

## Overview

Add a third input mode to the upload modal so users can paste raw text directly without needing a URL or file. This is the primary escape hatch for Medium articles (Spec 1), paywalled content, or any text the user already has on-device.

The feature adds:
1. A multiline `TextInput` beneath the file picker in Phase 1 (input mode)
2. A `handleTextSubmit()` handler in `UploadModal.tsx`
3. A new `uploadText(rawText, title?)` function in `native/lib/api.ts`
4. A new `rawText` body path in `src/app/api/upload/route.ts`

Phase 2 (preview card + DurationPicker + "Create Episode") is **reused unchanged** — `uploadText` returns the same `UploadResponse` shape.

---

## Requirements

### Interfaces

#### New API function signature (`native/lib/api.ts`)
```ts
export async function uploadText(
  rawText: string,
  options?: { title?: string; signal?: AbortSignal },
): Promise<UploadResponse>
```

- Sends a JSON `POST` to `/api/upload` with body `{ rawText, title }`.
- Uses `fetchJSON<UploadResponse>` (existing helper).
- `title` defaults to `"Pasted text"` if not supplied.

#### Server-side body shape (`src/app/api/upload/route.ts`)
When `Content-Type: application/json` with `{ rawText: string, title?: string }`:
- Parse as JSON (not `formData`).
- Run through `extractContent` dispatcher as `sourceType: 'txt'` using `extractTxt(rawText, title ?? 'Pasted text')`.
- Returns same `UploadResponse` shape as file/URL paths.

### New component state (`UploadModal.tsx`)

Add to existing state declarations (after line 113, `const [errorMsg, ...`):
```ts
const [rawTextInput, setRawTextInput] = useState('');
```

**No new loading state** — the existing `loading` boolean covers all three input paths.

### Component behavior

#### Phase 1 layout additions

After the file picker block (lines 312–325), add:

1. Second OR divider
2. Multiline TextInput for raw text
3. Live word-count feedback label (client-side estimate)
4. "Use This Text" button (only visible when `rawTextInput.trim().length >= MIN_TEXT_CHARS`)

`MIN_TEXT_CHARS` constant = `100` (prevents accidental short pastes from creating episodes).

#### `handleTextSubmit()` handler

```ts
async function handleTextSubmit() {
  if (offline) {
    Alert.alert('No Connection', 'Please check your internet connection and try again.');
    return;
  }

  const trimmed = rawTextInput.trim();
  if (trimmed.length < MIN_TEXT_CHARS) {
    setErrorMsg(`Please paste at least ${MIN_TEXT_CHARS} characters of text.`);
    return;
  }

  setLoading(true);
  setErrorMsg(null);

  try {
    const result = await uploadText(trimmed);
    setUploadResult(result);
  } catch (err: unknown) {
    const statusCode =
      err instanceof Object && 'statusCode' in err
        ? (err as { statusCode: number }).statusCode
        : undefined;
    setErrorMsg(humaniseError(err, statusCode));
  } finally {
    setLoading(false);
  }
}
```

#### Reset on dismiss

In `handleDismiss()` (line 121), add `setRawTextInput('')` alongside the other state resets.

#### File picker label update

Update the file picker helper text (line 324) from `"(PDF, EPUB, TXT)"` to `"(PDF, EPUB, TXT, DOCX)"` — this will be correct after Spec 4 lands, and is a zero-risk text change now.

---

## Acceptance Criteria

| # | Scenario | Expected |
|---|----------|----------|
| AC-1 | User opens upload modal | URL input, OR divider, Choose File button, second OR divider, paste text input all visible |
| AC-2 | User pastes < 100 chars | "Use This Text" button not shown; if tapped anyway, inline error appears |
| AC-3 | User pastes ≥ 100 chars | "Use This Text" button appears; live word count label shows e.g. "~240 words" |
| AC-4 | User taps "Use This Text", request succeeds | Transitions to Phase 2 preview card with title "Pasted text", wordCount from server |
| AC-5 | User taps "Use This Text" while offline | Alert shown, no API call made |
| AC-6 | Server returns 409 (duplicate text hash) | Modal shows "This content is already in your library." (existing humaniseError path) |
| AC-7 | Server returns 500 | Modal shows "The server ran into an error. Please try again in a moment." |
| AC-8 | Modal dismissed and reopened | rawTextInput cleared; no stale text |
| AC-9 | `uploadText` sends correct body | `POST /api/upload` with `Content-Type: application/json`, body `{ rawText: "...", title: "Pasted text" }` |
| AC-10 | Server-side word count used in preview card | `wordCount` in preview reflects server computation, not client estimate |

---

## Edge Cases

- **Text with only whitespace**: `trim()` check → `< MIN_TEXT_CHARS` → error shown before API call.
- **Very long paste** (> 400K chars): Server path processes it and may return `truncationWarning` — the existing truncation warning UI in Phase 2 (lines 343–350) handles this already.
- **URL accidentally pasted into text box**: No auto-detection or redirect to URL path. The user must clear the text input and use the URL field. This is acceptable for S-size scope.
- **Non-UTF-8 text from clipboard**: React Native clipboard returns strings; no binary content possible. No encoding issue.
- **`rawText` and `file` both absent from server body**: The new JSON path checks for `rawText` as a third branch. The existing `else { return 400 }` at line 92 is still hit if the JSON body has neither.
- **`rawText` alongside `url` in JSON body**: Spec defines `rawText`-as-JSON as a separate code path checked *before* the existing `formData` parse. The `rawText` path short-circuits before `url` is checked.

---

## Files to Create / Modify

### MODIFY `native/components/UploadModal.tsx`

**Current file**: 418 lines

#### Change 1 — Add `MIN_TEXT_CHARS` constant (after line 29, `FETCH_TIMEOUT_MS`)
```ts
const MIN_TEXT_CHARS = 100;
```

#### Change 2 — Add `rawTextInput` state (after line 113, `const [errorMsg, ...]`)
```ts
const [rawTextInput, setRawTextInput] = useState('');
```

#### Change 3 — Reset `rawTextInput` in `handleDismiss()` (line 122 block)

Current:
```ts
function handleDismiss() {
  setUrlText('');
  setLoading(false);
  setUploadResult(null);
  setErrorMsg(null);
  setTargetMinutes(DURATION_PRESETS[2].minutes);
  onDismiss();
}
```

Replace with:
```ts
function handleDismiss() {
  setUrlText('');
  setRawTextInput('');
  setLoading(false);
  setUploadResult(null);
  setErrorMsg(null);
  setTargetMinutes(DURATION_PRESETS[2].minutes);
  onDismiss();
}
```

#### Change 4 — Add `handleTextSubmit()` (after `handleFilePick`, before `handleCreateEpisode`, around line 207)

Insert the full function body from the Requirements section above.

#### Change 5 — Update `uploadText` import at line 17

Current:
```ts
import { uploadFile, uploadUrl } from '../lib/api';
```

Replace with:
```ts
import { uploadFile, uploadText, uploadUrl } from '../lib/api';
```

#### Change 6 — Add paste-text UI block (after the file picker closing `</TouchableOpacity>`, line 325)

Insert after line 325, still within the `{!uploadResult && (<>` block:

```tsx
                {/* OR divider — text paste */}
                <View className="flex-row items-center my-4 gap-3">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="text-xs text-gray-400 font-medium">or paste text</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

                {/* Raw text input */}
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                  placeholder="Paste article text here…"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                  value={rawTextInput}
                  onChangeText={(t) => {
                    setRawTextInput(t);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  editable={!loading && !offline}
                />

                {/* Live word count hint */}
                {rawTextInput.trim().length > 0 && (
                  <Text className="text-xs text-gray-400 mt-1 text-right">
                    ~{rawTextInput.trim() === '' ? 0 : rawTextInput.trim().split(/\s+/).length} words
                  </Text>
                )}

                {/* Use This Text button */}
                {rawTextInput.trim().length >= MIN_TEXT_CHARS && (
                  <TouchableOpacity
                    onPress={handleTextSubmit}
                    disabled={loading || offline}
                    className={`mt-3 bg-brand py-3 rounded-xl items-center ${loading || offline ? 'opacity-70' : ''}`}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold text-sm">
                        Use This Text
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
```

#### Change 7 — Update file picker label (line 324)

Current:
```tsx
                  <Text className="text-xs text-gray-400">(PDF, EPUB, TXT)</Text>
```

Replace with:
```tsx
                  <Text className="text-xs text-gray-400">(PDF, EPUB, TXT, DOCX)</Text>
```

---

### MODIFY `native/lib/api.ts`

**Current file**: 250 lines  
**Insert after `uploadFile` export** (after line 126):

```ts
export async function uploadText(
  rawText: string,
  options?: { title?: string; signal?: AbortSignal },
): Promise<UploadResponse> {
  const auth = await authHeaders();
  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: {
      ...auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rawText, title: options?.title ?? 'Pasted text' }),
    signal: options?.signal,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    const err = new Error(data.error ?? `Request failed: ${res.status}`);
    (err as Error & { statusCode: number }).statusCode = res.status;
    throw err;
  }
  return data as UploadResponse;
}
```

**Note**: Cannot use `fetchJSON` here because `fetchJSON` calls `authHeaders()` internally but does not support custom `Content-Type`. Cannot use `postFormData` because that sends `FormData`, not JSON. This function uses the same `fetch + authHeaders` pattern manually, mirroring what `postFormData` does for multipart.

---

### MODIFY `src/app/api/upload/route.ts`

**Current file**: 160 lines  
**Goal**: Add a JSON body path that handles `{ rawText, title? }`.

The current handler starts with:
```ts
const rawBody: any = await request.formData();  // line 18
```

This will throw if the client sends `Content-Type: application/json`. The fix requires reading the body differently based on content type.

**Replace lines 17–96** (the entire variable extraction block) with:

```ts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let file: File | null = null;
    let url: string | null = null;
    let rawText: string | null = null;
    let bodyTitle: string | null = null;

    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = await request.json() as { rawText?: string; title?: string };
      rawText = json.rawText ?? null;
      bodyTitle = json.title ?? null;
    } else {
      const rawBody = await request.formData();
      file = rawBody.get('file') as File | null;
      url = rawBody.get('url') as string | null;
    }

    // Fast-path dedup: if URL is already in library (including Pocket stubs), re-use it.
    if (url) {
      const byUrl = await prisma.content.findFirst({
        where: { userId, sourceUrl: url },
      });
      if (byUrl) {
        if (byUrl.sourceType === 'pocket' && byUrl.rawText === '') {
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
        } else {
          return NextResponse.json(
            { ...byUrl, error: 'This content has already been uploaded.' },
            { status: 409 },
          );
        }
      }
    }

    let title: string;
    let text: string;
    let wordCount: number;
    let sourceType: 'url' | 'txt' | 'pdf' | 'epub';
    let sourceUrl: string | null = null;
    let author: string | undefined;

    if (rawText !== null) {
      const result = extractTxt(rawText, bodyTitle ?? 'Pasted text');
      title = bodyTitle ?? result.title;
      text = result.text;
      wordCount = result.wordCount;
      sourceType = 'txt';
    } else if (url) {
      const result = await extractUrl(url);
      title = result.title;
      text = result.text;
      wordCount = result.wordCount;
      sourceType = 'url';
      sourceUrl = url;
      author = result.author;
    } else if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let fileSourceType: 'txt' | 'pdf' | 'epub';

      if (extension === 'pdf') {
        fileSourceType = 'pdf';
      } else if (extension === 'epub') {
        fileSourceType = 'epub';
      } else {
        fileSourceType = 'txt';
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await extractContent(buffer, file.name, fileSourceType);

      title = result.title;
      text = result.text;
      wordCount = result.wordCount;
      sourceType = fileSourceType;
      author = result.author;
    } else {
      return NextResponse.json(
        { error: 'No file, URL, or text provided' },
        { status: 400 },
      );
    }
```

**Also add** `extractTxt` to the import at line 3:

Current:
```ts
import { extractContent, extractUrl } from '@/lib/extractors';
```

Replace with:
```ts
import { extractContent, extractTxt, extractUrl } from '@/lib/extractors';
```

**Also update `index.ts`** to export `extractTxt`:

In `src/lib/extractors/index.ts`, after line 3 (`import { extractEpub } from './epub';`):
```ts
export { extractTxt } from './txt';
```

---

## Dependencies

- No new npm packages.
- `extractTxt` is already implemented in `src/lib/extractors/txt.ts`; just needs exporting from `index.ts`.

---

## Notes

- The client-side word count display in the paste input is a real-time estimate (`split(/\s+/)`) — it will differ slightly from the server count (which uses the same algorithm after trim). The difference is cosmetically fine.
- `MIN_TEXT_CHARS = 100` was chosen to prevent single-sentence pastes. Adjust if needed based on testing.
- The "Use This Text" button intentionally shares the same `loading` state as URL fetch and file pick — only one operation can be in-flight at a time. This avoids needing a per-operation `isLoading` discriminator.
- The `uploadText` function in `api.ts` bypasses `fetchJSON` and `postFormData` because both helpers are FormData-oriented. The manual `fetch + authHeaders` call is ~10 lines and follows the same pattern.

---

## Implementation Map

> _Filled in by the implementing agent during platform grounding._

| Step | File | Location | Action |
|------|------|----------|--------|
| 1 | `native/components/UploadModal.tsx` | Line 29 | Add `MIN_TEXT_CHARS = 100` constant |
| 2 | `native/components/UploadModal.tsx` | Line 17 | Add `uploadText` to import |
| 3 | `native/components/UploadModal.tsx` | Line 113 | Add `rawTextInput` state |
| 4 | `native/components/UploadModal.tsx` | `handleDismiss()` body | Add `setRawTextInput('')` reset |
| 5 | `native/components/UploadModal.tsx` | After `handleFilePick` (~line 207) | Insert `handleTextSubmit()` function |
| 6 | `native/components/UploadModal.tsx` | After line 325 (end of file picker) | Insert paste-text UI block |
| 7 | `native/components/UploadModal.tsx` | Line 324 | Update file picker label to include DOCX |
| 8 | `native/lib/api.ts` | After line 126 (`uploadFile`) | Insert `uploadText()` export |
| 9 | `src/lib/extractors/index.ts` | After line 3 | Add `export { extractTxt }` |
| 10 | `src/app/api/upload/route.ts` | Line 3 (imports) | Add `extractTxt` to import |
| 11 | `src/app/api/upload/route.ts` | Lines 17–96 | Replace with content-type-aware body parse + rawText branch |
| 12 | `native/components/__tests__/UploadModal.test.tsx` | Create/update | Test: text submit happy path, < MIN_TEXT_CHARS error, offline guard, reset on dismiss |
| 13 | `src/app/api/upload/route.test.ts` | Existing file | Add: rawText JSON body → 200 with wordCount; rawText too short → still accepted (server has no min); no rawText or file → 400 |
