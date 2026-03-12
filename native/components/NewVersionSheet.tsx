import React, { useState } from "react";
import {
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import DurationPicker from "./DurationPicker";
import type { LibraryItem } from "../lib/types";

export interface NewVersionSheetProps {
  visible: boolean;
  onDismiss: () => void;
  episode: LibraryItem;
}

export default function NewVersionSheet({
  visible,
  onDismiss,
  episode,
}: NewVersionSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Default to first existing version's target duration, or 5 min
  const defaultMinutes =
    episode.versions[0]?.targetDuration ?? 5;
  const [targetMinutes, setTargetMinutes] = useState(defaultMinutes);

  function handleGenerate() {
    onDismiss();
    router.push(
      `/processing?contentId=${episode.id}&targetMinutes=${targetMinutes}`,
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        className="flex-1 bg-black/40 justify-end"
        activeOpacity={1}
        onPress={onDismiss}
      >
        {/* Sheet */}
        <TouchableOpacity
          activeOpacity={1}
          className="bg-white rounded-t-3xl overflow-hidden"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Drag handle */}
          <View className="items-center pt-3 pb-1">
            <View className="w-10 h-1 rounded-full bg-gray-300" />
          </View>

          {/* Header */}
          <View className="px-5 pt-3 pb-4">
            <Text className="text-lg font-bold text-gray-900">New Version</Text>
            <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
              {episode.title}
            </Text>
          </View>

          {/* Duration picker */}
          <View className="px-5 mb-5">
            <Text className="text-sm font-semibold text-gray-700 mb-3">
              Target Duration
            </Text>
            <DurationPicker value={targetMinutes} onChange={setTargetMinutes} />
          </View>

          {/* Actions */}
          <View className="px-5 gap-3">
            <TouchableOpacity
              onPress={handleGenerate}
              activeOpacity={0.85}
              className="bg-brand py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold text-base">Generate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onDismiss}
              activeOpacity={0.85}
              className="bg-gray-100 py-4 rounded-2xl items-center"
            >
              <Text className="text-gray-700 font-semibold text-base">
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
