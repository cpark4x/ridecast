# Feature: Library Redesign

> Full library screen overhaul with time-sectioned grouping, dropdown source/topic filters, sort controls, and rich episode cards — matching the library-redesign-v2 mockup.

## Motivation

The library is Ridecast's primary content surface but currently looks like a flat list with minimal filter chips. As the library grows, users need: time sections ("Today", "This Week") for temporal orientation; richer filter options including per-source and per-topic filtering; and sort controls for power users. The mockup (`docs/mockups/library-redesign-v2.html`) shows a polished, iOS-native-feeling library that matches the quality of the home screen redesign.

**Depends on:** `active-filter-default` (adds `"active"` to `LibraryFilter` and the `filterEpisodes` switch).

## Scope

- **No** swipe-to-delete in this spec — long-press Delete is sufficient for now
- **No** saved/pinned filters
- **No** custom theme management — topics come from AI-generated `themes` array only
- Section headers are non-sticky (`stickySectionHeadersEnabled={false}`) — cleaner visual
- **No** count badges on filter chips

## Changes

### 1. Add `SortOrder` type and helpers to `native/lib/libraryHelpers.ts`

**File:** `native/lib/libraryHelpers.ts`

**Before** (end of file, lines 45–72):
```typescript
export function filterEpisodes(
  items: LibraryItem[],
  filter: LibraryFilter,
): LibraryItem[] {
  switch (filter) {
    case "all":
      return items;
    case "in_progress":
      return items.filter((item) =>
        item.versions.some((v) => v.position > 0 && !v.completed),
      );
    case "completed":
      return items.filter(
        (item) =>
          item.versions.length > 0 && item.versions.every((v) => v.completed),
      );
    case "generating":
      return items.filter((item) =>
        item.versions.some((v) => v.status === "generating"),
      );
    default:
      return items;
  }
}
```

**After** (full replacement — complete file):
```typescript
// native/lib/libraryHelpers.ts
import type { LibraryItem, LibraryFilter, PlayableItem } from "./types";

export type SortOrder =
  | "date_desc"
  | "date_asc"
  | "title_asc"
  | "duration_asc"
  | "source_asc";

// ─────────────────────────────────────────────────────────────────────────────
// Home screen helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter to episodes that are "unlistened":
 * has at least one ready version where position === 0 OR not completed.
 */
export function getUnlistenedItems(items: LibraryItem[]): LibraryItem[] {
  return items.filter((item) =>
    item.versions.some(
      (v) => v.status === "ready" && (v.position === 0 || !v.completed),
    ),
  );
}

/**
 * Build a PlayableItem from a LibraryItem using its first ready version.
 * Returns null if no ready version with audioId + audioUrl exists.
 */
export function libraryItemToPlayable(item: LibraryItem): PlayableItem | null {
  const version = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!version || !version.audioId || !version.audioUrl) return null;

  return {
    id: version.audioId,
    title: item.title,
    duration: version.durationSecs ?? version.targetDuration * 60,
    format: version.format,
    audioUrl: version.audioUrl,
    author: item.author,
    sourceType: item.sourceType,
    contentType: version.contentType,
    themes: version.themes,
    summary: version.summary,
    targetDuration: version.targetDuration,
    createdAt: item.createdAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Library screen helpers
// ─────────────────────────────────────────────────────────────────────────────

export function filterEpisodes(
  items: LibraryItem[],
  filter: LibraryFilter,
): LibraryItem[] {
  switch (filter) {
    case "active":
      // Active = has at least one ready version not yet completed
      return items.filter((item) =>
        item.versions.some((v) => v.status === "ready" && !v.completed),
      );

    case "all":
      return items;

    case "in_progress":
      return items.filter((item) =>
        item.versions.some((v) => v.position > 0 && !v.completed),
      );

    case "completed":
      return items.filter(
        (item) =>
          item.versions.length > 0 && item.versions.every((v) => v.completed),
      );

    case "generating":
      return items.filter((item) =>
        item.versions.some((v) => v.status === "generating"),
      );

    default:
      return items;
  }
}

/**
 * Group a flat list of LibraryItems into Today / This Week / Earlier sections.
 * Sections with no items are omitted.
 */
export function groupByTimePeriod(
  items: LibraryItem[],
): Array<{ title: string; data: LibraryItem[] }> {
  const today: LibraryItem[] = [];
  const thisWeek: LibraryItem[] = [];
  const earlier: LibraryItem[] = [];

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  // "This Week" = last 6 full days before today
  const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

  for (const item of items) {
    const t = new Date(item.createdAt).getTime();
    if (t >= startOfToday) {
      today.push(item);
    } else if (t >= sevenDaysAgo) {
      thisWeek.push(item);
    } else {
      earlier.push(item);
    }
  }

  const sections: Array<{ title: string; data: LibraryItem[] }> = [];
  if (today.length > 0) sections.push({ title: "Today", data: today });
  if (thisWeek.length > 0) sections.push({ title: "This Week", data: thisWeek });
  if (earlier.length > 0) sections.push({ title: "Earlier", data: earlier });
  return sections;
}

/**
 * Sort a list of LibraryItems by the given order.
 * Returns a new array (does not mutate input).
 */
export function sortEpisodes(
  items: LibraryItem[],
  order: SortOrder,
): LibraryItem[] {
  const sorted = [...items];
  switch (order) {
    case "date_desc":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "date_asc":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "title_asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "source_asc":
      return sorted.sort((a, b) =>
        a.sourceType.localeCompare(b.sourceType),
      );
    case "duration_asc":
      return sorted.sort((a, b) => {
        const aDur = a.versions[0]?.targetDuration ?? Infinity;
        const bDur = b.versions[0]?.targetDuration ?? Infinity;
        return aDur - bDur;
      });
    default:
      return sorted;
  }
}
```

