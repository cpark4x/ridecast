# Feature: Skeleton Loading

> Show shimmer placeholder cards during cold launch so the app feels instant — even before SQLite has returned data.

## Motivation

On cold launch, `getAllEpisodes()` reads from SQLite and typically resolves in <100ms. But there's still a visible flash of empty state before the list appears. A skeleton/shimmer treatment eliminates this flash, makes the app feel faster, and avoids the jarring empty→populated transition. Even if SQLite is fast, the visual polish matters: the user sees activity, not blankness.

## Changes

### 1. ShimmerCard component (`native/components/ShimmerCard.tsx` — new)

A single shimmer placeholder that matches the height and layout of `EpisodeCard`. Uses React Native's `Animated` API and `expo-linear-gradient` for the moving highlight.

```typescript
import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function ShimmerCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View className="bg-white rounded-2xl shadow-sm mx-4 mb-3 overflow-hidden" style={{ height: 96 }}>
      {/* Shimmer overlay */}
      <Animated.View
        style={{
          ...StyleSheet.absoluteFillObject,
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.6)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Placeholder layout — mirrors EpisodeCard structure */}
      <View className="p-4">
        {/* Title placeholder — two lines */}
        <View className="h-4 bg-gray-100 rounded-full w-3/4 mb-2" />
        <View className="h-3 bg-gray-100 rounded-full w-1/2 mb-3" />
        {/* Footer placeholder — badges */}
        <View className="flex-row gap-2">
          <View className="h-5 bg-gray-100 rounded-full w-10" />
          <View className="h-5 bg-gray-100 rounded-full w-14" />
        </View>
      </View>
    </View>
  );
}
```

Install LinearGradient if not already present:
```bash
cd native && npx expo install expo-linear-gradient
```

### 2. SkeletonList component (`native/components/SkeletonList.tsx` — new)

A simple wrapper that renders N skeleton cards.

```typescript
import React from "react";
import { View } from "react-native";
import ShimmerCard from "./ShimmerCard";

interface SkeletonListProps {
  count?: number;
}

export default function SkeletonList({ count = 5 }: SkeletonListProps) {
  return (
    <View className="pt-1">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i} />
      ))}
    </View>
  );
}
```

### 3. Loading state in LibraryScreen (`native/app/(tabs)/library.tsx`)

Add an `isLoading` state that starts `true` and flips to `false` after the first local SQLite load completes.

```typescript
const [isLoading, setIsLoading] = useState(true);

async function loadLocal() {
  try {
    const items = await getAllEpisodes();
    setEpisodes(items);
  } catch (err) {
    console.warn("[library] loadLocal error:", err);
  } finally {
    setIsLoading(false);  // ← always flip after first load
  }
}
```

Render skeleton while loading, real list after:

```tsx
{isLoading ? (
  <SkeletonList count={5} />
) : (
  <FlatList ... />
)}
```

The `FlatList` (with filter chips, search, FAB) only renders once `isLoading === false`.

### 4. Loading state in HomeScreen (`native/app/(tabs)/index.tsx`)

Same pattern. Show 4 skeleton cards in place of the `UpNextCard` list:

```typescript
const [isLoading, setIsLoading] = useState(true);

async function loadLocal() {
  try {
    const items = await getAllEpisodes();
    setEpisodes(items);
  } catch (err) {
    console.warn("[home] loadLocal error:", err);
  } finally {
    setIsLoading(false);
  }
}
```

In the `FlatList.ListHeaderComponent`, conditionally show skeleton after the greeting/Play All header:

```tsx
{isLoading && <SkeletonList count={4} />}
```

The header (greeting, Play All button) renders immediately. The episode list area shimmers.

### 5. Minimum display duration

SQLite often resolves in <50ms, which would make the shimmer flash so briefly it's visually jarring (loading flicker). Enforce a **200ms minimum display** for the skeleton:

```typescript
const loadStartRef = useRef(Date.now());

async function loadLocal() {
  try {
    const items = await getAllEpisodes();
    setEpisodes(items);
  } catch (err) {
    console.warn(err);
  } finally {
    const elapsed = Date.now() - loadStartRef.current;
    const delay = Math.max(0, 200 - elapsed);
    setTimeout(() => setIsLoading(false), delay);
  }
}
```

This means: if SQLite took 40ms, wait another 160ms before hiding skeletons. If it took 300ms, hide immediately.

### 6. No skeleton on pull-to-refresh

Pull-to-refresh uses the native iOS `RefreshControl` spinner — no skeleton needed. Only the initial cold-launch load uses skeletons.

```typescript
// In handleRefresh: do NOT set isLoading = true
async function handleRefresh() {
  setRefreshing(true);  // uses RefreshControl spinner, not skeleton
  ...
}
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/ShimmerCard.tsx` | New — animated shimmer placeholder card |
| `native/components/SkeletonList.tsx` | New — N skeleton cards wrapper |
| `native/app/(tabs)/library.tsx` | Add `isLoading` state, show `SkeletonList` during cold launch |
| `native/app/(tabs)/index.tsx` | Add `isLoading` state, show `SkeletonList` in list area |
| `native/package.json` | Add `expo-linear-gradient` if not present |

## Tests

Manual verification only (animation is hard to unit test):

- [ ] Cold launch: shimmer cards appear instantly, real cards appear after ~200ms
- [ ] Pull-to-refresh: spinner appears, no shimmer cards
- [ ] Shimmer animation is smooth (no jank) — verify on physical device
- [ ] Skeleton layout roughly matches real card height (no layout shift)
- [ ] If SQLite returns quickly (<50ms), skeletons still show for ≥200ms
- [ ] If SQLite returns slowly (>200ms), skeletons disappear as soon as data is ready

## Success Criteria

```bash
cd native && npx expo run:ios
```

- No TypeScript errors from new components
- `expo-linear-gradient` installed and linked
- On cold launch: loading state → skeleton → real content, no empty state flash
- Skeleton cards fill the screen width, match card border-radius

## Scope

- **No** per-card loading state (e.g., shimmer inside an already-loaded card)
- **No** Suspense/React 18 transitions — this uses simple `useState` + `useEffect`
- **No** skeleton for the player bar or expanded player
- **No** network loading skeleton (only SQLite cold-launch is addressed here)
