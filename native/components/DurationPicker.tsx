import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import Slider from "@react-native-community/slider";
import { DURATION_PRESETS, DURATION_SLIDER } from "../lib/constants";
import { colors, borderRadius } from "../lib/theme";

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
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: borderRadius.full,
                backgroundColor: isActive ? colors.accentPrimary : colors.surfaceElevated,
                ...(isActive ? {} : {
                  borderWidth: 1,
                  borderColor: colors.borderInput,
                }),
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: isActive ? colors.textPrimary : colors.textSecondary,
                }}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Slider */}
      <View style={{ marginTop: 12 }}>
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={DURATION_SLIDER.min}
          maximumValue={DURATION_SLIDER.max}
          step={DURATION_SLIDER.step}
          value={value}
          minimumTrackTintColor={colors.accentPrimary}
          maximumTrackTintColor={colors.surfaceElevated}
          thumbTintColor={colors.accentPrimary}
          onValueChange={(v) => onChange(Math.round(v))}
        />
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: "center", fontWeight: "500" }}>
          {value} min
        </Text>
      </View>
    </View>
  );
}
