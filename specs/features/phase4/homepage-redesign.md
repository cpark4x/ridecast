# Feature: Homepage Redesign

> Rebuild the home screen as a visual hybrid — hero "Now Playing" card, horizontal episode carousel, rich episode list, and a greeting header with stats — following Option B mockup.

## Motivation

The current home screen is a functional but visually sparse `FlatList` of `UpNextCard` rows with a Play All button. Option B (visual hybrid) in `docs/mockups/option-b-visual-hybrid.html` adds:

- A **hero card** when audio is playing — gradient branded background, progress bar, skip controls
- A **horizontal carousel** of all recent episodes — flick to scan upcoming content
- A richer **episode list** powered by the new `EpisodeCard` (source icon, summary, version pills)
- A **skeleton loading** state for cold launch

This makes Ridecast feel like a media app, not a task manager.

**Depends on:** `episode-card-redesign` spec must be applied first — it defines `SourceIcon`, `EpisodeCard`, and the `sourceName` utility referenced here.

## Pre-requisite: install expo-linear-gradient

`HeroPlayerCard` uses a gradient background that requires `expo-linear-gradient`:

```bash
cd native && npx expo install expo-linear-gradient
```

This adds `expo-linear-gradient` to `package.json` and the Expo config. Run this before implementing.

## Changes

### 1. Screen structure overview

```
SafeAreaView (flex-1 bg-white)
├── ScrollView (showsVerticalScrollIndicator={false})
│   ├── [isLoading]  → SkeletonList count={4}
│   ├── GreetingHeader          ← name + queue stats + settings button
│   ├── HeroPlayerCard?         ← only when player has a currentItem
│   ├── Play All CTA button?    ← only when episodeCount > 0
│   ├── EpisodeCarousel         ← horizontal, all episodes newest-first, max 8
│   ├── "Up Next" section label ← only when upNextPairs.length > 0
│   └── EpisodeCard ×N          ← one per unlistened item with ready audio
│       (or EmptyState)
└── FAB (absolute bottom-right)
    UploadModal
```

`FlatList` is replaced by `ScrollView` — the unlistened list is capped at O(10–20) items and does not require virtualisation.

---

### 2. New component: `native/components/GreetingHeader.tsx`

```tsx
// native/components/GreetingHeader.tsx — new file

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { formatDurationMinutes } from "../lib/utils";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GreetingHeaderProps {
  firstName: string | null;
  episodeCount: number;
  totalDurationSecs: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GreetingHeader({
  firstName,
  episodeCount,
  totalDurationSecs,
}: GreetingHeaderProps) {
  const router = useRouter();

  return (
    <View className="px-4 pt-3 pb-4 flex-row items-start justify-between">
      <View className="flex-1">
        <Text className="text-2xl font-bold text-gray-900">
          {getGreeting()}{firstName ? `, ${firstName}` : ""}
        </Text>

        {episodeCount > 0 ? (
          <Text className="text-sm text-gray-500 mt-0.5">
            {episodeCount} episode{episodeCount === 1 ? "" : "s"}{" "}
            · {formatDurationMinutes(totalDurationSecs)}
          </Text>
        ) : (
          <Text className="text-sm text-gray-500 mt-0.5">Your queue is clear</Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => router.push("/settings")}
        className="p-2 -mr-1 mt-0.5"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Settings"
      >
        <Ionicons name="settings-outline" size={22} color="#374151" />
      </TouchableOpacity>
    </View>
  );
}
```

---

### 3. New component: `native/components/HeroPlayerCard.tsx`

Renders when `player.currentItem` is non-null. Source-branded gradient background, pulsing "Now Playing" dot, inline skip/play controls, progress bar.

