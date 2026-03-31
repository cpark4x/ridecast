// native/app/(tabs)/discover-topic.tsx
// Discover Topic drilldown screen — articles filtered by topic
// Spec: specs/features/phase5/discover-screens.md (F-P5-UI-11)
// AC-1: Located at native/app/(tabs)/discover-topic.tsx (inside tabs shell)

import React from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, borderRadius } from "../../lib/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TopicArticle {
  id: string;
  title: string;
  sourceName: string;
  readMinutes: number;
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// Static article data per topic
// ---------------------------------------------------------------------------

const TOPIC_ARTICLES: Record<string, TopicArticle[]> = {
  science: [
    { id: "sci-1", title: "How CRISPR Is Being Used to Treat Genetic Disease", sourceName: "Nature", readMinutes: 7 },
    { id: "sci-2", title: "Physicists Confirm a New State of Matter", sourceName: "Quanta Magazine", readMinutes: 9 },
    { id: "sci-3", title: "The Brain's Hidden Map of Space and Time", sourceName: "MIT Technology Review", readMinutes: 6 },
    { id: "sci-4", title: "Ocean Microbes and the Carbon Cycle: What We're Missing", sourceName: "Nature", readMinutes: 8 },
    { id: "sci-5", title: "When Quantum Computers Will Finally Beat Classical Ones", sourceName: "Quanta Magazine", readMinutes: 11 },
  ],
  "ai-tech": [
    { id: "ai-1", title: "The Architecture Behind GPT-4 and What Comes Next", sourceName: "The Gradient", readMinutes: 12 },
    { id: "ai-2", title: "Reinforcement Learning From Human Feedback: A Primer", sourceName: "MIT Technology Review", readMinutes: 8 },
    { id: "ai-3", title: "How AI Models Learn to Reason Step by Step", sourceName: "Ars Technica", readMinutes: 7 },
    { id: "ai-4", title: "The Open-Source LLM Ecosystem in 2025", sourceName: "The Gradient", readMinutes: 10 },
    { id: "ai-5", title: "AI Safety Research: What Alignment Actually Means", sourceName: "MIT Technology Review", readMinutes: 9 },
  ],
  business: [
    { id: "biz-1", title: "Why Every Fortune 500 Is Quietly Reorganizing Around AI", sourceName: "Harvard Business Review", readMinutes: 8 },
    { id: "biz-2", title: "The New Playbook for Building Enterprise Software", sourceName: "The Gradient", readMinutes: 7 },
    { id: "biz-3", title: "Venture Capital in 2025: Who's Getting Funded and Why", sourceName: "TechCrunch", readMinutes: 6 },
    { id: "biz-4", title: "Remote Work's Second Act: What Companies Are Actually Doing", sourceName: "Harvard Business Review", readMinutes: 9 },
  ],
  psychology: [
    { id: "psy-1", title: "The Science of Decision Fatigue and How to Fight It", sourceName: "Aeon", readMinutes: 7 },
    { id: "psy-2", title: "Why Multitasking Is a Myth Your Brain Invented", sourceName: "Aeon", readMinutes: 6 },
    { id: "psy-3", title: "Cognitive Biases That Shape Every Financial Decision", sourceName: "Quanta Magazine", readMinutes: 8 },
    { id: "psy-4", title: "The Surprising Truth About Habit Formation", sourceName: "MIT Technology Review", readMinutes: 7 },
    { id: "psy-5", title: "Flow States: The Neuroscience of Being 'In the Zone'", sourceName: "Aeon", readMinutes: 9 },
  ],
  politics: [
    { id: "pol-1", title: "How Algorithms Are Reshaping Political Discourse", sourceName: "MIT Technology Review", readMinutes: 8 },
    { id: "pol-2", title: "The Global Rise of AI Regulation", sourceName: "Ars Technica", readMinutes: 7 },
    { id: "pol-3", title: "Disinformation Campaigns: Inside How They Work", sourceName: "The Gradient", readMinutes: 10 },
  ],
  history: [
    { id: "his-1", title: "How the Printing Press Changed Everything", sourceName: "Aeon", readMinutes: 8 },
    { id: "his-2", title: "The Forgotten Origins of the Internet", sourceName: "MIT Technology Review", readMinutes: 7 },
    { id: "his-3", title: "Ancient Rome's Supply Chain: Lessons for Today", sourceName: "Aeon", readMinutes: 9 },
  ],
};

const DEFAULT_ARTICLES: TopicArticle[] = [
  { id: "def-1", title: "The Best Long Reads of the Week", sourceName: "Ridecast Editors", readMinutes: 8 },
  { id: "def-2", title: "Curated Picks: What to Read This Weekend", sourceName: "Ridecast Editors", readMinutes: 6 },
  { id: "def-3", title: "Deep Dives: This Month's Best Articles", sourceName: "Ridecast Editors", readMinutes: 10 },
];

