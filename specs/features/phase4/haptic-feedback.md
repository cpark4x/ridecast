# Feature: Haptic Feedback

> Wire `expo-haptics` throughout the native app so every meaningful touch has a physical response.

## Motivation

Haptic feedback is the difference between an app that feels native and one that feels like a web wrapper. Ridecast's interactions — play buttons, filter chips, swipe gestures — are all silent right now. Adding well-tuned haptics at each touch point makes the app feel premium and reinforces the result of each action (selection, success, error).

---

## Haptic Map — All Touch Points

| Touch Point | Component | Haptic Type | API Call |
|---|---|---|---|
| Play button tap (PlayerBar) | `PlayerBar.tsx` | Light impact | `Haptics.light()` |
| Play/Pause toggle (ExpandedPlayer) | `ExpandedPlayer.tsx` | Light impact | `Haptics.light()` |
| Skip forward/back (ExpandedPlayer) | `ExpandedPlayer.tsx` | Light impact | `Haptics.light()` |
| Speed selector change (ExpandedPlayer) | `ExpandedPlayer.tsx` | Light impact | `Haptics.light()` |
| Play All button (HomeScreen) | `index.tsx` | Medium impact | `Haptics.medium()` |
| UpNextCard tap (HomeScreen FAB) | `index.tsx` | Medium impact | `Haptics.medium()` |
| Version pill tap | `EpisodeCard.tsx` | Light impact | `Haptics.light()` |
| Filter chip tap | `library.tsx` | Light impact | `Haptics.light()` |
| FAB tap (+ button) | `library.tsx`, `index.tsx` | Medium impact | `Haptics.medium()` |
| Long-press trigger (card) | `EpisodeCard.tsx` | Medium impact | `Haptics.medium()` |
| Tap generating/unavailable episode | `library.tsx` → `handleCardPress` | Error (notification) | `Haptics.error()` |
| Episode generation complete | `sync.ts` — generating→ready transition | Success (notification) | `Haptics.success()` |

---

## Changes

### 1. Install `expo-haptics`

```bash
cd native && npx expo install expo-haptics
```

No additional native linking needed — expo-haptics ships with Expo SDK 50+.

---

### 2. New file: `native/lib/haptics.ts`

A thin wrapper so callers don't import `expo-haptics` directly. This makes it easy to disable haptics globally (e.g., for automated testing or a future accessibility preferences toggle).

```typescript
// native/lib/haptics.ts
import * as ExpoHaptics from "expo-haptics";

export const Haptics = {
  light: () =>
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  medium: () =>
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium),
  heavy: () =>
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy),
  success: () =>
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success),
  error: () =>
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error),
  warning: () =>
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning),
};
```

---

### 3. Modify: `native/components/PlayerBar.tsx`

**Before:**
```tsx
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";

export default function PlayerBar() {
  const {
    currentItem,
    isPlaying,
    togglePlay,
    position,
    duration,
    setExpandedPlayerVisible,
  } = usePlayer();

  if (!currentItem) return null;

  const progressPercent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <View className="bg-white border-t border-gray-200">
      {/* Thin progress bar at the very top */}
      <View className="h-0.5 w-full bg-gray-100">
        <View
          className="h-0.5 bg-brand"
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      {/* Bar body */}
      <TouchableOpacity
        onPress={() => setExpandedPlayerVisible(true)}
        activeOpacity={0.8}
        className="flex-row items-center px-4 py-3 gap-3"
        style={{ height: 64 }}
      >
        {/* Title */}
        <Text
          className="flex-1 text-sm font-semibold text-gray-900"
          numberOfLines={1}
        >
          {currentItem.title}
        </Text>

        {/* Play / Pause button — separate press handler so it doesn't bubble */}
        <TouchableOpacity
          onPress={() => void togglePlay()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={26}
            color="#EA580C"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
```

