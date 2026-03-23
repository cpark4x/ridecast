# Feature: Source & Author Following

> Follow your favorite sources and authors — get a dedicated "Following" feed in the library and a management screen to see what you're tracking.

## Motivation

Users have favorite sources (ESPN, NYT, specific blogs) and authors they trust. Right now there's no way to filter by who made the content or to signal interest. A following system turns Ridecast from a passive document player into a personalized listening feed — and enables future features like "auto-create when new article drops from followed source."

**Mockup references:**
- Source/author card bottom sheet: `docs/mockups/discovery/source-author-card.html`
- Following management screen: `docs/mockups/discovery/following-screen.html`

## Scope

- **New SQLite tables** for followed sources and authors (local only — no server sync)
- **SourceCard bottom sheet** — tapping the source icon on any episode card
- **AuthorCard bottom sheet** — reachable from SourceCard's author list with breadcrumb back
- **`"following"` filter chip** — filters library to episodes from followed sources/authors
- **Following management screen** — `/following` route from library header heart icon
- **No** push notifications for new content from followed sources
- **No** server-side following sync — purely local SQLite
- **No** suggested sources to follow — manual only via episode interaction
- **No** follower counts or social features

## Changes

### 1. New SQLite tables — `native/lib/db.ts`

Add two tables inside the existing `migrate()` function.

**Before** (`native/lib/db.ts`, inside `migrate()`):
```typescript
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS episodes (
      content_id    TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      author        TEXT,
      source_type   TEXT NOT NULL,
      source_url    TEXT,
      word_count    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      json_versions TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS playback (
      audio_id   TEXT PRIMARY KEY,
      position   REAL NOT NULL DEFAULT 0,
      speed      REAL NOT NULL DEFAULT 1.0,
      completed  INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS downloads (
      audio_id   TEXT PRIMARY KEY,
      local_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
```

**After** — append new tables:
```typescript
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS episodes (
      content_id    TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      author        TEXT,
      source_type   TEXT NOT NULL,
      source_url    TEXT,
      word_count    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      json_versions TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS playback (
      audio_id   TEXT PRIMARY KEY,
      position   REAL NOT NULL DEFAULT 0,
      speed      REAL NOT NULL DEFAULT 1.0,
      completed  INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS downloads (
      audio_id   TEXT PRIMARY KEY,
      local_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS followed_sources (
      source_domain  TEXT PRIMARY KEY,
      source_name    TEXT NOT NULL,
      brand_color    TEXT,
      followed_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS followed_authors (
      author_name    TEXT PRIMARY KEY,
      primary_source TEXT,
      followed_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
```

### 2. DB helpers for following — `native/lib/db.ts`

Append to the bottom of `native/lib/db.ts` (after `deleteDownloadRecord`):

```typescript
// --- Following ---

export interface FollowedSource {
  source_domain: string;
  source_name: string;
  brand_color: string | null;
  followed_at: string;
}

export interface FollowedAuthor {
  author_name: string;
  primary_source: string | null;
  followed_at: string;
}

export async function followSource(
  domain: string,
  name: string,
  brandColor?: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO followed_sources (source_domain, source_name, brand_color) VALUES (?, ?, ?)`,
    domain,
    name,
    brandColor ?? null,
  );
}

export async function unfollowSource(domain: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM followed_sources WHERE source_domain = ?`, domain);
}

export async function isSourceFollowed(domain: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ source_domain: string }>(
    `SELECT source_domain FROM followed_sources WHERE source_domain = ?`,
    domain,
  );
  return !!row;
}

export async function getAllFollowedSources(): Promise<FollowedSource[]> {
  const db = await getDb();
  return db.getAllAsync<FollowedSource>(
    `SELECT * FROM followed_sources ORDER BY followed_at DESC`,
  );
}

export async function followAuthor(
  name: string,
  primarySource?: string,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO followed_authors (author_name, primary_source) VALUES (?, ?)`,
    name,
    primarySource ?? null,
  );
}

