# Feature: Upload Modal Polish

> Better error handling, a loading spinner, character/word count preview, and proper bottom sheet UX in the upload modal (GitHub #36).

## Motivation

The upload modal is the first thing a new user interacts with — and it currently swallows errors silently, has no feedback during URL fetching, and behaves like a plain `Modal` rather than a native bottom sheet. These friction points cause confusion and failed uploads that users don't understand. Fixing them turns a frustrating first experience into a smooth one.

## Changes

### 1. Read current state

`native/components/UploadModal.tsx` — review before implementing. Key areas to address:
- URL fetch: no loading state, error messages are generic or absent
- Text input: no word/character count
- Modal: no drag-to-dismiss, no bottom sheet feel

### 2. Loading spinner during URL fetch

While the URL is being fetched/validated, show a loading state inside the modal:

```typescript
const [isFetching, setIsFetching] = useState(false);
const [fetchError, setFetchError] = useState<string | null>(null);

async function handleURLFetch(url: string) {
  setIsFetching(true);
  setFetchError(null);
  try {
    const response = await fetch(`/api/upload`, { method: "POST", body: JSON.stringify({ url }) ... });
    if (!response.ok) {
      const data = await response.json();
      setFetchError(data.error ?? "Failed to fetch URL. Please check the address and try again.");
      return;
    }
    // success
  } catch (err) {
    if (err instanceof TypeError && err.message.includes("network")) {
      setFetchError("No internet connection. Please check your network and try again.");
    } else {
      setFetchError("Something went wrong. Please try again.");
    }
  } finally {
    setIsFetching(false);
  }
}
```

In the UI, replace the submit button content when fetching:
```tsx
<TouchableOpacity
  onPress={handleURLFetch}
  disabled={isFetching}
  className={`bg-brand py-4 rounded-2xl items-center ${isFetching ? "opacity-70" : ""}`}
>
  {isFetching ? (
    <ActivityIndicator color="white" />
  ) : (
    <Text className="text-base font-bold text-white">Create Episode</Text>
  )}
</TouchableOpacity>
```

### 3. Clear error messages per error type

| Scenario | Message |
|---|---|
| Empty URL submitted | "Please enter a URL before continuing." |
| Invalid URL format | "That doesn't look like a valid URL. Try something like https://espn.com/article/…" |
| URL fetch fails (4xx) | "We couldn't read that page. It may require a login or be unavailable." |
| URL fetch times out | "The request timed out. Check your connection and try again." |
| Network offline | "No internet connection. Please check your network." |
| 409 Duplicate content | "This content is already in your library." |
| Text input too short | "Your text is too short to generate a meaningful episode." |

Error display — inline, below the input, red text:
```tsx
{fetchError && (
  <View className="mt-2 flex-row items-start gap-2">
    <Ionicons name="alert-circle" size={14} color="#EF4444" />
    <Text className="text-xs text-red-500 flex-1">{fetchError}</Text>
  </View>
)}
```

### 4. Word/character count preview for text input

When the user is in "paste text" mode (not URL), show a live word count below the text area:

```typescript
const wordCount = useMemo(() => {
  const words = pastedText.trim().split(/\s+/).filter(Boolean);
  return words.length;
}, [pastedText]);

const charCount = pastedText.length;
```

Below the text input:
```tsx
<View className="flex-row justify-between mt-1">
  <Text className={`text-xs ${wordCount < 100 ? "text-amber-500" : "text-gray-400"}`}>
    {wordCount.toLocaleString()} words
  </Text>
  <Text className="text-xs text-gray-400">{charCount.toLocaleString()} chars</Text>
</View>
{wordCount > 0 && wordCount < 100 && (
  <Text className="text-xs text-amber-500 mt-1">
    Short content may produce a brief episode. Minimum ~100 words recommended.
  </Text>
)}
```

### 5. Proper bottom sheet behavior

Replace the plain `Modal` with a `Modal` + animated `View` that behaves like an iOS bottom sheet:

```typescript
// Use Animated.Value for sheet translateY
const sheetY = useRef(new Animated.Value(600)).current;

useEffect(() => {
  if (visible) {
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  } else {
    Animated.timing(sheetY, { toValue: 600, duration: 250, useNativeDriver: true }).start();
  }
}, [visible]);

// Drag-to-dismiss via PanResponder or simple scroll gesture
// When drag distance > 100pt downward, call onDismiss()
```

The sheet renders with `borderTopLeftRadius: 24, borderTopRightRadius: 24`, a drag handle pill at the top, and `KeyboardAvoidingView` for text inputs.

### 6. Network timeout

Add a 15-second timeout to URL fetch requests:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

try {
  const response = await fetch("/api/upload", {
    signal: controller.signal,
    ...
  });
} catch (err) {
  if (err instanceof DOMException && err.name === "AbortError") {
    setFetchError("The request timed out. Check your connection and try again.");
  }
} finally {
  clearTimeout(timeout);
}
```

### 7. Edge case: empty URL validation

Before making any network request, validate locally:

```typescript
function validateURL(url: string): string | null {
  if (!url.trim()) return "Please enter a URL before continuing.";
  try {
    const u = new URL(url.trim());
    if (!["http:", "https:"].includes(u.protocol)) return "URL must start with http:// or https://";
    return null; // valid
  } catch {
    return "That doesn't look like a valid URL. Try something like https://espn.com/article/…";
  }
}
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/UploadModal.tsx` | Add loading spinner, error messages, word count, bottom sheet animation, timeout, URL validation |

## Tests

Manual verification:
- [ ] Submitting empty URL shows "Please enter a URL" error (no network call)
- [ ] Invalid URL format shows format error (no network call)
- [ ] During fetch: submit button shows spinner, is disabled
- [ ] Network error shows connection message
- [ ] 409 Duplicate: shows "already in your library" message
- [ ] Text input mode: word count updates as user types
- [ ] <100 word warning appears for short text
- [ ] Bottom sheet slides up from bottom smoothly
- [ ] Dragging down >100pt dismisses the sheet

## Success Criteria

```bash
cd native && npx tsc --noEmit
```

- No TypeScript errors
- All error scenarios show a human-readable message (no raw JSON or "undefined" errors)
- URL validation is synchronous and instant (no loading state for bad URLs)

## Scope

- **No** URL content preview (title/image extraction) before submission
- **No** file type validation UI — that's `content-type-expansion`
- **No** multi-URL batch input
- `@gorhom/bottom-sheet` not required — native `Animated` + `Modal` is sufficient for this spec