**After:**
```tsx
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";
import { Haptics } from "../lib/haptics";

export default function PlayerBar() {
  const {
    currentItem,
    isPlaying,
    togglePlay,
    position,
    duration,
    setExpandedPlayerVisible,
  } = usePlayer();

  if (!currentItem) return null;

  const progressPercent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <View className="bg-white border-t border-gray-200">
      {/* Thin progress bar at the very top */}
      <View className="h-0.5 w-full bg-gray-100">
        <View
          className="h-0.5 bg-brand"
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      {/* Bar body */}
      <TouchableOpacity
        onPress={() => setExpandedPlayerVisible(true)}
        activeOpacity={0.8}
        className="flex-row items-center px-4 py-3 gap-3"
        style={{ height: 64 }}
      >
        {/* Title */}
        <Text
          className="flex-1 text-sm font-semibold text-gray-900"
          numberOfLines={1}
        >
          {currentItem.title}
        </Text>

        {/* Play / Pause button — separate press handler so it doesn't bubble */}
        <TouchableOpacity
          onPress={() => {
            void Haptics.light();
            void togglePlay();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={26}
            color="#EA580C"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
```

**Diff summary:** Add `import { Haptics } from "../lib/haptics"`. Wrap play/pause `onPress` to fire `void Haptics.light()` before `void togglePlay()`.

---

### 4. Modify: `native/components/EpisodeCard.tsx`

Two touch points: version pill tap (light) and long-press trigger (medium).

**Before** (version pill `onPress` block, line ~180):
```tsx
return (
  <TouchableOpacity
    key={v.scriptId}
    onPress={() => onVersionPress(item, v, playable)}
    className={`px-2 py-0.5 rounded-full ${isActive ? "bg-brand" : "bg-gray-100"}`}
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
  >
```

**After:**
```tsx
return (
  <TouchableOpacity
    key={v.scriptId}
    onPress={() => {
      void Haptics.light();
      onVersionPress(item, v, playable);
    }}
    className={`px-2 py-0.5 rounded-full ${isActive ? "bg-brand" : "bg-gray-100"}`}
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
  >
```

**Before** (outer card `onLongPress`, line ~116):
```tsx
onLongPress={handleLongPress}
```

**After:**
```tsx
onLongPress={() => {
  void Haptics.medium();
  handleLongPress();
}}
```

**Add import at top of file** (after existing imports):
```tsx
import { Haptics } from "../lib/haptics";
```