// ---------------------------------------------------------------------------
// Accent line color — maps topicId to content color token
// Spec: section 2 "Accent line color — map topicId to content color"
// ---------------------------------------------------------------------------

function getTopicAccentColor(topicId: string): string {
  switch (topicId) {
    case "science":
    case "health":
    case "climate":
    case "space":
      return colors.contentScience;
    case "ai-tech":
    case "design":
      return colors.contentTech;
    case "business":
    case "finance":
    case "sports":
    case "cooking":
    case "realestate":
      return colors.contentBusiness;
    case "psychology":
    case "philosophy":
    case "culture":
    case "parenting":
      return colors.contentFiction;
    case "politics":
    case "history":
    case "law":
      return colors.contentNews;
    default:
      return colors.accentPrimary;
  }
}

// ---------------------------------------------------------------------------
// ArticleCard (topic drilldown variant)
// ---------------------------------------------------------------------------

function TopicArticleCard({ article, topicColor }: { article: TopicArticle; topicColor: string }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.card,
        padding: 12,
        flexDirection: "row",
        gap: 12,
        minHeight: 96,
        marginBottom: spacing.md,
      }}
    >
      {/* 72×72 thumbnail — source initial on topic accent color */}
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: borderRadius.thumbnail,
          backgroundColor: topicColor + "33",
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 11, fontWeight: "700", color: topicColor, letterSpacing: 1 }}>
          {article.sourceName.slice(0, 3).toUpperCase()}
        </Text>
      </View>
      {/* Body */}
      <View style={{ flex: 1, overflow: "hidden" }}>
        <Text
          style={{
            fontSize: typography.sizes.body,
            fontWeight: typography.weights.semibold,
            color: colors.textPrimary,
          }}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {article.title}
        </Text>
        <Text
          style={{
            fontSize: 12,
            fontWeight: typography.weights.regular,
            color: colors.textSecondary,
            marginTop: 4,
          }}
        >
          {article.sourceName} · {article.readMinutes} min read
        </Text>
      </View>
      {/* Add button — 28×28 */}
      <TouchableOpacity
        activeOpacity={0.75}
        style={{
          width: 28,
          height: 28,
          borderRadius: borderRadius.full,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          alignSelf: "center",
        }}
      >
        <Ionicons name="add" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// DiscoverTopicScreen
// ---------------------------------------------------------------------------

export default function DiscoverTopicScreen(): JSX.Element {
  const router = useRouter();
  const { topicId, topicName, emoji } = useLocalSearchParams<{
    topicId: string;
    topicName: string;
    emoji: string;
  }>();

  const articles = TOPIC_ARTICLES[topicId ?? ""] ?? DEFAULT_ARTICLES;
  const accentColor = getTopicAccentColor(topicId ?? "");
  const sourceCount = new Set(articles.map((a) => a.sourceName)).size;

  // Fallbacks for undefined params (deep-link or missing navigation params)
  const displayName = topicName ?? "Topic";
  const displayEmoji = emoji ?? "📖";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>

      {/* Back nav bar — fixed above FlatList, does not scroll (spec §2 layout) */}
      <View
        style={{
          height: 44,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.screenMargin,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          <Text
            style={{
              fontSize: 17,
              fontWeight: typography.weights.regular,
              color: colors.textSecondary,
            }}
          >
            Discover
          </Text>
        </TouchableOpacity>
        {/* Spacer */}
        <View style={{ flex: 1 }} />
        {/* Filter icon — visual only, no action this phase */}
        <Ionicons name="options-outline" size={24} color={colors.textSecondary} />
      </View>

      {/* Article list with topic header */}
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.screenMargin,
          paddingBottom: 180,
        }}
        ListHeaderComponent={
          <View style={{ paddingTop: 16, paddingBottom: 12 }}>
            {/* Emoji + title row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 28 }}>{displayEmoji}</Text>
              <Text
                style={{
                  fontSize: typography.sizes.display,
                  fontWeight: typography.weights.bold,
                  color: colors.textPrimary,
                }}
              >
                {displayName}
              </Text>
            </View>
            {/* Stats */}
            <Text
              style={{
                fontSize: typography.sizes.caption,
                fontWeight: typography.weights.regular,
                color: colors.textSecondary,
                marginTop: 4,
              }}
            >
              {articles.length} article{articles.length === 1 ? "" : "s"} · {sourceCount} source{sourceCount === 1 ? "" : "s"}
            </Text>
            {/* Accent underline — 76px × 3px in topic category color */}
            <View
              style={{
                width: 76,
                height: 3,
                borderRadius: borderRadius.full,
                backgroundColor: accentColor,
                marginTop: 8,
              }}
            />
          </View>
        }
        renderItem={({ item }) => <TopicArticleCard article={item} topicColor={accentColor} />}
      />
    </SafeAreaView>
  );
}
