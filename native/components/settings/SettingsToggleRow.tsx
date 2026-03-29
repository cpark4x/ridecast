import React from "react";
import { Switch, Text, View } from "react-native";
import { colors } from "../../lib/theme";

interface SettingsToggleRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void | Promise<void>;
  disabled?: boolean;
}

export default function SettingsToggleRow({
  label,
  subtitle,
  value,
  onChange,
  disabled = false,
}: SettingsToggleRowProps) {
  return (
    <View style={{
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
    }}>
      <View style={{ flex: 1, marginRight: 16 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: "500",
          color: disabled ? colors.textTertiary : colors.textPrimary,
        }}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.surfaceElevated, true: colors.accentPrimary }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.surfaceElevated}
      />
    </View>
  );
}
