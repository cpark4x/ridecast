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

`native/app/(tabs)/library.tsx`: no `handleDelete` handler, no `Alert` import, no `api` namespace import.

## Changes

### 1. Add `deleteEpisode` to `native/lib/db.ts`

Add after the `deleteDownloadRecord` function at the end of the file:

```typescript
/**
 * Delete an episode and all associated local data.
 * - Removes the episode row from `episodes`
 * - Removes playback rows for each audioId in the episode's versions
 * - Removes download records for each audioId
 *
 * Call this AFTER the server confirms deletion — never before.
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

**Diff for `native/lib/db.ts`:**

```diff
 export async function deleteDownloadRecord(audioId: string) {
   const db = await getDb();
   await db.runAsync("DELETE FROM downloads WHERE audio_id = ?", audioId);
 }
+
+/**
+ * Delete an episode and all associated local data.
+ * - Removes the episode row from `episodes`
+ * - Removes playback rows for each audioId in the episode's versions
+ * - Removes download records for each audioId
+ *
+ * Call this AFTER the server confirms deletion — never before.
+ */
+export async function deleteEpisode(
+  contentId: string,
+  audioIds: string[],
+): Promise<void> {
+  const db = await getDb();
+
+  await db.runAsync("DELETE FROM episodes WHERE content_id = ?", contentId);
+
+  for (const audioId of audioIds) {
+    await db.runAsync("DELETE FROM playback WHERE audio_id = ?", audioId);
+    await db.runAsync("DELETE FROM downloads WHERE audio_id = ?", audioId);
+  }
+}
```

### 2. Add `deleteEpisode` to `native/lib/api.ts`

Add after the `savePlaybackState` function at the end of the file:

```typescript
// --- Delete ---

export async function deleteEpisode(contentId: string): Promise<void> {
  await fetchJSON<{ ok: boolean }>(`/api/library/${contentId}`, {
    method: "DELETE",
  });
}
```

`fetchJSON` already throws on non-ok responses (status ≥ 400, except 409), so callers receive an Error if the server returns 404 or 500.

**Diff for `native/lib/api.ts`:**

```diff
 export async function savePlaybackState(state: {
   audioId: string;
   position?: number;
   speed?: number;
   completed?: boolean;
 }): Promise<PlaybackState> {
   return fetchJSON<PlaybackState>("/api/playback", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(state),
   });
 }
+
+// --- Delete ---
+
+export async function deleteEpisode(contentId: string): Promise<void> {
+  await fetchJSON<{ ok: boolean }>(`/api/library/${contentId}`, {
+    method: "DELETE",
+  });
+}
```

### 3. Rewrite `native/components/EpisodeCard.tsx` (complete file)

This replaces the entire file. Changes from current:
- New imports: `useRef` from React, `Swipeable` from `react-native-gesture-handler`, `Ionicons` from `@expo/vector-icons`
- `onDelete?: (item: LibraryItem) => void` added to `EpisodeCardProps`
- `handleLongPress` replaced — both iOS and Android now call a shared `confirmDelete()` that invokes `onDelete`
- `swipeableRef` + `renderRightActions` added for swipe-to-delete
- `TouchableOpacity` wrapped in `Swipeable`
- "+" pill block removed from footer

```tsx
import React, { useRef } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import type { AudioVersion, LibraryItem, PlayableItem } from "../lib/types";

// ---------------------------------------------------------------------------
// Source badge colours
// ---------------------------------------------------------------------------

const SOURCE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pdf:    { bg: "bg-red-100",    text: "text-red-700",    label: "PDF"    },
  url:    { bg: "bg-blue-100",   text: "text-blue-700",   label: "URL"    },
  epub:   { bg: "bg-purple-100", text: "text-purple-700", label: "EPUB"   },
  txt:    { bg: "bg-gray-100",   text: "text-gray-700",   label: "TXT"    },
  pocket: { bg: "bg-green-100",  text: "text-green-700",  label: "Pocket" },
};

