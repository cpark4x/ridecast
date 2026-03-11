import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { LibraryItem } from "../lib/types";

const SOURCE_BADGE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pdf: { bg: "bg-red-100", text: "text-red-700", label: "PDF" },
  url: { bg: "bg-blue-100", text: "text-blue-700", label: "URL" },
  epub: { bg: "bg-purple-100", text: "text-purple-700", label: "EPUB" },
  txt: { bg: "bg-gray-100", text: "text-gray-700", label: "TXT" },
  pocket: { bg: "bg-green-100", text: "text-green-700", label: "Pocket" },
};

function defaultBadge(sourceType: string) {
  return {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: sourceType.toUpperCase(),
  };
}

interface EpisodeCardProps {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
}

export default function EpisodeCard({ item, onPress }: EpisodeCardProps) {
  const { versions } = item;

  const badge = SOURCE_BADGE[item.sourceType.toLowerCase()] ?? defaultBadge(item.sourceType);

  const isGenerating = versions.some((v) => v.status === "generating");
  const allCompleted =
    versions.length > 0 && versions.every((v) => v.completed);

  // Primary version: first ready version, or first version overall
  const primaryVersion =
    versions.find((v) => v.status === "ready") ?? versions[0];

  const hasProgress =
    primaryVersion &&
    primaryVersion.position > 0 &&
    !primaryVersion.completed;

  const progressPercent =
    hasProgress && primaryVersion.durationSecs && primaryVersion.durationSecs > 0
      ? Math.min(
          (primaryVersion.position / primaryVersion.durationSecs) * 100,
          100,
        )
      : 0;

  const durationLabel = versions
    .map((v) => `${v.targetDuration} min`)
    .join(" · ");

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      className="bg-white rounded-2xl shadow-sm mx-4 mb-3 overflow-hidden"
      style={{ opacity: allCompleted ? 0.5 : 1 }}
      activeOpacity={0.75}
    >
      {/* Thin progress bar at top */}
      {hasProgress && (
        <View className="h-1 bg-gray-100 w-full">
          <View
            className="h-1 bg-brand"
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      )}

      <View className="p-4">
        {/* Title row */}
        <View className="flex-row items-start justify-between gap-2">
          <Text
            className="text-base font-bold text-gray-900 flex-1"
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {isGenerating && (
            <View className="bg-amber-100 px-2 py-0.5 rounded-full self-start">
              <Text className="text-xs text-amber-700 font-medium">
                Generating
              </Text>
            </View>
          )}
        </View>

        {/* Author */}
        {item.author ? (
          <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
            {item.author}
          </Text>
        ) : null}

        {/* Footer row: source badge + durations */}
        <View className="flex-row items-center mt-3 gap-2 flex-wrap">
          {/* Source type badge */}
          <View className={`${badge.bg} px-2 py-0.5 rounded-full`}>
            <Text className={`text-xs font-medium ${badge.text}`}>
              {badge.label}
            </Text>
          </View>

          {/* Duration pills */}
          {durationLabel ? (
            <View className="bg-gray-100 px-2 py-0.5 rounded-full">
              <Text className="text-xs text-gray-600">{durationLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}
