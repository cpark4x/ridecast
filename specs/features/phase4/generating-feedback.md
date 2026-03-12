# Feature: Generating Episode Feedback

> Turn the silent tap-on-generating-card failure into a clear, friendly message — and add a pulse animation so the card communicates its state before the user even taps.

## Motivation

When a user taps an episode card whose versions are all still generating, `handleCardPress` in `library.tsx` returns early with no feedback whatsoever (the `// TODO: show a "still generating" toast` comment has lived there since the versioning PR). The same silent failure exists on the home screen: `libraryItemToPlayable` returns `null` for generating items, so they never appear in the Up Next list at all — but a user who navigates directly to the Library and taps one gets nothing.

This is a trust problem. A silent tap makes the user think the app is broken or that their content failed to generate. A clear message — "Still generating — we'll notify you when it's ready" — turns the silence into a status update.

The pulse animation is the secondary goal: it sets expectations before the tap happens, reducing how often users tap in the first place.

## Current State

`native/app/(tabs)/library.tsx`, `handleCardPress()` (lines 100–107):
```typescript
function handleCardPress(item: LibraryItem) {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
    // TODO: show a "still generating" toast once Toast API is wired
    return;  // ← silent failure
  }
  // ...
}
```

`native/components/EpisodeCard.tsx`: the "Generating" amber badge (lines 135–139) is rendered statically — no animation.

`native/app/(tabs)/index.tsx`, `handlePlayItem()` (lines 235–239): calls `player.play()` directly with no guard against items that somehow lack `audioUrl`.

## Changes

### 1. Create `native/lib/toast.ts` (new file)

```typescript
import { Alert } from "react-native";

/**
 * Show a non-blocking informational message.
 *
 * Uses Alert.alert for now — intentionally swappable for a proper snackbar
 * library (e.g. react-native-toast-message or burnt) without touching call sites.
 */
export function showToast(message: string, title = "Ridecast"): void {
  Alert.alert(title, message, [{ text: "OK" }], { cancelable: true });
}

/**
 * Convenience wrapper for the "still generating" UX state.
 * Called any time the user taps or attempts to play a version that isn't ready.
 */
export function showGeneratingToast(): void {
  showToast(
    "Still generating — we'll notify you when it's ready.",
    "Coming Soon",
  );
}
```

> **Note:** `Alert.alert` is modal on iOS (blocks until dismissed). Once `react-native-toast-message` or `burnt` is added as a dependency, replace `showToast`'s body only — all call sites remain unchanged.

### 2. Update `native/app/(tabs)/library.tsx`

**Diff:**

```diff
 import React, { useEffect, useRef, useState } from "react";
 import {
   FlatList,
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
 import { getAllEpisodes, searchEpisodes } from "../../lib/db";
 import { syncLibrary } from "../../lib/sync";
 import { usePlayer } from "../../lib/usePlayer";
+import { showGeneratingToast } from "../../lib/toast";
 import type { AudioVersion, LibraryFilter, LibraryItem, PlayableItem } from "../../lib/types";
```

```diff
   // Tap on the whole card → play the primary (first ready) version
   function handleCardPress(item: LibraryItem) {
     const readyVersion = item.versions.find(
       (v) => v.status === "ready" && v.audioId && v.audioUrl,
     );
     if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
-      // TODO: show a "still generating" toast once Toast API is wired
-      return;
+      const isGenerating = item.versions.some(
+        (v) => v.status === "generating" || v.status === "processing",
+      );
+      if (isGenerating || item.versions.length === 0) {
+        showGeneratingToast();
+      }
+      return;
     }
```

The full updated `handleCardPress`:

```typescript
function handleCardPress(item: LibraryItem) {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
    const isGenerating = item.versions.some(
      (v) => v.status === "generating" || v.status === "processing",
    );
    if (isGenerating || item.versions.length === 0) {
      showGeneratingToast();
    }
    return;
  }

  const playable: PlayableItem = {
    id: readyVersion.audioId,
    title: item.title,
    duration: readyVersion.durationSecs ?? readyVersion.targetDuration * 60,
    format: readyVersion.format,
    audioUrl: readyVersion.audioUrl,
    author: item.author,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    contentType: readyVersion.contentType,
    themes: readyVersion.themes,
    summary: readyVersion.summary,
    targetDuration: readyVersion.targetDuration,
    wordCount: item.wordCount,
    compressionRatio: readyVersion.compressionRatio,
    voices: readyVersion.voices,
    ttsProvider: readyVersion.ttsProvider,
    createdAt: item.createdAt,
  };

  player.play(playable).catch((err) =>
    console.warn("[library] play error:", err),
  );
}
```

### 3. Update `native/app/(tabs)/index.tsx`

Add a belt-and-suspenders guard in `handlePlayItem` for the case where filtering logic changes and a non-playable item somehow reaches `UpNextCard`:

**Diff:**

```diff
+import { showGeneratingToast } from "../../lib/toast";
 import { getUnlistenedItems, libraryItemToPlayable } from "../../lib/libraryHelpers";
```

