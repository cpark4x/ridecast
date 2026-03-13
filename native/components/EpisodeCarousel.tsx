// native/components/EpisodeCarousel.tsx — new file

import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LibraryItem } from "../lib/types";
import SourceIcon from "./SourceIcon";
import { formatDurationMinutes } from "../lib/utils";

// ---------------------------------------------------------------------------
// Source type → background color for the card header strip
// ---------------------------------------------------------------------------

const SOURCE_BG: Record<string, string> = {
  pdf:    "#FEE2E2",
  url:    "#DBEAFE",
  epub:   "#EDE9FE",
  txt:    "#F3F4F6",
  pocket: "#D1FAE5",
};

function sourceCardBg(sourceType: string): string {
  return SOURCE_BG[sourceType.toLowerCase()] ?? "#F3F4F6";
}

// ---------------------------------------------------------------------------
// CarouselCard
// ---------------------------------------------------------------------------

interface CarouselCardProps {
  item: LibraryItem;
  onPlay: (item: LibraryItem) => void;
  isActive: boolean;
}

function CarouselCard({ item, onPlay, isActive }: CarouselCardProps) {
  const readyVersion = item.versions.find((v) => v.status === "ready" && v.audioId && v.audioUrl);
  const durationSecs = readyVersion?.durationSecs ?? (readyVersion ? readyVersion.targetDuration * 60 : 0);
  const allCompleted = item.versions.length > 0 && item.versions.every((v) => v.completed);
  const hasAudio     = !!readyVersion;
  const isNew        = hasAudio && !allCompleted && (readyVersion?.position ?? 0) === 0;

  return (
    <TouchableOpacity
      onPress={() => onPlay(item)}
      activeOpacity={0.8}
      style={{ width: 148, height: 190, opacity: allCompleted ? 0.55 : 1 }}
      className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm"
      accessibilityLabel={item.title}
    >
      {/* —— Colored header strip with SourceIcon —— */}
      <View
        className="h-20 items-center justify-center"
        style={{ backgroundColor: sourceCardBg(item.sourceType) }}
      >
        <SourceIcon
          sourceName={item.sourceName}
          sourceDomain={item.sourceDomain}
          sourceBrandColor={item.sourceBrandColor}
          size={36}
        />
      </View>

      {/* —— Card body —— */}
      <View className="p-2.5">
        <Text className="text-xs font-semibold text-gray-900" numberOfLines={2}>
          {item.title}
        </Text>
        {durationSecs > 0 && (
          <Text className="text-xs text-gray-400 mt-1">
            {formatDurationMinutes(durationSecs)}
          </Text>
        )}
      </View>

      {/* —— Active playing indicator —— */}
      {isActive && (
        <View className="absolute top-2 right-2 w-5 h-5 bg-brand rounded-full items-center justify-center">
          <Ionicons name="musical-notes" size={10} color="white" />
        </View>
      )}

      {/* —— Unplayed dot —— */}
      {isNew && !isActive && (
        <View className="absolute top-2 left-2 w-2 h-2 rounded-full bg-orange-500" />
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EpisodeCarouselProps {
  episodes: LibraryItem[];
  onPlay: (item: LibraryItem) => void;
  currentAudioId: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EpisodeCarousel({
  episodes,
  onPlay,
  currentAudioId,
}: EpisodeCarouselProps) {
  const recent = episodes.slice(0, 8); // newest-first from SQLite DESC order
  if (recent.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="px-4 text-lg font-bold text-gray-900 mb-3">Recent</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        decelerationRate="fast"
      >
        {recent.map((item) => (
          <CarouselCard
            key={item.id}
            item={item}
            onPlay={onPlay}
            isActive={
              !!currentAudioId &&
              item.versions.some((v) => v.audioId === currentAudioId)
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}