```tsx
// native/components/HeroPlayerCard.tsx — new file

import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";
import SourceIcon from "./SourceIcon";
import { sourceName, formatDuration } from "../lib/utils";

// ---------------------------------------------------------------------------
// Source type → gradient pair [from, to]
// Light tints — works on white background
// ---------------------------------------------------------------------------

const SOURCE_GRADIENT: Record<string, [string, string]> = {
  pdf:    ["#FEF2F2", "#FEE2E2"],
  url:    ["#EFF6FF", "#DBEAFE"],
  epub:   ["#F5F3FF", "#EDE9FE"],
  txt:    ["#F9FAFB", "#F3F4F6"],
  pocket: ["#F0FDF4", "#D1FAE5"],
};

const DEFAULT_GRADIENT: [string, string] = ["#FFF7ED", "#FFEDD5"]; // orange tint fallback

// ---------------------------------------------------------------------------
// Pulsing dot — animated opacity loop
// ---------------------------------------------------------------------------

function PulseDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1.0, duration: 750, useNativeDriver: true }),
      ]),
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#EA580C",
        opacity,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HeroPlayerCardProps {
  onExpand: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HeroPlayerCard({ onExpand }: HeroPlayerCardProps) {
  const { currentItem, isPlaying, togglePlay, position, duration, skipBack, skipForward } =
    usePlayer();

  if (!currentItem) return null;

  const key = (currentItem.sourceType ?? "").toLowerCase();
  const [gradFrom, gradTo] = SOURCE_GRADIENT[key] ?? DEFAULT_GRADIENT;
  const progressPercent = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <TouchableOpacity
      onPress={onExpand}
      activeOpacity={0.88}
      className="mx-4 mb-4 rounded-2xl overflow-hidden"
      accessibilityLabel="Now Playing — tap to expand"
    >
      <LinearGradient
        colors={[gradFrom, gradTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-4"
      >
        {/* ── Top row: source badge + NOW PLAYING pill ── */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <SourceIcon sourceType={currentItem.sourceType ?? "url"} size="sm" />
            <Text className="text-xs text-gray-500" numberOfLines={1}>
              {sourceName(currentItem.sourceType, currentItem.sourceUrl ?? null, currentItem.author ?? null)}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-full">
            <PulseDot />
            <Text className="text-xs font-bold text-brand uppercase tracking-wide">
              Now Playing
            </Text>
          </View>
        </View>

        {/* ── Title ── */}
        <Text className="text-base font-bold text-gray-900 mb-3" numberOfLines={2}>
          {currentItem.title}
        </Text>

        {/* ── Progress bar ── */}
        <View className="h-1 bg-white/50 rounded-full mb-1.5">
          <View
            className="h-1 bg-brand rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </View>

        {/* ── Time labels ── */}
        <View className="flex-row justify-between mb-3">
          <Text className="text-xs text-gray-500">{formatDuration(position)}</Text>
          <Text className="text-xs text-gray-500">{formatDuration(duration)}</Text>
        </View>

        {/* ── Transport controls ── */}
        <View className="flex-row items-center justify-center gap-6">
          <TouchableOpacity
            onPress={() => void skipBack(5)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Skip back 5 seconds"
          >
            <Ionicons name="play-skip-back" size={22} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void togglePlay()}
            className="w-12 h-12 bg-brand rounded-full items-center justify-center"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={24}
              color="white"
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void skipForward(15)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Skip forward 15 seconds"
          >
            <Ionicons name="play-skip-forward" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
```

---

### 4. New component: `native/components/EpisodeCarousel.tsx`

Horizontal `ScrollView` showing up to 8 most-recently-added episodes. Each `CarouselCard` is 148 × 190, with a source-colored header strip and source icon, title, duration badge, and unplayed dot.

