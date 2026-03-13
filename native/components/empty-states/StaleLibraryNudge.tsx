import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StaleLibraryNudgeProps {
  daysSinceNewest: number;
  /** Most common source domain in the library, e.g. "espn.com" — may be null */
  topSourceDomain: string | null;
  onDismiss: () => void;
  onAddNew: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaleLibraryNudge({
  daysSinceNewest,
  topSourceDomain,
  onDismiss,
  onAddNew,
}: StaleLibraryNudgeProps) {
  return (
    <View className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-semibold text-amber-900 mb-1">
            Your newest content is {daysSinceNewest} day{daysSinceNewest === 1 ? "" : "s"} old
          </Text>
          <Text className="text-xs text-amber-700 leading-4">
            {topSourceDomain
              ? `Check ${topSourceDomain} for new articles to add`
              : "Paste a URL to create a new episode"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={16} color="#92400E" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onAddNew}
        activeOpacity={0.8}
        className="mt-3 bg-amber-500 py-2 rounded-xl items-center"
        accessibilityLabel="Add Episode"
      >
        <Text className="text-xs font-bold text-white">Add Episode</Text>
      </TouchableOpacity>
    </View>
  );
}
