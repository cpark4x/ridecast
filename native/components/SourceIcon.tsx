import React from "react";
import { Text, View } from "react-native";
import { hashColor } from "../lib/sourceUtils";

interface SourceIconProps {
  sourceName:       string | null | undefined;
  sourceDomain:     string | null | undefined;
  sourceBrandColor: string | null | undefined;
  /** Diameter in pixels — defaults to 24 */
  size?: number;
}

/**
 * Renders a coloured circle with the first letter of the source name.
 *
 * Colour priority:
 *   1. sourceBrandColor (explicit brand colour from KNOWN_SOURCES)
 *   2. hashColor(sourceDomain)  — deterministic colour from domain string
 *   3. hashColor(sourceName)    — fallback when domain is unavailable
 *   4. #9CA3AF                  — neutral gray last-resort
 */
export default function SourceIcon({
  sourceName,
  sourceDomain,
  sourceBrandColor,
  size = 24,
}: SourceIconProps) {
  const letter = sourceName ? sourceName.charAt(0).toUpperCase() : "?";

  let bgColor: string;
  if (sourceBrandColor) {
    bgColor = sourceBrandColor;
  } else if (sourceDomain) {
    bgColor = hashColor(sourceDomain);
  } else if (sourceName) {
    bgColor = hashColor(sourceName);
  } else {
    bgColor = "#9CA3AF";
  }

  const fontSize = Math.max(8, Math.round(size * 0.46));

  return (
    <View
      style={{
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        backgroundColor: bgColor,
        alignItems:      "center",
        justifyContent:  "center",
      }}
    >
      <Text style={{ color: "white", fontSize, fontWeight: "700", lineHeight: size }}>
        {letter}
      </Text>
    </View>
  );
}
