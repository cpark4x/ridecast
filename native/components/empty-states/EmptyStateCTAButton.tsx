import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { colors, borderRadius, sizes, typography } from "../../lib/theme";

const BASE_STYLE: ViewStyle = {
  width: "100%",
  backgroundColor: colors.accentPrimary,
  height: sizes.buttonHeight,
  justifyContent: "center",
  borderRadius: borderRadius.card,
  alignItems: "center",
};

const TEXT_STYLE = {
  fontSize: typography.sizes.body,
  fontWeight: typography.weights.bold,
  color: colors.textPrimary,
};

export interface EmptyStateCTAButtonProps {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export default function EmptyStateCTAButton({
  label,
  onPress,
  accessibilityLabel,
  style,
}: EmptyStateCTAButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={StyleSheet.compose(BASE_STYLE, style)}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
    >
      <Text style={TEXT_STYLE}>{label}</Text>
    </TouchableOpacity>
  );
}
