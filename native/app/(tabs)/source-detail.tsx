// native/app/(tabs)/source-detail.tsx
// Source Detail screen — source header, episode list, follow button, Play Unplayed CTA
// Spec: specs/features/phase5/source-detail.md

import React, { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius, spacing, typography } from "../../lib/theme";
import { getAllEpisodes } from "../../lib/db";
import { itemToSourceEpisode, toPlayableItem } from "../../lib/libraryHelpers";
import type { SourceEpisode } from "../../lib/libraryHelpers";
import { usePlayer } from "../../lib/usePlayer";
import { showGeneratingToast } from "../../lib/toast";
import SourceThumbnail from "../../components/SourceThumbnail";
import EmptyState from "../../components/EmptyState";
import SkeletonList from "../../components/SkeletonList";
import { ErrorBoundary } from "../../components/ErrorBoundary";

// ---------------------------------------------------------------------------
// SourceDetailScreen
// ---------------------------------------------------------------------------

function SourceDetailScreen(): JSX.Element {
  const router = useRouter();
  const player = usePlayer();
  const {
    sourceDomain,
    sourceName,
    sourceLogoColor,
    backLabel,
  } = useLocalSearchParams<{
    sourceDomain: string;
    sourceName: string;
    sourceLogoColor?: string;
    backLabel?: string;
  }>();

  const [episodes, setEpisodes] = useState<SourceEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSourceEpisodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDomain]);

  async function loadSourceEpisodes() {
    setIsLoading(true);
    try {
      const allEpisodes = await getAllEpisodes();
      const filtered = allEpisodes.filter(
        (item) =>
          (sourceDomain && item.sourceDomain === sourceDomain) ||
          (sourceName && item.sourceName === sourceName),
      );
      setEpisodes(filtered.map(itemToSourceEpisode));
    } catch (err) {
      console.warn("[source-detail] load error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const unplayedEpisodes = episodes.filter(
    (e) => e.status === "new" || e.status === "unplayed",
  );
  const unplayedMinutes = unplayedEpisodes.reduce(
    (sum, e) => sum + e.durationMin,
    0,
  );

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  function handlePlayUnplayed() {
    if (unplayedEpisodes.length === 0) return;
    const playables = unplayedEpisodes
      .map(toPlayableItem)
      .filter((p): p is NonNullable<typeof p> => p !== null);
    if (playables.length === 0) return;
    player.playQueue(playables).catch((err) =>
      console.warn("[source-detail] playQueue error:", err),
    );
  }

  function handleEpisodePress(episode: SourceEpisode) {
    const playable = toPlayableItem(episode);
    if (!playable) {
      showGeneratingToast();
      return;
    }
    player.play(playable).catch((err) =>
      console.warn("[source-detail] play error:", err),
    );
  }

  function handleMorePress(episode: SourceEpisode) {
    const title = episode.title;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options:           ["Cancel", "Rename", "Delete"],
          cancelButtonIndex:  0,
          destructiveButtonIndex: 2,
          title,
        },
        () => {
          // Placeholder: Rename and Delete are future actions
        },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>

      {/* NavBar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.screenMargin,
          paddingVertical: 14,
        }}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          <Text style={{ fontSize: 17, fontWeight: "400", color: colors.textSecondary }}>
            {backLabel ?? "Library"}
          </Text>
        </TouchableOpacity>

        {/* NavTitle — centered */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: colors.textPrimary,
            }}
            numberOfLines={1}
          >
            {sourceName}
          </Text>
        </View>

        {/* NavActionButton (ellipsis) — placeholder for future actions */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.full,
            width: 36,
            height: 36,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="ellipsis-horizontal-circle-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
      >
        {/* Source header */}
        <View
          style={{
            paddingHorizontal: spacing.screenMargin,
            paddingTop: 8,
            paddingBottom: 24,
          }}
        >
          {/* Source logo row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <SourceThumbnail
              sourceType="url"
              sourceUrl={sourceDomain ? `https://${sourceDomain}` : null}
              sourceName={sourceName}
              size={64}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: typography.sizes.h1,
                  fontWeight: "600",
                  color: colors.textPrimary,
                }}
                numberOfLines={1}
              >
                {sourceName}
              </Text>
              <Text
                style={{
                  fontSize: typography.sizes.caption,
                  fontWeight: "400",
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                {episodes.length} episode{episodes.length === 1 ? "" : "s"} · {unplayedEpisodes.length} unplayed
              </Text>
            </View>
          </View>

          {/* Play Unplayed button */}
          <TouchableOpacity
            onPress={unplayedEpisodes.length > 0 ? handlePlayUnplayed : undefined}
            activeOpacity={unplayedEpisodes.length > 0 ? 0.85 : 1}
            style={{
              backgroundColor: colors.accentPrimary,
              borderRadius: borderRadius.card,
              height: 48,
              paddingHorizontal: spacing.screenMargin,
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              opacity: unplayedEpisodes.length > 0 ? 1 : 0.4,
            }}
          >
            <Ionicons name="play" size={16} color={colors.textPrimary} />
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.textPrimary }}>
              Play Unplayed · {unplayedMinutes} min
            </Text>
          </TouchableOpacity>
        </View>

        {/* Episode list */}
        <View style={{ paddingHorizontal: spacing.screenMargin }}>
          {isLoading ? (
            <SkeletonList count={3} />
          ) : episodes.length === 0 ? (
            <EmptyState
              icon="library-outline"
              title={`No ${sourceName ?? "source"} episodes yet`}
              subtitle="Add articles from this source to your library to see them here."
            />
          ) : (
            episodes.map((episode, index) => (
              <View key={episode.id}>
                <TouchableOpacity
                  onPress={() => handleEpisodePress(episode)}
                  activeOpacity={0.75}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingVertical: 12,
                    gap: 12,
                    minHeight: 76,
                  }}
                >
                  {/* Thumbnail placeholder */}
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: borderRadius.thumbnail,
                      backgroundColor: colors.surfaceElevated,
                      flexShrink: 0,
                    }}
                  />

                  {/* Text column */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: typography.sizes.body,
                        fontWeight: "600",
                        color: colors.textPrimary,
                      }}
                      numberOfLines={2}
                    >
                      {episode.title}
                    </Text>
                    <Text
                      style={{
                        fontSize: typography.sizes.caption,
                        fontWeight: "400",
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {episode.durationMin} min · {episode.format}
                    </Text>

                    {/* Status indicator */}
                    <View style={{ marginTop: 4 }}>
                      {episode.status === "played" && (
                        <Text
                          style={{
                            fontSize: typography.sizes.micro,
                            fontWeight: "400",
                            color: colors.statusSuccess,
                          }}
                        >
                          Played ✓
                        </Text>
                      )}
                      {episode.status === "in_progress" && episode.progressPct !== undefined && (
                        <View
                          style={{
                            height: 3,
                            borderRadius: 3,
                            backgroundColor: colors.surfaceElevated,
                            overflow: "hidden",
                            width: "80%",
                          }}
                        >
                          <View
                            style={{
                              height: 3,
                              width: `${episode.progressPct}%`,
                              backgroundColor: colors.accentPrimary,
                              borderRadius: 3,
                            }}
                          />
                        </View>
                      )}
                      {episode.status === "new" && (
                        <View
                          style={{
                            backgroundColor: "rgba(255,107,53,0.15)",
                            borderRadius: borderRadius.full,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            alignSelf: "flex-start",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: typography.sizes.micro,
                              fontWeight: "400",
                              color: colors.accentPrimary,
                            }}
                          >
                            New
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* More button */}
                  <TouchableOpacity
                    onPress={() => handleMorePress(episode)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 4, flexShrink: 0 }}
                  >
                    <Ionicons
                      name="ellipsis-horizontal"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Row divider (not after last item) */}
                {index < episodes.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.borderDivider,
                    }}
                  />
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Export with ErrorBoundary wrapper
// ---------------------------------------------------------------------------

export default function SourceDetailScreenWrapper(): JSX.Element {
  return (
    <ErrorBoundary fallbackTitle="Source unavailable">
      <SourceDetailScreen />
    </ErrorBoundary>
  );
}
