import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import EpisodeCard from "../../components/EpisodeCard";
import UploadModal from "../../components/UploadModal";
import EmptyState from "../../components/EmptyState";
import NewVersionSheet from "../../components/NewVersionSheet";
import SkeletonList from "../../components/SkeletonList";
import { filterEpisodes } from "../../lib/libraryHelpers";
import { getAllEpisodes, searchEpisodes, deleteEpisode as dbDeleteEpisode } from "../../lib/db";
import { deleteEpisode as apiDeleteEpisode } from "../../lib/api";
import { syncLibrary } from "../../lib/sync";
import { showGeneratingToast } from "../../lib/toast";
import { usePlayer } from "../../lib/usePlayer";
import { Haptics } from "../../lib/haptics";
import type { AudioVersion, LibraryFilter, LibraryItem, PlayableItem } from "../../lib/types";

const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "all",         label: "All"         },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "generating",  label: "Generating"  },
];

export default function LibraryScreen() {
  const router = useRouter();
  const player = usePlayer();

  const [episodes, setEpisodes]                   = useState<LibraryItem[]>([]);
  const [filter, setFilter]                       = useState<LibraryFilter>("all");
  const [searchQuery, setSearchQuery]             = useState("");
  const [refreshing, setRefreshing]               = useState(false);
  const [isLoading, setIsLoading]                 = useState(true);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [newVersionEpisode, setNewVersionEpisode] = useState<LibraryItem | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadStartRef = useRef(Date.now());

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

  // Tap on the whole card → play the primary (first ready) version
  function handleCardPress(item: LibraryItem) {
    const readyVersion = item.versions.find(
      (v) => v.status === "ready" && v.audioId && v.audioUrl,
    );
    if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
      void Haptics.error();
      showGeneratingToast();
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

  // Tap a specific version pill → play that exact version
  function handleVersionPress(
    _item: LibraryItem,
    _version: AudioVersion,
    playable: PlayableItem,
  ) {
    player.play(playable).catch((err) =>
      console.warn("[library] version play error:", err),
    );
  }

  // delete-episodes: server first, then local, then optimistic state update
  async function handleDelete(item: LibraryItem) {
    try {
      await apiDeleteEpisode(item.id);
    } catch (err) {
      console.warn("[library] server delete error:", err);
      // Proceed with local delete even if server call fails
    }

    const audioIds = item.versions
      .filter((v) => v.audioId)
      .map((v) => v.audioId as string);

    try {
      await dbDeleteEpisode(item.id, audioIds);
    } catch (err) {
      console.warn("[library] local delete error:", err);
      Alert.alert("Error", "Could not delete the episode. Please try again.");
      return;
    }

    setEpisodes((prev) => prev.filter((e) => e.id !== item.id));
  }

  const filtered = filterEpisodes(episodes, filter);

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Library</Text>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          className="p-2 -mr-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="settings-outline" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View className="mx-4 mb-3 flex-row items-center bg-gray-100 rounded-xl px-3 py-2 gap-2">
        <Ionicons name="search" size={16} color="#9CA3AF" />
        <TextInput
          className="flex-1 text-base text-gray-900"
          placeholder="Search episodes…"
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerClassName="px-4 gap-2"
      >
        {FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => { void Haptics.light(); setFilter(key); }}
            className={`px-4 py-1.5 rounded-full ${
              filter === key ? "bg-brand" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                filter === key ? "text-white" : "text-gray-700"
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
              onDelete={handleDelete}
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

      {/* FAB */}
      <TouchableOpacity
        onPress={() => { void Haptics.medium(); setUploadModalVisible(true); }}
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

      {/* New Version Sheet */}
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
