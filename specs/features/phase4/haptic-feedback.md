# Feature: Haptic Feedback

> Wire expo-haptics throughout the native app so every meaningful touch has a physical response.

## Motivation

Haptic feedback is the difference between an app that feels native and one that feels like a web wrapper. Ridecast's interactions — play buttons, filter chips, swipe gestures — are all silent right now. Adding well-tuned haptics at each touch point makes the app feel premium and reinforces the result of each action (selection, success, error).

## Changes

### 1. Install expo-haptics

```bash
cd native && npx expo install expo-haptics
```

No additional native linking needed — expo-haptics ships with Expo.

### 2. Haptic map — all touch points

| Touch Point | Component | Haptic Type | API Call |
|---|---|---|---|
| Play button tap (PlayerBar) | `PlayerBar.tsx` | Light impact | `impactAsync(Light)` |
| Play/Pause toggle (ExpandedPlayer) | `ExpandedPlayer.tsx` | Light impact | `impactAsync(Light)` |
| Play All button (HomeScreen) | `index.tsx` | Medium impact | `impactAsync(Medium)` |
| UpNextCard tap | `index.tsx` → `UpNextCard` | Light impact | `impactAsync(Light)` |
| Version pill tap | `EpisodeCard.tsx` | Light impact | `impactAsync(Light)` |
| Filter chip tap | `library.tsx` | Light impact | `impactAsync(Light)` |
| Favorite tap (future) | `EpisodeCard.tsx` | Light impact | `impactAsync(Light)` |
| FAB tap (+ button) | `library.tsx`, `index.tsx` | Medium impact | `impactAsync(Medium)` |
| Long-press trigger (card) | `EpisodeCard.tsx` | Medium impact | `impactAsync(Medium)` |
| Swipe-to-delete commit | future delete gesture | Medium impact | `impactAsync(Medium)` |
| Tap generating/unavailable episode | `library.tsx` → `handleCardPress` | Error (notification) | `notificationAsync(Error)` |
| Episode generation complete | push notification handler | Success (notification) | `notificationAsync(Success)` |
| Skip forward/back (player) | `ExpandedPlayer.tsx` | Light impact | `impactAsync(Light)` |
| Speed selector change | `ExpandedPlayer.tsx` | Light impact | `impactAsync(Light)` |
| Pull-to-refresh trigger | `library.tsx`, `index.tsx` | Light impact | `impactAsync(Light)` |

### 3. Utility wrapper (`native/lib/haptics.ts` — new)

Create a thin wrapper so callers don't import expo-haptics directly. This makes it easy to disable haptics globally (e.g., for automated testing or accessibility preferences).

```typescript
import * as ExpoHaptics from "expo-haptics";

export const Haptics = {
  light: () => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light),
  medium: () => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium),
  heavy: () => ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy),
  success: () => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success),
  error: () => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error),
  warning: () => ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning),
};
```

### 4. Wire haptics into components

**PlayerBar.tsx** — play/pause button:
```typescript
import { Haptics } from "../lib/haptics";

// Inside the play button onPress:
onPress={() => {
  void Haptics.light();
  void togglePlay();
}}
```

**EpisodeCard.tsx** — version pill tap + long-press:
```typescript
// Version pill tap:
onPress={() => {
  void Haptics.light();
  onVersionPress(item, v, playable);
}}

// Long-press trigger (delayLongPress fires):
onLongPress={() => {
  void Haptics.medium();
  handleLongPress();
}}
```

**library.tsx** — filter chips, FAB, error on unavailable episode:
```typescript
// Filter chip:
onPress={() => {
  void Haptics.light();
  setFilter(key);
}}

// FAB:
onPress={() => {
  void Haptics.medium();
  setUploadModalVisible(true);
}}

// handleCardPress — when no ready version:
if (!readyVersion) {
  void Haptics.error();
  // show toast
  return;
}
```

**index.tsx** — Play All FAB:
```typescript
onPress={() => {
  void Haptics.medium();
  handlePlayAll();
}}
```

### 5. Success haptic on generation complete

In the push notification handler (or the sync loop when a `generating` → `ready` status transition is detected), fire:

```typescript
// In syncLibrary() or wherever generation completion is detected:
const wasGenerating = prev.versions.some(v => v.status === "generating");
const nowReady = updated.versions.some(v => v.status === "ready");
if (wasGenerating && nowReady) {
  void Haptics.success();
}
```

This can be implemented in `native/lib/sync.ts` — compare old state in SQLite vs. fresh API response before upserting.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/lib/haptics.ts` | New — Haptics utility wrapper |
| `native/components/PlayerBar.tsx` | Add light haptic to play/pause tap |
| `native/components/EpisodeCard.tsx` | Add light haptic to version pills, medium to long-press |
| `native/app/(tabs)/library.tsx` | Light on filter chips, medium on FAB, error on unavailable tap |
| `native/app/(tabs)/index.tsx` | Medium on Play All FAB |
| `native/components/ExpandedPlayer.tsx` | Light on skip, play/pause, speed change |
| `native/lib/sync.ts` | Success haptic on generating → ready transition |
| `native/package.json` | Add `expo-haptics` |

## Tests

No unit tests needed — haptics are a side-effect-only native API. Manual verification on a physical device (simulator does not fire haptics):

- [ ] Tap play button → light buzz
- [ ] Tap FAB → medium bump
- [ ] Long-press episode card → medium buzz before action sheet appears
- [ ] Tap a still-generating episode → error buzz (three rapid pulses)
- [ ] Episode finishes generating (simulate via sync) → success buzz

## Success Criteria

```bash
cd native && npx expo run:ios  # builds without errors
```

- All haptic calls are `void`-prefixed (no unhandled promise warnings in Metro)
- No haptic fires on Android simulator (expo-haptics no-ops gracefully on unsupported platforms)
- Haptics do not block the UI thread (all calls are fire-and-forget)

## Scope

- No haptic preferences/settings toggle in this spec — that's `settings-onboarding-polish`
- No custom vibration patterns — only the three expo-haptics impact levels and three notification types
- Android support is best-effort (expo-haptics provides fallback vibration on Android automatically)