function defaultBadge(sourceType: string) {
  return { bg: "bg-gray-100", text: "text-gray-700", label: sourceType.toUpperCase() };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EpisodeCardProps {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
  /** Called when user taps a specific version pill (plays that version) */
  onVersionPress?: (item: LibraryItem, version: AudioVersion, playable: PlayableItem) => void;
  /** audioId of the currently playing track — highlights active version pill */
  currentAudioId?: string | null;
  /** Called when "New Version" is chosen from long-press menu */
  onNewVersion?: (item: LibraryItem) => void;
  /** Called after the user confirms deletion. Parent removes item from state. */
  onDelete?: (item: LibraryItem) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EpisodeCard({
  item,
  onPress,
  onVersionPress,
  currentAudioId,
  onNewVersion,
  onDelete,
}: EpisodeCardProps) {
  const { versions } = item;
  const swipeableRef = useRef<Swipeable>(null);

  const badge = SOURCE_BADGE[item.sourceType.toLowerCase()] ?? defaultBadge(item.sourceType);

  const isGenerating = versions.some((v) => v.status === "generating");
  const allCompleted = versions.length > 0 && versions.every((v) => v.completed);

  // Primary version: first ready version, or first overall
  const primaryVersion = versions.find((v) => v.status === "ready") ?? versions[0];

  const hasProgress =
    primaryVersion &&
    primaryVersion.position > 0 &&
    !primaryVersion.completed;

  const progressPercent =
    hasProgress && primaryVersion.durationSecs && primaryVersion.durationSecs > 0
      ? Math.min((primaryVersion.position / primaryVersion.durationSecs) * 100, 100)
      : 0;

  // ---------------------------------------------------------------------------
  // Long-press action sheet
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Swipe-to-delete right action
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
        delayLongPress={400}
        className="bg-white rounded-2xl shadow-sm mx-4 mb-3 overflow-hidden"
        style={{ opacity: allCompleted ? 0.5 : 1 }}
        activeOpacity={0.75}
      >
        {/* Progress bar */}
        {hasProgress && (
          <View className="h-1 bg-gray-100 w-full">
            <View className="h-1 bg-brand" style={{ width: `${progressPercent}%` }} />
          </View>
        )}

        <View className="p-4">
          {/* Title row */}
          <View className="flex-row items-start justify-between gap-2">
            <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={2}>
              {item.title}
            </Text>
            {isGenerating && (
              <View className="bg-amber-100 px-2 py-0.5 rounded-full self-start">
                <Text className="text-xs text-amber-700 font-medium">Generating</Text>
              </View>
            )}
          </View>

          {/* Author */}
          {item.author ? (
            <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
              {item.author}
            </Text>
          ) : null}

          {/* Footer: source badge + version pills */}
          <View className="flex-row items-center mt-3 gap-2 flex-wrap">
            {/* Source badge */}
            <View className={`${badge.bg} px-2 py-0.5 rounded-full`}>
              <Text className={`text-xs font-medium ${badge.text}`}>{badge.label}</Text>
            </View>

            {/* Per-version duration pills */}
            {versions.map((v) => {
              const isActive = !!currentAudioId && currentAudioId === v.audioId;
              const label = `${v.targetDuration} min`;

              if (v.status === "ready" && v.audioId && onVersionPress) {
                const playable: PlayableItem = {
                  id: v.audioId,
                  title: item.title,
                  duration: v.durationSecs ?? v.targetDuration * 60,
                  format: v.format,
                  audioUrl: v.audioUrl ?? "",
                  author: item.author,
                  sourceType: item.sourceType,
                  contentType: v.contentType,
                  themes: v.themes,
                  summary: v.summary,
                  targetDuration: v.targetDuration,
                  createdAt: item.createdAt,
                };
                return (
                  <TouchableOpacity
                    key={v.scriptId}
                    onPress={() => onVersionPress(item, v, playable)}
                    className={`px-2 py-0.5 rounded-full ${isActive ? "bg-brand" : "bg-gray-100"}`}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text
                      className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-600"}`}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Non-tappable (generating / processing)
              return (
                <View
                  key={v.scriptId}
                  className={`px-2 py-0.5 rounded-full ${isActive ? "bg-brand" : "bg-gray-100"}`}
                >
                  <Text
                    className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-600"}`}
                  >
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}
```

> `react-native-gesture-handler` is already a dependency (used by `expo-router`). No new package install needed.

### 4. Wire `onDelete` in `native/app/(tabs)/library.tsx`

**Diff:**

```diff
 import React, { useEffect, useRef, useState } from "react";
 import {
   FlatList,
+  Alert,
   ScrollView,
   Text,
   TextInput,
   TouchableOpacity,
   View,
 } from "react-native";
 import { SafeAreaView } from "react-native-safe-area-context";
 import { Ionicons } from "@expo/vector-icons";
 import { useRouter } from "expo-router";

 import EpisodeCard from "../../components/EpisodeCard";
 import UploadModal from "../../components/UploadModal";
 import EmptyState from "../../components/EmptyState";
 import NewVersionSheet from "../../components/NewVersionSheet";
 import { filterEpisodes } from "../../lib/libraryHelpers";
-import { getAllEpisodes, searchEpisodes } from "../../lib/db";
+import { getAllEpisodes, searchEpisodes, deleteEpisode as dbDeleteEpisode } from "../../lib/db";
+import { deleteEpisode as apiDeleteEpisode } from "../../lib/api";
 import { syncLibrary } from "../../lib/sync";
 import { usePlayer } from "../../lib/usePlayer";
 import type { AudioVersion, LibraryFilter, LibraryItem, PlayableItem } from "../../lib/types";
```

Add `handleDelete` after `handleVersionPress`:

```diff
   // Tap a specific version pill → play that exact version
   function handleVersionPress(
     _item: LibraryItem,
     _version: AudioVersion,
     playable: PlayableItem,
   ) {
     player.play(playable).catch((err) =>
       console.warn("[library] version play error:", err),
     );
   }
+
+  async function handleDelete(item: LibraryItem) {
+    const audioIds = item.versions
+      .map((v) => v.audioId)
+      .filter((id): id is string => !!id);
+
+    try {
+      // Server first — abort if it fails
+      await apiDeleteEpisode(item.id);
+      // Then local SQLite
+      await dbDeleteEpisode(item.id, audioIds);
+      // Remove from React state
+      setEpisodes((prev) => prev.filter((e) => e.id !== item.id));
+    } catch (err) {
+      Alert.alert(
+        "Delete Failed",
+        "Could not delete the episode. Check your connection and try again.",
+      );
+      console.warn("[library] delete error:", err);
+    }
+  }
```

Pass `onDelete` to `EpisodeCard` in the `renderItem`:

```diff
         renderItem={({ item }) => (
           <EpisodeCard
             item={item}
             onPress={handleCardPress}
             onVersionPress={handleVersionPress}
             currentAudioId={player.currentItem?.id ?? null}
             onNewVersion={setNewVersionEpisode}
+            onDelete={handleDelete}
           />
         )}
```

## Files to Create/Modify

| File | Change |
|---|---|
| `native/lib/db.ts` | Add `deleteEpisode(contentId, audioIds)` at end of file |
| `native/lib/api.ts` | Add `deleteEpisode(contentId)` at end of file |
| `native/components/EpisodeCard.tsx` | Full rewrite: add `onDelete` prop, replace stub handler, add `Swipeable`, remove "+" pill |
| `native/app/(tabs)/library.tsx` | Add `Alert` import, add named imports for `dbDeleteEpisode`/`apiDeleteEpisode`, add `handleDelete`, pass `onDelete` to `EpisodeCard` |

## Tests

**File:** `native/lib/__tests__/db-delete.test.ts` (new)

```typescript
import { describe, it, expect, beforeEach } from "@jest/globals";
import { getDb, deleteEpisode, upsertEpisodes, getAllEpisodes, saveLocalPlayback, getLocalPlayback } from "../db";
import type { LibraryItem } from "../types";

// Requires expo-sqlite in-memory mock OR jest config with transformIgnorePatterns
// that allows expo-sqlite to run. Add to jest.config.js:
//   transformIgnorePatterns: ["node_modules/(?!(expo-sqlite|expo-modules-core)/)"]

const MOCK_ITEM: LibraryItem = {
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
      status: "ready",
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

  it("removes audioIds from playback table", async () => {
    await upsertEpisodes([MOCK_ITEM]);
    await saveLocalPlayback({ audioId: "audio-1", position: 42, speed: 1 });

    await deleteEpisode("content-abc", ["audio-1"]);

    const playback = await getLocalPlayback("audio-1");
    expect(playback).toBeNull();
  });

  it("handles an empty audioIds array without error", async () => {
    await upsertEpisodes([MOCK_ITEM]);
    await expect(deleteEpisode("content-abc", [])).resolves.not.toThrow();
    // Row still deleted even with empty audioIds
    const after = await getAllEpisodes();
    expect(after.find((e) => e.id === "content-abc")).toBeUndefined();
  });
});
```

**File:** `native/lib/__tests__/api-delete.test.ts` (new)

```typescript
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Must mock fetch globally before importing api
global.fetch = jest.fn() as jest.Mock;

describe("api.deleteEpisode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls DELETE /api/library/{contentId}", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const { setTokenProvider, deleteEpisode } = await import("../api");
    setTokenProvider(async () => "test-token");

    await deleteEpisode("content-abc");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/library/content-abc"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("includes the Authorization header", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    const { setTokenProvider, deleteEpisode } = await import("../api");
    setTokenProvider(async () => "my-token");

    await deleteEpisode("content-abc");

    const [, options] = (fetch as jest.Mock).mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: "Bearer my-token",
    });
  });

  it("throws when the server returns a 404", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    });

    const { deleteEpisode } = await import("../api");
    await expect(deleteEpisode("content-missing")).rejects.toThrow("Not found");
  });

  it("throws when the server returns a 500", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    const { deleteEpisode } = await import("../api");
    await expect(deleteEpisode("content-abc")).rejects.toThrow();
  });
});
```

## Success Criteria

```bash
cd native
npx jest lib/__tests__/db-delete.test.ts lib/__tests__/api-delete.test.ts
# All tests pass

npx tsc --noEmit
# No type errors
```

Manual verification:
- [ ] Long-press an episode → tap "Delete" → confirmation alert appears with `"<episode title>" will be removed from your library.`
- [ ] Tap "Cancel" → alert dismisses, episode remains in list
- [ ] Tap "Delete" (destructive) → episode disappears from list immediately
- [ ] Swipe left on an episode card → red trash button revealed (w-20 width)
- [ ] Tap trash button → swipe closes, 150ms later same confirmation alert appears
- [ ] Confirm swipe-delete → episode removed from list
- [ ] Kill network (Airplane Mode) → try to delete → "Delete Failed" alert shown, episode remains in list
- [ ] "+" pill no longer visible on any card in the library
- [ ] Android: long-press → sheet with "New Version", "Delete", "Cancel" — same confirmation flow

## Scope

Client-side delete flow only. The backend `DELETE /api/library/{contentId}` endpoint must already exist (or be created separately) — this spec does not cover the server route. Local file deletion (removing the downloaded `.mp3` from the filesystem) is handled by a separate cleanup job; this spec only removes the SQLite record. No changes to `home/index.tsx` — deleted episodes will disappear on the next sync cycle. No changes to the `NewVersionSheet` or any other component.