**Full updated `native/components/EpisodeCard.tsx`:**
```tsx
import React from "react";
import { ActionSheetIOS, Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import type { AudioVersion, LibraryItem, PlayableItem } from "../lib/types";
import { Haptics } from "../lib/haptics";

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
}: EpisodeCardProps) {
  const { versions } = item;

  const badge = SOURCE_BADGE[item.sourceType.toLowerCase()] ?? defaultBadge(item.sourceType);

  const isGenerating  = versions.some((v) => v.status === "generating");
  const allCompleted  = versions.length > 0 && versions.every((v) => v.completed);

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
          if (idx === 2) {
            Alert.alert(
              "Delete Episode",
              "Deleting episodes is coming soon.",
              [{ text: "OK" }],
            );
          }
        },
      );
    } else {
      // Android / other: simple Alert
      Alert.alert(item.title, "What would you like to do?", [
        {
          text: "New Version",
          onPress: () => onNewVersion?.(item),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            Alert.alert("Coming soon", "Episode deletion will be available in a future update."),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      onLongPress={() => {
        void Haptics.medium();
        handleLongPress();
      }}
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

        {/* Footer: source badge + version pills + "+" pill */}
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
              // Build a minimal PlayableItem for this version
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
                  onPress={() => {
                    void Haptics.light();
                    onVersionPress(item, v, playable);
                  }}
                  className={`px-2 py-0.5 rounded-full ${isActive ? "bg-brand" : "bg-gray-100"}`}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-600"}`}>
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
                <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-600"}`}>
                  {label}
                </Text>
              </View>
            );
          })}

          {/* "+" pill — opens NewVersionSheet */}
          {onNewVersion ? (
            <TouchableOpacity
              onPress={() => onNewVersion(item)}
              className="bg-gray-100 px-2 py-0.5 rounded-full"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text className="text-xs font-medium text-gray-500">+</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

---

### 5. Modify: `native/app/(tabs)/library.tsx`

Three touch points: filter chips (light), FAB (medium), error on unavailable episode tap (error).

**Add import** at top (after existing imports):
```tsx
import { Haptics } from "../../lib/haptics";
```

**Before** (`handleCardPress` — no-ready-version path):
```tsx
function handleCardPress(item: LibraryItem) {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
    // TODO: show a "still generating" toast once Toast API is wired
    return;
  }
```

**After:**
```tsx
function handleCardPress(item: LibraryItem) {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
    void Haptics.error();
    // TODO: show a "still generating" toast once Toast API is wired
    return;
  }
```

**Before** (filter chip `onPress`):
```tsx
onPress={() => setFilter(key)}
```

**After:**
```tsx
onPress={() => {
  void Haptics.light();
  setFilter(key);
}}
```

**Before** (FAB `onPress`):
```tsx
onPress={() => setUploadModalVisible(true)}
```

**After:**
```tsx
onPress={() => {
  void Haptics.medium();
  setUploadModalVisible(true);
}}
```

---

### 6. Modify: `native/app/(tabs)/index.tsx`

Two touch points: Play All button (medium), FAB (medium).

**Add import** at top (after existing imports):
```tsx
import { Haptics } from "../../lib/haptics";
```

**Before** (Play All `onPress`):
```tsx
onPress={handlePlayAll}
```

**After:**
```tsx
onPress={() => {
  void Haptics.medium();
  handlePlayAll();
}}
```

**Before** (FAB `onPress`):
```tsx
onPress={() => setUploadModalVisible(true)}
```

**After:**
```tsx
onPress={() => {
  void Haptics.medium();
  setUploadModalVisible(true);
}}
```

---

### 7. Modify: `native/components/ExpandedPlayer.tsx`

Three touch points: play/pause (light), skip back (light), skip forward (light), speed change (light).

**Add import** at top (after existing imports):
```tsx
import { Haptics } from "../lib/haptics";
```

**Before** (`handleSpeedPress`):
```tsx
function handleSpeedPress() {
  const newSpeed = nextSpeed(speed, SPEEDS);
  setSpeed(newSpeed).catch((err) => console.warn("[player] setSpeed error:", err));
}
```

**After:**
```tsx
function handleSpeedPress() {
  void Haptics.light();
  const newSpeed = nextSpeed(speed, SPEEDS);
  setSpeed(newSpeed).catch((err) => console.warn("[player] setSpeed error:", err));
}
```

**Before** (skip back `onPress`):
```tsx
onPress={() => void skipBack(5)}
```

**After:**
```tsx
onPress={() => {
  void Haptics.light();
  void skipBack(5);
}}
```

**Before** (skip forward `onPress`):
```tsx
onPress={() => void skipForward(15)}
```

**After:**
```tsx
onPress={() => {
  void Haptics.light();
  void skipForward(15);
}}
```

**Before** (play/pause large button `onPress`):
```tsx
onPress={() => void togglePlay()}
```

**After:**
```tsx
onPress={() => {
  void Haptics.light();
  void togglePlay();
}}
```

---

### 8. Modify: `native/lib/sync.ts`

Fire a success haptic when a `generating` → `ready` transition is detected during sync. This reads the old SQLite state before upserting so a transition can be detected.

**Before:**
```typescript
import * as api from "./api";
import * as db from "./db";
import { downloadEpisodeAudio } from "./downloads";
import type { LibraryItem } from "./types";

export async function syncLibrary(): Promise<LibraryItem[]> {
  const serverItems = await api.fetchLibrary();
  await db.upsertEpisodes(serverItems);

  for (const item of serverItems) {
    for (const version of item.versions) {
      if (version.status === "ready" && version.audioId && version.audioUrl) {
        const existing = await db.getDownloadPath(version.audioId);
        if (!existing) {
          downloadEpisodeAudio(version.audioId, version.audioUrl).catch(
            (err) => console.warn("[sync] download failed:", version.audioId, err),
          );
        }
      }
    }
  }

  return serverItems;
}
```

**After:**
```typescript
import * as api from "./api";
import * as db from "./db";
import { downloadEpisodeAudio } from "./downloads";
import { Haptics } from "./haptics";
import type { LibraryItem } from "./types";

export async function syncLibrary(): Promise<LibraryItem[]> {
  // Read existing local state before overwriting — used to detect transitions
  const localItems = await db.getAllEpisodes();
  const localById = new Map(localItems.map((i) => [i.id, i]));

  const serverItems = await api.fetchLibrary();

  // Detect generating → ready transitions and fire success haptic
  let anyNewlyReady = false;
  for (const serverItem of serverItems) {
    const localItem = localById.get(serverItem.id);
    if (!localItem) continue;
    const localWasGenerating = localItem.versions.some((v) => v.status === "generating");
    const serverNowReady = serverItem.versions.some((v) => v.status === "ready");
    if (localWasGenerating && serverNowReady) {
      anyNewlyReady = true;
      break;
    }
  }
  if (anyNewlyReady) {
    void Haptics.success();
  }

  await db.upsertEpisodes(serverItems);

  for (const item of serverItems) {
    for (const version of item.versions) {
      if (version.status === "ready" && version.audioId && version.audioUrl) {
        const existing = await db.getDownloadPath(version.audioId);
        if (!existing) {
          downloadEpisodeAudio(version.audioId, version.audioUrl).catch(
            (err) => console.warn("[sync] download failed:", version.audioId, err),
          );
        }
      }
    }
  }

  return serverItems;
}
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/lib/haptics.ts` | **New** — Haptics utility wrapper (6 named methods) |
| `native/components/PlayerBar.tsx` | Add `Haptics.light()` to play/pause `onPress` |
| `native/components/EpisodeCard.tsx` | Add `Haptics.light()` to version pill tap; `Haptics.medium()` to long-press |
| `native/app/(tabs)/library.tsx` | `Haptics.light()` on filter chips; `Haptics.medium()` on FAB; `Haptics.error()` on unavailable tap |
| `native/app/(tabs)/index.tsx` | `Haptics.medium()` on Play All and FAB |
| `native/components/ExpandedPlayer.tsx` | `Haptics.light()` on skip, play/pause, speed change |
| `native/lib/sync.ts` | `Haptics.success()` on generating → ready transition |

---

## Tests

Haptics are a fire-and-forget native side-effect. Unit tests mock `expo-haptics` and verify the wrapper delegates correctly.

**File:** `native/lib/haptics.test.ts` (new)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock expo-haptics before importing the wrapper
vi.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium", Heavy: "Heavy" },
  NotificationFeedbackType: { Success: "Success", Error: "Error", Warning: "Warning" },
  impactAsync: vi.fn().mockResolvedValue(undefined),
  notificationAsync: vi.fn().mockResolvedValue(undefined),
}));