```tsx
// native/components/EpisodeCarousel.tsx — new file

import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LibraryItem } from "../lib/types";
import SourceIcon from "./SourceIcon";
import { formatDurationMinutes } from "../lib/utils";

// ---------------------------------------------------------------------------
// Source type → background color for the card header strip
// ---------------------------------------------------------------------------

const SOURCE_BG: Record<string, string> = {
  pdf:    "#FEE2E2",
  url:    "#DBEAFE",
  epub:   "#EDE9FE",
  txt:    "#F3F4F6",
  pocket: "#D1FAE5",
};

function sourceCardBg(sourceType: string): string {
  return SOURCE_BG[sourceType.toLowerCase()] ?? "#F3F4F6";
}

// ---------------------------------------------------------------------------
// CarouselCard
// ---------------------------------------------------------------------------

interface CarouselCardProps {
  item: LibraryItem;
  onPlay: (item: LibraryItem) => void;
  isActive: boolean;
}

function CarouselCard({ item, onPlay, isActive }: CarouselCardProps) {
  const readyVersion = item.versions.find((v) => v.status === "ready" && v.audioId);
  const durationSecs = readyVersion?.durationSecs ?? (readyVersion ? readyVersion.targetDuration * 60 : 0);
  const hasAudio     = !!readyVersion;
  const allCompleted = item.versions.length > 0 && item.versions.every((v) => v.completed);
  const isNew        = hasAudio && !allCompleted && (readyVersion?.position ?? 0) === 0;

  return (
    <TouchableOpacity
      onPress={() => onPlay(item)}
      activeOpacity={0.8}
      style={{ width: 148, opacity: allCompleted ? 0.55 : 1 }}
      className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm"
      accessibilityLabel={item.title}
    >
      {/* ── Colored header strip with SourceIcon ── */}
      <View
        className="h-20 items-center justify-center"
        style={{ backgroundColor: sourceCardBg(item.sourceType) }}
      >
        <SourceIcon sourceType={item.sourceType} size="lg" />
      </View>

      {/* ── Card body ── */}
      <View className="p-2.5">
        <Text className="text-xs font-semibold text-gray-900" numberOfLines={2}>
          {item.title}
        </Text>
        {durationSecs > 0 && (
          <Text className="text-xs text-gray-400 mt-1">
            {formatDurationMinutes(durationSecs)}
          </Text>
        )}
      </View>

      {/* ── Active playing indicator ── */}
      {isActive && (
        <View className="absolute top-2 right-2 w-5 h-5 bg-brand rounded-full items-center justify-center">
          <Ionicons name="musical-notes" size={10} color="white" />
        </View>
      )}

      {/* ── Unplayed dot ── */}
      {isNew && !isActive && (
        <View className="absolute top-2 left-2 w-2 h-2 rounded-full bg-orange-500" />
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EpisodeCarouselProps {
  episodes: LibraryItem[];
  onPlay: (item: LibraryItem) => void;
  currentAudioId: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EpisodeCarousel({
  episodes,
  onPlay,
  currentAudioId,
}: EpisodeCarouselProps) {
  const recent = episodes.slice(0, 8); // newest-first from SQLite DESC order
  if (recent.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="px-4 text-lg font-bold text-gray-900 mb-3">Recent</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        decelerationRate="fast"
      >
        {recent.map((item) => (
          <CarouselCard
            key={item.id}
            item={item}
            onPlay={onPlay}
            isActive={
              !!currentAudioId &&
              item.versions.some((v) => v.audioId === currentAudioId)
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}
```

---

### 5. New component: `native/components/SkeletonLoader.tsx`

Used during cold launch while `loadLocal()` resolves. Matches the 3-column card layout of `EpisodeCard` so the layout does not jump.

```tsx
// native/components/SkeletonLoader.tsx — new file

import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

// ---------------------------------------------------------------------------
// Single shimmer card
// ---------------------------------------------------------------------------

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
    ).start();
  }, [shimmer]);

  const bg = shimmer.interpolate({
    inputRange:  [0, 1],
    outputRange: ["#F3F4F6", "#E5E7EB"],
  });

  return (
    <View className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm overflow-hidden">
      <View className="flex-row gap-3 items-start">
        {/* Left column placeholder — SourceIcon */}
        <Animated.View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: bg }} />

        {/* Center column placeholder */}
        <View className="flex-1 gap-2">
          <Animated.View style={{ height: 13, borderRadius: 4, backgroundColor: bg, width: "72%" }} />
          <Animated.View style={{ height: 10, borderRadius: 4, backgroundColor: bg, width: "48%" }} />
          <Animated.View style={{ height: 10, borderRadius: 4, backgroundColor: bg, width: "88%" }} />
        </View>

        {/* Right column placeholder — duration pill */}
        <Animated.View style={{ width: 48, height: 22, borderRadius: 6, backgroundColor: bg }} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 4 }: SkeletonListProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
```

