// native/components/GreetingHeader.tsx — new file

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { formatDurationMinutes } from "../lib/utils";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GreetingHeaderProps {
  firstName: string | null;
  episodeCount: number;
  totalDurationSecs: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GreetingHeader({
  firstName,
  episodeCount,
  totalDurationSecs,
}: GreetingHeaderProps) {
  const router = useRouter();

  return (
    <View className="px-4 pt-3 pb-4 flex-row items-start justify-between">
      <View className="flex-1">
        <Text className="text-2xl font-bold text-gray-900">
          {getGreeting()}{firstName ? `, ${firstName}` : ""}
        </Text>

        {episodeCount > 0 ? (
          <Text className="text-sm text-gray-500 mt-0.5">
            {episodeCount} episode{episodeCount === 1 ? "" : "s"}{" "}
            · {formatDurationMinutes(totalDurationSecs)}
          </Text>
        ) : (
          <Text className="text-sm text-gray-500 mt-0.5">Your queue is clear</Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => router.push("/settings")}
        className="p-2 -mr-1 mt-0.5"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Settings"
      >
        <Ionicons name="settings-outline" size={22} color="#374151" />
      </TouchableOpacity>
    </View>
  );
}