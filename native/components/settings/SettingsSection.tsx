import React from "react";
import { Text, View } from "react-native";
import { colors, borderRadius } from "../../lib/theme";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={{
        paddingHorizontal: 16,
        fontSize: 12,
        fontWeight: "600",
        color: colors.textSecondary,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        marginBottom: 8,
      }}>
        {title}
      </Text>
      <View style={{
        marginHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.card,
        overflow: "hidden",
      }}>
        {children}
      </View>
    </View>
  );
}
