import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../lib/usePlayer";
import { CAR_MODE_SKIP_SECS } from "../lib/constants";

interface CarModeProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function CarMode({ visible, onDismiss }: CarModeProps) {
  const insets = useSafeAreaInsets();
  const { currentItem, isPlaying, togglePlay, skipForward, skipBack } = usePlayer();

  if (!currentItem) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onDismiss}
    >
      <View
        className="flex-1 bg-black items-center justify-center"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {/* ── Close button (top-right) ──────────────────────────────────── */}
        <TouchableOpacity
          onPress={onDismiss}
          className="absolute top-0 right-4 p-3"
          style={{ top: insets.top + 8 }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close car mode"
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>

        {/* ── Main controls row ─────────────────────────────────────────── */}
        <View className="flex-row items-center justify-center gap-10">
          {/* Skip back 30s */}
          <TouchableOpacity
            onPress={() => void skipBack(CAR_MODE_SKIP_SECS)}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.3)",
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel={`Skip back ${CAR_MODE_SKIP_SECS} seconds`}
          >
            <Ionicons name="play-back" size={36} color="white" />
            <Text style={{ color: "white", fontSize: 11, marginTop: 2 }}>
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
              borderWidth: 3,
              borderColor: "white",
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

          {/* Skip forward 30s */}
          <TouchableOpacity
            onPress={() => void skipForward(CAR_MODE_SKIP_SECS)}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.3)",
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel={`Skip forward ${CAR_MODE_SKIP_SECS} seconds`}
          >
            <Ionicons name="play-forward" size={36} color="white" />
            <Text style={{ color: "white", fontSize: 11, marginTop: 2 }}>
              {CAR_MODE_SKIP_SECS}s
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Episode title (bottom center) ─────────────────────────────── */}
        <View className="absolute bottom-0 left-0 right-0 px-8 pb-6" style={{ bottom: insets.bottom + 16 }}>
          <Text
            className="text-white text-lg font-semibold text-center"
            numberOfLines={1}
          >
            {currentItem.title}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
