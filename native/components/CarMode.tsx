import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../lib/usePlayer";
import { CAR_MODE_SKIP_SECS } from "../lib/constants";
import { colors } from "../lib/theme";

interface CarModeProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function CarMode({ visible, onDismiss }: CarModeProps) {
  const insets = useSafeAreaInsets();
  const { currentItem, isPlaying, togglePlay, skipForward, skipBack, position, duration } = usePlayer();

  if (!currentItem) return null;

  // Progress bar fill — protect against division by zero
  const progressFill = Math.min(position / Math.max(duration, 1), 1);
  const progressWidthPct = `${Math.floor(progressFill * 100)}%` as `${number}%`;

  // Source display: domain > author > empty
  const sourceDisplay = currentItem.sourceDomain ?? currentItem.author ?? "";

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onDismiss}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.backgroundOled,
          alignItems: "center",
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {/* ── Close button (top-right) ──────────────────────────────────── */}
        <TouchableOpacity
          onPress={onDismiss}
          style={{ position: "absolute", top: insets.top + 8, right: 16, padding: 12 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close car mode"
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>

        {/* ── ArticleInfoSection (absolute top area) ─────────────────────── */}
        <View style={{
          position: "absolute",
          top: insets.top + 48,
          left: 24,
          right: 24,
        }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: "#FFFFFF",
              lineHeight: 33.6,
            }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {currentItem.title}
          </Text>
          {sourceDisplay ? (
            <Text
              style={{ fontSize: 16, fontWeight: "400", color: "#9CA3AF", marginTop: 8 }}
              numberOfLines={1}
            >
              {sourceDisplay}
            </Text>
          ) : null}
        </View>

        {/* ── Content area (centered controls) ─────────────────────────── */}
        <View style={{ flex: 1, justifyContent: "center", width: "100%" }}>
          {/* Progress bar */}
          <View style={{
            height: 6,
            backgroundColor: "#1A1A2E",
            borderRadius: 3,
            marginHorizontal: 40,
            marginBottom: 48,
          }}>
            <View style={{
              backgroundColor: colors.accentPrimary,
              height: 6,
              borderRadius: 3,
              width: progressWidthPct,
              minWidth: 0,
            }} />
          </View>

          {/* Main controls row */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {/* Skip back */}
            <TouchableOpacity
              onPress={() => void skipBack(CAR_MODE_SKIP_SECS)}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#1A1A2E",
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel={`Skip back ${CAR_MODE_SKIP_SECS} seconds`}
            >
              <Ionicons name="play-back" size={36} color="white" />
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 }}>
                {CAR_MODE_SKIP_SECS}s
              </Text>
            </TouchableOpacity>

            {/* Play / Pause */}
            <TouchableOpacity
              onPress={() => void togglePlay()}
              style={{
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: colors.accentPrimary,
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={64}
                color="white"
                style={{ marginLeft: isPlaying ? 0 : 6 }}
              />
            </TouchableOpacity>

            {/* Skip forward */}
            <TouchableOpacity
              onPress={() => void skipForward(CAR_MODE_SKIP_SECS)}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#1A1A2E",
                alignItems: "center",
                justifyContent: "center",
              }}
              accessibilityLabel={`Skip forward ${CAR_MODE_SKIP_SECS} seconds`}
            >
              <Ionicons name="play-forward" size={36} color="white" />
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 2 }}>
                {CAR_MODE_SKIP_SECS}s
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* Note: bottom episode title removed — now shown in ArticleInfoSection at top */}
      </View>
    </Modal>
  );
}
