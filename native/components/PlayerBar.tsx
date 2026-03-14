import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";
import { smartTitle } from "../lib/libraryHelpers";
import { Haptics } from "../lib/haptics";
import { timeRemaining } from "../lib/utils";
import SourceThumbnail from "./SourceThumbnail";

export default function PlayerBar() {
  const {
    currentItem,
    isPlaying,
    togglePlay,
    skipBack,
    skipForward,
    position,
    duration,
    setExpandedPlayerVisible,
  } = usePlayer();

  if (!currentItem) return null;

  const progressPercent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  // Clean display title
  const displayTitle = smartTitle(
    currentItem.title,
    currentItem.sourceType ?? "url",
    currentItem.sourceDomain,
  );

  // Time remaining — show "Loading…" until duration is known
  const timeLabel =
    duration > 0 ? timeRemaining(position, duration) : "Loading…";

  return (
    /*
     * Floating card: 8px margin on sides, 8px bottom gap before tab bar,
     * dark near-black background, 16px corner radius, subtle shadow.
     */
    <View
      style={{
        marginHorizontal: 8,
        marginBottom:     8,
        borderRadius:     16,
        backgroundColor:  "#1c1c1e",
        overflow:         "hidden",
        shadowColor:      "#000",
        shadowOffset:     { width: 0, height: 4 },
        shadowOpacity:    0.25,
        shadowRadius:     12,
        elevation:        8,
        position:         "relative",
      }}
    >
      {/* Tappable body — opens expanded player */}
      <TouchableOpacity
        onPress={() => setExpandedPlayerVisible(true)}
        activeOpacity={0.85}
        style={{
          flexDirection: "row",
          alignItems:    "center",
          paddingHorizontal: 14,
          paddingVertical:   10,
          gap:           10,
        }}
      >
        {/* ── Thumbnail: 36×36 rounded rectangle ── */}
        <SourceThumbnail
          sourceType={currentItem.sourceType}
          sourceUrl={currentItem.sourceUrl}
          sourceName={currentItem.sourceName}
          size={36}
        />

        {/* ── Title + time ── */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize:      13,
              fontWeight:    "600",
              color:         "#fff",
              letterSpacing: -0.1,
            }}
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          <Text
            style={{
              fontSize:  11,
              color:     "rgba(255,255,255,0.5)",
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {timeLabel}
          </Text>
        </View>

        {/* ── Controls: rewind-15 · play/pause · skip-30 ── */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          {/* Rewind 15s */}
          <TouchableOpacity
            onPress={() => {
              void Haptics.light();
              skipBack(15).catch((err: unknown) =>
                console.warn("[PlayerBar] skipBack error:", err),
              );
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width:           32,
              height:          32,
              alignItems:      "center",
              justifyContent:  "center",
              borderRadius:    16,
            }}
            accessibilityLabel="Rewind 15 seconds"
          >
            <Ionicons name="play-back" size={20} color="white" />
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity
            onPress={() => { void Haptics.light(); void togglePlay(); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width:           32,
              height:          32,
              alignItems:      "center",
              justifyContent:  "center",
              borderRadius:    16,
            }}
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={22}
              color="white"
            />
          </TouchableOpacity>

          {/* Skip 30s */}
          <TouchableOpacity
            onPress={() => {
              void Haptics.light();
              skipForward(30).catch((err: unknown) =>
                console.warn("[PlayerBar] skipForward error:", err),
              );
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              width:           32,
              height:          32,
              alignItems:      "center",
              justifyContent:  "center",
              borderRadius:    16,
            }}
            accessibilityLabel="Skip 30 seconds"
          >
            <Ionicons name="play-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* ── Progress bar: 2px at very bottom, inside border-radius ── */}
      <View
        style={{
          height:          2,
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      >
        <View
          style={{
            height:          2,
            backgroundColor: "#EA580C",
            width:           `${progressPercent}%`,
          }}
        />
      </View>
    </View>
  );
}
