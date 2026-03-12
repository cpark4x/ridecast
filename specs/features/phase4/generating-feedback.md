# Feature: Generating Episode Feedback

> Turn the silent tap-on-generating-card failure into a clear, friendly message — and add a pulse animation so the card communicates its state before the user even taps.

## Motivation

When a user taps an episode card whose versions are all still generating, `handleCardPress` in `library.tsx` returns early with no feedback whatsoever (the `// TODO: show a "still generating" toast` comment has lived there since the versioning PR). The same silent failure exists on the home screen: `libraryItemToPlayable` returns `null` for generating items, so they never appear in the Up Next list at all — but a user who navigates directly to the Library and taps one gets nothing.

This is a trust problem. A silent tap makes the user think the app is broken or that their content failed to generate. A clear message — "Still generating — we'll notify you when it's ready" — turns the silence into a status update.

The pulse animation is the secondary goal: it sets expectations before the tap happens, reducing how often users tap in the first place.

## Current State

`native/app/(tabs)/library.tsx`, `handleCardPress()` (line 100–107):
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

`native/components/EpisodeCard.tsx`: the "Generating" amber badge is rendered but is static — no animation.

## Changes

### 1. Create `native/lib/toast.ts` — lightweight toast utility

Use React Native's `Alert` for now. This wrapper makes it trivially swappable for a proper toast library (e.g. `react-native-toast-message`) in a future pass without touching call sites.

```typescript
import { Alert, Platform } from "react-native";

/**
 * Show a non-blocking informational message.
 *
 * On iOS this is a brief Alert (no actions). On Android, same.
 * Swap the implementation here when a proper toast library is added.
 */
export function showToast(message: string, title = "Ridecast") {
  Alert.alert(title, message, [{ text: "OK" }], { cancelable: true });
}

/**
 * Convenience wrapper for the "still generating" UX state.
 */
export function showGeneratingToast() {
  showToast(
    "Still generating — we'll notify you when it's ready.",
    "Coming Soon",
  );
}
```

> **Note:** `Alert.alert` is blocking on iOS (modal). Once `react-native-toast-message` or `burnt` is added as a dependency, replace `showToast`'s body only — the call sites stay identical.

### 2. Wire `showGeneratingToast` into `native/app/(tabs)/library.tsx`

Replace the silent return in `handleCardPress`:

```typescript
import { showGeneratingToast } from "../../lib/toast";

function handleCardPress(item: LibraryItem) {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
    const isGenerating = item.versions.some(
      (v) => v.status === "generating" || v.status === "processing",
    );
    if (isGenerating) {
      showGeneratingToast();
    }
    // If versions is empty (content uploaded but not yet queued), also toast
    // rather than silently failing
    return;
  }
  // ... rest of handler unchanged
}
```

Remove the `// TODO` comment.

### 3. Wire `showGeneratingToast` into `native/app/(tabs)/index.tsx`

The home screen's `UpNextCard` already filters to only `ready` items via `libraryItemToPlayable`, so generating episodes never appear in Up Next. However, if a user somehow reaches the library tab and returns, the generating card in the Library is the risk surface. The home screen `handlePlayItem` is not affected.

Add the guard inside the `UpNextCard`'s `onPlay` prop call site in `HomeScreen` as a belt-and-suspenders measure in case `upNextPairs` filtering logic changes:

```typescript
import { showGeneratingToast } from "../../lib/toast";

function handlePlayItem(playable: PlayableItem) {
  if (!playable.audioUrl) {
    showGeneratingToast();
    return;
  }
  player.play(playable).catch((err) =>
    console.warn("[home] play error:", err),
  );
}
```

### 4. Add pulse animation to the "Generating" badge in `native/components/EpisodeCard.tsx`

Use React Native's built-in `Animated` API — no new dependencies.

```typescript
import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

// Inside EpisodeCard component, after existing state/derived values:
const pulseAnim = useRef(new Animated.Value(1)).current;

useEffect(() => {
  if (!isGenerating) {
    pulseAnim.setValue(1);
    return;
  }
  const pulse = Animated.loop(
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.4,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]),
  );
  pulse.start();
  return () => pulse.stop();
}, [isGenerating, pulseAnim]);
```

Replace the static generating badge with an animated version:

```tsx
{isGenerating && (
  <Animated.View
    style={{ opacity: pulseAnim }}
    className="bg-amber-100 px-2 py-0.5 rounded-full self-start"
  >
    <Text className="text-xs text-amber-700 font-medium">Generating</Text>
  </Animated.View>
)}
```

