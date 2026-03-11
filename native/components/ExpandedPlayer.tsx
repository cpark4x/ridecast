import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../lib/usePlayer";
import { formatDuration, nextSpeed } from "../lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

const SLEEP_OPTIONS: { label: string; value: number | "end" | null }[] = [
  { label: "Off", value: null },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "End of episode", value: "end" },
];

// ──────────────────────────────────────────────────────────────────────────────
// Artwork background by content/source type
// ──────────────────────────────────────────────────────────────────────────────

const ARTWORK_BG: Record<string, string> = {
  article: "#FFF7ED",
  url: "#FFF7ED",
  pdf: "#FFF1F2",
  epub: "#FAF5FF",
  txt: "#F9FAFB",
};

function artworkBg(contentType?: string | null, sourceType?: string | null): string {
  if (contentType && ARTWORK_BG[contentType.toLowerCase()]) {
    return ARTWORK_BG[contentType.toLowerCase()];
  }
  if (sourceType && ARTWORK_BG[sourceType.toLowerCase()]) {
    return ARTWORK_BG[sourceType.toLowerCase()];
  }
  return "#F8FAFC";
}

// ──────────────────────────────────────────────────────────────────────────────
// ExpandedPlayer
// ──────────────────────────────────────────────────────────────────────────────

interface ExpandedPlayerProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function ExpandedPlayer({ visible, onDismiss }: ExpandedPlayerProps) {
  const insets = useSafeAreaInsets();
  const {
    currentItem,
    isPlaying,
    position,
    duration,
    speed,
    sleepTimer,
    togglePlay,
    seekTo,
    skipForward,
    skipBack,
    setSpeed,
    setSleepTimer,
  } = usePlayer();

  // Local scrub position — only used while the user is dragging the slider
  const [scrubPosition, setScrubPosition] = useState<number | null>(null);
  const [sleepModalVisible, setSleepModalVisible] = useState(false);

  if (!currentItem) return null;

  const displayPosition = scrubPosition ?? position;
  const remaining = Math.max(0, duration - displayPosition);
  const bg = artworkBg(currentItem.contentType, currentItem.sourceType);

  // ── Speed cycling ──────────────────────────────────────────────────────────
  function handleSpeedPress() {
    const newSpeed = nextSpeed(speed, SPEEDS);
    setSpeed(newSpeed).catch((err) => console.warn("[player] setSpeed error:", err));
  }

  // ── Sleep timer ────────────────────────────────────────────────────────────
  function handleSleepOption(value: number | "end" | null) {
    setSleepTimer(value);
    setSleepModalVisible(false);
  }

  // ── Scrubber ───────────────────────────────────────────────────────────────
  function handleSlidingComplete(value: number) {
    setScrubPosition(null);
    seekTo(value).catch((err) => console.warn("[player] seekTo error:", err));
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View
        className="flex-1 bg-white"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View className="items-center pt-2 pb-1">
          {/* Drag handle */}
          <View className="w-10 h-1 rounded-full bg-gray-300" />
        </View>
        <View className="flex-row items-center justify-between px-4 pb-2">
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-2 -ml-2"
          >
            <Ionicons name="chevron-down" size={26} color="#374151" />
          </TouchableOpacity>
          <Text className="text-base font-semibold text-gray-700">Now Playing</Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Artwork ──────────────────────────────────────────────────── */}
          <View className="items-center px-8 mt-4 mb-6">
            <View
              className="w-70 h-70 rounded-3xl items-center justify-center"
              style={{ width: 280, height: 280, backgroundColor: bg }}
            >
              <Ionicons name="headset" size={96} color="#EA580C" style={{ opacity: 0.7 }} />
            </View>

            {/* Title + author */}
            <Text
              className="text-xl font-bold text-gray-900 mt-5 text-center"
              numberOfLines={2}
            >
              {currentItem.title}
            </Text>
            {currentItem.author ? (
              <Text className="text-base text-gray-500 mt-1 text-center" numberOfLines={1}>
                {currentItem.author}
              </Text>
            ) : null}
          </View>

          {/* ── Scrubber ─────────────────────────────────────────────────── */}
          <View className="px-5 mb-2">
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={duration > 0 ? duration : 1}
              value={displayPosition}
              minimumTrackTintColor="#EA580C"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#EA580C"
              onValueChange={(v) => setScrubPosition(v)}
              onSlidingComplete={handleSlidingComplete}
            />
            <View className="flex-row justify-between px-1 -mt-1">
              <Text className="text-xs text-gray-500">{formatDuration(displayPosition)}</Text>
              <Text className="text-xs text-gray-500">-{formatDuration(remaining)}</Text>
            </View>
          </View>

