import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";
import { smartTitle } from "../lib/libraryHelpers";

export default function PlayerBar() {
  const {
    currentItem,
    isPlaying,
    togglePlay,
    position,
    duration,
    setExpandedPlayerVisible,
  } = usePlayer();

  if (!currentItem) return null;

  const progressPercent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  // smart-titles: clean the display title
  const displayTitle = smartTitle(currentItem.title, currentItem.sourceType ?? "url", currentItem.sourceDomain);

  return (
    <View className="bg-white border-t border-gray-200">
      {/* Thin progress bar at the very top */}
      <View className="h-0.5 w-full bg-gray-100">
        <View
          className="h-0.5 bg-brand"
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      {/* Bar body */}
      <TouchableOpacity
        onPress={() => setExpandedPlayerVisible(true)}
        activeOpacity={0.8}
        className="flex-row items-center px-4 py-3 gap-3"
        style={{ height: 64 }}
      >
        {/* Title */}
        <Text
          className="flex-1 text-sm font-semibold text-gray-900"
          numberOfLines={1}
        >
          {displayTitle}
        </Text>

        {/* Play / Pause button — separate press handler so it doesn't bubble */}
        <TouchableOpacity
          onPress={() => void togglePlay()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={26}
            color="#EA580C"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