The pulse runs at ~0.625 Hz (1600ms cycle), which reads as "active/processing" without being distracting.

## Files to Create/Modify

| File | Change |
|---|---|
| `native/lib/toast.ts` | New — `showToast`, `showGeneratingToast` utilities |
| `native/app/(tabs)/library.tsx` | Replace silent return with `showGeneratingToast()`, import toast |
| `native/app/(tabs)/index.tsx` | Add guard in `handlePlayItem`, import toast |
| `native/components/EpisodeCard.tsx` | Add `pulseAnim`, replace static badge with `Animated.View` |

## Tests

**File:** `native/lib/__tests__/toast.test.ts` (new)

```typescript
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Alert } from "react-native";

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: "ios" },
}));

describe("toast utilities", () => {
  beforeEach(() => jest.clearAllMocks());

  it("showToast calls Alert.alert with the provided message", async () => {
    const { showToast } = await import("../toast");
    showToast("Hello world");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Ridecast",
      "Hello world",
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("showToast uses a custom title when provided", async () => {
    const { showToast } = await import("../toast");
    showToast("Message", "Custom Title");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Custom Title",
      "Message",
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("showGeneratingToast calls Alert.alert with the generating message", async () => {
    const { showGeneratingToast } = await import("../toast");
    showGeneratingToast();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Coming Soon",
      expect.stringContaining("Still generating"),
      expect.any(Array),
      expect.any(Object),
    );
  });
});
```

**File:** `native/app/(tabs)/__tests__/library-generating.test.tsx` (new)

```typescript
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { describe, it, expect, jest } from "@jest/globals";

jest.mock("../../../lib/toast", () => ({
  showGeneratingToast: jest.fn(),
}));
jest.mock("../../../lib/db", () => ({ getAllEpisodes: jest.fn(() => []) }));
jest.mock("../../../lib/sync", () => ({ syncLibrary: jest.fn(() => []) }));
jest.mock("../../../lib/usePlayer", () => ({
  usePlayer: () => ({ currentItem: null, play: jest.fn() }),
}));

import { showGeneratingToast } from "../../../lib/toast";

const GENERATING_ITEM = {
  id: "c1",
  title: "Still Cooking",
  author: null,
  sourceType: "url",
  sourceUrl: "https://example.com",
  wordCount: 800,
  createdAt: new Date().toISOString(),
  versions: [
    {
      scriptId: "s1",
      audioId: null,
      audioUrl: null,
      durationSecs: null,
      targetDuration: 5,
      format: "brief",
      status: "generating" as const,
      completed: false,
      position: 0,
      createdAt: new Date().toISOString(),
      summary: null,
      contentType: null,
      themes: [],
      compressionRatio: 0,
      actualWordCount: 0,
      voices: [],
      ttsProvider: "elevenlabs",
    },
  ],
};

describe("LibraryScreen — generating episode tap", () => {
  it("shows generating toast when tapping a card with no ready versions", async () => {
    const { getAllEpisodes } = await import("../../../lib/db");
    (getAllEpisodes as jest.Mock).mockResolvedValueOnce([GENERATING_ITEM]);

    // Dynamically import after mocks are set up
    const LibraryScreen = (await import("../library")).default;
    const { getByText } = render(<LibraryScreen />);

    // Wait for loadLocal to populate
    await new Promise((r) => setTimeout(r, 0));

    fireEvent.press(getByText("Still Cooking"));
    expect(showGeneratingToast).toHaveBeenCalledTimes(1);
  });
});
```

## Success Criteria

```bash
cd native
npx jest lib/__tests__/toast.test.ts
# All 3 tests pass

npx jest app/\(tabs\)/__tests__/library-generating.test.tsx
# Test passes
```

Manual verification:
- [ ] Library: tap an episode whose badge shows "Generating" → alert appears with message containing "Still generating"
- [ ] Alert has an "OK" button and dismisses cleanly
- [ ] Tapping a ready episode → plays normally, no alert
- [ ] "Generating" badge on the card pulses (fades in/out roughly every 800ms)
- [ ] Pulse stops if the episode becomes ready on the next sync cycle (badge disappears entirely)

## Scope

Client-side feedback only. No push notification infrastructure — the "we'll notify you when it's ready" copy is forward-looking; actual push notifications are a separate feature. The toast implementation is intentionally minimal (`Alert.alert`); swapping to `react-native-toast-message` for a non-blocking snackbar is an explicit follow-up task. No changes to the generating logic or API polling.
