// native/app/(tabs)/index.tsx — homepage-redesign: ScrollView layout with new components

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScrollToTop } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";

import { usePlayer } from "../../lib/usePlayer";
import { getAllEpisodes } from "../../lib/db";
import { syncLibrary } from "../../lib/sync";
import { updateContentTitle } from "../../lib/api";
import {
  getUnlistenedItems,
  libraryItemToPlayable,
  getLibraryContext,
  getTopSourceDomain,
} from "../../lib/libraryHelpers";

import type { AudioVersion, LibraryItem, PlayableItem } from "../../lib/types";
import { Haptics } from "../../lib/haptics";
import { colors, borderRadius, spacing } from "../../lib/theme";

import GreetingHeader from "../../components/GreetingHeader";
import EpisodeCard from "../../components/EpisodeCard";
import SkeletonList from "../../components/SkeletonList";
import UploadModal from "../../components/UploadModal";
import NewUserEmptyState from "../../components/empty-states/NewUserEmptyState";
import AllCaughtUpEmptyState from "../../components/empty-states/AllCaughtUpEmptyState";
import StaleLibraryNudge from "../../components/empty-states/StaleLibraryNudge";
import { ErrorBoundary } from "../../components/ErrorBoundary";

// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen
// ─────────────────────────────────────────────────────────────────────────────

function HomeScreen() {
  const player     = usePlayer();
  const { user }   = useUser();

  const [episodes,           setEpisodes]           = useState<LibraryItem[]>([]);
  const [refreshing,         setRefreshing]          = useState(false);
  const [uploadModalVisible, setUploadModalVisible]  = useState(false);
  const [isLoading,          setIsLoading]           = useState(true);
  const [staleDismissed,     setStaleDismissed]      = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

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

  // —— Derived data ─────────────────────────────────────────────────────────

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

  // —— Event handlers ──────────────────────────────────────────────────────

  function handlePlayAll() {
    const playables = upNextPairs.map(({ playable }) => playable);
    if (playables.length === 0) return;
    void Haptics.medium();
    player.playQueue(playables).catch((err) =>
      console.warn("[home] playQueue error:", err),
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

  /** Long-press → Rename — shows prompt to edit title */
  function handleRename(item: LibraryItem) {
    Alert.prompt(
      "Rename Episode",
      undefined,
      async (newTitle) => {
        if (!newTitle?.trim()) return;
        try {
          await updateContentTitle(item.id, newTitle.trim());
          void Haptics.success();
          setEpisodes((prev) =>
            prev.map((ep) =>
              ep.id === item.id ? { ...ep, title: newTitle.trim() } : ep,
            ),
          );
        } catch (err) {
          console.warn("[home] rename error:", err);
          Alert.alert("Error", "Could not rename episode. Try again.");
        }
      },
      "plain-text",
      item.title ?? "",
    );
  }

  /** Long-press → New Version — opens UploadModal */
  function handleNewVersion(_item: LibraryItem) {
    setUploadModalVisible(true);
  }

  // —— Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>
      <ScrollView
        ref={scrollRef}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
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

            {/* —— Dark header row: greeting + "+" button —— */}
            <View
              style={{
                flexDirection:  "row",
                alignItems:     "flex-start",
              }}
            >
              <View style={{ flex: 1 }}>
                <GreetingHeader
                  firstName={firstName}
                  episodeCount={episodeCount}
                  totalDurationSecs={totalDurationSecs}
                />
              </View>
              {/* Header "+" button — dark surface, 36×36, textSecondary icon */}
              <TouchableOpacity
                onPress={() => setUploadModalVisible(true)}
                activeOpacity={0.8}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius:    borderRadius.card,
                  width:           36,
                  height:          36,
                  alignItems:      "center",
                  justifyContent:  "center",
                  marginTop:       20,
                  marginRight:     spacing.screenMargin,
                }}
                accessibilityLabel="Add new episode"
              >
                <Ionicons name="add" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* —— Play All CTA —— */}
            {episodeCount > 0 && (
              <TouchableOpacity
                onPress={handlePlayAll}
                activeOpacity={0.85}
                style={{
                  marginHorizontal: spacing.screenMargin,
                  marginBottom:     16,
                  backgroundColor:  colors.accentPrimary,
                  borderRadius:     borderRadius.card,
                  paddingVertical:  14,
                  paddingHorizontal: 20,
                  flexDirection:    "row",
                  alignItems:       "center",
                  gap:              8,
                }}
                accessibilityLabel={`Play all — ${episodeCount} episodes`}
              >
                {/* Play icon circle */}
                <View
                  style={{
                    width:           28,
                    height:          28,
                    borderRadius:    14,
                    backgroundColor: "rgba(255,255,255,0.25)",
                    alignItems:      "center",
                    justifyContent:  "center",
                  }}
                >
                  <Ionicons name="play" size={14} color="white" style={{ marginLeft: 2 }} />
                </View>

                {/* Label */}
                <Text
                  style={{
                    color:         "white",
                    fontSize:      15,
                    fontWeight:    "600",
                    letterSpacing: -0.2,
                  }}
                >
                  Play All
                </Text>

                {/* Episode count — right-aligned */}
                <Text
                  style={{
                    color:      "rgba(255,255,255,0.7)",
                    fontSize:   13,
                    marginLeft: "auto",
                    fontWeight: "400",
                  }}
                >
                  {episodeCount} episode{episodeCount === 1 ? "" : "s"}
                </Text>
              </TouchableOpacity>
            )}

            {/* —— Up Next list —— */}
            {upNextPairs.length > 0 && (
              <>
                <View
                  style={{
                    paddingHorizontal: spacing.screenMargin,
                    paddingTop:        20,
                    paddingBottom:     10,
                    flexDirection:     "row",
                    alignItems:        "baseline",
                    gap:               8,
                  }}
                >
                  <Text
                    style={{
                      fontSize:      19,
                      fontWeight:    "700",
                      color:         colors.textPrimary,
                      letterSpacing: -0.3,
                    }}
                  >
                    Up Next
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.textTertiary, fontWeight: "500" }}>
                    {upNextPairs.length}
                  </Text>
                </View>

                {upNextPairs.map(({ item }) => (
                  <EpisodeCard
                    key={item.id}
                    item={item}
                    onPress={handleCardPress}
                    onVersionPress={handleVersionPress}
                    currentAudioId={player.currentItem?.id ?? null}
                    onNewVersion={handleNewVersion}
                    onRename={handleRename}
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

      {/* —— Upload modal —— */}
      <UploadModal
        visible={uploadModalVisible}
        onDismiss={() => setUploadModalVisible(false)}
      />
    </SafeAreaView>
  );
}

export default function HomeScreenWrapper() {
  return (
    <ErrorBoundary fallbackTitle="Home unavailable">
      <HomeScreen />
    </ErrorBoundary>
  );
}