import * as ExpoHaptics from "expo-haptics";
import { Haptics } from "./haptics";

describe("Haptics wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("light() calls impactAsync with Light style", async () => {
    await Haptics.light();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
      ExpoHaptics.ImpactFeedbackStyle.Light,
    );
  });

  it("medium() calls impactAsync with Medium style", async () => {
    await Haptics.medium();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
      ExpoHaptics.ImpactFeedbackStyle.Medium,
    );
  });

  it("heavy() calls impactAsync with Heavy style", async () => {
    await Haptics.heavy();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
      ExpoHaptics.ImpactFeedbackStyle.Heavy,
    );
  });

  it("success() calls notificationAsync with Success type", async () => {
    await Haptics.success();
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
      ExpoHaptics.NotificationFeedbackType.Success,
    );
  });

  it("error() calls notificationAsync with Error type", async () => {
    await Haptics.error();
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
      ExpoHaptics.NotificationFeedbackType.Error,
    );
  });

  it("warning() calls notificationAsync with Warning type", async () => {
    await Haptics.warning();
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
      ExpoHaptics.NotificationFeedbackType.Warning,
    );
  });
});
```

---

## Success Criteria

```bash
# TypeScript — no type errors
cd native && npx tsc --noEmit
# → 0 errors

# Unit tests pass
cd native && npx jest haptics.test.ts --no-coverage
# → 6 tests pass

# Build succeeds
cd native && npx expo run:ios --no-build-cache
# → Build succeeded, app launches
```

Manual verification (physical device only — simulator does not fire haptics):
- [ ] Tap play button in PlayerBar → light buzz
- [ ] Tap Play All on Home screen → medium bump
- [ ] Tap FAB (+ button) → medium bump
- [ ] Tap filter chip in Library → light buzz
- [ ] Long-press episode card → medium buzz, then action sheet appears
- [ ] Tap a still-generating episode → error buzz (three rapid pulses on iPhone)
- [ ] Episode finishes generating (trigger via pull-to-refresh during generation) → success buzz

---

## Scope

- **No** haptic preferences toggle — that's `settings-onboarding-polish`
- **No** custom vibration patterns — only the three expo-haptics impact levels (`Light`, `Medium`, `Heavy`) and three notification types (`Success`, `Error`, `Warning`)
- **No** haptics inside the sleep timer modal or queue modal
- Android support is best-effort: expo-haptics provides fallback vibration automatically; no special Android code needed
- All haptic calls are `void`-prefixed — no unhandled promise warnings in Metro