```diff
   function handlePlayItem(playable: PlayableItem) {
+    if (!playable.audioUrl) {
+      showGeneratingToast();
+      return;
+    }
     player.play(playable).catch((err) =>
       console.warn("[home] play error:", err),
     );
   }
```

### 4. Add pulse animation to `native/components/EpisodeCard.tsx`

**Diff** — add imports at the top:

```diff
-import React from "react";
+import React, { useEffect, useRef } from "react";
 import {
   ActionSheetIOS,
   Alert,
+  Animated,
   Platform,
   Text,
   TouchableOpacity,
   View,
 } from "react-native";
```

**Diff** — add `pulseAnim` and `useEffect` after the existing derived values (`isGenerating`, `allCompleted`, etc.):

```diff
   const isGenerating  = versions.some((v) => v.status === "generating");
   const allCompleted  = versions.length > 0 && versions.every((v) => v.completed);
+
+  // Pulse animation for the "Generating" badge
+  const pulseAnim = useRef(new Animated.Value(1)).current;
+
+  useEffect(() => {
+    if (!isGenerating) {
+      pulseAnim.setValue(1);
+      return;
+    }
+    const pulse = Animated.loop(
+      Animated.sequence([
+        Animated.timing(pulseAnim, {
+          toValue: 0.4,
+          duration: 800,
+          useNativeDriver: true,
+        }),
+        Animated.timing(pulseAnim, {
+          toValue: 1,
+          duration: 800,
+          useNativeDriver: true,
+        }),
+      ]),
+    );
+    pulse.start();
+    return () => pulse.stop();
+  }, [isGenerating, pulseAnim]);
```

**Diff** — replace the static generating badge in the title row:

```diff
-          {isGenerating && (
-            <View className="bg-amber-100 px-2 py-0.5 rounded-full self-start">
-              <Text className="text-xs text-amber-700 font-medium">Generating</Text>
-            </View>
-          )}
+          {isGenerating && (
+            <Animated.View
+              style={{ opacity: pulseAnim }}
+              className="bg-amber-100 px-2 py-0.5 rounded-full self-start"
+            >
+              <Text className="text-xs text-amber-700 font-medium">Generating</Text>
+            </Animated.View>
+          )}
```

The pulse runs at ~0.625 Hz (1600ms cycle), which reads as "active/processing" without being distracting. The animation uses `useNativeDriver: true` — opacity-only animation runs off the JS thread with no performance cost.

## Files to Create/Modify

| File | Change |
|---|---|
| `native/lib/toast.ts` | New — `showToast`, `showGeneratingToast` utilities |
| `native/app/(tabs)/library.tsx` | Import `showGeneratingToast`, replace silent return with toast + generating check |
| `native/app/(tabs)/index.tsx` | Import `showGeneratingToast`, add guard in `handlePlayItem` |
| `native/components/EpisodeCard.tsx` | Add `useEffect`, `useRef`, `Animated` imports; add `pulseAnim` hook; replace static badge with `Animated.View` |

## Tests

**File:** `native/lib/__tests__/toast.test.ts` (new)

```typescript
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: "ios" },
}));

describe("toast utilities", () => {
  beforeEach(() => jest.clearAllMocks());

  it("showToast calls Alert.alert with title and message", async () => {
    const { Alert } = await import("react-native");
    const { showToast } = await import("../toast");

    showToast("Hello world");

    expect(Alert.alert).toHaveBeenCalledWith(
      "Ridecast",
      "Hello world",
      [{ text: "OK" }],
      { cancelable: true },
    );
  });

  it("showToast uses a custom title when provided", async () => {
    const { Alert } = await import("react-native");
    const { showToast } = await import("../toast");

    showToast("A message", "Custom Title");

    expect(Alert.alert).toHaveBeenCalledWith(
      "Custom Title",
      "A message",
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("showGeneratingToast calls Alert.alert with the generating message", async () => {
    const { Alert } = await import("react-native");
    const { showGeneratingToast } = await import("../toast");

    showGeneratingToast();

    expect(Alert.alert).toHaveBeenCalledWith(
      "Coming Soon",
      expect.stringContaining("Still generating"),
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("showGeneratingToast message contains 'notify you'", async () => {
    const { Alert } = await import("react-native");
    const { showGeneratingToast } = await import("../toast");

    showGeneratingToast();

    const [, message] = (Alert.alert as jest.Mock).mock.calls[0];
    expect(message).toContain("notify you");
  });
});
```

**File:** `native/lib/__tests__/toast-library-integration.test.ts` (new)

This tests the `handleCardPress` logic in isolation (no component render needed):