export async function unfollowAuthor(name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM followed_authors WHERE author_name = ?`, name);
}

export async function isAuthorFollowed(name: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ author_name: string }>(
    `SELECT author_name FROM followed_authors WHERE author_name = ?`,
    name,
  );
  return !!row;
}

export async function getAllFollowedAuthors(): Promise<FollowedAuthor[]> {
  const db = await getDb();
  return db.getAllAsync<FollowedAuthor>(
    `SELECT * FROM followed_authors ORDER BY followed_at DESC`,
  );
}
```

### 3. Type additions — `native/lib/types.ts`

**Before:**
```typescript
export type LibraryFilter = "all" | "in_progress" | "completed" | "generating";
```

**After:**
```typescript
export type LibraryFilter = "all" | "following" | "in_progress" | "completed" | "generating";
```

The `FollowedSource` and `FollowedAuthor` interfaces now live in `native/lib/db.ts` and are re-exported from there (no separate types needed since they're DB-shaped).

### 4. Following filter in `native/lib/libraryHelpers.ts`

**Before** (the `filterEpisodes` function signature and `switch`):
```typescript
export function filterEpisodes(
  items: LibraryItem[],
  filter: LibraryFilter,
): LibraryItem[] {
  switch (filter) {
    case "in_progress": ...
    case "completed":   ...
    case "generating":  ...
    default:            return items;
  }
}
```

**After:**
```typescript
export interface FollowingContext {
  followedDomains: Set<string>;
  followedAuthors: Set<string>;
}

export function filterEpisodes(
  items: LibraryItem[],
  filter: LibraryFilter,
  followingCtx?: FollowingContext,
): LibraryItem[] {
  switch (filter) {
    case "following": {
      if (!followingCtx) return items;
      return items.filter((item) => {
        const domain = item.sourceUrl
          ? (() => {
              try {
                return new URL(item.sourceUrl).hostname.replace(/^www\./, "");
              } catch {
                return item.sourceType;
              }
            })()
          : item.sourceType;
        return (
          followingCtx.followedDomains.has(domain) ||
          (item.author != null && followingCtx.followedAuthors.has(item.author))
        );
      });
    }
    case "in_progress": ...
    case "completed":   ...
    case "generating":  ...
    default:            return items;
  }
}
```

### 5. SourceCard bottom sheet — `native/components/SourceCard.tsx` (new)

```tsx
// native/components/SourceCard.tsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  isSourceFollowed,
  followSource,
  unfollowSource,
} from "../lib/db";
import type { LibraryItem } from "../lib/types";

interface SourceCardProps {
  visible: boolean;
  onDismiss: () => void;
  sourceDomain: string;   // e.g. "espn.com" or "pdf"
  sourceName: string;     // display name e.g. "ESPN"
  sourceType: string;     // "url" | "pdf" | etc.
  brandColor?: string;    // optional tint for source icon
  episodes: LibraryItem[];
  onViewAuthor: (authorName: string, primarySource: string) => void;
}

export default function SourceCard({
  visible,
  onDismiss,
  sourceDomain,
  sourceName,
  sourceType,
  brandColor = "#374151",
  episodes,
  onViewAuthor,
}: SourceCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (visible) {
      isSourceFollowed(sourceDomain).then(setIsFollowing).catch(() => {});
    }
  }, [visible, sourceDomain]);

  async function handleToggleFollow() {
    try {
      if (isFollowing) {
        await unfollowSource(sourceDomain);
        setIsFollowing(false);
      } else {
        await followSource(sourceDomain, sourceName, brandColor);
        setIsFollowing(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn("[SourceCard] follow toggle error:", err);
    }
  }

  // Aggregate authors from these episodes
  const authorCounts = episodes.reduce<Record<string, number>>((acc, e) => {
    if (e.author) acc[e.author] = (acc[e.author] ?? 0) + 1;
    return acc;
  }, {});
  const authors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]);

  const episodeCount = episodes.length;
  const recentEpisodes = episodes.slice(0, 3);

  // Avatar letter(s) for source icon
  const initials = sourceName.slice(0, 2).toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onDismiss}
      />

      {/* Sheet */}
      <View className="bg-white rounded-t-3xl overflow-hidden">
        {/* Drag handle */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 rounded-full bg-gray-300" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        >
          {/* Source header */}
          <View className="flex-row items-center gap-4 pt-3 pb-4">
            <View
              className="w-14 h-14 rounded-2xl items-center justify-center"
              style={{ backgroundColor: brandColor }}
            >
              <Text className="text-xl font-black text-white">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{sourceName}</Text>
              <Text className="text-sm text-gray-500">
                {sourceDomain} · {episodeCount} episode{episodeCount !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          {/* Follow button */}
          <TouchableOpacity
            onPress={handleToggleFollow}
            className={`flex-row items-center justify-center gap-2 py-3 rounded-2xl mb-5 ${
              isFollowing ? "bg-brand" : "border border-brand"
            }`}
          >
            <Ionicons
              name={isFollowing ? "heart" : "heart-outline"}
              size={18}
              color={isFollowing ? "white" : "#EA580C"}
            />
            <Text
              className={`text-base font-semibold ${
                isFollowing ? "text-white" : "text-brand"
              }`}
            >
              {isFollowing ? `Following ${sourceName}` : `Follow ${sourceName}`}
            </Text>
          </TouchableOpacity>

          {/* Authors from this source */}
          {authors.length > 0 && (
            <>
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Authors from {sourceName}
              </Text>
              <View className="bg-gray-50 rounded-2xl overflow-hidden mb-5">
                {authors.slice(0, 5).map(([author, count], idx) => (
                  <React.Fragment key={author}>
                    {idx > 0 && <View className="h-px bg-gray-100 mx-4" />}
                    <TouchableOpacity
                      onPress={() => onViewAuthor(author, sourceDomain)}
                      className="flex-row items-center justify-between px-4 py-3"
                    >
                      {/* Avatar */}
                      <View className="w-9 h-9 rounded-full bg-gray-300 items-center justify-center mr-3">
                        <Text className="text-xs font-bold text-gray-600">
                          {author
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900">
                          {author}
                        </Text>
                        <Text className="text-xs text-gray-400">
                          {count} episode{count !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            </>
          )}

          {/* Recent episodes */}
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Recent from {sourceName}
          </Text>
          <View className="bg-gray-50 rounded-2xl overflow-hidden">
            {recentEpisodes.map((ep, idx) => (
              <React.Fragment key={ep.id}>
                {idx > 0 && <View className="h-px bg-gray-100 mx-4" />}
                <View className="flex-row items-center px-4 py-3 gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-900" numberOfLines={2}>
                      {ep.title}
                    </Text>
                    {ep.versions[0]?.targetDuration && (
                      <Text className="text-xs text-gray-400 mt-0.5">
                        {ep.versions[0].targetDuration} min
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                </View>
              </React.Fragment>
            ))}
            {episodeCount > 3 && (
              <>
                <View className="h-px bg-gray-100 mx-4" />
                <TouchableOpacity onPress={onDismiss} className="px-4 py-3">
                  <Text className="text-sm font-semibold text-brand">
                    View all {episodeCount} episodes →
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
```

### 6. AuthorCard bottom sheet — `native/components/AuthorCard.tsx` (new)

```tsx
// native/components/AuthorCard.tsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { isAuthorFollowed, followAuthor, unfollowAuthor } from "../lib/db";
import type { LibraryItem } from "../lib/types";

interface AuthorCardProps {
  visible: boolean;
  onDismiss: () => void;
  onBack: () => void;              // Back to SourceCard
  authorName: string;
  primarySource: string;           // Domain of source, e.g. "espn.com"
  sourceName: string;              // Display name, e.g. "ESPN"
  sourceBrandColor?: string;
  episodes: LibraryItem[];         // All episodes by this author
}

export default function AuthorCard({
  visible,
  onDismiss,
  onBack,
  authorName,
  primarySource,
  sourceName,
  sourceBrandColor = "#374151",
  episodes,
}: AuthorCardProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (visible) {
      isAuthorFollowed(authorName).then(setIsFollowing).catch(() => {});
    }
  }, [visible, authorName]);

  async function handleToggleFollow() {
    try {
      if (isFollowing) {
        await unfollowAuthor(authorName);
        setIsFollowing(false);
      } else {
        await followAuthor(authorName, primarySource);
        setIsFollowing(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.warn("[AuthorCard] follow toggle error:", err);
    }
  }

  const initials = authorName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sourceInitials = sourceName.slice(0, 2).toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onBack}
    >
      {/* Backdrop */}
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onDismiss}
      />

      {/* Sheet */}
      <View className="bg-white rounded-t-3xl overflow-hidden">
        {/* Drag handle */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 rounded-full bg-gray-300" />
        </View>

        {/* Breadcrumb back to source */}
        <TouchableOpacity
          onPress={onBack}
          className="flex-row items-center px-5 py-2 gap-1"
        >
          <Ionicons name="chevron-back" size={16} color="#EA580C" />
          <Text className="text-sm font-medium text-brand">{sourceName}</Text>
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 36 }}
        >
          {/* Author header */}
          <View className="flex-row items-center gap-4 pt-2 pb-4">
            <View className="w-14 h-14 rounded-full bg-gray-200 items-center justify-center">
              <Text className="text-xl font-bold text-gray-600">{initials}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{authorName}</Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <View
                  className="w-4 h-4 rounded items-center justify-center"
                  style={{ backgroundColor: sourceBrandColor }}
                >
                  <Text className="text-[8px] font-black text-white">
                    {sourceInitials}
                  </Text>
                </View>
                <Text className="text-sm text-gray-500">{sourceName}</Text>
              </View>
            </View>
          </View>

          {/* Stats */}
          <Text className="text-sm text-gray-400 mb-4">
            {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
          </Text>

          {/* Follow button */}
          <TouchableOpacity
            onPress={handleToggleFollow}
            className={`flex-row items-center justify-center gap-2 py-3 rounded-2xl mb-5 ${
              isFollowing ? "bg-brand" : "border border-brand"
            }`}
          >
            <Ionicons
              name={isFollowing ? "heart" : "heart-outline"}
              size={18}
              color={isFollowing ? "white" : "#EA580C"}
            />
            <Text
              className={`text-base font-semibold ${
                isFollowing ? "text-white" : "text-brand"
              }`}
            >
              {isFollowing ? `Following ${authorName}` : `Follow ${authorName}`}
            </Text>
          </TouchableOpacity>

          {/* Episodes by this author */}
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Episodes by {authorName}
          </Text>
          <View className="bg-gray-50 rounded-2xl overflow-hidden">
            {episodes.map((ep, idx) => (
              <React.Fragment key={ep.id}>
                {idx > 0 && <View className="h-px bg-gray-100 mx-4" />}
                <View className="flex-row items-center px-4 py-3 gap-3">
                  <View className="flex-1">
                    <Text
                      className="text-sm font-medium text-gray-900"
                      numberOfLines={2}
                    >
                      {ep.title}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {sourceName}
                      {ep.versions[0]?.targetDuration
                        ? ` · ${ep.versions[0].targetDuration} min`
                        : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                </View>
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
```

### 7. EpisodeCard — wire `onSourceTap` prop

**Before** in `native/components/EpisodeCard.tsx` (source icon area):
```tsx
<SourceIcon sourceType={item.sourceType} size="md" />
```

**After:**
```tsx
interface EpisodeCardProps {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
  onVersionPress: (item: LibraryItem, version: AudioVersion, playable: PlayableItem) => void;
  currentAudioId: string | null;
  onNewVersion: (item: LibraryItem) => void;
  onSourceTap?: (item: LibraryItem) => void;   // ← add this
}

// Wrap the icon:
<TouchableOpacity
  onPress={() => onSourceTap?.(item)}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  disabled={!onSourceTap}
>
  <SourceIcon sourceType={item.sourceType} size="md" />
</TouchableOpacity>
```

### 8. Following management screen — `native/app/following.tsx` (new)

```tsx
// native/app/following.tsx
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import {
  getAllFollowedSources,
  getAllFollowedAuthors,
  unfollowSource,
  unfollowAuthor,
  type FollowedSource,
  type FollowedAuthor,
} from "../lib/db";

type Tab = "sources" | "authors";

export default function FollowingScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("sources");
  const [sources, setSources] = useState<FollowedSource[]>([]);
  const [authors, setAuthors] = useState<FollowedAuthor[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData() {
    try {
      const [s, a] = await Promise.all([
        getAllFollowedSources(),
        getAllFollowedAuthors(),
      ]);
      setSources(s);
      setAuthors(a);
    } catch (err) {
      console.warn("[following] loadData error:", err);
    }
  }

  function handleUnfollowSource(source: FollowedSource) {
    Alert.alert(
      `Unfollow ${source.source_name}?`,
      "Episodes from this source will no longer appear in your Following feed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unfollow",
          style: "destructive",
          onPress: async () => {
            await unfollowSource(source.source_domain);
            setSources((prev) =>
              prev.filter((s) => s.source_domain !== source.source_domain),
            );
          },
        },
      ],
    );
  }

  function handleUnfollowAuthor(author: FollowedAuthor) {
    Alert.alert(
      `Unfollow ${author.author_name}?`,
      "Episodes from this author will no longer appear in your Following feed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unfollow",
          style: "destructive",
          onPress: async () => {
            await unfollowAuthor(author.author_name);
            setAuthors((prev) =>
              prev.filter((a) => a.author_name !== author.author_name),
            );
          },
        },
      ],
    );
  }

  const filteredSources = sources.filter(
    (s) =>
      s.source_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.source_domain.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredAuthors = authors.filter((a) =>
    a.author_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color="#EA580C" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Following</Text>
        <View className="w-8" />
      </View>

      {/* Search */}
      <View className="mx-4 mb-3 flex-row items-center bg-gray-200/60 rounded-xl px-3 py-2 gap-2">
        <Ionicons name="search" size={15} color="#8E8E93" />
        <TextInput
          className="flex-1 text-base text-gray-900"
          placeholder="Search sources and authors…"
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Segment control */}
      <View className="mx-4 mb-3 flex-row bg-gray-200/60 rounded-xl p-1 gap-1">
        {(["sources", "authors"] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg items-center ${
              tab === t ? "bg-white shadow-sm" : ""
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                tab === t ? "text-gray-900" : "text-gray-500"
              }`}
            >
              {t === "sources"
                ? `Sources (${sources.length})`
                : `Authors (${authors.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {tab === "sources" ? (
        <FlatList
          data={filteredSources}
          keyExtractor={(item) => item.source_domain}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-2 gap-3">
              <View
                className="w-11 h-11 rounded-xl items-center justify-center"
                style={{ backgroundColor: item.brand_color ?? "#374151" }}
              >
                <Text className="text-sm font-black text-white">
                  {item.source_name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {item.source_name}
                </Text>
                <Text className="text-xs text-gray-400">{item.source_domain}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleUnfollowSource(item)}
                className="px-3 py-1.5 border border-gray-200 rounded-full"
              >
                <Text className="text-sm text-gray-500 font-medium">Unfollow</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="heart-outline" size={40} color="#D1D5DB" />
              <Text className="text-base font-semibold text-gray-400 mt-3">
                No sources followed
              </Text>
              <Text className="text-sm text-gray-400 mt-1 text-center px-8">
                Tap the source icon on any episode card to follow a source
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredAuthors}
          keyExtractor={(item) => item.author_name}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 mb-2 gap-3">
              <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center">
                <Text className="text-sm font-bold text-gray-600">
                  {item.author_name
                    .split(" ")
                    .map((w: string) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {item.author_name}
                </Text>
                {item.primary_source && (
                  <Text className="text-xs text-gray-400">{item.primary_source}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleUnfollowAuthor(item)}
                className="px-3 py-1.5 border border-gray-200 rounded-full"
              >
                <Text className="text-sm text-gray-500 font-medium">Unfollow</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Ionicons name="person-outline" size={40} color="#D1D5DB" />
              <Text className="text-base font-semibold text-gray-400 mt-3">
                No authors followed
              </Text>
              <Text className="text-sm text-gray-400 mt-1 text-center px-8">
                Tap a source card's author list to follow an author
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
```

### 9. Wire SourceCard into library — `native/app/(tabs)/library.tsx`

**Before** (header icons area):
```tsx
<TouchableOpacity
  onPress={() => router.push("/settings")}
  className="p-2 -mr-1"
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
>
  <Ionicons name="settings-outline" size={22} color="#374151" />
</TouchableOpacity>
```

**After** — add Following icon before Settings:
```tsx
<View className="flex-row items-center gap-1">
  <TouchableOpacity
    onPress={() => router.push("/following")}
    className="p-2"
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name="heart-outline" size={22} color="#374151" />
  </TouchableOpacity>
  <TouchableOpacity
    onPress={() => router.push("/settings")}
    className="p-2 -mr-1"
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <Ionicons name="settings-outline" size={22} color="#374151" />
  </TouchableOpacity>
</View>
```

**Before** (FILTERS array):
```typescript
const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "generating", label: "Generating" },
];
```

**After:**
```typescript
const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "following", label: "♥ Following" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "generating", label: "Generating" },
];
```

**Add to `LibraryScreen` state and effects:**
```typescript
import {
  getAllFollowedSources,
  getAllFollowedAuthors,
} from "../../lib/db";
import SourceCard from "../../components/SourceCard";
import AuthorCard from "../../components/AuthorCard";
import type { FollowingContext } from "../../lib/libraryHelpers";

// State additions:
const [sourceCardItem, setSourceCardItem] = useState<LibraryItem | null>(null);
const [authorCardInfo, setAuthorCardInfo] = useState<{
  authorName: string;
  primarySource: string;
  sourceName: string;
  episodes: LibraryItem[];
} | null>(null);
const [followingCtx, setFollowingCtx] = useState<FollowingContext>({
  followedDomains: new Set(),
  followedAuthors: new Set(),
});

// Load following context whenever screen focuses:
useFocusEffect(
  useCallback(() => {
    loadFollowingCtx();
  }, []),
);

async function loadFollowingCtx() {
  try {
    const [srcs, auths] = await Promise.all([
      getAllFollowedSources(),
      getAllFollowedAuthors(),
    ]);
    setFollowingCtx({
      followedDomains: new Set(srcs.map((s) => s.source_domain)),
      followedAuthors: new Set(auths.map((a) => a.author_name)),
    });
  } catch (err) {
    console.warn("[library] loadFollowingCtx error:", err);
  }
}

function handleSourceTap(item: LibraryItem) {
  setSourceCardItem(item);
}

function handleViewAuthor(authorName: string, primarySource: string) {
  // Find all episodes by this author
  const authorEpisodes = episodes.filter((e) => e.author === authorName);
  const sourceName =
    sourceCardItem
      ? (sourceCardItem.sourceUrl
          ? (() => { try { return new URL(sourceCardItem.sourceUrl!).hostname.replace(/^www\./, ""); } catch { return sourceCardItem.sourceType; } })()
          : sourceCardItem.sourceType)
      : primarySource;
  setAuthorCardInfo({ authorName, primarySource, sourceName, episodes: authorEpisodes });
}

// Update filterEpisodes call:
const filtered = filterEpisodes(episodes, filter, followingCtx);
```

**Add SourceCard and AuthorCard to render (after NewVersionSheet):**
```tsx
{/* Source Card */}
{sourceCardItem && (
  <SourceCard
    visible={!!sourceCardItem}
    onDismiss={() => setSourceCardItem(null)}
    sourceDomain={
      sourceCardItem.sourceUrl
        ? (() => { try { return new URL(sourceCardItem.sourceUrl).hostname.replace(/^www\./, ""); } catch { return sourceCardItem.sourceType; } })()
        : sourceCardItem.sourceType
    }
    sourceName={sourceCardItem.sourceType.toUpperCase()}
    sourceType={sourceCardItem.sourceType}
    episodes={episodes.filter(
      (e) => e.sourceType === sourceCardItem.sourceType ||
             (e.sourceUrl && sourceCardItem.sourceUrl &&
              (() => { try { return new URL(e.sourceUrl!).hostname === new URL(sourceCardItem.sourceUrl!).hostname; } catch { return false; } })())
    )}
    onViewAuthor={handleViewAuthor}
  />
)}

{/* Author Card */}
{authorCardInfo && (
  <AuthorCard
    visible={!!authorCardInfo}
    onDismiss={() => { setAuthorCardInfo(null); setSourceCardItem(null); }}
    onBack={() => setAuthorCardInfo(null)}
    authorName={authorCardInfo.authorName}
    primarySource={authorCardInfo.primarySource}
    sourceName={authorCardInfo.sourceName}
    episodes={authorCardInfo.episodes}
  />
)}
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/lib/db.ts` | Add `followed_sources`, `followed_authors` tables to `migrate()`; append CRUD helpers + `FollowedSource`/`FollowedAuthor` interfaces |
| `native/lib/types.ts` | Add `"following"` to `LibraryFilter` |
| `native/lib/libraryHelpers.ts` | Add `FollowingContext` interface; add `"following"` case to `filterEpisodes()` with optional context param |
| `native/components/SourceCard.tsx` | **New** — source bottom sheet |
| `native/components/AuthorCard.tsx` | **New** — author bottom sheet with breadcrumb back |
| `native/components/EpisodeCard.tsx` | Add `onSourceTap?` prop; wrap SourceIcon in `TouchableOpacity` |
| `native/app/following.tsx` | **New** — following management screen |
| `native/app/(tabs)/library.tsx` | Add "♥ Following" filter chip; add heart icon in header linking to `/following`; wire SourceCard/AuthorCard state; pass `followingCtx` to `filterEpisodes` |

## Tests

```typescript
// native/__tests__/following.test.ts
import { getDb, setDb } from "../lib/db";
import * as db from "../lib/db";
import * as SQLite from "expo-sqlite";

jest.mock("expo-sqlite");
jest.mock("expo-haptics");

describe("following DB helpers", () => {
  beforeEach(async () => {
    // Use in-memory DB for tests
    const mockDb = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue(undefined),
      getFirstAsync: jest.fn(),
      getAllAsync: jest.fn().mockResolvedValue([]),
    };
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
    setDb(mockDb as unknown as SQLite.SQLiteDatabase);
  });

  describe("followSource / unfollowSource / isSourceFollowed", () => {
    it("follows a source", async () => {
      const mockDb = await getDb();
      await db.followSource("espn.com", "ESPN", "#D00000");
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR IGNORE INTO followed_sources"),
        "espn.com",
        "ESPN",
        "#D00000",
      );
    });

    it("returns true for followed source", async () => {
      const mockDb = await getDb();
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValueOnce({
        source_domain: "espn.com",
      });
      const result = await db.isSourceFollowed("espn.com");
      expect(result).toBe(true);
    });

    it("returns false for unfollowed source", async () => {
      const mockDb = await getDb();
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValueOnce(null);
      const result = await db.isSourceFollowed("nytimes.com");
      expect(result).toBe(false);
    });

    it("unfollows a source", async () => {
      const mockDb = await getDb();
      await db.unfollowSource("espn.com");
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM followed_sources"),
        "espn.com",
      );
    });
  });

  describe("followAuthor / unfollowAuthor / isAuthorFollowed", () => {
    it("follows an author", async () => {
      const mockDb = await getDb();
      await db.followAuthor("Paul Graham", "substack.com");
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR IGNORE INTO followed_authors"),
        "Paul Graham",
        "substack.com",
      );
    });

    it("returns true for followed author", async () => {
      const mockDb = await getDb();
      (mockDb.getFirstAsync as jest.Mock).mockResolvedValueOnce({
        author_name: "Paul Graham",
      });
      const result = await db.isAuthorFollowed("Paul Graham");
      expect(result).toBe(true);
    });
  });
});

// native/__tests__/libraryHelpers.following.test.ts
import { filterEpisodes } from "../lib/libraryHelpers";
import type { LibraryItem } from "../lib/types";

const makeItem = (id: string, overrides: Partial<LibraryItem> = {}): LibraryItem => ({
  id,
  title: `Episode ${id}`,
  author: null,
  sourceType: "url",
  sourceUrl: null,
  createdAt: new Date().toISOString(),
  wordCount: 1000,
  versions: [],
  ...overrides,
});

describe("filterEpisodes – following", () => {
  const ctx = {
    followedDomains: new Set(["espn.com"]),
    followedAuthors: new Set(["Paul Graham"]),
  };

  const items: LibraryItem[] = [
    makeItem("1", { sourceUrl: "https://espn.com/nfl/article-123" }),
    makeItem("2", { author: "Paul Graham", sourceType: "url" }),
    makeItem("3", { sourceUrl: "https://nytimes.com/article" }),
    makeItem("4", { author: "Matt Levine" }),
  ];

  it("shows episodes from followed domain", () => {
    const result = filterEpisodes(items, "following", ctx);
    expect(result.map((i) => i.id)).toContain("1");
  });

  it("shows episodes from followed author", () => {
    const result = filterEpisodes(items, "following", ctx);
    expect(result.map((i) => i.id)).toContain("2");
  });

  it("excludes episodes from unfollowed domain and author", () => {
    const result = filterEpisodes(items, "following", ctx);
    expect(result.map((i) => i.id)).not.toContain("3");
    expect(result.map((i) => i.id)).not.toContain("4");
  });

  it("returns all items when context is undefined", () => {
    const result = filterEpisodes(items, "following", undefined);
    expect(result).toHaveLength(items.length);
  });
});
```

## Success Criteria

```bash
# TypeScript clean
cd native && npx tsc --noEmit
# → 0 errors

# Unit tests pass
cd native && npx jest __tests__/following.test.ts __tests__/libraryHelpers.following.test.ts --no-coverage
# → Test Suites: 2 passed

# Manual smoke test — new tables exist
cd native && npx expo start
# Open app → Library tab → no crash
# Tap source icon on episode card → SourceCard slides up
# Tap "Follow ESPN" → button turns orange/filled
# Kill and reopen app → reopen SourceCard → still shows "Following ESPN"
# Tap heart icon in Library header → /following screen with ESPN listed
# "♥ Following" chip → only ESPN episodes shown
```

- New SQLite tables created without migration errors on first launch
- SourceCard/AuthorCard slide up correctly and dismiss on backdrop tap
- Follow state persists between app sessions (stored in SQLite, survives app restart)
- "♥ Following" filter chip visible and functional
- `/following` screen reachable from library header