### 2. Add `"active"` to `LibraryFilter` in `native/lib/types.ts`

**File:** `native/lib/types.ts`

**Before:**
```typescript
export type LibraryFilter = "all" | "in_progress" | "completed" | "generating";
```

**After:**
```typescript
export type LibraryFilter = "active" | "all" | "in_progress" | "completed" | "generating";
```

### 3. Replace `native/app/(tabs)/library.tsx` — full rewrite

**File:** `native/app/(tabs)/library.tsx`

```tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActionSheetIOS,
  Platform,
  SectionList,
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
import {
  filterEpisodes,
  groupByTimePeriod,
  sortEpisodes,
} from "../../lib/libraryHelpers";
import type { SortOrder } from "../../lib/libraryHelpers";
import { getAllEpisodes, searchEpisodes } from "../../lib/db";
import { syncLibrary } from "../../lib/sync";
import { usePlayer } from "../../lib/usePlayer";
import type {
  AudioVersion,
  LibraryFilter,
  LibraryItem,
  PlayableItem,
} from "../../lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TOGGLE_FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "active",      label: "Active"      },
  { key: "all",         label: "All"         },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "generating",  label: "Generating"  },
];

const SORT_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: "Newest First",   value: "date_desc"    },
  { label: "Oldest First",   value: "date_asc"     },
  { label: "Title A→Z",      value: "title_asc"    },
  { label: "Shortest First", value: "duration_asc" },
  { label: "By Source",      value: "source_asc"   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function LibraryScreen() {
  const router = useRouter();
  const player = usePlayer();

  const [episodes, setEpisodes] = useState<LibraryItem[]>([]);
  const [filter, setFilter] = useState<LibraryFilter>("active");
  const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
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

  // ── Sort picker ─────────────────────────────────────────────────────────────
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

  // ── Source filter picker ─────────────────────────────────────────────────────
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

  // ── Topic filter picker ──────────────────────────────────────────────────────
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

  // ── Card handlers ─────────────────────────────────────────────────────────────
  function handleCardPress(item: LibraryItem) {
    const readyVersion = item.versions.find(
      (v) => v.status === "ready" && v.audioId && v.audioUrl,
    );
    if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
      return;
    }
    const playable: PlayableItem = {
      id: readyVersion.audioId,
      title: item.title,
      duration: readyVersion.durationSecs ?? readyVersion.targetDuration * 60,
      format: readyVersion.format,
      audioUrl: readyVersion.audioUrl,
      author: item.author,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      contentType: readyVersion.contentType,
      themes: readyVersion.themes,
      summary: readyVersion.summary,
      targetDuration: readyVersion.targetDuration,
      wordCount: item.wordCount,
      compressionRatio: readyVersion.compressionRatio,
      voices: readyVersion.voices,
      ttsProvider: readyVersion.ttsProvider,
      createdAt: item.createdAt,
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

  // ── Combined filter pipeline ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // Search overrides filter/sort — show flat results
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

  const hasSections = sections.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Library</Text>
        <View className="flex-row gap-1 items-center">
          {/* Sort icon */}
          <TouchableOpacity
            onPress={handleSortPress}
            className="p-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Sort episodes"
          >
            <Ionicons name="funnel-outline" size={20} color="#374151" />
          </TouchableOpacity>
          {/* Settings gear */}
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            className="p-2 -mr-1"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
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

      {/* ── Filter chips row ─────────────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-3"
        contentContainerClassName="px-4 gap-2"
      >
        {/* Toggle chips */}
        {TOGGLE_FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
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

        {/* Divider */}
        <View className="w-px bg-gray-200 mx-1 self-stretch" />

        {/* Sources dropdown chip */}
        <TouchableOpacity
          onPress={handleSourceFilterPress}
          className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${
            sourceFilter ? "bg-brand" : "bg-gray-100"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              sourceFilter ? "text-white" : "text-gray-700"
            }`}
          >
            {sourceFilter ?? "Sources"}
          </Text>
          <Ionicons
            name={sourceFilter ? "close-circle" : "chevron-down"}
            size={13}
            color={sourceFilter ? "white" : "#9CA3AF"}
          />
        </TouchableOpacity>

        {/* Topics dropdown chip */}
        <TouchableOpacity
          onPress={handleTopicFilterPress}
          className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${
            topicFilter ? "bg-brand" : "bg-gray-100"
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              topicFilter ? "text-white" : "text-gray-700"
            }`}
          >
            {topicFilter ?? "Topics"}
          </Text>
          <Ionicons
            name={topicFilter ? "close-circle" : "chevron-down"}
            size={13}
            color={topicFilter ? "white" : "#9CA3AF"}
          />
        </TouchableOpacity>
      </ScrollView>

      {/* ── Episode list ─────────────────────────────────────────────────────── */}
      {isSearching ? (
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
          renderItem={({ item }) => (
            <EpisodeCard
              item={item}
              onPress={handleCardPress}
              onVersionPress={handleVersionPress}
              currentAudioId={player.currentItem?.id ?? null}
              onNewVersion={setNewVersionEpisode}
            />
          )}
          renderSectionHeader={({ section: { title } }) =>
            title ? (
              <View className="px-4 pt-5 pb-1">
                <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {title}
                </Text>
              </View>
            ) : null
          }
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 112 }}
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
                icon="filter-outline"
                title="No episodes match"
                subtitle="Try a different filter or clear Sources / Topics"
              />
            )
          }
        />
      )}

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => setUploadModalVisible(true)}
        className="absolute bottom-8 right-6 w-14 h-14 bg-brand rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 6 }}
        accessibilityLabel="Add content"
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* ── Upload Modal ─────────────────────────────────────────────────────── */}
      <UploadModal
        visible={uploadModalVisible}
        onDismiss={() => setUploadModalVisible(false)}
      />

      {/* ── New Version Sheet ────────────────────────────────────────────────── */}
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
```

