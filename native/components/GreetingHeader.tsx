// native/components/GreetingHeader.tsx

import React from "react";
import { Text, View } from "react-native";
import { formatDurationMinutes } from "../lib/utils";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GreetingHeaderProps {
  firstName: string | null;
  episodeCount: number;
  totalDurationSecs: number;
}

// ---------------------------------------------------------------------------
// Component — no settings gear (settings gear belongs on Library screen only)
// ---------------------------------------------------------------------------

export default function GreetingHeader({
  firstName,
  episodeCount,
  totalDurationSecs,
}: GreetingHeaderProps) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
      <Text
        style={{
          fontSize:      26,
          fontWeight:    "700",
          color:         "#000",
          letterSpacing: -0.5,
          lineHeight:    31,
        }}
      >
        {getGreeting()}{firstName ? `, ${firstName}` : ""}
      </Text>

      {episodeCount > 0 ? (
        <Text
          style={{
            fontSize:   13,
            color:      "#8e8e93",
            marginTop:  3,
            fontWeight: "400",
          }}
        >
          {episodeCount} episode{episodeCount === 1 ? "" : "s"}{" "}
          · {formatDurationMinutes(totalDurationSecs)}
        </Text>
      ) : (
        <Text
          style={{
            fontSize:   13,
            color:      "#8e8e93",
            marginTop:  3,
            fontWeight: "400",
          }}
        >
          Your queue is clear
        </Text>
      )}
    </View>
  );
}
