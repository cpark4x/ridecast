# Feature: Player Controls Polish

> Verify and improve skip buttons, make speed selector more accessible in the mini player, persist sleep timer across navigation, and add Now Playing notification integration (GitHub #37).

## Motivation

The expanded player has the right controls but several are broken or hard to discover: skip buttons may not work correctly at track boundaries, the speed selector requires opening the full player (not accessible from the mini bar), sleep timer resets when navigating away, and there's no lock-screen Now Playing card. Fixing these makes the core listen experience feel solid and professional.

## Changes

### 1. Audit current player implementation

Read `native/components/ExpandedPlayer.tsx` and `native/lib/usePlayer.ts` before implementing. Verify:
- Skip forward/back button handlers
- Speed state management
- Sleep timer state location

### 2. Verify skip forward/back buttons

Current likely implementation in `ExpandedPlayer.tsx`:
```typescript
// Skip forward 15s
async function skipForward() {
  const newPos = Math.min(position + 15, duration);
  await player.seekTo(newPos);
}

// Skip back 15s
async function skipBack() {
  const newPos = Math.max(position - 15, 0);
  await player.seekTo(newPos);
}
```

Common bugs to check and fix:
- Skip past end of track: should not seek beyond `duration`, should not crash
- Skip at position 0: `Math.max(0 - 15, 0)` should correctly clamp to 0
- After skip: position display should update immediately (via `setPosition` optimistic update)
- Double-tap skip: rapid taps should queue correctly, not race

If `seekTo` is async and position state lags, add an optimistic update:
```typescript
async function skipForward() {
  const newPos = Math.min(position + 15, duration);
  setPosition(newPos); // optimistic update
  await audioRef.current?.setPositionAsync(newPos * 1000);
}
```

### 3. Speed selector in mini player

Add a speed indicator to `PlayerBar.tsx` — tapping it cycles through speeds without opening the full player:

```typescript
const SPEED_OPTIONS = [1.0, 1.25, 1.5, 1.75, 2.0];

function nextSpeed(current: number): number {
  const idx = SPEED_OPTIONS.indexOf(current);
  return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
}
```

In `PlayerBar`, replace the right side with a two-button row: speed chip + play/pause:

```tsx
{/* Speed chip */}
<TouchableOpacity
  onPress={() => {
    void Haptics.light();
    const next = nextSpeed(speed);
    void setSpeed(next);
  }}
  className="bg-gray-100 px-2 py-1 rounded-lg"
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Text className="text-xs font-bold text-gray-600">{speed}×</Text>
</TouchableOpacity>

{/* Play/Pause */}
<TouchableOpacity onPress={() => void togglePlay()} ... >
  <Ionicons name={isPlaying ? "pause" : "play"} size={26} color="#EA580C" />
</TouchableOpacity>
```

The `speed` and `setSpeed` values come from `usePlayer()`.

### 4. Sleep timer persistence across navigation

If sleep timer state lives as a `useState` in `ExpandedPlayer`, it resets when the component unmounts (user navigates away). Move it into the `PlayerContext` or a global store.

In `native/lib/PlayerContext.tsx` (or wherever PlayerContext is defined):

```typescript
const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null);

// Check sleep timer in the audio position update interval
useEffect(() => {
  if (sleepTimerEndsAt && Date.now() >= sleepTimerEndsAt) {
    void audioRef.current?.pauseAsync();
    setSleepTimerEndsAt(null);
  }
}, [position, sleepTimerEndsAt]);

// Expose in context value
```

`ExpandedPlayer` reads `sleepTimerEndsAt` and `setSleepTimerEndsAt` from `usePlayer()` rather than managing local state.

### 5. Now Playing notification / lock screen integration

`expo-av` automatically registers with iOS's `AVAudioSession` for background audio. For the lock screen / Control Center Now Playing widget, set the audio metadata:

```typescript
import { Audio } from "expo-av";

// When a new track starts playing:
await Audio.setAudioModeAsync({
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
});

// Set Now Playing info (React Native has no direct API for this,
// but expo-av surfaces it through the AVAudioSession)
// The track title and author will appear automatically if the
// sound object is created with proper metadata.
```

For rich Now Playing metadata (title, artist, artwork) on the lock screen, use `expo-av`'s `sound.setOnPlaybackStatusUpdate` and ensure the sound is created with metadata that iOS can read. Check the expo-av changelog for `NowPlayingInfo` support — if not natively supported, a bare workflow module or `react-native-track-player` migration may be required.

> **Note:** Full Now Playing integration (custom artwork, lock screen controls that work) may require switching from `expo-av` to `react-native-track-player`. Document this as a **separate decision** — this spec only ensures the basic metadata is registered. The agent should check current `expo-av` version capabilities and either implement or note the limitation.

### 6. Speed persistence across sessions

Speed should persist between app sessions. Save it to SQLite via `saveLocalPlayback` when changed:

```typescript
// In usePlayer — when setSpeed is called:
async function setSpeed(newSpeed: number) {
  await audioRef.current?.setRateAsync(newSpeed, true);
  setSpeedState(newSpeed);
  if (currentItem?.id) {
    await saveLocalPlayback({ audioId: currentItem.id, speed: newSpeed });
  }
}
```

This is already partially in `playback-state-persistence` spec — verify it's implemented and working.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/ExpandedPlayer.tsx` | Fix skip forward/back with optimistic update and boundary clamping |
| `native/components/PlayerBar.tsx` | Add speed chip (cycle through speeds) to mini player |
| `native/lib/PlayerContext.tsx` (or equivalent) | Move sleep timer state from ExpandedPlayer into context |
| `native/lib/usePlayer.ts` | Expose `sleepTimerEndsAt`/`setSleepTimerEndsAt`, verify `setSpeed` persists |

## Tests

Manual verification on physical device:
- [ ] Skip forward at near-end of track: position clamps to `duration`, no crash
- [ ] Skip back at position 0: position clamps to 0, no crash
- [ ] Rapid double-tap skip: position advances by 30s total, no race condition
- [ ] Speed chip in mini bar: cycles 1.0 → 1.25 → 1.5 → 1.75 → 2.0 → 1.0
- [ ] Set sleep timer in expanded player → navigate away → sleep timer still fires
- [ ] Speed set in mini bar is reflected in expanded player and vice versa
- [ ] Audio continues playing when screen is locked (background audio)
- [ ] Lock screen shows track title and artist

## Success Criteria

```bash
cd native && npx tsc --noEmit
```

- Skip buttons work correctly at all positions
- Speed chip visible and functional in mini player
- Sleep timer persists across component mount/unmount

## Scope

- **No** `react-native-track-player` migration in this spec (flag as future if needed)
- **No** custom artwork on lock screen (default system behavior)
- **No** AirPlay / Bluetooth controls beyond what `expo-av` provides automatically
- Sleep timer UI (how to set it) stays in ExpandedPlayer — only state is moved to context