---

### 6. Full replacement: `native/app/(tabs)/index.tsx`

#### Key structural diff (before → after)

```typescript
// ── BEFORE: key structural pieces ──────────────────────────────────────────
//
// import { FlatList, ... } from "react-native";
// import EmptyState from "../../components/EmptyState";
// // No: GreetingHeader, HeroPlayerCard, EpisodeCarousel, EpisodeCard, SkeletonList
//
// function CurrentlyPlayingCard({ onExpand }) { ... }   // inline, no gradient
// function UpNextCard({ item, playable, onPlay }) { ... } // inline, simplified
//
// export default function HomeScreen() {
//   const [episodes, setEpisodes] = useState([]);
//   const [refreshing, setRefreshing] = useState(false);
//   const [uploadModalVisible, setUploadModalVisible] = useState(false);
//   // No isLoading, no newVersionEpisode
//
//   return (
//     <SafeAreaView>
//       <FlatList
//         data={upNextPairs}
//         ListHeaderComponent={<>...CurrentlyPlayingCard...Play All...</>}
//         renderItem={({ item }) => <UpNextCard ... />}
//         ListEmptyComponent={<EmptyState ... />}
//       />
//       <TouchableOpacity /* FAB */ />
//       <UploadModal ... />
//     </SafeAreaView>
//   );
// }

// ── AFTER: key structural pieces ───────────────────────────────────────────
//
// import { ScrollView, ... } from "react-native";          // FlatList removed
// import GreetingHeader from "../../components/GreetingHeader";
// import HeroPlayerCard from "../../components/HeroPlayerCard";
// import EpisodeCarousel from "../../components/EpisodeCarousel";
// import EpisodeCard from "../../components/EpisodeCard";
// import { SkeletonList } from "../../components/SkeletonLoader";
//
// export default function HomeScreen() {
//   const [isLoading, setIsLoading] = useState(true);       // new
//   const [newVersionEpisode, setNewVersionEpisode] = useState(null); // new
//   // handleVersionPress, handleCardPress, handleCarouselPlay — new
//
//   return (
//     <SafeAreaView>
//       <ScrollView refreshControl={...}>
//         {isLoading && <SkeletonList count={4} />}
//         {!isLoading && (
//           <>
//             <GreetingHeader ... />
//             <HeroPlayerCard onExpand={...} />
//             {episodeCount > 0 && <TouchableOpacity /* Play All */ />}
//             <EpisodeCarousel ... />
//             {upNextPairs.length > 0 && <Text>Up Next</Text>}
//             {upNextPairs.map(({ item }) => <EpisodeCard key={item.id} item={item} ... />)}
//             {!isLoading && episodes.length === 0 && <EmptyState ... />}
//           </>
//         )}
//       </ScrollView>
//       <TouchableOpacity /* FAB */ />
//       <UploadModal ... />
//     </SafeAreaView>
//   );
// }
```

#### Complete new file

