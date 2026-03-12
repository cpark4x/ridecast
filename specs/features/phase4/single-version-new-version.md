# Feature: Single-Version "New Version" Access

> Make it easy to create a second version from a single-version card — today the affordance is a bare "+" symbol that users don't discover naturally.

## Motivation

The "New Version" action is currently surfaced two ways: (1) a bare `+` pill in the card footer, and (2) the long-press action sheet. Neither is obvious. For single-version cards the `+` reads as a decorative element rather than an action. Upgrading it to a labeled `+ Version` button and re-routing dead taps (fully-completed card, no playable audio) to `NewVersionSheet` surface this core feature at exactly the moment users want it — after finishing an episode.

## Scope

- **No** new UI for in-card duration picker — `NewVersionSheet` handles duration selection
- **No** backend changes — `NewVersionSheet` already calls the correct API
- **No** auto-suggest duration for the second version
- Multi-version cards continue to work identically

## Changes

### 1. Upgrade the `+` pill in `native/components/EpisodeCard.tsx`

**File:** `native/components/EpisodeCard.tsx`

**Before** (lines 204–213 — the `+` pill):
```tsx
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
```

**After:**
```tsx
{/* "+ Version" pill — labeled button, more discoverable than bare "+" */}
{onNewVersion ? (
  <TouchableOpacity
    onPress={() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onNewVersion(item);
    }}
    className="flex-row items-center gap-0.5 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200"
    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    accessibilityLabel="Create a new version"
  >
    <Ionicons name="add" size={11} color="#6B7280" />
    <Text className="text-xs font-medium text-gray-500">Version</Text>
  </TouchableOpacity>
) : null}
```

### 2. Re-route completed-card dead-tap to `onNewVersion`

When a card has versions but none are playable (all completed), tapping it currently does nothing. Instead, open `NewVersionSheet` to invite the user to generate a fresh version.

**File:** `native/components/EpisodeCard.tsx`

The `onPress` handler is in the parent (`library.tsx`). We need to handle the dead-tap case in `handleCardPress`.

**Before** (in `native/app/(tabs)/library.tsx`, `handleCardPress`):
```typescript
function handleCardPress(item: LibraryItem) {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
    // TODO: show a "still generating" toast once Toast API is wired
    return;
  }
  // ... build playable and call player.play()
}
```