## Files to Modify

| File | Change |
|------|--------|
| `native/lib/libraryHelpers.ts` | Add `SortOrder` type, `groupByTimePeriod()`, `sortEpisodes()`; add `"active"` case to `filterEpisodes()` |
| `native/lib/types.ts` | Add `"active"` to `LibraryFilter` union |
| `native/app/(tabs)/library.tsx` | Full rewrite: `SectionList`, sort control, source/topic dropdown chips, combined filter pipeline |

## Tests

**File:** `native/lib/libraryHelpers.test.ts` (create if absent)

```typescript
import {
  groupByTimePeriod,
  sortEpisodes,
  filterEpisodes,
} from "./libraryHelpers";
import type { LibraryItem } from "./types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<LibraryItem> & { id: string }): LibraryItem {
  return {
    id: overrides.id,
    title: overrides.title ?? `Episode ${overrides.id}`,
    author: overrides.author ?? null,
    sourceType: overrides.sourceType ?? "url",
    sourceUrl: overrides.sourceUrl ?? null,
    wordCount: overrides.wordCount ?? 500,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    versions: overrides.versions ?? [],
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ── groupByTimePeriod ─────────────────────────────────────────────────────────

describe("groupByTimePeriod", () => {
  it("puts today's items in Today section", () => {
    const item = makeItem({ id: "1", createdAt: new Date().toISOString() });
    const sections = groupByTimePeriod([item]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.title).toBe("Today");
    expect(sections[0]!.data).toHaveLength(1);
  });

  it("puts 3-day-old items in This Week section", () => {
    const item = makeItem({ id: "2", createdAt: daysAgo(3) });
    const sections = groupByTimePeriod([item]);
    expect(sections[0]!.title).toBe("This Week");
  });

  it("puts 8-day-old items in Earlier section", () => {
    const item = makeItem({ id: "3", createdAt: daysAgo(8) });
    const sections = groupByTimePeriod([item]);
    expect(sections[0]!.title).toBe("Earlier");
  });

  it("omits empty sections", () => {
    const item = makeItem({ id: "4", createdAt: daysAgo(10) });
    const sections = groupByTimePeriod([item]);
    expect(sections.every((s) => s.data.length > 0)).toBe(true);
    expect(sections.find((s) => s.title === "Today")).toBeUndefined();
    expect(sections.find((s) => s.title === "This Week")).toBeUndefined();
  });

  it("returns empty array for empty input", () => {
    expect(groupByTimePeriod([])).toEqual([]);
  });

  it("places items in correct sections when all three are populated", () => {
    const todayItem = makeItem({ id: "a", createdAt: new Date().toISOString() });
    const weekItem = makeItem({ id: "b", createdAt: daysAgo(2) });
    const oldItem = makeItem({ id: "c", createdAt: daysAgo(14) });
    const sections = groupByTimePeriod([todayItem, weekItem, oldItem]);
    expect(sections).toHaveLength(3);
    expect(sections.map((s) => s.title)).toEqual(["Today", "This Week", "Earlier"]);
  });
});

// ── sortEpisodes ──────────────────────────────────────────────────────────────

describe("sortEpisodes", () => {
  const items: LibraryItem[] = [
    makeItem({ id: "1", title: "Zebra", createdAt: "2024-01-01T00:00:00Z" }),
    makeItem({ id: "2", title: "Apple", createdAt: "2024-03-01T00:00:00Z" }),
    makeItem({ id: "3", title: "Mango", createdAt: "2024-02-01T00:00:00Z" }),
  ];

  it("sorts date_desc: newest first", () => {
    const sorted = sortEpisodes(items, "date_desc");
    expect(sorted.map((i) => i.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts date_asc: oldest first", () => {
    const sorted = sortEpisodes(items, "date_asc");
    expect(sorted.map((i) => i.id)).toEqual(["1", "3", "2"]);
  });

  it("sorts title_asc alphabetically", () => {
    const sorted = sortEpisodes(items, "title_asc");
    expect(sorted.map((i) => i.title)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("does not mutate the input array", () => {
    const original = [...items];
    sortEpisodes(items, "title_asc");
    expect(items).toEqual(original);
  });
});

// ── filterEpisodes (active case) ──────────────────────────────────────────────

describe("filterEpisodes — active", () => {
  it("includes items with at least one ready, incomplete version", () => {
    const item = makeItem({
      id: "1",
      versions: [{ status: "ready", completed: false } as never],
    });
    expect(filterEpisodes([item], "active")).toHaveLength(1);
  });

  it("excludes items where all versions are completed", () => {
    const item = makeItem({
      id: "2",
      versions: [{ status: "ready", completed: true } as never],
    });
    expect(filterEpisodes([item], "active")).toHaveLength(0);
  });

  it("excludes items with no ready versions", () => {
    const item = makeItem({
      id: "3",
      versions: [{ status: "generating", completed: false } as never],
    });
    expect(filterEpisodes([item], "active")).toHaveLength(0);
  });
});
```

## Success Criteria

```bash
# Type check
cd native && npx tsc --noEmit
# Expect: no errors

# Run unit tests
cd native && npx jest lib/libraryHelpers.test.ts --no-coverage
# Expect: all tests pass
```

Manual checklist:
- [ ] Library launches showing "Active" filter selected by default
- [ ] Episodes grouped into Today / This Week / Earlier with section headers
- [ ] Sort icon (funnel) in header opens ActionSheet; list re-orders correctly
- [ ] "Sources ▾" chip opens ActionSheet listing real domains from library
- [ ] Selecting a source turns chip orange; list filters; tapping orange chip clears filter
- [ ] "Topics ▾" chip lists themes from episode `themes` arrays
- [ ] Topic filter works the same as source filter
- [ ] Source and topic filters stack (both can be active simultaneously)
- [ ] Search query shows flat results (no section headers) and still clears correctly
- [ ] Pull-to-refresh still works; FAB still opens UploadModal
