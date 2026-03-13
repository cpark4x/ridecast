import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SettingsRowProps {
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightLabel?: string;
  children?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export default function SettingsRow({
  label,
  subtitle,
  onPress,
  rightLabel,
  children,
  destructive = false,
  disabled = false,
}: SettingsRowProps) {
  const inner = (
    <View className="px-4 py-4 flex-row items-center justify-between">
      <View className="flex-1 mr-3">
        <Text
          className={`text-base font-medium ${
            destructive ? "text-red-500" : disabled ? "text-gray-400" : "text-gray-900"
          }`}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
        ) : null}
      </View>
      {children ?? (
        <View className="flex-row items-center gap-1">
          {rightLabel ? (
            <Text className="text-sm text-gray-400">{rightLabel}</Text>
          ) : null}
          {onPress ? (
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          ) : null}
        </View>
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}
