import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import Slider from "@react-native-community/slider";
import { DURATION_PRESETS, DURATION_SLIDER } from "../lib/constants";

// ---------------------------------------------------------------------------
// Pure helper — exported for unit tests
// ---------------------------------------------------------------------------

/**
 * Returns the index of the preset whose `minutes` value equals `value`,
 * or -1 if no preset matches.
 */
export function findActivePreset(
  value: number,
  presets: readonly { minutes: number; label: string }[],
): number {
  for (let i = 0; i < presets.length; i++) {
    if (presets[i].minutes === value) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DurationPickerProps {
  value: number;
  onChange: (minutes: number) => void;
}

export default function DurationPicker({ value, onChange }: DurationPickerProps) {
  const activeIdx = findActivePreset(value, DURATION_PRESETS);

  return (
    <View>
      {/* Preset chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 2, paddingBottom: 4 }}
      >
        {DURATION_PRESETS.map((preset, idx) => {
          const isActive = idx === activeIdx;
          return (
            <TouchableOpacity
              key={preset.minutes}
              onPress={() => onChange(preset.minutes)}
              className={`px-3 py-1.5 rounded-full ${
                isActive ? "bg-brand" : "bg-gray-100"
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                className={`text-sm font-medium ${
                  isActive ? "text-white" : "text-gray-700"
                }`}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Slider */}
      <View className="mt-3">
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={DURATION_SLIDER.min}
          maximumValue={DURATION_SLIDER.max}
          step={DURATION_SLIDER.step}
          value={value}
          minimumTrackTintColor="#EA580C"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#EA580C"
          onValueChange={(v) => onChange(Math.round(v))}
        />
        <Text className="text-sm text-gray-600 text-center font-medium">{value} min</Text>
      </View>
    </View>
  );
}
