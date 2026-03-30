// native/app/discover-ftue-sources.tsx
// Discover FTUE Step 2: Source suggestion cards with follow toggles
// Spec: specs/features/phase5/discover-ftue.md

import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius } from "../lib/theme";
import { Haptics } from "../lib/haptics";

// ---------------------------------------------------------------------------
// Source data
// ---------------------------------------------------------------------------

const SUGGESTED_SOURCES: {
  id: string;
  shortLabel: string;
  name: string;
  category: string;
  logoColor: string;
}[] = [
  { id: "mit",      shortLabel: "MIT",  name: "MIT Technology Review", category: "Science & Technology",    logoColor: "#0D9488" },
  { id: "ars",      shortLabel: "Ars",  name: "Ars Technica",          category: "Technology",              logoColor: "#2563EB" },
  { id: "quanta",   shortLabel: "QM",   name: "Quanta Magazine",       category: "Science & Math",          logoColor: "#7C3AED" },
  { id: "nature",   shortLabel: "Nat",  name: "Nature",                category: "Science",                 logoColor: "#059669" },
  { id: "gradient", shortLabel: "TG",   name: "The Gradient",          category: "AI & Machine Learning",   logoColor: "#EA580C" },
  { id: "aeon",     shortLabel: "Aeon", name: "Aeon",                  category: "Psychology & Philosophy", logoColor: "#DB2777" },
];

// ---------------------------------------------------------------------------
// SourceCard component
// ---------------------------------------------------------------------------

function SourceCard({
  source,
  following,
  onToggle,
}: {
  source: (typeof SUGGESTED_SOURCES)[0];
  following: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: borderRadius.card,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Logo block */}
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          backgroundColor: source.logoColor,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: "700", color: "white" }}>
          {source.shortLabel}
        </Text>
      </View>

      {/* Source info */}
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "600", color: colors.textPrimary }}
          numberOfLines={1}
        >
          {source.name}
        </Text>
        <Text
          style={{ fontSize: 12, fontWeight: "400", color: colors.textTertiary, marginTop: 4 }}
          numberOfLines={1}
        >
          {source.category}
        </Text>
      </View>

      {/* Follow button */}
      <TouchableOpacity
        onPress={() => onToggle(source.id)}
        activeOpacity={0.8}
        style={{
          backgroundColor: following ? colors.accentPrimary : "transparent",
          borderWidth: following ? 0 : 1,
          borderColor: "#3F3F4E",
          borderRadius: borderRadius.full,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: following ? "white" : colors.textTertiary,
          }}
        >
          {following ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DiscoverFTUESourcesScreen(): JSX.Element {
  const router = useRouter();
  const [followedSources, setFollowedSources] = useState<Set<string>>(new Set());

  function toggleFollow(id: string) {
    void Haptics.light();
    setFollowedSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleDone() {
    try {
      await AsyncStorage.setItem(
        "discover_ftue_followed_sources",
        JSON.stringify([...followedSources]),
      );
      await AsyncStorage.setItem("discover_ftue_completed", "true");
    } catch (err) {
      console.warn("[ftue-sources] AsyncStorage error:", err);
    }
    router.replace("/(tabs)/discover");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingTop: 16,
          }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
          <Text style={{ fontSize: 17, fontWeight: "400", color: colors.textSecondary }}>
            Topics
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ paddingTop: 16 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            Sources you might like
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "400",
              color: colors.textSecondary,
              marginTop: 8,
            }}
          >
            We picked a few based on your interests.
          </Text>
        </View>

        {/* Sources list */}
        <View style={{ marginTop: 24, gap: 12 }}>
          {SUGGESTED_SOURCES.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              following={followedSources.has(source.id)}
              onToggle={toggleFollow}
            />
          ))}
        </View>

        {/* CTA section */}
        <View style={{ marginTop: 32, paddingBottom: 20 }}>
          <TouchableOpacity
            onPress={handleDone}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.accentPrimary,
              borderRadius: borderRadius.full,
              paddingVertical: 16,
              width: "100%",
              flexDirection: "row",
              gap: 8,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Leading checkmark icon per 12b blueprint */}
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
              Done · Following {followedSources.size} sources
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
