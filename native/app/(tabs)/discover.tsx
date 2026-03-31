// native/app/(tabs)/discover.tsx
// Discover Main screen — For You feed, Your Topics, Recommended Sources
// Spec: specs/features/phase5/discover-screens.md (F-P5-UI-11)

import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, typography, spacing, borderRadius } from "../../lib/theme";
import { Haptics } from "../../lib/haptics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiscoveryArticle {
  id: string;
  title: string;
  sourceName: string;
  readMinutes: number;
  contextBadge: string;
  badgeCategory: "science" | "tech" | "business" | "psychology" | "fiction" | "news" | "biography";
  imageUrl?: string;
}

// isFollowed removed — follow state is derived from followedSourceIds Set at render time,
// not stored on the source object (see AC-12, avoid dead data confusion).
interface DiscoverySource {
  id: string;
  name: string;
  categoryLabel: string;
  logoColor: string;
  shortLabel: string;
}

interface DiscoveryTopic {
  id: string;
  emoji: string;
  name: string;
  newCount: number;
  categoryColor: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const FOR_YOU_ARTICLES: DiscoveryArticle[] = [
  {
    id: "fy-1",
    title: "The Next Leap in AI: What Comes After Large Language Models",
    sourceName: "MIT Technology Review",
    readMinutes: 8,
    contextBadge: "Trending in AI",
    badgeCategory: "tech",
  },
  {
    id: "fy-2",
    title: "How Your Brain Forms New Memories During Sleep",
    sourceName: "Quanta Magazine",
    readMinutes: 6,
    contextBadge: "Trending in Science",
    badgeCategory: "science",
  },
  {
    id: "fy-3",
    title: "The Hidden Psychology of Why We Procrastinate",
    sourceName: "Aeon",
    readMinutes: 9,
    contextBadge: "Trending in Psychology",
    badgeCategory: "psychology",
  },
  {
    id: "fy-4",
    title: "How Startups Are Rebuilding the News Business From Scratch",
    sourceName: "The Gradient",
    readMinutes: 11,
    contextBadge: "Trending in Business",
    badgeCategory: "business",
  },
];

const ALL_TOPICS_MAP: Record<string, { emoji: string; name: string; categoryColor: string; newCount: number }> = {
  science:     { emoji: "🧬", name: "Science",     categoryColor: colors.contentScience,  newCount: 5 },
  "ai-tech":   { emoji: "🤖", name: "AI & Tech",   categoryColor: colors.contentTech,     newCount: 8 },
  business:    { emoji: "💼", name: "Business",    categoryColor: colors.contentBusiness, newCount: 4 },
  finance:     { emoji: "💰", name: "Finance",     categoryColor: colors.contentBusiness, newCount: 3 },
  psychology:  { emoji: "🧠", name: "Psychology",  categoryColor: colors.contentFiction,  newCount: 6 },
  health:      { emoji: "🏥", name: "Health",      categoryColor: colors.contentScience,  newCount: 4 },
  design:      { emoji: "🎨", name: "Design",      categoryColor: colors.contentTech,     newCount: 3 },
  climate:     { emoji: "🌍", name: "Climate",     categoryColor: colors.contentScience,  newCount: 5 },
  space:       { emoji: "🚀", name: "Space",       categoryColor: colors.contentScience,  newCount: 2 },
  politics:    { emoji: "📰", name: "Politics",    categoryColor: colors.contentNews,     newCount: 7 },
  history:     { emoji: "📚", name: "History",     categoryColor: colors.contentNews,     newCount: 3 },
  culture:     { emoji: "🎭", name: "Culture",     categoryColor: colors.contentFiction,  newCount: 4 },
  sports:      { emoji: "⚽", name: "Sports",      categoryColor: colors.contentBusiness, newCount: 5 },
  cooking:     { emoji: "🍳", name: "Cooking",     categoryColor: colors.contentBusiness, newCount: 2 },
  parenting:   { emoji: "👶", name: "Parenting",   categoryColor: colors.contentFiction,  newCount: 3 },
  philosophy:  { emoji: "💡", name: "Philosophy",  categoryColor: colors.contentFiction,  newCount: 4 },
  law:         { emoji: "⚖️", name: "Law",         categoryColor: colors.contentNews,     newCount: 2 },
  realestate:  { emoji: "🏠", name: "Real Estate", categoryColor: colors.contentBusiness, newCount: 3 },
};

const DEFAULT_TOPIC_IDS = ["science", "ai-tech", "psychology"];

const RECOMMENDED_SOURCES: DiscoverySource[] = [
  { id: "mit",      shortLabel: "MIT",  name: "MIT Technology Review", categoryLabel: "Science · 3 new articles",    logoColor: "#0D9488" },
  { id: "ars",      shortLabel: "Ars",  name: "Ars Technica",          categoryLabel: "Technology · 5 new articles", logoColor: "#2563EB" },
  { id: "quanta",   shortLabel: "QM",   name: "Quanta Magazine",       categoryLabel: "Science · 2 new articles",    logoColor: "#7C3AED" },
  { id: "nature",   shortLabel: "Nat",  name: "Nature",                categoryLabel: "Science · 4 new articles",    logoColor: "#059669" },
  { id: "gradient", shortLabel: "TG",   name: "The Gradient",          categoryLabel: "AI & ML · 1 new article",     logoColor: "#EA580C" },
  { id: "aeon",     shortLabel: "Aeon", name: "Aeon",                  categoryLabel: "Psychology · 2 new articles", logoColor: "#DB2777" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCategoryColor(category: DiscoveryArticle["badgeCategory"]): string {
  switch (category) {
    case "science":    return colors.contentScience;
    case "tech":       return colors.contentTech;
    case "business":   return colors.contentBusiness;
    case "psychology":
    case "fiction":    return colors.contentFiction;
    case "news":       return colors.contentNews;
    case "biography":  return colors.contentBiography;
    default:           return colors.accentPrimary;
  }
}

function getCategoryLabel(category: DiscoveryArticle["badgeCategory"]): string {
  switch (category) {
    case "science":    return "SCI";
    case "tech":       return "AI";
    case "business":   return "BIZ";
    case "psychology": return "PSY";
    case "fiction":    return "LIT";
    case "news":       return "NEWS";
    case "biography":  return "BIO";
    default:           return "ART";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: typography.sizes.h1,
        fontWeight: typography.weights.semibold,
        color: colors.textPrimary,
        marginBottom: spacing.md,
      }}
    >
      {label}
    </Text>
  );
}

function ArticleCard({ article }: { article: DiscoveryArticle }) {
  const badgeColor = getCategoryColor(article.badgeCategory);
  return (
    <View
      style={{
        width: 260,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.card,
        overflow: "hidden",
      }}
    >
      {/* Image area — category color + emoji */}
      <View
        style={{
          width: "100%",
          height: 140,
          backgroundColor: badgeColor + "33",   // category color at 20% opacity
          borderTopLeftRadius: borderRadius.card,
          borderTopRightRadius: borderRadius.card,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", color: badgeColor, letterSpacing: 1 }}>{getCategoryLabel(article.badgeCategory)}</Text>
      </View>
      {/* Context badge — absolute top-left, category color at 90% opacity */}
      <View
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          backgroundColor: badgeColor + "E6",
          borderRadius: borderRadius.full,
          paddingHorizontal: 8,
          paddingVertical: 4,
        }}
      >
        <Text style={{ fontSize: typography.sizes.micro, fontWeight: typography.weights.regular, color: "#FFFFFF" }}>
          {article.contextBadge}
        </Text>
      </View>
      {/* Title */}
      <Text
        style={{
          fontSize: typography.sizes.h2,
          fontWeight: typography.weights.semibold,
          color: colors.textPrimary,
          paddingHorizontal: 12,
          paddingTop: 8,
        }}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {article.title}
      </Text>
      {/* Meta */}
      <Text
        style={{
          fontSize: typography.sizes.caption,
          fontWeight: typography.weights.regular,
          color: colors.textSecondary,
          paddingHorizontal: 12,
          paddingBottom: 12,
          marginTop: 4,
        }}
      >
        {article.sourceName} · {article.readMinutes} min read
      </Text>
      {/* Add button — absolute bottom-right */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={{
          position: "absolute",
          bottom: 8,
          right: 8,
          backgroundColor: colors.surfaceElevated,
          borderRadius: borderRadius.full,
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="add" size={16} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function TopicPill({
  topic,
  onPress,
}: {
  topic: DiscoveryTopic;
  onPress: (topic: DiscoveryTopic) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onPress(topic)}
      activeOpacity={0.8}
      style={{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.card,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Text
        style={{
          fontSize: typography.sizes.body,
          fontWeight: typography.weights.semibold,
          color: colors.textPrimary,
        }}
      >
        {topic.name}
      </Text>
      <Text
        style={{
          fontSize: typography.sizes.caption,
          fontWeight: typography.weights.regular,
          color: colors.textSecondary,
        }}
      >
        {topic.newCount} new
      </Text>
    </TouchableOpacity>
  );
}

function SourceRow({
  source,
  isFollowed,
  onToggleFollow,
}: {
  source: DiscoverySource;
  isFollowed: boolean;
  onToggleFollow: (id: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        minHeight: 60,
        gap: 12,
      }}
    >
      {/* Logo block */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: borderRadius.thumbnail,
          backgroundColor: source.logoColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>
          {source.shortLabel}
        </Text>
      </View>
      {/* Text group */}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: typography.sizes.body,
            fontWeight: typography.weights.semibold,
            color: colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {source.name}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: typography.weights.regular,
            color: colors.textSecondary,
            marginTop: 2,
          }}
          numberOfLines={1}
        >
          {source.categoryLabel}
        </Text>
      </View>
      {/* Follow button — consistent borderWidth=1 to avoid layout shift on toggle */}
      <TouchableOpacity
        onPress={() => onToggleFollow(source.id)}
        activeOpacity={0.8}
        style={{
          backgroundColor: isFollowed ? colors.accentPrimary : "transparent",
          borderWidth: 1,
          borderColor: isFollowed ? colors.accentPrimary : "#3F3F4E",
          borderRadius: borderRadius.full,
          paddingHorizontal: 16,
          paddingVertical: 6,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: typography.weights.semibold,
            color: isFollowed ? colors.textPrimary : colors.textTertiary,
          }}
        >
          {isFollowed ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// DiscoverScreen
// ---------------------------------------------------------------------------

export default function DiscoverScreen(): JSX.Element {
  const router = useRouter();
  const ftueChecked = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [followedSourceIds, setFollowedSourceIds] = useState<Set<string>>(new Set());
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(DEFAULT_TOPIC_IDS);

  // Load FTUE state and initial follow set on mount
  useEffect(() => {
    if (ftueChecked.current) return;
    ftueChecked.current = true;
    void loadInitialState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitialState() {
    try {
      // FTUE gate — redirect if not completed (AC-13)
      const completed = await AsyncStorage.getItem("discover_ftue_completed");
      if (!completed) {
        router.replace("/discover-ftue-topics");
        return;
      }
      // Load selected topics from FTUE step 1 (read-only)
      const savedTopics = await AsyncStorage.getItem("discover_ftue_selected_topics");
      if (savedTopics) {
        const parsed = JSON.parse(savedTopics) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedTopicIds(parsed);
        }
      }
      // Load followed sources from FTUE step 2 (read-only, AC-12)
      const savedFollowed = await AsyncStorage.getItem("discover_ftue_followed_sources");
      if (savedFollowed) {
        const parsed = JSON.parse(savedFollowed) as string[];
        if (Array.isArray(parsed)) {
          setFollowedSourceIds(new Set(parsed));
        }
      }
    } catch (err) {
      console.warn("[discover] loadInitialState error:", err);
    }
  }

  // Follow toggle — local state only, no AsyncStorage write (AC-12)
  function handleToggleFollow(id: string) {
    void Haptics.light();
    setFollowedSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleTopicPress(topic: DiscoveryTopic) {
    void Haptics.light();
    router.push({
      pathname: "/(tabs)/discover-topic",
      params: { topicId: topic.id, topicName: topic.name, emoji: topic.emoji },
    });
  }

  // Client-side filter — no URL detection, content discovery only (AC-7)
  const query = searchQuery.trim().toLowerCase();

  const filteredArticles = query
    ? FOR_YOU_ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.sourceName.toLowerCase().includes(query),
      )
    : FOR_YOU_ARTICLES;

  const topics: DiscoveryTopic[] = selectedTopicIds
    .filter((id) => id in ALL_TOPICS_MAP)
    .map((id) => ({ id, ...ALL_TOPICS_MAP[id] }));

  const filteredTopics = query
    ? topics.filter((t) => t.name.toLowerCase().includes(query))
    : topics;

  const filteredSources = query
    ? RECOMMENDED_SOURCES.filter((s) => s.name.toLowerCase().includes(query))
    : RECOMMENDED_SOURCES;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>

      {/* Header — title + searchbar */}
      <View style={{ paddingHorizontal: spacing.screenMargin, paddingTop: 8 }}>
        <Text
          style={{
            fontSize: typography.sizes.display,
            fontWeight: typography.weights.bold,
            color: colors.textPrimary,
            marginBottom: spacing.sm,
          }}
        >
          Discover
        </Text>

        {/* SearchBar — AC-6: surfaceElevated bg, 48px height, borderRadius.card = 10 */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.surfaceElevated,
            borderRadius: borderRadius.card,
            height: 48,
            paddingHorizontal: 12,
            gap: 8,
            marginBottom: spacing.sm,
          }}
        >
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              // Client-side filter is reactive (already applied via state),
              // no URL detection (AC-7)
            }}
            placeholder="Search topics or sources..."
            placeholderTextColor={colors.textSecondary}
            style={{
              flex: 1,
              fontSize: typography.sizes.body,
              color: colors.textPrimary,
            }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main scroll */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 180 }}
      >
        {/* ── For You (marginTop: 24 per spec §2) ── */}
        <View style={{ marginTop: 24, paddingHorizontal: spacing.screenMargin }}>
          <SectionHeader label="For You" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingLeft: spacing.screenMargin,
            paddingRight: spacing.screenMargin,
            gap: spacing.cardGap,
          }}
        >
          {filteredArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
          {filteredArticles.length === 0 && (
            <Text style={{ color: colors.textSecondary, paddingVertical: 16 }}>
              No articles match your search.
            </Text>
          )}
        </ScrollView>

        {/* ── Your Topics (marginTop: 32) ── */}
        <View style={{ marginTop: spacing.sectionGap, paddingHorizontal: spacing.screenMargin }}>
          <SectionHeader label="Your Topics" />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingLeft: spacing.screenMargin,
            paddingRight: spacing.screenMargin,
            gap: spacing.cardGap,
          }}
        >
          {filteredTopics.map((topic) => (
            <TopicPill key={topic.id} topic={topic} onPress={handleTopicPress} />
          ))}
          {filteredTopics.length === 0 && (
            <Text style={{ color: colors.textSecondary, paddingVertical: 16 }}>
              No topics match your search.
            </Text>
          )}
        </ScrollView>

        {/* ── Recommended (marginTop: 32) ── */}
        <View style={{ marginTop: spacing.sectionGap }}>
          {/* Section header row with "See all" link */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: spacing.screenMargin,
              marginBottom: spacing.md,
            }}
          >
            <Text
              style={{
                fontSize: typography.sizes.h1,
                fontWeight: typography.weights.semibold,
                color: colors.textPrimary,
              }}
            >
              Recommended
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            >
              <Text
                style={{
                  fontSize: typography.sizes.body,
                  fontWeight: typography.weights.regular,
                  color: colors.accentPrimary,
                }}
              >
                See all
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.accentPrimary} />
            </TouchableOpacity>
          </View>

          {/* Source list */}
          <View style={{ paddingHorizontal: spacing.screenMargin, gap: spacing.md }}>
            {filteredSources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                isFollowed={followedSourceIds.has(source.id)}
                onToggleFollow={handleToggleFollow}
              />
            ))}
            {filteredSources.length === 0 && (
              <Text style={{ color: colors.textSecondary }}>
                No sources match your search.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
