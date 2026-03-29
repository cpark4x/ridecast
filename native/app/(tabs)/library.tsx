import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  SectionList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScrollToTop } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import EpisodeCard from "../../components/EpisodeCard";
import UploadModal from "../../components/UploadModal";
import EmptyState from "../../components/EmptyState";
import NewVersionSheet from "../../components/NewVersionSheet";
import { getPrefs, setPrefs } from "../../lib/prefs";
import NewUserEmptyState from "../../components/empty-states/NewUserEmptyState";
import AllCaughtUpEmptyState from "../../components/empty-states/AllCaughtUpEmptyState";
import StaleLibraryNudge from "../../components/empty-states/StaleLibraryNudge";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import SkeletonList from "../../components/SkeletonList";
import {
  filterEpisodes,
  getLibraryContext,
  getTopSourceDomain,
  groupByTimePeriod,
  sortEpisodes,
} from "../../lib/libraryHelpers";
import type { SortOrder } from "../../lib/libraryHelpers";
import { getAllEpisodes, searchEpisodes, deleteEpisode as dbDeleteEpisode } from "../../lib/db";
import { deleteEpisode as apiDeleteEpisode, updateContentTitle } from "../../lib/api";
import { deleteDownload } from "../../lib/downloads";
import { syncLibrary } from "../../lib/sync";
import { showGeneratingToast } from "../../lib/toast";
import { usePlayer } from "../../lib/usePlayer";
import { Haptics } from "../../lib/haptics";
import { colors, borderRadius, spacing } from "../../lib/theme";
import type { AudioVersion, LibraryFilter, LibraryItem, PlayableItem } from "../../lib/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const TOGGLE_FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "active",      label: "Unheard"     },
  { key: "all",         label: "All"         },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
];

const SORT_LABELS: Record<SortOrder, string> = {
  date_desc:    "Newest First",
  date_asc:     "Oldest First",
  title_asc:    "A → Z",
  duration_asc: "Shortest First",
  source_asc:   "By Source",
};

