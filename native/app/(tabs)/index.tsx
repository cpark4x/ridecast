// native/app/(tabs)/index.tsx — homepage-redesign: ScrollView layout with new components

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
  getLibraryContext,
  getTopSourceDomain,
} from "../../lib/libraryHelpers";
import { formatDurationMinutes } from "../../lib/utils";
import type { AudioVersion, LibraryItem, PlayableItem } from "../../lib/types";
import { Haptics } from "../../lib/haptics";

import GreetingHeader from "../../components/GreetingHeader";
import HeroPlayerCard from "../../components/HeroPlayerCard";
import EpisodeCarousel from "../../components/EpisodeCarousel";
import EpisodeCard from "../../components/EpisodeCard";
import { SkeletonList } from "../../components/SkeletonLoader";
import UploadModal from "../../components/UploadModal";
import NewUserEmptyState from "../../components/empty-states/NewUserEmptyState";
import AllCaughtUpEmptyState from "../../components/empty-states/AllCaughtUpEmptyState";
import StaleLibraryNudge from "../../components/empty-states/StaleLibraryNudge";

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const player     = usePlayer();
  const { user }   = useUser();

  const [episodes,           setEpisodes]           = useState<LibraryItem[]>([]);
  const [refreshing,         setRefreshing]          = useState(false);
  const [uploadModalVisible, setUploadModalVisible]  = useState(false);
  const [isLoading,          setIsLoading]           = useState(true);
  const [staleDismissed,     setStaleDismissed]      = useState(false);

  const firstName = user?.firstName ?? null;

  // —— Data loading ─────────────────────────────────────────────────────────

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

  // —— Derived data ──────────────────────────────────────────────────────────

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

  // Empty-state context detection (from empty-states spec)
  const context = getLibraryContext(episodes);

  const computedStats = {
    episodeCount: episodes.filter(
      (item) => item.versions.length > 0 && item.versions.every((v) => v.completed),
    ).length,
    totalHours:
      episodes.reduce((acc, item) => {
        const secsCompleted = item.versions
          .filter((v) => v.completed)
          .reduce((s, v) => s + (v.durationSecs ?? 0), 0);
        return acc + secsCompleted;
      }, 0) / 3600,
  };

  const topSourceDomain = getTopSourceDomain(episodes);

  const newestMs = episodes.length > 0
    ? episodes.reduce((max, item) => Math.max(max, new Date(item.createdAt).getTime()), 0)
    : 0;
  const daysSinceNewest = newestMs > 0
    ? Math.floor((Date.now() - newestMs) / (24 * 60 * 60 * 1000))
    : 0;

  // —— Event handlers ────────────────────────────────────────────────────────

  function handlePlayAll() {
    const playables = upNextPairs.map(({ playable }) => playable);
    if (playables.length === 0) return;
    void Haptics.medium();
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

  /** Long-press → New Version — opens UploadModal */
  function handleNewVersion(_item: LibraryItem) {
    setUploadModalVisible(true);
  }

  // —— Render ────────────────────────────────────────────────────────────────

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
        {/* —— Skeleton (cold launch) —— */}
        {isLoading && <SkeletonList count={4} />}

        {!isLoading && (
          <>
            {/* Stale nudge — appears above content when library is stale */}
            {context === "stale" && !staleDismissed && (
              <StaleLibraryNudge
                daysSinceNewest={daysSinceNewest}
                topSourceDomain={topSourceDomain}
                onDismiss={() => setStaleDismissed(true)}
                onAddNew={() => setUploadModalVisible(true)}
              />
            )}

            {/* —— Greeting header —— */}
            <GreetingHeader
              firstName={firstName}
              episodeCount={episodeCount}
              totalDurationSecs={totalDurationSecs}
            />

            {/* —— Now Playing hero card (conditional) —— */}
            <HeroPlayerCard
              onExpand={() => player.setExpandedPlayerVisible(true)}
            />

            {/* —— Play All CTA —— */}
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

            {/* —— Horizontal carousel (all episodes, newest first) —— */}
            <EpisodeCarousel
              episodes={episodes}
              onPlay={handleCarouselPlay}
              currentAudioId={player.currentItem?.id ?? null}
            />

            {/* —— Up Next list —— */}
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

            {/* —— Context-aware empty states —— */}
            {context === "new_user" && (
              <NewUserEmptyState
                onCreateEpisode={() => setUploadModalVisible(true)}
              />
            )}
            {context === "all_caught_up" && (
              <AllCaughtUpEmptyState
                stats={computedStats}
                onAddNew={() => setUploadModalVisible(true)}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* —— FAB —— */}
      <TouchableOpacity
        onPress={() => { void Haptics.medium(); setUploadModalVisible(true); }}
        className="absolute bottom-8 right-6 w-14 h-14 bg-brand rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
        accessibilityLabel="Add content"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* —— Upload modal —— */}
      <UploadModal
        visible={uploadModalVisible}
        onDismiss={() => setUploadModalVisible(false)}
      />
    </SafeAreaView>
  );
}
