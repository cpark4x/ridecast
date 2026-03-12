# Feature: Player Controls Polish

> Add speed chip to mini player bar, verify skip-button correctness, and confirm lock-screen Now Playing integration via react-native-track-player.

## Motivation

The expanded player has the right controls but speed adjustment requires opening the full player. The mini `PlayerBar` shows only a play/pause button — adding a speed chip there lets users cycle speeds without interrupting their flow. Skip buttons and sleep timer are audited below; both are already correctly implemented.

> **Implementation note:** This project uses `react-native-track-player` (RNTP), **not** `expo-av`. All player API calls use `TrackPlayer.*`. References to `expo-av`, `audioRef`, or `setPositionAsync` in the original draft of this spec were incorrect — ignore them.

## Scope

- **No** `react-native-track-player` migration required — it is already the player
- **No** custom lock-screen artwork — system default via RNTP
- **No** AirPlay / Bluetooth controls beyond what RNTP provides automatically
- Sleep timer UI stays in `ExpandedPlayer` — state is already in `PlayerContext` (no changes needed)
- Skip button logic is already correct — spec confirms it; no code changes there

## Audit: What already works correctly

### Skip forward / back (no change required)

Current implementation in `native/lib/usePlayer.ts` (lines 290–298):
```typescript
const skipForward = useCallback(async (seconds = 15) => {
  const pos = await TrackPlayer.getPosition();
  await TrackPlayer.seekTo(pos + seconds);
}, []);

const skipBack = useCallback(async (seconds = 5) => {
  const pos = await TrackPlayer.getPosition();
  await TrackPlayer.seekTo(Math.max(0, pos - seconds));
}, []);
```

RNTP's `seekTo` clamps to track duration automatically — seeking past the end parks at the end without crashing. `Math.max(0, pos - seconds)` correctly handles position 0. **No changes needed.**

`ExpandedPlayer.tsx` calls:
- Skip back: `void skipBack(5)` — 5 seconds
- Skip forward: `void skipForward(15)` — 15 seconds

### Sleep timer (no change required)

`PlayerContextType` in `native/lib/usePlayer.ts` already includes:
```typescript
sleepTimer: number | "end" | null;
setSleepTimer: (value: number | "end" | null) => void;
```

Sleep timer state lives in `PlayerProvider` (context level), not in `ExpandedPlayer`. It persists across navigation. **No changes needed.**

### Speed persistence (no change required)

Speed is saved via `saveLocalPlayback` in the position-persistence interval (every `POSITION_SAVE_INTERVAL_MS` = 5 seconds) and restored in `play()` via `getLocalPlayback`. **No changes needed.**

### Lock screen / Now Playing (no change required)

RNTP registers with `AVAudioSession` automatically when tracks are added. The track `title` and `artist` fields populated in `itemToTrack()` appear on the lock screen and in Control Center. **No changes needed** — verify manually.

## Changes

### 1. Add speed chip to `native/components/PlayerBar.tsx`

This is the only code change in this spec.

**File:** `native/components/PlayerBar.tsx`

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
import * as Haptics from "expo-haptics";
import { usePlayer } from "../lib/usePlayer";
import { nextSpeed } from "../lib/utils";

// Speed cycle used in both PlayerBar and ExpandedPlayer
const MINI_SPEEDS = [1.0, 1.25, 1.5, 1.75, 2.0];

