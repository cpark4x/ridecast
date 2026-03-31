import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";
import { smartTitle } from "../lib/libraryHelpers";
import { Haptics } from "../lib/haptics";
import { timeRemaining } from "../lib/utils";
import SourceThumbnail from "./SourceThumbnail";
import { colors, borderRadius, sizes } from "../lib/theme";

// ---------------------------------------------------------------------------
// Exported style constants — for testability (PlayerBar.test.tsx)
// ---------------------------------------------------------------------------

/** Container style object (AC-10, AC-11, AC-12) */
export const PLAYER_BAR_CONTAINER_STYLES = {
  marginHorizontal: 8,
  borderRadius:     borderRadius.miniPlayer,  // 14
  backgroundColor:  colors.surfaceElevated,  // '#242438'
  overflow:         "hidden",
  position:         "relative",
  // No shadow props — anti-slop rule (depth via surfaceElevated bg only)
} as const;

/** Title text style (AC-14) */
export const PLAYER_BAR_TITLE_STYLES = {
  fontSize:      14,
  fontWeight:    "500" as const,
  color:         "#F5F5F5",
  letterSpacing: -0.1,
} as const;

/** Caption (time remaining) text style (AC-15) */
export const PLAYER_BAR_CAPTION_STYLES = {
  fontSize:  12,
  color:     colors.textSecondary,  // '#9CA3AF'
  marginTop: 1,
} as const;

/** Progress bar fill color (AC-16) */
export const PLAYER_BAR_PROGRESS_FILL_COLOR = colors.accentPrimary;  // '#FF6B35'

/** Play/pause icon size (AC-17) */
export const PLAYER_BAR_PLAY_ICON_SIZE = sizes.iconNav;  // 24

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PlayerBar() {
  const insets = useSafeAreaInsets();
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

  // Clean display title
  const displayTitle = smartTitle(
    currentItem.title,
    currentItem.sourceType ?? "url",
    currentItem.sourceDomain,
  );

  // Time remaining — show source name until duration is known
  const timeLabel =
    duration > 0
      ? timeRemaining(position, duration)
      : (currentItem.sourceName ?? currentItem.sourceDomain ?? "");

  return (
    /*
     * Floating card: 8px margin on sides, bottom gap before tab bar.
     * surfaceElevated (#242438) background, 14px corner radius.
     * No shadow — depth via color elevation only (anti-slop rule).
     */
    <View
      style={{
        ...PLAYER_BAR_CONTAINER_STYLES,
        marginBottom: 0,
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
        {/* ── Thumbnail: 40×40 rounded rectangle (blueprint: size-mini-player-thumbnail = 40) ── */}
        <SourceThumbnail
          sourceType={currentItem.sourceType}
          sourceUrl={currentItem.sourceUrl}
          sourceName={currentItem.sourceName}
          size={40}
        />

        {/* ── Title + time ── */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={PLAYER_BAR_TITLE_STYLES}
            numberOfLines={1}
          >
            {displayTitle}
          </Text>
          <Text
            style={PLAYER_BAR_CAPTION_STYLES}
            numberOfLines={1}
          >
            {timeLabel}
          </Text>
        </View>

        {/* ── Controls: play/pause only (rewind-15 and skip-30 removed per blueprint) ── */}
        <TouchableOpacity
          onPress={() => { void Haptics.light(); void togglePlay(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width:           36,
            height:          36,
            alignItems:      "center",
            justifyContent:  "center",
            borderRadius:    18,
          }}
          accessibilityLabel={isPlaying ? "Pause" : "Play"}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={PLAYER_BAR_PLAY_ICON_SIZE}
            color="white"
          />
        </TouchableOpacity>
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
            backgroundColor: PLAYER_BAR_PROGRESS_FILL_COLOR,
            width:           `${progressPercent}%`,
          }}
        />
      </View>
    </View>
  );
}