          {/* ── Main controls ────────────────────────────────────────────── */}
          <View className="flex-row items-center justify-center gap-6 mt-2 mb-4 px-8">
            {/* Skip back 5s */}
            <TouchableOpacity
              onPress={() => void skipBack(5)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="play-back" size={30} color="#374151" />
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity
              onPress={() => void togglePlay()}
              className="w-16 h-16 rounded-full bg-brand items-center justify-center"
              style={{ elevation: 4 }}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={30}
                color="white"
                style={{ marginLeft: isPlaying ? 0 : 3 }}
              />
            </TouchableOpacity>

            {/* Skip forward 15s */}
            <TouchableOpacity
              onPress={() => void skipForward(15)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="play-forward" size={30} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* ── Secondary controls ──────────────────────────────────────── */}
          <View className="flex-row items-center justify-center gap-8 px-8 mb-6">
            {/* Speed */}
            <TouchableOpacity
              onPress={handleSpeedPress}
              className="bg-gray-100 px-3 py-1.5 rounded-full min-w-[52px] items-center"
            >
              <Text className="text-sm font-bold text-gray-800">{speed.toFixed(2)}x</Text>
            </TouchableOpacity>

            {/* Sleep timer */}
            <TouchableOpacity
              onPress={() => setSleepModalVisible(true)}
              className={`p-2 rounded-full ${sleepTimer !== null ? "bg-brand" : "bg-gray-100"}`}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name="moon-outline"
                size={22}
                color={sleepTimer !== null ? "white" : "#374151"}
              />
            </TouchableOpacity>

            {/* Queue */}
            <TouchableOpacity
              onPress={() => console.log("open queue")}
              className="bg-gray-100 p-2 rounded-full"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="list-outline" size={22} color="#374151" />
            </TouchableOpacity>

            {/* Car mode */}
            <TouchableOpacity
              onPress={() => console.log("car mode")}
              className="bg-gray-100 p-2 rounded-full"
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="car-outline" size={22} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* ── Metadata / Info ──────────────────────────────────────────── */}
          {(currentItem.summary ||
            currentItem.contentType ||
            (currentItem.themes && currentItem.themes.length > 0)) && (
            <View className="mx-5 bg-gray-50 rounded-2xl p-4">
              {/* Summary */}
              {currentItem.summary ? (
                <Text className="text-sm text-gray-700 leading-5 mb-3">
                  {currentItem.summary}
                </Text>
              ) : null}

              {/* Format + Content type + Themes pills */}
              <View className="flex-row flex-wrap gap-2">
                <View className="bg-orange-100 px-2.5 py-1 rounded-full">
                  <Text className="text-xs font-medium text-orange-700">
                    {currentItem.format}
                  </Text>
                </View>

                {currentItem.contentType ? (
                  <View className="bg-blue-100 px-2.5 py-1 rounded-full">
                    <Text className="text-xs font-medium text-blue-700">
                      {currentItem.contentType}
                    </Text>
                  </View>
                ) : null}

                {currentItem.themes?.map((theme) => (
                  <View key={theme} className="bg-gray-200 px-2.5 py-1 rounded-full">
                    <Text className="text-xs font-medium text-gray-700">{theme}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── Sleep timer modal ──────────────────────────────────────────────── */}
      <Modal
        visible={sleepModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSleepModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/40 items-center justify-end pb-12"
          activeOpacity={1}
          onPress={() => setSleepModalVisible(false)}
        >
          <View className="bg-white w-full mx-0 rounded-t-3xl overflow-hidden">
            <View className="items-center pt-3 pb-1">
              <View className="w-10 h-1 rounded-full bg-gray-300" />
            </View>
            <Text className="text-base font-bold text-gray-900 px-5 pt-2 pb-3">
              Sleep Timer
            </Text>
            {SLEEP_OPTIONS.map(({ label, value }) => {
              const isActive =
                sleepTimer === value || (value === null && sleepTimer === null);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => handleSleepOption(value)}
                  className={`px-5 py-4 flex-row items-center justify-between border-t border-gray-100 ${
                    isActive ? "bg-orange-50" : ""
                  }`}
                >
                  <Text
                    className={`text-base ${isActive ? "text-brand font-semibold" : "text-gray-900"}`}
                  >
                    {label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={20} color="#EA580C" />
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: insets.bottom + 8 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}