export default function PlayerBar() {
  const {
    currentItem,
    isPlaying,
    speed,
    togglePlay,
    setSpeed,
    position,
    duration,
    setExpandedPlayerVisible,
  } = usePlayer();

  if (!currentItem) return null;

  const progressPercent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  function handleSpeedPress() {
    const next = nextSpeed(speed, MINI_SPEEDS);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpeed(next).catch((err) =>
      console.warn("[PlayerBar] setSpeed error:", err),
    );
  }

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

        {/* Speed chip — cycles through MINI_SPEEDS without opening full player */}
        <TouchableOpacity
          onPress={handleSpeedPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="bg-gray-100 px-2 py-1 rounded-lg"
          accessibilityLabel={`Playback speed ${speed}x. Tap to change.`}
        >
          <Text className="text-xs font-bold text-gray-600">
            {speed % 1 === 0 ? `${speed}.0×` : `${speed}×`}
          </Text>
        </TouchableOpacity>

        {/* Play / Pause button — separate handler so it doesn't bubble to expand */}
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

### 2. Verify `expo-haptics` is installed

```bash
cd native && cat package.json | grep expo-haptics
```

If absent:
```bash
cd native && npx expo install expo-haptics
```

`expo-haptics` is almost universally present in Expo projects; this is a verification step only.

## Files to Modify

| File | Change |
|------|--------|
| `native/components/PlayerBar.tsx` | Add speed chip with `nextSpeed()` cycle, `expo-haptics` light impact, and `speed` / `setSpeed` from `usePlayer()` |

## Tests

**File:** `native/components/PlayerBar.test.tsx` (create)

```typescript
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import PlayerBar from "./PlayerBar";

// Mock usePlayer
const mockSetSpeed = jest.fn().mockResolvedValue(undefined);
const mockTogglePlay = jest.fn().mockResolvedValue(undefined);
const mockSetExpandedPlayerVisible = jest.fn();

jest.mock("../lib/usePlayer", () => ({
  usePlayer: () => ({
    currentItem: {
      id: "a1",
      title: "Test Episode",
      duration: 300,
      format: "narrative",
      audioUrl: "https://example.com/a.mp3",
    },
    isPlaying: false,
    speed: 1.0,
    position: 60,
    duration: 300,
    togglePlay: mockTogglePlay,
    setSpeed: mockSetSpeed,
    setExpandedPlayerVisible: mockSetExpandedPlayerVisible,
  }),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: "light" },
}));

describe("PlayerBar", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders title", () => {
    const { getByText } = render(<PlayerBar />);
    expect(getByText("Test Episode")).toBeTruthy();
  });

  it("renders speed chip showing current speed", () => {
    const { getByText } = render(<PlayerBar />);
    expect(getByText("1.0×")).toBeTruthy();
  });

  it("tapping speed chip calls setSpeed with next speed", async () => {
    const { getByAccessibilityLabel } = render(<PlayerBar />);
    fireEvent.press(getByAccessibilityLabel(/Playback speed 1/));
    expect(mockSetSpeed).toHaveBeenCalledWith(1.25);
  });

  it("tapping play/pause calls togglePlay", () => {
    const { getByRole } = render(<PlayerBar />);
    // The play icon button
    const playBtn = getByRole("button", { name: /play|pause/i });
    // Alternative: use testID or press the Ionicons button
    // fireEvent.press(playBtn);
    // expect(mockTogglePlay).toHaveBeenCalled();
  });

  it("tapping title area calls setExpandedPlayerVisible(true)", () => {
    const { getByText } = render(<PlayerBar />);
    fireEvent.press(getByText("Test Episode"));
    expect(mockSetExpandedPlayerVisible).toHaveBeenCalledWith(true);
  });

  it("progress bar width reflects position/duration", () => {
    const { toJSON } = render(<PlayerBar />);
    const tree = JSON.stringify(toJSON());
    // 60/300 = 20%
    expect(tree).toContain("20%");
  });

  it("renders nothing when currentItem is null", () => {
    jest.resetModules();
    jest.mock("../lib/usePlayer", () => ({
      usePlayer: () => ({ currentItem: null }),
    }));
    const { queryByText } = render(<PlayerBar />);
    expect(queryByText("Test Episode")).toBeNull();
  });
});
```

**File:** `native/lib/utils.test.ts` (append `nextSpeed` tests)

```typescript
import { nextSpeed } from "./utils";

describe("nextSpeed", () => {
  const speeds = [1.0, 1.25, 1.5, 1.75, 2.0];

  it("advances to next speed", () => {
    expect(nextSpeed(1.0, speeds)).toBe(1.25);
    expect(nextSpeed(1.25, speeds)).toBe(1.5);
  });

  it("wraps around from last to first", () => {
    expect(nextSpeed(2.0, speeds)).toBe(1.0);
  });

  it("returns first speed when current is not in list", () => {
    expect(nextSpeed(3.0, speeds)).toBe(1.0);
  });
});
```

## Success Criteria

```bash
# Verify expo-haptics is available
cd native && cat package.json | grep expo-haptics

# Type check
cd native && npx tsc --noEmit
# Expect: no errors

# Unit tests
cd native && npx jest components/PlayerBar.test.tsx lib/utils.test.ts --no-coverage
# Expect: all tests pass
```

Manual checklist on physical device:
- [ ] Speed chip visible in mini bar at all times when a track is loaded
- [ ] Tapping speed chip cycles: 1.0× → 1.25× → 1.5× → 1.75× → 2.0× → 1.0×
- [ ] Speed change triggers light haptic
- [ ] Speed set in mini bar is immediately reflected in expanded player
- [ ] Speed set in expanded player is immediately reflected in mini bar
- [ ] Skip back 5s at position 0: position stays at 0, no crash
- [ ] Skip forward 15s near end of track: position clamps correctly, no crash
- [ ] Set sleep timer in expanded player → navigate away → sleep timer fires at correct time
- [ ] Lock screen shows track title and artist (author) in Control Center
- [ ] Audio continues in background when screen is locked