```typescript
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import type { LibraryItem } from "../types";

// Mock toast before importing library screen helpers
const mockShowGeneratingToast = jest.fn();
jest.mock("../toast", () => ({
  showGeneratingToast: mockShowGeneratingToast,
  showToast: jest.fn(),
}));

/**
 * Reproduces the handleCardPress logic from library.tsx as a pure function
 * so it can be unit-tested without React Native rendering.
 */
function handleCardPress(
  item: LibraryItem,
  onShowGeneratingToast: () => void,
  onPlay: (id: string) => void,
): void {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
    const isGenerating = item.versions.some(
      (v) => v.status === "generating" || v.status === "processing",
    );
    if (isGenerating || item.versions.length === 0) {
      onShowGeneratingToast();
    }
    return;
  }
  onPlay(readyVersion.audioId);
}

const BASE_VERSION = {
  scriptId: "s1",
  audioId: null as string | null,
  audioUrl: null as string | null,
  durationSecs: null,
  targetDuration: 5,
  format: "brief",
  completed: false,
  position: 0,
  createdAt: new Date().toISOString(),
  summary: null,
  contentType: null,
  themes: [] as string[],
  compressionRatio: 0,
  actualWordCount: 0,
  voices: [] as string[],
  ttsProvider: "elevenlabs",
} as const;

const BASE_ITEM: LibraryItem = {
  id: "c1",
  title: "Test Episode",
  author: null,
  sourceType: "url",
  sourceUrl: "https://example.com",
  wordCount: 800,
  createdAt: new Date().toISOString(),
  versions: [],
};

describe("handleCardPress logic — generating episode feedback", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls onShowGeneratingToast when status is 'generating'", () => {
    const item: LibraryItem = {
      ...BASE_ITEM,
      versions: [{ ...BASE_VERSION, status: "generating" }],
    };
    const onPlay = jest.fn();
    const onToast = jest.fn();
    handleCardPress(item, onToast, onPlay);
    expect(onToast).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls onShowGeneratingToast when status is 'processing'", () => {
    const item: LibraryItem = {
      ...BASE_ITEM,
      versions: [{ ...BASE_VERSION, status: "processing" }],
    };
    const onPlay = jest.fn();
    const onToast = jest.fn();
    handleCardPress(item, onToast, onPlay);
    expect(onToast).toHaveBeenCalledTimes(1);
  });

  it("calls onShowGeneratingToast when versions array is empty", () => {
    const item: LibraryItem = { ...BASE_ITEM, versions: [] };
    const onPlay = jest.fn();
    const onToast = jest.fn();
    handleCardPress(item, onToast, onPlay);
    expect(onToast).toHaveBeenCalledTimes(1);
  });

  it("calls onPlay with audioId when a ready version exists", () => {
    const item: LibraryItem = {
      ...BASE_ITEM,
      versions: [
        {
          ...BASE_VERSION,
          status: "ready",
          audioId: "audio-123",
          audioUrl: "https://cdn.example.com/audio-123.mp3",
        },
      ],
    };
    const onPlay = jest.fn();
    const onToast = jest.fn();
    handleCardPress(item, onToast, onPlay);
    expect(onPlay).toHaveBeenCalledWith("audio-123");
    expect(onToast).not.toHaveBeenCalled();
  });

  it("does not call onShowGeneratingToast when ready version has missing audioUrl", () => {
    // Edge case: status ready but audioUrl null — treated as not ready but no toast
    // (content may have failed silently — don't claim it's still generating)
    const item: LibraryItem = {
      ...BASE_ITEM,
      versions: [
        { ...BASE_VERSION, status: "ready", audioId: "audio-123", audioUrl: null },
      ],
    };
    const onPlay = jest.fn();
    const onToast = jest.fn();
    handleCardPress(item, onToast, onPlay);
    expect(onToast).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });
});
```

## Success Criteria

```bash
cd native
npx jest lib/__tests__/toast.test.ts
# 4 tests pass

npx jest lib/__tests__/toast-library-integration.test.ts
# 5 tests pass

npx tsc --noEmit
# No type errors
```

Manual verification:
- [ ] Library: tap an episode whose badge shows "Generating" → Alert appears with title "Coming Soon" and message containing "Still generating"
- [ ] Alert has an "OK" button and dismisses cleanly
- [ ] Tapping a ready episode → plays normally, no alert
- [ ] Tap episode with zero versions (content uploaded, not yet queued) → same toast appears
- [ ] "Generating" badge on the card pulses (fades in and out roughly every 800ms)
- [ ] Pulse stops and badge disappears when the episode becomes ready on the next sync cycle
- [ ] Home screen "Play All" with only ready items → plays normally, no toast
- [ ] Home screen: if `audioUrl` is somehow null on a PlayableItem, toast fires instead of crash

## Scope

Client-side feedback only. No push notification infrastructure — the "we'll notify you when it's ready" copy is forward-looking; actual push notifications are a separate feature. The toast implementation is intentionally minimal (`Alert.alert`); swapping to `react-native-toast-message` for a non-blocking snackbar is an explicit follow-up task (replace only `showToast`'s body). No changes to the generating logic, API polling, or background sync. No changes to the `NewVersionSheet`. The `status === "processing"` check in `handleCardPress` covers the intermediate server-side state between upload and audio generation.
