import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius } from "../lib/theme";

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
      <Ionicons name={icon} size={48} color={colors.textTertiary} />

      <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '600', marginTop: 20, textAlign: 'center' }}>
        {title}
      </Text>

      <Text style={{ color: colors.textSecondary, fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 24 }}>
        {subtitle}
      </Text>

      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.85}
          style={{ backgroundColor: colors.accentPrimary, borderRadius: borderRadius.card, paddingVertical: 12, paddingHorizontal: 24, marginTop: 24 }}
        >
          <Text style={{ color: 'white', fontWeight: '600', fontSize: 15 }}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