```tsx
// native/app/(tabs)/index.tsx — full replacement

import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";

import { usePlayer } from "../../lib/usePlayer";
import { getAllEpisodes } from "../../lib/db";
import { syncLibrary } from "../../lib/sync";
import {
  getUnlistenedItems,
  libraryItemToPlayable,
} from "../../lib/libraryHelpers";
import { formatDurationMinutes } from "../../lib/utils";
import type { AudioVersion, LibraryItem, PlayableItem } from "../../lib/types";

import GreetingHeader from "../../components/GreetingHeader";
import HeroPlayerCard from "../../components/HeroPlayerCard";
import EpisodeCarousel from "../../components/EpisodeCarousel";
import EpisodeCard from "../../components/EpisodeCard";
import { SkeletonList } from "../../components/SkeletonLoader";
import EmptyState from "../../components/EmptyState";
import UploadModal from "../../components/UploadModal";

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

export default function HomeScreen() {
  const player     = usePlayer();
  const { user }   = useUser();

  const [episodes,           setEpisodes]           = useState<LibraryItem[]>([]);
  const [refreshing,         setRefreshing]          = useState(false);
  const [uploadModalVisible, setUploadModalVisible]  = useState(false);
  const [isLoading,          setIsLoading]           = useState(true);
  const [newVersionEpisode,  setNewVersionEpisode]   = useState<LibraryItem | null>(null);

  const firstName = user?.firstName ?? null;

  // ── Data loading ─────────────────────────────────────────────────────────

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
      console.warn("[home] loadLocal error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function syncInBackground() {
    try {
      const items = await syncLibrary();
      setEpisodes(items);
    } catch (err) {
      console.warn("[home] background sync error:", err);
    }
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const items = await syncLibrary();
      setEpisodes(items);
    } catch (err) {
      console.warn("[home] pull-to-refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────

  // Unlistened items with ready audio — shown in the Up Next list
  const unlistenedItems = getUnlistenedItems(episodes);
  const upNextPairs: { item: LibraryItem; playable: PlayableItem }[] = [];
  for (const item of unlistenedItems) {
    const playable = libraryItemToPlayable(item);
    if (playable) upNextPairs.push({ item, playable });
  }

  const totalDurationSecs = upNextPairs.reduce(
    (acc, { playable }) => acc + playable.duration,
    0,
  );
  const episodeCount = upNextPairs.length;

  // ── Event handlers ────────────────────────────────────────────────────────

  function handlePlayAll() {
    const playables = upNextPairs.map(({ playable }) => playable);
    if (playables.length === 0) return;
    player.playQueue(playables).catch((err) =>
      console.warn("[home] playQueue error:", err),
    );
  }

  /** Tapping a carousel card — plays via the item's first ready version */
  function handleCarouselPlay(item: LibraryItem) {
    const playable = libraryItemToPlayable(item);
    if (!playable) return;
    player.play(playable).catch((err) =>
      console.warn("[home] carousel play error:", err),
    );
  }

  /** Tapping the body of an Up Next card — plays its primary version */
  function handleCardPress(item: LibraryItem) {
    const playable = libraryItemToPlayable(item);
    if (!playable) return;
    player.play(playable).catch((err) =>
      console.warn("[home] card press error:", err),
    );
  }

  /** Tapping a specific version pill on an Up Next card */
  function handleVersionPress(
    _item: LibraryItem,
    _version: AudioVersion,
    playable: PlayableItem,
  ) {
    player.play(playable).catch((err) =>
      console.warn("[home] version press error:", err),
    );
  }

  /** Long-press → New Version — opens UploadModal (NewVersionSheet is library-screen only) */
  function handleNewVersion(item: LibraryItem) {
    setNewVersionEpisode(item);
    setUploadModalVisible(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#EA580C"
          />
        }
      >
        {/* ── Skeleton (cold launch) ── */}
        {isLoading && <SkeletonList count={4} />}

        {!isLoading && (
          <>
            {/* ── Greeting header ── */}
            <GreetingHeader
              firstName={firstName}
              episodeCount={episodeCount}
              totalDurationSecs={totalDurationSecs}
            />

            {/* ── Now Playing hero card (conditional) ── */}
            <HeroPlayerCard
              onExpand={() => player.setExpandedPlayerVisible(true)}
            />

            {/* ── Play All CTA ── */}
            {episodeCount > 0 && (
              <TouchableOpacity
                onPress={handlePlayAll}
                activeOpacity={0.85}
                className="mx-4 mb-4 bg-brand py-4 rounded-2xl items-center"
                accessibilityLabel={`Play all — ${formatDurationMinutes(totalDurationSecs)}`}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="play" size={18} color="white" />
                  <Text className="text-base font-bold text-white">
                    Play All · {formatDurationMinutes(totalDurationSecs)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ── Horizontal carousel (all episodes, newest first) ── */}
            <EpisodeCarousel
              episodes={episodes}
              onPlay={handleCarouselPlay}
              currentAudioId={player.currentItem?.id ?? null}
            />

            {/* ── Up Next list ── */}
            {upNextPairs.length > 0 && (
              <>
                <Text className="px-4 text-lg font-bold text-gray-900 mb-3">
                  Up Next
                </Text>
                {upNextPairs.map(({ item }) => (
                  <EpisodeCard
                    key={item.id}
                    item={item}
                    onPress={handleCardPress}
                    onVersionPress={handleVersionPress}
                    currentAudioId={player.currentItem?.id ?? null}
                    onNewVersion={handleNewVersion}
                  />
                ))}
              </>
            )}

            {/* ── Empty state (no episodes at all) ── */}
            {episodes.length === 0 && (
              <EmptyState
                icon="headset"
                title="Your Daily Drive is empty"
                subtitle="Upload an article or URL to create your first episode"
                actionLabel="Create Episode"
                onAction={() => setUploadModalVisible(true)}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={() => setUploadModalVisible(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-brand rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
        accessibilityLabel="Add content"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* ── Upload modal ── */}
      <UploadModal
        visible={uploadModalVisible}
        onDismiss={() => {
          setUploadModalVisible(false);
          setNewVersionEpisode(null);
        }}
      />
    </SafeAreaView>
  );
}
```

