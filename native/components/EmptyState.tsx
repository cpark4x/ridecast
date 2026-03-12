import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <Ionicons name={icon} size={48} color="#D1D5DB" />

      <Text className="text-xl font-semibold text-gray-900 mt-5 text-center">
        {title}
      </Text>

      <Text className="text-base text-gray-500 mt-2 text-center leading-6">
        {subtitle}
      </Text>

      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.85}
          className="bg-brand rounded-2xl py-3 px-6 mt-6"
        >
          <Text className="text-white font-semibold text-base">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