const SORT_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: "Newest First",   value: "date_desc"    },
  { label: "Oldest First",   value: "date_asc"     },
  { label: "Title A→Z",      value: "title_asc"    },
  { label: "Shortest First", value: "duration_asc" },
  { label: "By Source",      value: "source_asc"   },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function domainFromItem(item: LibraryItem): string {
  if (item.sourceUrl) {
    try {
      return new URL(item.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      // fall through
    }
  }
  return item.sourceType.toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────

function LibraryScreen() {
  const router = useRouter();
  const player = usePlayer();

  const [episodes, setEpisodes]                     = useState<LibraryItem[]>([]);
  const [filter, setFilter]                         = useState<LibraryFilter>("active");
  const [sortOrder, setSortOrder]                   = useState<SortOrder>("date_desc");
  const [sourceFilter, setSourceFilter]             = useState<string | null>(null);
  const [topicFilter, setTopicFilter]               = useState<string | null>(null);
  const [searchQuery, setSearchQuery]               = useState("");
  const [refreshing, setRefreshing]                 = useState(false);
  const [isLoading, setIsLoading]                   = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [newVersionEpisode, setNewVersionEpisode]   = useState<LibraryItem | null>(null);
  const [staleDismissed, setStaleDismissed]         = useState(false);
  const [showOnboardingHint, setShowOnboardingHint] = useState(false);

  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadStartRef   = useRef(Date.now());
  const listRef        = useRef<SectionList<LibraryItem>>(null);
  useScrollToTop(listRef);

  // Load from SQLite on mount, then sync in background
  useEffect(() => {
    loadLocal();
    syncInBackground();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show first-run onboarding hint when library is empty
  useEffect(() => {
    if (!isLoading && episodes.length === 0) {
      getPrefs().then((p) => {
        if (!p.hasSeenOnboarding) setShowOnboardingHint(true);
      }).catch(() => {});
    }
  }, [isLoading, episodes.length]);

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
      setTimeout(() => setIsLoading(false), delay);
    }
  }

  async function syncInBackground() {
    try {
      const items = await syncLibrary();
      setEpisodes(items);
    } catch (err) {
      console.warn("[library] background sync error:", err);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const items = await syncLibrary();
      setEpisodes(items);
    } catch (err) {
      console.warn("[library] pull-to-refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }

  async function dismissOnboardingHint() {
    setShowOnboardingHint(false);
    await setPrefs({ hasSeenOnboarding: true }).catch(() => {});
  }

  function handleSearchChange(text: string) {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        if (text.trim()) {
          const results = await searchEpisodes(text.trim());
          setEpisodes(results);
        } else {
          const all = await getAllEpisodes();
          setEpisodes(all);
        }
      } catch (err) {
        console.warn("[library] search error:", err);
      }
    }, 200);
  }

  // ── Sort picker ───────────────────────────────────────────────────────────
  function handleSortPress() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Cancel", ...SORT_OPTIONS.map((o) => o.label)],
          cancelButtonIndex: 0,
          title: "Sort By",
        },
        (idx) => {
          if (idx === 0) return;
          const chosen = SORT_OPTIONS[idx - 1];
          if (chosen) setSortOrder(chosen.value);
        },
      );
    }
  }

  // ── Source filter picker ──────────────────────────────────────────────────
  function handleSourceFilterPress() {
    if (sourceFilter !== null) {
      // Already active — clear it directly
      setSourceFilter(null);
      return;
    }
    const sources = [
      ...new Set(episodes.map((i) => domainFromItem(i))),
    ].sort();

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["All Sources", ...sources, "Cancel"],
          cancelButtonIndex: sources.length + 1,
          title: "Filter by Source",
        },
        (idx) => {
          if (idx === 0) setSourceFilter(null);
          else if (idx <= sources.length) setSourceFilter(sources[idx - 1] ?? null);
        },
      );
    }
  }

  // ── Topic filter picker ───────────────────────────────────────────────────
  function handleTopicFilterPress() {
    if (topicFilter !== null) {
      setTopicFilter(null);
      return;
    }
    const topics = [
      ...new Set(episodes.flatMap((i) => i.versions.flatMap((v) => v.themes ?? []))),
    ].sort();

    if (topics.length === 0) return;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["All Topics", ...topics, "Cancel"],
          cancelButtonIndex: topics.length + 1,
          title: "Filter by Topic",
        },
        (idx) => {
          if (idx === 0) setTopicFilter(null);
          else if (idx <= topics.length) setTopicFilter(topics[idx - 1] ?? null);
        },
      );
    }
  }

  // ── Card handlers ─────────────────────────────────────────────────────────
  function handleCardPress(item: LibraryItem) {
    const readyVersion = item.versions.find(
      (v) => v.status === "ready" && v.audioId && v.audioUrl,
    );

    if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
      const isStillGenerating = item.versions.some(
        (v) => v.status === "generating" || v.status === "processing",
      );

      if (isStillGenerating) {
        void Haptics.error();
        showGeneratingToast();
        return;
      }

      setNewVersionEpisode(item);
      return;
    }

    const playable: PlayableItem = {
      id:               readyVersion.audioId,
      title:            item.title,
      duration:         readyVersion.durationSecs ?? readyVersion.targetDuration * 60,
      format:           readyVersion.format,
      audioUrl:         readyVersion.audioUrl,
      author:           item.author,
      sourceType:       item.sourceType,
      sourceUrl:        item.sourceUrl,
      sourceDomain:     item.sourceDomain,
      sourceName:       item.sourceName,
      sourceBrandColor: item.sourceBrandColor,
      contentType:      readyVersion.contentType,
      themes:           readyVersion.themes,
      summary:          readyVersion.summary,
      targetDuration:   readyVersion.targetDuration,
      wordCount:        item.wordCount,
      compressionRatio: readyVersion.compressionRatio,
      voices:           readyVersion.voices,
      ttsProvider:      readyVersion.ttsProvider,
      createdAt:        item.createdAt,
    };

    player.play(playable).catch((err) =>
      console.warn("[library] play error:", err),
    );
  }

  function handleVersionPress(
    _item: LibraryItem,
    _version: AudioVersion,
    playable: PlayableItem,
  ) {
    player.play(playable).catch((err) =>
      console.warn("[library] version play error:", err),
    );
  }

  // rename: prompt for new title, save to server, optimistic state update
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
          console.warn("[library] rename error:", err);
          Alert.alert("Error", "Could not rename episode. Try again.");
        }
      },
      "plain-text",
      item.title ?? "",
    );
  }

  // delete-episodes: server first, then local, then optimistic state update
  async function handleDelete(item: LibraryItem) {
    try {
      await apiDeleteEpisode(item.id);
    } catch (err) {
      console.warn("[library] server delete error:", err);
    }

    const audioIds = item.versions
      .filter((v) => v.audioId)
      .map((v) => v.audioId as string);

    // Clean up local .mp3 files before removing DB records
    for (const audioId of audioIds) {
      await deleteDownload(audioId).catch(() => {});
    }

    try {
      await dbDeleteEpisode(item.id, audioIds);
    } catch (err) {
      console.warn("[library] local delete error:", err);
      Alert.alert("Error", "Could not delete the episode. Please try again.");
      return;
    }

    setEpisodes((prev) => prev.filter((e) => e.id !== item.id));
  }

  // ── Combined filter pipeline ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Search overrides filter/sort — show flat results from searchEpisodes
    if (searchQuery.trim()) return episodes;

    let result = filterEpisodes(episodes, filter);

    if (sourceFilter) {
      result = result.filter((i) => domainFromItem(i) === sourceFilter);
    }
    if (topicFilter) {
      result = result.filter((i) =>
        i.versions.some((v) => v.themes?.includes(topicFilter)),
      );
    }
    return sortEpisodes(result, sortOrder);
  }, [episodes, filter, sourceFilter, topicFilter, sortOrder, searchQuery]);

  const sections = groupByTimePeriod(filtered);

  // Empty-state context detection (use unfiltered episodes)
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

  const isSearching = searchQuery.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '700' }}>Library</Text>
        <View className="flex-row gap-1 items-center">
          {/* Add button — was FAB, moved to header */}
          <TouchableOpacity
            onPress={() => { void dismissOnboardingHint(); setUploadModalVisible(true); }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: borderRadius.card,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Add content"
          >
            <Ionicons name="add" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          {/* Sort icon */}
          <TouchableOpacity
            onPress={handleSortPress}
            style={{
              backgroundColor: colors.surface,
              borderRadius:    borderRadius.card,
              width:           36,
              height:          36,
              alignItems:      "center",
              justifyContent:  "center",
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Sort episodes"
          >
            <Ionicons name="reorder-three-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          {/* Settings gear */}
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            className="p-2 -mr-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <View
        style={{
          marginHorizontal: spacing.screenMargin,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderRadius: borderRadius.card,
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 8,
          borderWidth: 1,
          borderColor: colors.borderInput,
        }}
      >
        <Ionicons name="search" size={16} color="#9CA3AF" />
        <TextInput
          style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}
          placeholder="Search episodes…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* ── Filter chips — single scrollable row ────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ minHeight: 52, maxHeight: 52, flexShrink: 0, flexGrow: 0, marginBottom: 8 }}
        contentContainerStyle={{ paddingLeft: 16, paddingRight: 32, gap: 8, alignItems: "center" }}
      >
        {TOGGLE_FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => { void Haptics.light(); setFilter(key); }}
            style={{
              paddingHorizontal: 16,
              paddingVertical:   8,
              borderRadius:      20,
              backgroundColor:   filter === key ? colors.accentPrimary : colors.surfaceElevated,
              borderWidth: filter === key ? 0 : 1,
              borderColor: filter === key ? undefined : colors.borderInput,
            }}
          >
            <Text
              style={{
                fontSize:   15,
                fontWeight: "600",
                color:      filter === key ? "#fff" : colors.textSecondary,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Thin separator */}
        <View style={{ width: 1, height: 24, backgroundColor: "rgba(0,0,0,0.1)" }} />

        {/* Sources dropdown */}
        <TouchableOpacity
          onPress={handleSourceFilterPress}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
            backgroundColor: sourceFilter ? colors.accentPrimary : colors.surfaceElevated,
            borderWidth: 1, borderColor: sourceFilter ? colors.accentPrimary : colors.borderInput,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: sourceFilter ? "#fff" : colors.textSecondary }}>
            {sourceFilter ?? "Sources"}
          </Text>
          <Ionicons name={sourceFilter ? "close-circle" : "chevron-down"} size={13} color={sourceFilter ? "white" : "#9CA3AF"} />
        </TouchableOpacity>

        {/* Topics dropdown */}
        <TouchableOpacity
          onPress={handleTopicFilterPress}
          style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
            backgroundColor: topicFilter ? colors.accentPrimary : colors.surfaceElevated,
            borderWidth: 1, borderColor: topicFilter ? colors.accentPrimary : colors.borderInput,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: topicFilter ? "#fff" : colors.textSecondary }}>
            {topicFilter ?? "Topics"}
          </Text>
          <Ionicons name={topicFilter ? "close-circle" : "chevron-down"} size={13} color={topicFilter ? "white" : "#9CA3AF"} />
        </TouchableOpacity>
      </ScrollView>


      {/* ── Stale nudge ──────────────────────────────────────────────────── */}
      {/* Active sort indicator — shown when not using the default sort order */}
      {sortOrder !== "date_desc" && (
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => setSortOrder("date_desc")}
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255,107,53,0.15)',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 9999,
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Clear sort order"
          >
            <Text style={{ color: colors.accentPrimary, fontSize: 12, fontWeight: '500' }}>
              {SORT_LABELS[sortOrder]}
            </Text>
            <Ionicons name="close" size={12} color={colors.accentPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {context === "stale" && !staleDismissed && !isLoading && (
        <StaleLibraryNudge
          daysSinceNewest={daysSinceNewest}
          topSourceDomain={topSourceDomain}
          onDismiss={() => setStaleDismissed(true)}
          onAddNew={() => setUploadModalVisible(true)}
        />
      )}

      {/* ── Episode list — skeleton during cold launch, SectionList after ── */}
      {isLoading ? (
        <SkeletonList count={5} />
      ) : isSearching ? (
        // Search mode: flat list (no sections)
        <SectionList
          sections={filtered.length > 0 ? [{ title: "", data: filtered }] : []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EpisodeCard
              item={item}
              onPress={handleCardPress}
              onVersionPress={handleVersionPress}
              currentAudioId={player.currentItem?.id ?? null}
              onNewVersion={setNewVersionEpisode}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          )}
          renderSectionHeader={() => null}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 112 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title="No matches"
              subtitle="Try a different search term"
            />
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <EpisodeCard
              item={item}
              onPress={handleCardPress}
              onVersionPress={handleVersionPress}
              currentAudioId={player.currentItem?.id ?? null}
              onNewVersion={setNewVersionEpisode}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          )}
          renderSectionHeader={({ section: { title, data } }) =>
            title ? (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop:        20,
                  paddingBottom:     4,
                  flexDirection:     "row",
                  alignItems:        "center",
                  gap:               8,
                }}
              >
                <Text
                  style={{
                    fontSize:      13,
                    fontWeight:    "600",
                    color:         colors.textTertiary,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  {title}
                </Text>
                <View
                  style={{
                    backgroundColor:  colors.surfaceElevated,
                    borderRadius:     10,
                    paddingHorizontal: 7,
                    paddingVertical:  1,
                  }}
                >
                  <Text
                    style={{
                      fontSize:   11,
                      fontWeight: "600",
                      color:      colors.textTertiary,
                    }}
                  >
                    {data.length}
                  </Text>
                </View>
              </View>
            ) : null
          }
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 112 }}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            searchQuery.trim() || (filtered.length === 0 && episodes.length > 0) ? (
              <EmptyState
                icon="filter-outline"
                title="No episodes match"
                subtitle="Try a different filter or clear Sources / Topics"
              />
            ) : context === "new_user" ? (
              <NewUserEmptyState
                onCreateEpisode={() => setUploadModalVisible(true)}
              />
            ) : context === "all_caught_up" ? (
              <AllCaughtUpEmptyState
                stats={computedStats}
                onAddNew={() => setUploadModalVisible(true)}
              />
            ) : (
              <EmptyState
                icon="library-outline"
                title="No episodes yet"
                subtitle="Paste a URL or upload a file to get started"
                actionLabel="Create Episode"
                onAction={() => setUploadModalVisible(true)}
              />
            )
          }
        />
      )}

      {/* Onboarding Tooltip */}
      {showOnboardingHint && (
        <TouchableOpacity
          onPress={() => void dismissOnboardingHint()}
          style={{ position: 'absolute', top: 52, right: 8 }}
          activeOpacity={0.8}
        >
          <View style={{ backgroundColor: colors.surface, borderRadius: borderRadius.card, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 208 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '500' }}>
              Tap + to add your first episode
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
              Paste a URL or upload a file
            </Text>
            <View
              style={{ position: 'absolute', top: -6, right: 10, width: 12, height: 12, backgroundColor: colors.surface, transform: [{ rotate: '45deg' }] }}
            />
          </View>
        </TouchableOpacity>
      )}
      {/* ── Upload Modal ─────────────────────────────────────────────────── */}
      <UploadModal
        visible={uploadModalVisible}
        onDismiss={() => setUploadModalVisible(false)}
      />

      {/* ── New Version Sheet ────────────────────────────────────────────── */}
      {newVersionEpisode ? (
        <NewVersionSheet
          visible
          onDismiss={() => setNewVersionEpisode(null)}
          episode={newVersionEpisode}
        />
      ) : null}
    </SafeAreaView>
  );
}

export default function LibraryScreenWrapper() {
  return (
    <ErrorBoundary fallbackTitle="Library unavailable">
      <LibraryScreen />
    </ErrorBoundary>
  );
}
