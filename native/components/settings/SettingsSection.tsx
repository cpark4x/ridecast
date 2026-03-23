import React from "react";
import { Text, View } from "react-native";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="mt-6">
      <Text className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </Text>
      <View className="mx-4 bg-white rounded-2xl overflow-hidden border border-gray-100">
        {children}
      </View>
    </View>
  );
}
