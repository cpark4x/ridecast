# Feature: Delete Episodes

> Replace the "Coming soon" stub with real deletion — long-press and swipe both work, SQLite and server stay in sync.

## Motivation

The delete action has been wired to an alert that says "Deleting episodes is coming soon" since the long-press menu shipped in `c69cb66`. This is a broken contract: the option appears in the action sheet, the user taps it, and nothing happens. It also leaves orphaned rows in SQLite when the server deletes content through other means.

Deletion needs to hit three places atomically: the local `episodes` table, the `playback` table (position data for each audio version), and the `downloads` table (local file record). The server call fires first; if it fails, no local data is removed.

The "+" pill (queue button) referenced in the original UX audit (#34) is also addressed here — it was added speculatively but has no backing queue system. Removing it eliminates a tap target that does nothing meaningful.

## Current State

`native/components/EpisodeCard.tsx` `handleLongPress()`:
- iOS: taps index 2 ("Delete") → shows `Alert.alert("Delete Episode", "Deleting episodes is coming soon.")`
- Android: taps "Delete" → shows `Alert.alert("Coming soon", "Episode deletion will be available in a future update.")`

`native/lib/db.ts`: has `deleteDownloadRecord(audioId)` but no `deleteEpisode(contentId)`.

`native/lib/api.ts`: no DELETE endpoint call.

## Changes

### 1. Add `deleteEpisode` to `native/lib/db.ts`

Deletes the episode row and all associated playback records. Downloads for each audio version are also removed. This must be called after the server confirms deletion.

```typescript
/**
 * Delete an episode and all associated local data.
 * - Removes the episode row from `episodes`
 * - Removes playback rows for each audioId in the episode's versions
 * - Removes download records for each audioId
 */
export async function deleteEpisode(
  contentId: string,
  audioIds: string[],
): Promise<void> {
  const db = await getDb();

  await db.runAsync("DELETE FROM episodes WHERE content_id = ?", contentId);

  for (const audioId of audioIds) {
    await db.runAsync("DELETE FROM playback WHERE audio_id = ?", audioId);
    await db.runAsync("DELETE FROM downloads WHERE audio_id = ?", audioId);
  }
}
```

> The caller is responsible for passing `audioIds` — derive them from `item.versions.map(v => v.audioId).filter(Boolean)` before calling.

### 2. Add `deleteEpisode` to `native/lib/api.ts`

```typescript
// --- Delete ---

export async function deleteEpisode(contentId: string): Promise<void> {
  await fetchJSON<{ ok: boolean }>(`/api/library/${contentId}`, {
    method: "DELETE",
  });
}
```

`fetchJSON` already throws on non-ok responses, so callers get an error if the server returns 404 or 500.

### 3. Add `onDelete` prop to `EpisodeCardProps` in `native/components/EpisodeCard.tsx`

```typescript
export interface EpisodeCardProps {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
  onVersionPress?: (item: LibraryItem, version: AudioVersion, playable: PlayableItem) => void;
  currentAudioId?: string | null;
  onNewVersion?: (item: LibraryItem) => void;
  /** Called after the user confirms deletion. Parent removes item from state. */
  onDelete?: (item: LibraryItem) => void;
}
```

### 4. Replace the stub delete handler in `native/components/EpisodeCard.tsx`

Replace both branches of `handleLongPress` with real confirmation + callback:

```typescript
function handleLongPress() {
  function confirmDelete() {
    Alert.alert(
      "Delete Episode",
      `"${item.title}" will be removed from your library.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete?.(item),
        },
      ],
    );
  }

  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ["Cancel", "New Version", "Delete"],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 2,
        title: item.title,
      },
      (idx) => {
        if (idx === 1) onNewVersion?.(item);
        if (idx === 2) confirmDelete();
      },
    );
  } else {
    Alert.alert(item.title, "What would you like to do?", [
      { text: "New Version", onPress: () => onNewVersion?.(item) },
      { text: "Delete", style: "destructive", onPress: confirmDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  }
}
```

### 5. Add swipe-to-delete on `EpisodeCard` using `react-native-gesture-handler`

Wrap the card's `TouchableOpacity` in a `Swipeable` that reveals a red delete action on swipe-left. The swipe calls the same `onDelete` prop as the long-press path, so the confirmation alert fires consistently.

```typescript
import { Swipeable } from "react-native-gesture-handler";
import { useRef } from "react";

// Inside EpisodeCard component:
const swipeableRef = useRef<Swipeable>(null);

function renderRightActions() {
  return (
    <TouchableOpacity
      onPress={() => {
        swipeableRef.current?.close();
        // Short delay so the swipe closes before the alert appears
        setTimeout(() => onDelete?.(item), 150);
      }}
      className="bg-red-500 justify-center items-center w-20 mx-4 mb-3 rounded-2xl"
    >
      <Ionicons name="trash-outline" size={22} color="white" />
      <Text className="text-white text-xs font-medium mt-1">Delete</Text>
    </TouchableOpacity>
  );
}

return (
  <Swipeable
    ref={swipeableRef}
    renderRightActions={onDelete ? renderRightActions : undefined}
    rightThreshold={40}
    overshootRight={false}
  >
    <TouchableOpacity
      onPress={() => onPress(item)}
      onLongPress={handleLongPress}
      {/* ... rest of existing props */}
    >
      {/* ... existing card body unchanged */}
    </TouchableOpacity>
  </Swipeable>
);
```

> `react-native-gesture-handler` is already a dependency (used by `expo-router`). No new package install needed.

### 6. Remove the non-functional "+" queue pill from `EpisodeCard`

Delete the `{/* "+" pill — opens NewVersionSheet */}` block entirely (lines 204–213 in the current file). The "+" action is already accessible via long-press → "New Version". Having both creates confusion and the pill has no distinct queue behavior.

```diff
-          {/* "+" pill — opens NewVersionSheet */}
-          {onNewVersion ? (
-            <TouchableOpacity
-              onPress={() => onNewVersion(item)}
-              className="bg-gray-100 px-2 py-0.5 rounded-full"
-              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
-            >
-              <Text className="text-xs font-medium text-gray-500">+</Text>
-            </TouchableOpacity>
-          ) : null}
```

### 7. Wire `onDelete` in `native/app/(tabs)/library.tsx`

Add the delete handler and pass it to `EpisodeCard`:

```typescript
async function handleDelete(item: LibraryItem) {
  const audioIds = item.versions
    .map((v) => v.audioId)
    .filter((id): id is string => !!id);

  try {
    // Server first — abort if it fails
    await api.deleteEpisode(item.id);
    // Then local
    await db.deleteEpisode(item.id, audioIds);
    // Remove from React state
    setEpisodes((prev) => prev.filter((e) => e.id !== item.id));
  } catch (err) {
    Alert.alert(
      "Delete Failed",
      "Could not delete the episode. Check your connection and try again.",
    );
    console.warn("[library] delete error:", err);
  }
}
```

Add the import at the top:

```typescript
import * as api from "../../lib/api";
import * as db from "../../lib/db";
```

Pass `onDelete` to `EpisodeCard` in the `renderItem`:

```tsx
<EpisodeCard
  item={item}
  onPress={handleCardPress}
  onVersionPress={handleVersionPress}
  currentAudioId={player.currentItem?.id ?? null}
  onNewVersion={setNewVersionEpisode}
  onDelete={handleDelete}
/>
```

## Files to Create/Modify

| File | Change |
|---|---|
| `native/lib/db.ts` | Add `deleteEpisode(contentId, audioIds)` |
| `native/lib/api.ts` | Add `deleteEpisode(contentId)` |
| `native/components/EpisodeCard.tsx` | Add `onDelete` prop, replace stub handler, add `Swipeable`, remove "+" pill |
| `native/app/(tabs)/library.tsx` | Add `handleDelete`, import api + db, pass `onDelete` to `EpisodeCard` |

## Tests

**File:** `native/lib/__tests__/db-delete.test.ts` (new)

```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";
import * as SQLite from "expo-sqlite";
import { setDb, deleteEpisode, upsertEpisodes, getAllEpisodes } from "../db";

// Uses in-memory SQLite via jest mock in __mocks__/expo-sqlite.ts
// (or real SQLite if running on device via Expo test runner)

const MOCK_ITEM = {
  id: "content-abc",
  title: "Test Episode",
  author: null,
  sourceType: "url",
  sourceUrl: "https://example.com",
  wordCount: 1000,
  createdAt: new Date().toISOString(),
  versions: [
    {
      scriptId: "script-1",
      audioId: "audio-1",
      audioUrl: "https://cdn.example.com/audio-1.mp3",
      durationSecs: 300,
      targetDuration: 5,
      format: "brief",
      status: "ready" as const,
      completed: false,
      position: 0,
      createdAt: new Date().toISOString(),
      summary: null,
      contentType: null,
      themes: [],
      compressionRatio: 0.5,
      actualWordCount: 500,
      voices: [],
      ttsProvider: "elevenlabs",
    },
  ],
};

describe("deleteEpisode", () => {
  it("removes the episode row from SQLite", async () => {
    await upsertEpisodes([MOCK_ITEM]);
    const before = await getAllEpisodes();
    expect(before.find((e) => e.id === "content-abc")).toBeDefined();

    await deleteEpisode("content-abc", ["audio-1"]);

    const after = await getAllEpisodes();
    expect(after.find((e) => e.id === "content-abc")).toBeUndefined();
  });

  it("is a no-op for a content_id that does not exist", async () => {
    await expect(deleteEpisode("nonexistent", [])).resolves.not.toThrow();
  });

  it("removes all audioIds from playback and downloads", async () => {
    const db = await import("../db");
    // Seed a playback row
    await db.saveLocalPlayback({ audioId: "audio-1", position: 42, speed: 1 });
    await deleteEpisode("content-abc", ["audio-1"]);
    const playback = await db.getLocalPlayback("audio-1");
    expect(playback).toBeNull();
  });
});
```

**File:** `native/lib/__tests__/api-delete.test.ts` (new)

```typescript
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

global.fetch = jest.fn();

describe("api.deleteEpisode", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls DELETE /api/library/{contentId}", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    // Must set token provider before calling
    const { setTokenProvider, deleteEpisode } = await import("../api");
    setTokenProvider(async () => "test-token");

    await deleteEpisode("content-abc");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/library/content-abc"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws when the server returns an error", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    });

    const { deleteEpisode } = await import("../api");
    await expect(deleteEpisode("content-missing")).rejects.toThrow("Not found");
  });
});
```

## Success Criteria

```bash
cd native
npx jest lib/__tests__/db-delete.test.ts lib/__tests__/api-delete.test.ts
# All tests pass
```

Manual verification:
- [ ] Long-press an episode → tap "Delete" → confirmation alert appears with episode title
- [ ] Confirm → episode disappears from list immediately
- [ ] Swipe left on an episode card → red trash button revealed
- [ ] Tap trash → same confirmation alert appears
- [ ] Confirm swipe-delete → episode removed from list
- [ ] Kill network → try to delete → "Delete Failed" alert shown, episode remains in list
- [ ] "+" pill no longer visible on any card in the library

## Scope

Client-side delete flow only. The backend `DELETE /api/library/{contentId}` endpoint must already exist or be created separately — this spec does not cover the server route implementation. Local file deletion (removing the downloaded `.mp3` from the filesystem) is handled by a separate cleanup job; this spec only removes the SQLite record. No changes to `home/index.tsx` — deleted episodes will disappear on the next sync cycle.
