# Feature: Skeleton Loading

> Show shimmer placeholder cards during cold launch so the app feels instant — even before SQLite has returned data.

## Motivation

On cold launch, `getAllEpisodes()` reads from SQLite and typically resolves in <100ms. But there's still a visible flash of empty state before the list appears. A skeleton/shimmer treatment eliminates this flash, makes the app feel faster, and avoids the jarring empty→populated transition. Even if SQLite is fast, the visual polish matters: the user sees activity, not blankness.

---

## Changes

### 1. Install `expo-linear-gradient`

```bash
cd native && npx expo install expo-linear-gradient
```

> Already present if another feature installed it. Check `native/package.json` — skip if `expo-linear-gradient` is listed.

---

### 2. New file: `native/components/ShimmerCard.tsx`

A single shimmer placeholder matching the height and layout of `EpisodeCard`. Uses React Native's `Animated` API with `expo-linear-gradient` for the moving highlight. `useNativeDriver: true` keeps the animation on the UI thread.

```tsx
// native/components/ShimmerCard.tsx
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function ShimmerCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View style={styles.card}>
      {/* Animated shimmer overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Placeholder layout — mirrors EpisodeCard structure */}
      <View style={styles.body}>
        {/* Title placeholder — two lines */}
        <View style={[styles.line, { width: "75%", marginBottom: 8 }]} />
        <View style={[styles.line, { width: "50%", height: 10, marginBottom: 12 }]} />
        {/* Footer placeholder — source badge + version pill */}
        <View style={styles.footer}>
          <View style={[styles.pill, { width: 36 }]} />
          <View style={[styles.pill, { width: 52 }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    height: 96,
    overflow: "hidden",
    // Matches EpisodeCard shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  body: {
    padding: 16,
  },
  line: {
    height: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 99,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    height: 20,
    backgroundColor: "#F3F4F6",
    borderRadius: 99,
  },
});
```

---

### 3. New file: `native/components/SkeletonList.tsx`

Renders `count` skeleton cards. Used in both Library and Home screens.

```tsx
// native/components/SkeletonList.tsx
import React from "react";
import { View } from "react-native";
import ShimmerCard from "./ShimmerCard";

interface SkeletonListProps {
  count?: number;
}

export default function SkeletonList({ count = 5 }: SkeletonListProps) {
  return (
    <View style={{ paddingTop: 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i} />
      ))}
    </View>
  );
}
```

---

### 4. Modify: `native/app/(tabs)/library.tsx`

Add an `isLoading` state that starts `true`, flips to `false` after the first local SQLite read completes, and enforces a **200ms minimum display** to avoid a sub-50ms flicker.

**Before** (relevant state + `loadLocal` function):
```tsx
const [episodes, setEpisodes] = useState<LibraryItem[]>([]);
const [filter, setFilter] = useState<LibraryFilter>("all");
const [searchQuery, setSearchQuery] = useState("");
const [refreshing, setRefreshing] = useState(false);
const [uploadModalVisible, setUploadModalVisible] = useState(false);
const [newVersionEpisode, setNewVersionEpisode] = useState<LibraryItem | null>(null);

const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

// Load from SQLite on mount, then sync in background
useEffect(() => {
  loadLocal();
  syncInBackground();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

async function loadLocal() {
  try {
    const items = await getAllEpisodes();
    setEpisodes(items);
  } catch (err) {
    console.warn("[library] loadLocal error:", err);
  }
}
```