**After:**
```typescript
function handleCardPress(item: LibraryItem) {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );

  if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
    const isStillGenerating = item.versions.some(
      (v) => v.status === "generating" || v.status === "processing",
    );

    if (isStillGenerating) {
      // Give error haptic — episode not ready yet
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    // All versions are completed or no versions exist — offer a new version
    setNewVersionEpisode(item);
    return;
  }

  // Normal play flow (unchanged)
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

### 3. Add `expo-haptics` import to `native/components/EpisodeCard.tsx`

**Before:**
```typescript
import React from "react";
import { ActionSheetIOS, Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import type { AudioVersion, LibraryItem, PlayableItem } from "../lib/types";
```

**After:**
```typescript
import React from "react";
import { ActionSheetIOS, Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { AudioVersion, LibraryItem, PlayableItem } from "../lib/types";
```

Note: `Ionicons` is already used in the existing long-press `Alert` — check whether it's already imported. If so, remove the duplicate import line.

### 4. Add `expo-haptics` import to `native/app/(tabs)/library.tsx`

The updated `handleCardPress` uses `Haptics.notificationAsync`.

**Before:**
```typescript
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
```

**After:**
```typescript
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
```

### 5. Update `NewVersionSheet` header copy for single-version case

**File:** `native/components/NewVersionSheet.tsx`

Current header shows "New Version" regardless of how many versions exist. For single-version items, "Create a second version" is more informative.

**Before** (lines 64–68):
```tsx
{/* Header */}
<View className="px-5 pt-3 pb-4">
  <Text className="text-lg font-bold text-gray-900">New Version</Text>
  <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
    {episode.title}
  </Text>
</View>
```

**After:**
```tsx
{/* Header */}
<View className="px-5 pt-3 pb-4">
  <Text className="text-lg font-bold text-gray-900">
    {episode.versions.length === 0
      ? "Create Your First Episode"
      : episode.versions.length === 1
        ? "Create a Second Version"
        : `Add Version ${episode.versions.length + 1}`}
  </Text>
  <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
    {episode.title}
  </Text>
</View>
```

### 6. Complete modified `native/components/EpisodeCard.tsx`

For reference, the full modified file (changed sections only highlighted with comments):

```tsx
import React from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";               // ← NEW
import { Ionicons } from "@expo/vector-icons";         // ← NEW (if not already imported)
import type { AudioVersion, LibraryItem, PlayableItem } from "../lib/types";

// ... SOURCE_BADGE, defaultBadge, EpisodeCardProps unchanged ...

export default function EpisodeCard({
  item,
  onPress,
  onVersionPress,
  currentAudioId,
  onNewVersion,
}: EpisodeCardProps) {
  // ... all existing code unchanged until the "+" pill ...

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      onLongPress={handleLongPress}
      delayLongPress={400}
      className="bg-white rounded-2xl shadow-sm mx-4 mb-3 overflow-hidden"
      style={{ opacity: allCompleted ? 0.5 : 1 }}
      activeOpacity={0.75}
    >
      {/* Progress bar — unchanged */}
      {hasProgress && (
        <View className="h-1 bg-gray-100 w-full">
          <View className="h-1 bg-brand" style={{ width: `${progressPercent}%` }} />
        </View>
      )}

      <View className="p-4">
        {/* Title row — unchanged */}
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

        {/* Author — unchanged */}
        {item.author ? (
          <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
            {item.author}
          </Text>
        ) : null}

        {/* Footer: source badge + version pills + "+ Version" pill */}
        <View className="flex-row items-center mt-3 gap-2 flex-wrap">
          {/* Source badge — unchanged */}
          <View className={`${badge.bg} px-2 py-0.5 rounded-full`}>
            <Text className={`text-xs font-medium ${badge.text}`}>{badge.label}</Text>
          </View>

          {/* Per-version duration pills — unchanged */}
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
                  <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-600"}`}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }

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

          {/* ← CHANGED: "+" pill → labeled "+ Version" button */}
          {onNewVersion ? (
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onNewVersion(item);
              }}
              className="flex-row items-center gap-0.5 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Create a new version"
            >
              <Ionicons name="add" size={11} color="#6B7280" />
              <Text className="text-xs font-medium text-gray-500">Version</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

## Files to Modify

| File | Change |
|------|--------|
| `native/components/EpisodeCard.tsx` | Add `expo-haptics` + `Ionicons` imports; upgrade `+` pill to labeled `+ Version` button with haptic |
| `native/app/(tabs)/library.tsx` | Add `expo-haptics` import; update `handleCardPress` to route completed/no-audio cards to `NewVersionSheet` with error haptic for still-generating cards |
| `native/components/NewVersionSheet.tsx` | Context-aware header: "Create Your First Episode" / "Create a Second Version" / "Add Version N" |

## Tests

**File:** `native/components/EpisodeCard.test.tsx` (create or append)

```typescript
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import EpisodeCard from "./EpisodeCard";
import type { LibraryItem } from "../lib/types";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light" },
}));

const Haptics = require("expo-haptics");

function makeItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: "item-1",
    title: "Test Episode",
    author: "Author Name",
    sourceType: "url",
    sourceUrl: "https://example.com/article",
    wordCount: 800,
    createdAt: new Date().toISOString(),
    versions: [],
    ...overrides,
  };
}

describe("EpisodeCard — + Version pill", () => {
  it("renders '+ Version' label (not bare '+')", () => {
    const onNewVersion = jest.fn();
    const { getByText, queryByText } = render(
      <EpisodeCard
        item={makeItem()}
        onPress={jest.fn()}
        onNewVersion={onNewVersion}
      />,
    );
    expect(getByText("Version")).toBeTruthy();
    expect(queryByText("+")).toBeNull(); // no bare "+"
  });

  it("tapping + Version calls onNewVersion with the item", () => {
    const onNewVersion = jest.fn();
    const item = makeItem();
    const { getByAccessibilityLabel } = render(
      <EpisodeCard item={item} onPress={jest.fn()} onNewVersion={onNewVersion} />,
    );
    fireEvent.press(getByAccessibilityLabel("Create a new version"));
    expect(onNewVersion).toHaveBeenCalledWith(item);
  });

  it("tapping + Version triggers haptic", () => {
    const { getByAccessibilityLabel } = render(
      <EpisodeCard
        item={makeItem()}
        onPress={jest.fn()}
        onNewVersion={jest.fn()}
      />,
    );
    fireEvent.press(getByAccessibilityLabel("Create a new version"));
    expect(Haptics.impactAsync).toHaveBeenCalledWith("light");
  });

  it("does not render + Version pill when onNewVersion is not provided", () => {
    const { queryByAccessibilityLabel } = render(
      <EpisodeCard item={makeItem()} onPress={jest.fn()} />,
    );
    expect(queryByAccessibilityLabel("Create a new version")).toBeNull();
  });
});
```

**File:** `native/components/NewVersionSheet.test.tsx` (create or append)

```typescript
import React from "react";
import { render } from "@testing-library/react-native";
import NewVersionSheet from "./NewVersionSheet";
import type { LibraryItem } from "../lib/types";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("./DurationPicker", () => {
  const { View } = require("react-native");
  return () => <View />;
});

function makeEpisode(versionCount: number): LibraryItem {
  return {
    id: "e1",
    title: "Test Episode",
    author: null,
    sourceType: "url",
    sourceUrl: null,
    wordCount: 500,
    createdAt: new Date().toISOString(),
    versions: Array.from({ length: versionCount }, (_, i) => ({
      scriptId: `s${i}`,
      audioId: `a${i}`,
      audioUrl: `https://cdn.example.com/a${i}.mp3`,
      durationSecs: 300,
      targetDuration: 5,
      format: "narrative",
      status: "ready" as const,
      completed: true,
      position: 0,
      createdAt: new Date().toISOString(),
      summary: null,
      contentType: null,
      themes: [],
      compressionRatio: 0.1,
      actualWordCount: 750,
      voices: ["nova"],
      ttsProvider: "openai",
    })),
  };
}

