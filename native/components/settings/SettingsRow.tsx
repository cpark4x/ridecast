import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";

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
  const labelColor = destructive
    ? colors.statusError
    : disabled
      ? colors.textTertiary
      : colors.textPrimary;

  const inner = (
    <View style={{
      paddingHorizontal: 16,
      paddingVertical: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
    }}>
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "500", color: labelColor }}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      {children ?? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {rightLabel ? (
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{rightLabel}</Text>
          ) : null}
          {onPress ? (
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
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