**After:**
```tsx
const [episodes, setEpisodes] = useState<LibraryItem[]>([]);
const [filter, setFilter] = useState<LibraryFilter>("all");
const [searchQuery, setSearchQuery] = useState("");
const [refreshing, setRefreshing] = useState(false);
const [isLoading, setIsLoading] = useState(true); // ← NEW
const [uploadModalVisible, setUploadModalVisible] = useState(false);
const [newVersionEpisode, setNewVersionEpisode] = useState<LibraryItem | null>(null);

const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
const loadStartRef = useRef(Date.now()); // ← NEW — tracks when load began

// Load from SQLite on mount, then sync in background
useEffect(() => {
  loadLocal();
  syncInBackground();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

async function loadLocal() {
  try {
    const items = await getAllEpisodes();
    setEpisodes(items);
  } catch (err) {
    console.warn("[library] loadLocal error:", err);
  } finally {
    // Enforce 200ms minimum to avoid sub-50ms shimmer flicker
    const elapsed = Date.now() - loadStartRef.current;
    const delay = Math.max(0, 200 - elapsed);
    setTimeout(() => setIsLoading(false), delay); // ← NEW
  }
}
```

**Before** (the `return` JSX — episode list section):
```tsx
{/* Episode list */}
<FlatList
  data={filtered}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <EpisodeCard
      item={item}
      onPress={handleCardPress}
      onVersionPress={handleVersionPress}
      currentAudioId={player.currentItem?.id ?? null}
      onNewVersion={setNewVersionEpisode}
    />
  )}
  contentContainerClassName="pt-1 pb-28"
  showsVerticalScrollIndicator={false}
  refreshing={refreshing}
  onRefresh={handleRefresh}
  ListEmptyComponent={
    episodes.length === 0 ? (
      <EmptyState
        icon="library-outline"
        title="No episodes yet"
        subtitle="Paste a URL or upload a file to get started"
        actionLabel="Create Episode"
        onAction={() => setUploadModalVisible(true)}
      />
    ) : (
      <EmptyState
        icon="search"
        title="No matches"
        subtitle="Try a different search or filter"
      />
    )
  }
/>
```

**After:**
```tsx
{/* Episode list — skeleton during cold launch, real list after */}
{isLoading ? (
  <SkeletonList count={5} />
) : (
  <FlatList
    data={filtered}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <EpisodeCard
        item={item}
        onPress={handleCardPress}
        onVersionPress={handleVersionPress}
        currentAudioId={player.currentItem?.id ?? null}
        onNewVersion={setNewVersionEpisode}
      />
    )}
    contentContainerClassName="pt-1 pb-28"
    showsVerticalScrollIndicator={false}
    refreshing={refreshing}
    onRefresh={handleRefresh}
    ListEmptyComponent={
      episodes.length === 0 ? (
        <EmptyState
          icon="library-outline"
          title="No episodes yet"
          subtitle="Paste a URL or upload a file to get started"
          actionLabel="Create Episode"
          onAction={() => setUploadModalVisible(true)}
        />
      ) : (
        <EmptyState
          icon="search"
          title="No matches"
          subtitle="Try a different search or filter"
        />
      )
    }
  />
)}
```

**Also add import** at top of `library.tsx` (after existing imports):
```tsx
import SkeletonList from "../../components/SkeletonList";
```

> **Note:** `handleRefresh` must NOT set `isLoading = true`. Pull-to-refresh uses the native `RefreshControl` spinner. The skeleton is exclusively for cold-launch first-load.

---

### 5. Modify: `native/app/(tabs)/index.tsx`

Same `isLoading` + minimum display pattern. The greeting header and Play All button render immediately; the episode list area shimmers.

**Before** (state declarations + `loadLocal`):
```tsx
const [episodes, setEpisodes] = useState<LibraryItem[]>([]);
const [refreshing, setRefreshing] = useState(false);
const [uploadModalVisible, setUploadModalVisible] = useState(false);

// ...

async function loadLocal() {
  try {
    const items = await getAllEpisodes();
    setEpisodes(items);
  } catch (err) {
    console.warn("[home] loadLocal error:", err);
  }
}
```

