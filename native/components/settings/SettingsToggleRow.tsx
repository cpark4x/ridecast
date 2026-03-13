import React from "react";
import { Switch, Text, View } from "react-native";

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
    <View className="px-4 py-3.5 flex-row items-center justify-between">
      <View className="flex-1 mr-4">
        <Text className={`text-base font-medium ${disabled ? "text-gray-400" : "text-gray-900"}`}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#D1D5DB", true: "#EA580C" }}
        thumbColor="white"
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}