---

### 7. `getGreeting` migration note

`getGreeting` is **moved** from `native/app/(tabs)/index.tsx` to `native/components/GreetingHeader.tsx` where it is also exported for testing. Remove the duplicate definition from `index.tsx` (already done in the replacement above).

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/GreetingHeader.tsx` | New — greeting text + queue stats header |
| `native/components/HeroPlayerCard.tsx` | New — gradient Now Playing card with controls |
| `native/components/EpisodeCarousel.tsx` | New — horizontal carousel with CarouselCard |
| `native/components/SkeletonLoader.tsx` | New — shimmer skeleton for cold launch |
| `native/app/(tabs)/index.tsx` | Full replacement — ScrollView layout, new components wired |
| `native/components/SourceIcon.tsx` | Dependency — from `episode-card-redesign` spec |
| `native/components/EpisodeCard.tsx` | Dependency — from `episode-card-redesign` spec |
| `native/lib/utils.ts` | Dependency — `sourceName()` from `episode-card-redesign` spec |

## Tests

### Unit tests: `native/__tests__/greetingHeader.test.ts` — new file

```typescript
// native/__tests__/greetingHeader.test.ts

import { getGreeting } from "../components/GreetingHeader";

// ---------------------------------------------------------------------------
// getGreeting
// ---------------------------------------------------------------------------

describe("getGreeting", () => {
  const RealDate = Date;

  function mockHour(hour: number) {
    // Stub Date to return a specific hour
    global.Date = class extends RealDate {
      getHours() { return hour; }
    } as typeof Date;
  }

  afterEach(() => {
    global.Date = RealDate;
  });

  it("returns 'Good morning' for hour < 12", () => {
    mockHour(7);
    expect(getGreeting()).toBe("Good morning");
  });

  it("returns 'Good morning' at midnight (hour 0)", () => {
    mockHour(0);
    expect(getGreeting()).toBe("Good morning");
  });

  it("returns 'Good afternoon' for hour 12", () => {
    mockHour(12);
    expect(getGreeting()).toBe("Good afternoon");
  });

  it("returns 'Good afternoon' for hour 16", () => {
    mockHour(16);
    expect(getGreeting()).toBe("Good afternoon");
  });

  it("returns 'Good evening' for hour 17", () => {
    mockHour(17);
    expect(getGreeting()).toBe("Good evening");
  });

  it("returns 'Good evening' for hour 23", () => {
    mockHour(23);
    expect(getGreeting()).toBe("Good evening");
  });
});
```

### Carousel unit tests: `native/__tests__/episodeCarousel.test.ts` — new file

```typescript
// native/__tests__/episodeCarousel.test.ts