**After:**
```tsx
const [episodes, setEpisodes] = useState<LibraryItem[]>([]);
const [refreshing, setRefreshing] = useState(false);
const [isLoading, setIsLoading] = useState(true); // ← NEW
const [uploadModalVisible, setUploadModalVisible] = useState(false);

const loadStartRef = useRef(Date.now()); // ← NEW

// ...

async function loadLocal() {
  try {
    const items = await getAllEpisodes();
    setEpisodes(items);
  } catch (err) {
    console.warn("[home] loadLocal error:", err);
  } finally {
    // Enforce 200ms minimum to avoid sub-50ms shimmer flicker
    const elapsed = Date.now() - loadStartRef.current;
    const delay = Math.max(0, 200 - elapsed);
    setTimeout(() => setIsLoading(false), delay); // ← NEW
  }
}
```

**Before** (inside `ListHeaderComponent`, after the "Up Next" section header):
```tsx
{episodeCount > 0 && (
  <Text className="px-4 text-lg font-bold text-gray-900 mb-3">Up Next</Text>
)}
```

**After:**
```tsx
{isLoading && <SkeletonList count={4} />}

{!isLoading && episodeCount > 0 && (
  <Text className="px-4 text-lg font-bold text-gray-900 mb-3">Up Next</Text>
)}
```

> The greeting and Play All button are in `ListHeaderComponent` before this block — they render immediately without waiting for `isLoading`. Only the episode list area shimmers.

**Also add import** at top of `index.tsx` (after existing imports):
```tsx
import SkeletonList from "../../components/SkeletonList";
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/ShimmerCard.tsx` | **New** — animated shimmer placeholder card (matches EpisodeCard height + border-radius) |
| `native/components/SkeletonList.tsx` | **New** — renders N ShimmerCards; `count` prop |
| `native/app/(tabs)/library.tsx` | Add `isLoading` state + `loadStartRef`; replace episode list with `SkeletonList` during load |
| `native/app/(tabs)/index.tsx` | Add `isLoading` state + `loadStartRef`; render `SkeletonList` in list area during load |

---

## Tests

The shimmer animation is driven by `Animated.loop` — hard to unit test meaningfully. Behavior is verified manually.

Manual verification checklist:

- [ ] **Cold launch — Library tab:** shimmer cards appear instantly on first render, real cards appear after ≥200ms (never a flash of empty state)
- [ ] **Cold launch — Home tab:** greeting and Play All button render immediately; episode list area shimmers, then shows real cards
- [ ] **Pull-to-refresh:** native `RefreshControl` spinner appears at top; no shimmer cards — `isLoading` is not set to `true` on refresh
- [ ] **Fast SQLite (<50ms):** skeleton still shows for ≥200ms before disappearing
- [ ] **Slow SQLite (>200ms):** skeleton disappears as soon as data is ready (no additional delay)
- [ ] Skeleton card height (~96px) roughly matches real `EpisodeCard` height — no layout shift on transition
- [ ] Skeleton cards fill the screen width, match `border-radius: 16` of real cards
- [ ] Shimmer animation is smooth (60fps) on physical device — no jank
- [ ] `useNativeDriver: true` is set on the animation — verify no Metro yellow warning about native driver

---

## Success Criteria

```bash
# TypeScript — no type errors from new components
cd native && npx tsc --noEmit
# → 0 errors

# expo-linear-gradient is installed
cd native && grep expo-linear-gradient package.json
# → "expo-linear-gradient": "..."

# App builds and runs
cd native && npx expo run:ios
# → Build succeeded, no Metro errors on launch
```

---

## Scope

- **No** per-card loading state (e.g., shimmer inside an already-loaded card while audio URL resolves)
- **No** React 18 Suspense or `startTransition` — this uses simple `useState` + `useEffect`
- **No** skeleton for the PlayerBar or ExpandedPlayer
- **No** network loading skeleton — only the SQLite cold-launch first-read is addressed here; background sync uses `RefreshControl`
- **No** skeleton in search results — search is triggered by user input, not cold launch
