// native/app/discover-ftue-topics.tsx
// Discover FTUE Step 1: Topic chip grid selection screen
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
import { colors, borderRadius } from "../lib/theme";
import { Haptics } from "../lib/haptics";

// ---------------------------------------------------------------------------
// Topic data
// ---------------------------------------------------------------------------

const TOPICS: { id: string; emoji: string; label: string }[] = [
  { id: "science",     emoji: "🧬", label: "Science"     },
  { id: "ai-tech",    emoji: "🤖", label: "AI & Tech"   },
  { id: "business",   emoji: "💼", label: "Business"    },
  { id: "finance",    emoji: "💰", label: "Finance"     },
  { id: "psychology", emoji: "🧠", label: "Psychology"  },
  { id: "health",     emoji: "🏥", label: "Health"      },
  { id: "design",     emoji: "🎨", label: "Design"      },
  { id: "climate",    emoji: "🌍", label: "Climate"     },
  { id: "space",      emoji: "🚀", label: "Space"       },
  { id: "politics",   emoji: "📰", label: "Politics"    },
  { id: "history",    emoji: "📚", label: "History"     },
  { id: "culture",    emoji: "🎭", label: "Culture"     },
  { id: "sports",     emoji: "⚽", label: "Sports"      },
  { id: "cooking",    emoji: "🍳", label: "Cooking"     },
  { id: "parenting",  emoji: "👶", label: "Parenting"   },
  { id: "philosophy", emoji: "💡", label: "Philosophy"  },
  { id: "law",        emoji: "⚖️", label: "Law"         },
  { id: "realestate", emoji: "🏠", label: "Real Estate" },
];

// ---------------------------------------------------------------------------
// Topic chip component
// ---------------------------------------------------------------------------

function TopicChip({
  item,
  selected,
  onToggle,
}: {
  item: (typeof TOPICS)[0];
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <TouchableOpacity
      onPress={() => onToggle(item.id)}
      activeOpacity={0.8}
      style={{
        width: '31%',
        backgroundColor: selected ? colors.accentPrimary : colors.surface,
        borderWidth: selected ? 0 : 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 22, lineHeight: 28 }}>{item.emoji}</Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: selected ? "#0F0F1A" : colors.textPrimary,
          textAlign: "center",
          marginTop: 2,
        }}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DiscoverFTUETopicsScreen(): JSX.Element {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());

  const canContinue = selectedTopics.size >= 1;

  function toggleTopic(id: string) {
    void Haptics.light();
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleContinue() {
    if (!canContinue) return;
    try {
      await AsyncStorage.setItem(
        "discover_ftue_selected_topics",
        JSON.stringify([...selectedTopics]),
      );
    } catch (err) {
      console.warn("[ftue-topics] AsyncStorage error:", err);
    }
    router.push("/discover-ftue-sources");
  }

  async function handleSkip() {
    try {
      await AsyncStorage.setItem("discover_ftue_completed", "true");
    } catch (err) {
      console.warn("[ftue-topics] AsyncStorage error:", err);
    }
    router.replace("/(tabs)/discover");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingTop: 40 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "700",
              color: colors.textPrimary,
            }}
          >
            What are you into?
          </Text>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "400",
              color: colors.textSecondary,
              marginTop: 16,
            }}
          >
            Pick topics to personalize your Discover feed.
          </Text>
        </View>

        {/* Topic grid — 3 columns */}
        <View style={{ marginTop: 32 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {TOPICS.map((item) => (
              <TopicChip
                key={item.id}
                item={item}
                selected={selectedTopics.has(item.id)}
                onToggle={toggleTopic}
              />
            ))}
          </View>
        </View>

        {/* Bottom actions */}
        <View style={{ marginTop: 40, paddingBottom: 32 }}>
          {/* Continue button */}
          <TouchableOpacity
            onPress={handleContinue}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.accentPrimary,
              width: "100%",
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              opacity: canContinue ? 1 : 0.4,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                color: "white",
              }}
            >
              Continue · {selectedTopics.size} selected
            </Text>
          </TouchableOpacity>

          {/* Skip link */}
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.7}
            style={{ marginTop: 24, alignItems: "center" }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: "400",
                color: colors.textSecondary,
              }}
            >
              Skip
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