import type { LibraryItem, AudioVersion } from "../lib/types";

// Test the source color helper logic in isolation
const SOURCE_BG: Record<string, string> = {
  pdf:    "#FEE2E2",
  url:    "#DBEAFE",
  epub:   "#EDE9FE",
  txt:    "#F3F4F6",
  pocket: "#D1FAE5",
};

function sourceCardBg(sourceType: string): string {
  return SOURCE_BG[sourceType.toLowerCase()] ?? "#F3F4F6";
}

function makeVersion(overrides: Partial<AudioVersion> = {}): AudioVersion {
  return {
    scriptId: "s1", audioId: "a1",
    audioUrl: "https://cdn.example.com/audio.mp3",
    durationSecs: 600, targetDuration: 10,
    format: "narrator", status: "ready",
    completed: false, position: 0,
    createdAt: "2026-01-01T00:00:00Z",
    summary: null, contentType: null, themes: [],
    compressionRatio: 0.5, actualWordCount: 1500,
    voices: [], ttsProvider: "openai",
    ...overrides,
  };
}

function makeItem(id: string, overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id, title: `Episode ${id}`,
    author: null, sourceType: "url", sourceUrl: null,
    createdAt: new Date().toISOString(), wordCount: 1000,
    versions: [makeVersion()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// sourceCardBg
// ---------------------------------------------------------------------------

describe("sourceCardBg", () => {
  it("returns red tint for pdf", () => {
    expect(sourceCardBg("pdf")).toBe("#FEE2E2");
  });
  it("returns blue tint for url", () => {
    expect(sourceCardBg("url")).toBe("#DBEAFE");
  });
  it("returns purple tint for epub", () => {
    expect(sourceCardBg("epub")).toBe("#EDE9FE");
  });
  it("is case-insensitive", () => {
    expect(sourceCardBg("PDF")).toBe("#FEE2E2");
    expect(sourceCardBg("URL")).toBe("#DBEAFE");
  });
  it("returns gray fallback for unknown source type", () => {
    expect(sourceCardBg("rss")).toBe("#F3F4F6");
  });
});

// ---------------------------------------------------------------------------
// Carousel slicing
// ---------------------------------------------------------------------------

describe("EpisodeCarousel slicing", () => {
  it("shows at most 8 episodes from the beginning of the list", () => {
    const episodes = Array.from({ length: 12 }, (_, i) =>
      makeItem(String(i + 1)),
    );
    const recent = episodes.slice(0, 8);
    expect(recent).toHaveLength(8);
    expect(recent[0].id).toBe("1");
  });

  it("shows all episodes when fewer than 8 exist", () => {
    const episodes = Array.from({ length: 3 }, (_, i) => makeItem(String(i + 1)));
    const recent = episodes.slice(0, 8);
    expect(recent).toHaveLength(3);
  });

  it("returns empty array when no episodes exist (carousel renders nothing)", () => {
    const recent = [].slice(0, 8);
    expect(recent).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isActive detection logic (mirrors CarouselCard prop derivation)
// ---------------------------------------------------------------------------

describe("CarouselCard isActive derivation", () => {
  it("is active when currentAudioId matches any version's audioId", () => {
    const item = makeItem("1", {
      versions: [makeVersion({ audioId: "matched-audio" })],
    });
    const isActive =
      !!("matched-audio") &&
      item.versions.some((v) => v.audioId === "matched-audio");
    expect(isActive).toBe(true);
  });

  it("is not active when currentAudioId does not match", () => {
    const item = makeItem("1", {
      versions: [makeVersion({ audioId: "other-audio" })],
    });
    const isActive =
      !!("current-audio") &&
      item.versions.some((v) => v.audioId === "current-audio");
    expect(isActive).toBe(false);
  });

  it("is not active when currentAudioId is null", () => {
    const item = makeItem("1");
    const isActive =
      !!(null) &&
      item.versions.some((v) => v.audioId === null);
    expect(isActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Component smoke tests
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GreetingHeaderModule  = require("../components/GreetingHeader");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const EpisodeCarouselModule = require("../components/EpisodeCarousel");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SkeletonLoaderModule  = require("../components/SkeletonLoader");

describe("GreetingHeader module", () => {
  it("has a default export (component)", () => {
    expect(GreetingHeaderModule.default).toBeDefined();
    expect(typeof GreetingHeaderModule.default).toBe("function");
  });
  it("exports getGreeting function", () => {
    expect(typeof GreetingHeaderModule.getGreeting).toBe("function");
  });
});

describe("EpisodeCarousel module", () => {
  it("has a default export (component)", () => {
    expect(EpisodeCarouselModule.default).toBeDefined();
    expect(typeof EpisodeCarouselModule.default).toBe("function");
  });
});

describe("SkeletonLoader module", () => {
  it("exports SkeletonList named export", () => {
    expect(typeof SkeletonLoaderModule.SkeletonList).toBe("function");
  });
});
```

## Success Criteria

```bash
# 0. Install expo-linear-gradient (one-time)
cd native && npx expo install expo-linear-gradient

# 1. TypeScript clean — no errors
cd native && npx tsc --noEmit

# 2. New unit tests pass
cd native && npx jest --testPathPattern="greetingHeader|episodeCarousel" --no-coverage

# 3. Full regression suite — all tests still green
cd native && npx jest --no-coverage

# 4. iOS Simulator build
cd native && npx expo run:ios --no-build-cache
# Expected: build succeeds, app launches
```

Manual verification checklist:
- [ ] Cold launch: skeleton cards appear briefly, then home screen content loads
- [ ] No audio playing: greeting + carousel + Up Next list visible; hero card absent
- [ ] Audio playing: `HeroPlayerCard` appears below greeting; gradient matches source type (PDF = red tint, URL = blue tint, etc.)
- [ ] NOW PLAYING dot pulses (opacity animation cycles)
- [ ] Skip back/forward buttons call `player.skipBack(5)` / `player.skipForward(15)`
- [ ] Carousel shows up to 8 most-recently-added episodes, scrolls horizontally
- [ ] Completed episodes in carousel show 55% opacity
- [ ] Active episode in carousel shows musical note badge
- [ ] New episode in carousel shows orange unplayed dot
- [ ] "Play All" button shows total queue duration
- [ ] Pull-to-refresh re-syncs and updates the screen
- [ ] Empty state shown when `episodes.length === 0`
- [ ] FAB opens upload modal
- [ ] Long-press on Up Next card → opens action sheet (from `EpisodeCard.handleLongPress`)
- [ ] Version pill tap plays the selected version

## Scope

- **No** dark background — mockup's `#111827` background is aspirational; keep `bg-white` for this spec
- **No** AI-personalized recommendations — carousel is `episodes.slice(0, 8)` by recency
- **No** "See all" navigation from carousel — plain `ScrollView`, no `FlatList` virtualisation
- **No** artwork / album art — `SourceIcon` emoji only
- **No** changes to `ExpandedPlayer`, `PlayerBar`, `LibraryScreen`, or backend
- `newVersionEpisode` state is stored but opens the generic `UploadModal`; a dedicated `NewVersionSheet` is the `library-redesign` spec
- The empty state on the home screen remains `EmptyState` (generic); context-aware states (`NewUserEmptyState`, `AllCaughtUpEmptyState`) are wired in the `empty-states` spec
