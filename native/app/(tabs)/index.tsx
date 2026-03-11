import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";

import { usePlayer } from "../../lib/usePlayer";
import { getAllEpisodes } from "../../lib/db";
import { syncLibrary } from "../../lib/sync";
import { getUnlistenedItems, libraryItemToPlayable } from "../../lib/libraryHelpers";
import { formatDuration, formatDurationMinutes, timeAgo } from "../../lib/utils";
import type { LibraryItem, PlayableItem } from "../../lib/types";
import UploadModal from "../../components/UploadModal";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const SOURCE_COLOR: Record<string, string> = {
  pdf: "#FEE2E2",
  url: "#DBEAFE",
  epub: "#EDE9FE",
  txt: "#F3F4F6",
  pocket: "#D1FAE5",
};

function sourcePillBg(sourceType: string): string {
  return SOURCE_COLOR[sourceType.toLowerCase()] ?? "#F3F4F6";
}

// ──────────────────────────────────────────────────────────────────────────────
// Currently Playing Card
// ──────────────────────────────────────────────────────────────────────────────

interface CurrentlyPlayingCardProps {
  onExpand: () => void;
}

function CurrentlyPlayingCard({ onExpand }: CurrentlyPlayingCardProps) {
  const { currentItem, isPlaying, togglePlay, position, duration } = usePlayer();

  if (!currentItem) return null;

  const progressPercent = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <TouchableOpacity
      onPress={onExpand}
      activeOpacity={0.85}
      className="mx-4 mb-4 bg-orange-50 rounded-2xl overflow-hidden border border-orange-100"
    >
      {/* Thin progress bar at top */}
      <View className="h-1 w-full bg-orange-100">
        <View className="h-1 bg-brand" style={{ width: `${progressPercent}%` }} />
      </View>

      <View className="px-4 py-3 flex-row items-center gap-3">
        {/* Text block */}
        <View className="flex-1">
          <Text className="text-xs font-semibold text-brand uppercase tracking-wide mb-0.5">
            Now Playing
          </Text>
          <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
            {currentItem.title}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">
            {formatDuration(position)} / {formatDuration(duration)}
          </Text>
        </View>

        {/* Format badge */}
        <View className="bg-white border border-orange-200 px-2 py-0.5 rounded-full">
          <Text className="text-xs font-medium text-orange-600">{currentItem.format}</Text>
        </View>

        {/* Play/Pause toggle */}
        <TouchableOpacity
          onPress={() => void togglePlay()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <Ionicons name={isPlaying ? "pause-circle" : "play-circle"} size={32} color="#EA580C" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Up Next Row Card
// ──────────────────────────────────────────────────────────────────────────────

interface UpNextCardProps {
  item: LibraryItem;
  playable: PlayableItem;
  onPlay: (p: PlayableItem) => void;
}

function UpNextCard({ item, playable, onPlay }: UpNextCardProps) {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId,
  );
  const durationSecs = readyVersion?.durationSecs ?? (readyVersion?.targetDuration ?? 0) * 60;

  return (
    <TouchableOpacity
      onPress={() => onPlay(playable)}
      activeOpacity={0.75}
      className="mx-4 mb-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm"
    >
      <View className="px-4 py-3 flex-row items-center gap-3">
        {/* Play icon */}
        <View className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
          <Ionicons name="play" size={14} color="#EA580C" />
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
            {item.title}
          </Text>
          <View className="flex-row items-center gap-2 mt-1">
            {/* Source pill */}
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: sourcePillBg(item.sourceType) }}
            >
              <Text className="text-xs font-medium text-gray-700">
                {item.sourceType.toUpperCase()}
              </Text>
            </View>
            {/* Time ago */}
            <Text className="text-xs text-gray-400">{timeAgo(item.createdAt)}</Text>
          </View>
        </View>

        {/* Duration pill */}
        <View className="bg-gray-100 px-2 py-0.5 rounded-full">
          <Text className="text-xs text-gray-600">{formatDurationMinutes(durationSecs)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Home Screen
// ──────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const player = usePlayer();
  const { user } = useUser();

  const [episodes, setEpisodes] = useState<LibraryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  const firstName = user?.firstName ?? null;

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
      console.warn("[home] loadLocal error:", err);
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

  // Derive unlistened items (sorted newest-first — SQLite already returns DESC)
  const unlistenedItems = getUnlistenedItems(episodes);

  // Build (item, playable) pairs, filtering out items with no ready audio
  const upNextPairs: { item: LibraryItem; playable: PlayableItem }[] = [];
  for (const item of unlistenedItems) {
    const playable = libraryItemToPlayable(item);
    if (playable) upNextPairs.push({ item, playable });
  }

  const totalDurationSecs = upNextPairs.reduce((acc, { playable }) => acc + playable.duration, 0);
  const episodeCount = upNextPairs.length;

  function handlePlayAll() {
    const playables = upNextPairs.map(({ playable }) => playable);
    if (playables.length === 0) return;
    player.playQueue(playables).catch((err) =>
      console.warn("[home] playQueue error:", err),
    );
  }

  function handlePlayItem(playable: PlayableItem) {
    player.play(playable).catch((err) =>
      console.warn("[home] play error:", err),
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={upNextPairs}
        keyExtractor={({ item }) => item.id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#EA580C" />
        }
        contentContainerClassName="pb-32"
        ListHeaderComponent={
          <>
            {/* ── Header row ── */}
            <View className="flex-row items-start justify-between px-4 pt-3 pb-4">
              <View className="flex-1">
                <Text className="text-2xl font-bold text-gray-900">
                  {getGreeting()}{firstName ? `, ${firstName}` : ""}
                </Text>
                {episodeCount > 0 ? (
                  <Text className="text-sm text-gray-500 mt-0.5">
                    {formatDurationMinutes(totalDurationSecs)} · {episodeCount}{" "}
                    {episodeCount === 1 ? "episode" : "episodes"}
                  </Text>
                ) : (
                  <Text className="text-sm text-gray-500 mt-0.5">Nothing queued up yet</Text>
                )}
              </View>

              {/* Settings gear */}
              <TouchableOpacity
                onPress={() => router.push("/settings")}
                className="p-2 -mr-1 mt-0.5"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="settings-outline" size={22} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* ── Play All button ── */}
            {episodeCount > 0 && (
              <TouchableOpacity
                onPress={handlePlayAll}
                activeOpacity={0.85}
                className="mx-4 mb-4 bg-brand py-4 rounded-2xl items-center"
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="play" size={18} color="white" />
                  <Text className="text-base font-bold text-white">Play All</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* ── Currently Playing card ── */}
            <CurrentlyPlayingCard onExpand={() => console.log("expand player")} />

            {/* ── Up Next header ── */}
            {episodeCount > 0 && (
              <Text className="px-4 text-lg font-bold text-gray-900 mb-3">Up Next</Text>
            )}
          </>
        }
        renderItem={({ item: { item, playable } }) => (
          <UpNextCard item={item} playable={playable} onPlay={handlePlayItem} />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-8">
            <Ionicons name="headset-outline" size={48} color="#D1D5DB" />
            <Text className="text-base text-gray-400 mt-4 text-center">
              {"All caught up!\nPull to refresh or add content in your Library."}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setUploadModalVisible(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-brand rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
        accessibilityLabel="Add content"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Upload Modal */}
      <UploadModal
        visible={uploadModalVisible}
        onDismiss={() => setUploadModalVisible(false)}
      />
    </SafeAreaView>
  );
}
