import React, { useState } from "react";
import {
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
import { smartTitle } from "../lib/libraryHelpers";
import { Haptics } from "../lib/haptics";
import CarMode from "./CarMode";
import { colors, borderRadius, spacing } from "../lib/theme";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

const SLEEP_OPTIONS: { label: string; value: number | "end" | null }[] = [
  { label: "Off",            value: null  },
  { label: "15 min",         value: 15    },
  { label: "30 min",         value: 30    },
  { label: "45 min",         value: 45    },
  { label: "End of episode", value: "end" },
];

// ────────────────────────────────────────────────────────────────────────────
// Content-type atmosphere color
// ────────────────────────────────────────────────────────────────────────────

function contentTypeToColor(contentType?: string | null): string {
  const t = (contentType ?? "").toLowerCase();
  if (t === "tech" || t === "ai")                                   return colors.contentTech;      // #2563EB
  if (t === "business" || t === "finance")                          return colors.contentBusiness;  // #EA580C
  if (t === "science")                                              return colors.contentScience;   // #0D9488
  if (t === "fiction" || t === "psychology" || t === "philosophy")  return colors.contentFiction;   // #7C3AED
  if (t === "news" || t === "politics")                             return colors.contentNews;      // #DB2777
  if (t === "biography")                                            return colors.contentBiography; // #059669
  return colors.accentPrimary; // fallback: #FF6B35
}

// ────────────────────────────────────────────────────────────────────────────
// ExpandedPlayer
// ────────────────────────────────────────────────────────────────────────────

interface ExpandedPlayerProps {
  visible:   boolean;
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
    carModeVisible,
    setCarModeVisible,
  } = usePlayer();

  // Local scrub position — only used while the user is dragging the slider
  const [scrubPosition, setScrubPosition]        = useState<number | null>(null);
  const [sleepModalVisible, setSleepModalVisible] = useState(false);

  if (!currentItem) return null;

  const displayPosition = scrubPosition ?? position;
  const remaining       = Math.max(0, duration - displayPosition);
  const atmosphereColor = contentTypeToColor(currentItem.contentType);

  // smart-titles: clean the display title
  const displayTitle = smartTitle(
    currentItem.title,
    currentItem.sourceType ?? "url",
    currentItem.sourceDomain,
  );

  // ── Speed cycling ────────────────────────────────────────────────────────
  function handleSpeedPress() {
    void Haptics.light();
    const newSpeed = nextSpeed(speed, SPEEDS);
    setSpeed(newSpeed).catch((err) => console.warn("[player] setSpeed error:", err));
  }

  // ── Sleep timer ──────────────────────────────────────────────────────────
  function handleSleepOption(value: number | "end" | null) {
    setSleepTimer(value);
    setSleepModalVisible(false);
  }

  // ── Scrubber ─────────────────────────────────────────────────────────────
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
        style={{
          flex: 1,
          backgroundColor: colors.backgroundScreen,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View className="items-center pt-2 pb-1">
          {/* Drag handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 9999,
              backgroundColor: "#3A3A4E",
            }}
          />
        </View>
        <View className="flex-row items-center justify-between px-4 pb-2">
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-2 -ml-2"
          >
            <Ionicons name="chevron-down" size={26} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: "500" }}>
            Now Playing
          </Text>
          <View style={{ width: 42 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.sectionGap }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Artwork ─────────────────────────────────────────────────── */}
          <View className="items-center px-8 mt-4 mb-6">
            {/* Atmospheric glow */}
            <View
              style={{
                position: "absolute",
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: atmosphereColor + "14",
              }}
            />

            {/* Artwork card */}
            <View
              style={{
                width: 280,
                height: 280,
                borderRadius: 16,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="headset"
                size={96}
                color={colors.accentPrimary}
                style={{ opacity: 0.7 }}
              />
            </View>

            {/* Title + author */}
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 20,
                fontWeight: "600",
                letterSpacing: 0.3,
                marginTop: 20,
                textAlign: "center",
              }}
              numberOfLines={2}
            >
              {displayTitle}
            </Text>
            {currentItem.author ? (
              <Text
                style={{ color: colors.textSecondary, marginTop: 4, textAlign: "center" }}
                numberOfLines={1}
              >
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
              minimumTrackTintColor={colors.accentPrimary}
              maximumTrackTintColor="#2C303E"
              thumbTintColor="#FFFFFF"
              onValueChange={(v) => setScrubPosition(v)}
              onSlidingComplete={handleSlidingComplete}
            />
            <View className="flex-row justify-between px-1 -mt-1">
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                {formatDuration(displayPosition)}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                -{formatDuration(remaining)}
              </Text>
            </View>
          </View>

          {/* ── Main controls ─────────────────────────────────────────────── */}
          <View className="flex-row items-center justify-center gap-6 mt-2 mb-4 px-8">
            {/* Skip back 5s */}
            <TouchableOpacity
              onPress={() => { void Haptics.light(); void skipBack(5); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="play-back" size={30} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity
              onPress={() => { void Haptics.light(); void togglePlay(); }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.accentPrimary,
                alignItems: "center",
                justifyContent: "center",
              }}
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
              onPress={() => { void Haptics.light(); void skipForward(15); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="play-forward" size={30} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── Secondary controls ─────────────────────────────────────────── */}
          <View className="flex-row items-center justify-center gap-8 px-8 mb-6">
            {/* Speed */}
            <TouchableOpacity
              onPress={handleSpeedPress}
              style={{
                backgroundColor: colors.surfaceElevated,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: borderRadius.card,
                minWidth: 52,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700" }}>
                {speed.toFixed(2)}x
              </Text>
            </TouchableOpacity>

            {/* Sleep timer */}
            <TouchableOpacity
              onPress={() => setSleepModalVisible(true)}
              style={
                sleepTimer !== null
                  ? { backgroundColor: colors.accentPrimary, padding: 8, borderRadius: borderRadius.card }
                  : { backgroundColor: colors.surfaceElevated, padding: 8, borderRadius: borderRadius.card }
              }
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons
                name="moon-outline"
                size={22}
                color={sleepTimer !== null ? "white" : colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Queue — TODO: show current queue list in a Modal (future sprint) */}
            <TouchableOpacity
              onPress={() => { /* TODO: open queue modal */ }}
              style={{ backgroundColor: colors.surfaceElevated, padding: 8, borderRadius: borderRadius.card }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="list-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Car mode */}
            <TouchableOpacity
              onPress={() => setCarModeVisible(true)}
              style={{ backgroundColor: colors.surfaceElevated, padding: 8, borderRadius: borderRadius.card }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityLabel="Car mode"
            >
              <Ionicons name="car-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Metadata / Info ───────────────────────────────────────────── */}
          {(currentItem.summary ||
            currentItem.contentType ||
            (currentItem.themes && currentItem.themes.length > 0)) && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: borderRadius.card,
                marginHorizontal: 20,
                padding: 16,
              }}
            >
              {/* Summary */}
              {currentItem.summary ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    lineHeight: 20,
                    marginBottom: 12,
                  }}
                >
                  {currentItem.summary}
                </Text>
              ) : null}

              {/* Format + Content type + Themes pills */}
              <View className="flex-row flex-wrap gap-2">
                <View
                  style={{
                    backgroundColor: "rgba(255,107,53,0.15)",
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 9999,
                  }}
                >
                  <Text style={{ color: colors.accentPrimary, fontSize: 12, fontWeight: "500" }}>
                    {currentItem.format}
                  </Text>
                </View>

                {currentItem.contentType ? (
                  <View
                    style={{
                      backgroundColor: "rgba(37,99,235,0.15)",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 9999,
                    }}
                  >
                    <Text style={{ color: colors.contentTech, fontSize: 12, fontWeight: "500" }}>
                      {currentItem.contentType}
                    </Text>
                  </View>
                ) : null}

                {currentItem.themes?.map((theme) => (
                  <View
                    key={theme}
                    style={{
                      backgroundColor: colors.surfaceElevated,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 9999,
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: "500" }}>
                      {theme}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── Sleep timer modal ─────────────────────────────────────────────── */}
      <Modal
        visible={sleepModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSleepModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingBottom: 48,
          }}
          activeOpacity={1}
          onPress={() => setSleepModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              width: "100%",
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              overflow: "hidden",
            }}
          >
            <View className="items-center pt-3 pb-1">
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 9999,
                  backgroundColor: "#3A3A4E",
                }}
              />
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 16,
                fontWeight: "700",
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: 12,
              }}
            >
              Sleep Timer
            </Text>
            {SLEEP_OPTIONS.map(({ label, value }) => {
              const isActive =
                sleepTimer === value || (value === null && sleepTimer === null);
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => handleSleepOption(value)}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTopWidth: 1,
                    borderTopColor: colors.borderDivider,
                    backgroundColor: isActive ? "rgba(255,107,53,0.10)" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: isActive ? colors.accentPrimary : colors.textPrimary,
                      fontWeight: isActive ? "600" : "400",
                    }}
                  >
                    {label}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={20} color={colors.accentPrimary} />
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: insets.bottom + 8 }} />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Car Mode overlay ──────────────────────────────────────────────── */}
      <CarMode
        visible={carModeVisible}
        onDismiss={() => setCarModeVisible(false)}
      />
    </Modal>
  );
}
