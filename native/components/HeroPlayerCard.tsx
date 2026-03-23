// native/components/HeroPlayerCard.tsx — new file

import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";
import SourceIcon from "./SourceIcon";
import { sourceName, formatDuration } from "../lib/utils";

// ---------------------------------------------------------------------------
// Source type → gradient pair [from, to]
// Light tints — works on white background
// ---------------------------------------------------------------------------

const SOURCE_GRADIENT: Record<string, [string, string]> = {
  pdf:    ["#FEF2F2", "#FEE2E2"],
  url:    ["#EFF6FF", "#DBEAFE"],
  epub:   ["#F5F3FF", "#EDE9FE"],
  txt:    ["#F9FAFB", "#F3F4F6"],
  pocket: ["#F0FDF4", "#D1FAE5"],
};

const DEFAULT_GRADIENT: [string, string] = ["#FFF7ED", "#FFEDD5"]; // orange tint fallback

// ---------------------------------------------------------------------------
// Pulsing dot — animated opacity loop
// ---------------------------------------------------------------------------

function PulseDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1.0, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#EA580C",
        opacity,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface HeroPlayerCardProps {
  onExpand: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HeroPlayerCard({ onExpand }: HeroPlayerCardProps) {
  const { currentItem, isPlaying, togglePlay, position, duration, skipBack, skipForward } =
    usePlayer();

  if (!currentItem) return null;

  const key = (currentItem.sourceType ?? "").toLowerCase();
  const [gradFrom, gradTo] = SOURCE_GRADIENT[key] ?? DEFAULT_GRADIENT;
  const progressPercent = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <TouchableOpacity
      onPress={onExpand}
      activeOpacity={0.88}
      className="mx-4 mb-4 rounded-2xl overflow-hidden"
      accessibilityLabel="Now Playing — tap to expand"
    >
      <LinearGradient
        colors={[gradFrom, gradTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="p-4"
      >
        {/* —— Top row: source badge + NOW PLAYING pill —— */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <SourceIcon
              sourceName={currentItem.sourceName}
              sourceDomain={currentItem.sourceDomain}
              sourceBrandColor={currentItem.sourceBrandColor}
              size={18}
            />
            <Text className="text-xs text-gray-500" numberOfLines={1}>
              {sourceName(currentItem.sourceType, currentItem.sourceUrl ?? null, currentItem.author ?? null)}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5 bg-white/60 px-2.5 py-1 rounded-full">
            {isPlaying && <PulseDot />}
            <Text className="text-xs font-bold text-brand uppercase tracking-wide">
              {isPlaying ? "Now Playing" : "Paused"}
            </Text>
          </View>
        </View>

        {/* —— Title —— */}
        <Text className="text-base font-bold text-gray-900 mb-3" numberOfLines={2}>
          {currentItem.title}
        </Text>

        {/* —— Progress bar —— */}
        <View className="h-1 bg-white/50 rounded-full mb-1.5">
          <View
            className="h-1 bg-brand rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </View>

        {/* —— Time labels —— */}
        <View className="flex-row justify-between mb-3">
          <Text className="text-xs text-gray-500">{formatDuration(position)}</Text>
          <Text className="text-xs text-gray-500">{formatDuration(duration)}</Text>
        </View>

        {/* —— Transport controls —— */}
        <View className="flex-row items-center justify-center gap-6">
          <TouchableOpacity
            onPress={() => void skipBack(5)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Skip back 5 seconds"
          >
            <Ionicons name="play-skip-back" size={22} color="#374151" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void togglePlay()}
            className="w-12 h-12 bg-brand rounded-full items-center justify-center"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={24}
              color="white"
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => void skipForward(15)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Skip forward 15 seconds"
          >
            <Ionicons name="play-skip-forward" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}