describe("NewVersionSheet — header copy", () => {
  it("shows 'Create Your First Episode' for 0 versions", () => {
    const { getByText } = render(
      <NewVersionSheet visible onDismiss={jest.fn()} episode={makeEpisode(0)} />,
    );
    expect(getByText("Create Your First Episode")).toBeTruthy();
  });

  it("shows 'Create a Second Version' for 1 version", () => {
    const { getByText } = render(
      <NewVersionSheet visible onDismiss={jest.fn()} episode={makeEpisode(1)} />,
    );
    expect(getByText("Create a Second Version")).toBeTruthy();
  });

  it("shows 'Add Version 3' for 2 existing versions", () => {
    const { getByText } = render(
      <NewVersionSheet visible onDismiss={jest.fn()} episode={makeEpisode(2)} />,
    );
    expect(getByText("Add Version 3")).toBeTruthy();
  });
});
```

## Success Criteria

```bash
# Type check
cd native && npx tsc --noEmit
# Expect: no errors

# Unit tests
cd native && npx jest components/EpisodeCard.test.tsx components/NewVersionSheet.test.tsx --no-coverage
# Expect: all tests pass
```

Manual checklist:
- [ ] All single-version cards show "Version" label next to the `+` icon (not a bare `+`)
- [ ] Tapping `+ Version` opens `NewVersionSheet` with "Create a Second Version" header
- [ ] `NewVersionSheet` shows correct header for 0 / 1 / 2+ versions
- [ ] Long-pressing a single-version card still shows "New Version" in the action sheet
- [ ] Tapping a fully-completed single-version card opens `NewVersionSheet` (not a dead tap)
- [ ] Tapping a still-generating card fires error haptic and does NOT open `NewVersionSheet`
- [ ] Multi-version cards are unchanged: version pills still play the correct version
- [ ] Haptic fires when tapping `+ Version` pill
