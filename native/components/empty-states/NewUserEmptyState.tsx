import React, { useEffect, useState } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { colors, borderRadius } from "../../lib/theme";
import EmptyStateCTAButton from "./EmptyStateCTAButton";

// ---------------------------------------------------------------------------
// Waveform bar configuration
// Heights mirror a symmetric mountain shape (center = tallest)
// ---------------------------------------------------------------------------

const BARS: Array<{ height: number; delay: number; opacity: number }> = [
  { height: 14, delay:   0, opacity: 0.35 },
  { height: 20, delay:   0, opacity: 1.0  },
  { height: 22, delay: 120, opacity: 0.35 },
  { height: 32, delay: 120, opacity: 1.0  },
  { height: 38, delay: 240, opacity: 0.45 },
  { height: 48, delay: 240, opacity: 1.0  },
  { height: 44, delay: 360, opacity: 0.45 },
  { height: 56, delay: 360, opacity: 1.0  },
  { height: 48, delay: 480, opacity: 0.50 },
  { height: 64, delay: 480, opacity: 1.0  }, // center / tallest
  { height: 48, delay: 480, opacity: 0.50 },
  { height: 56, delay: 360, opacity: 1.0  },
  { height: 44, delay: 360, opacity: 0.45 },
  { height: 48, delay: 240, opacity: 1.0  },
  { height: 38, delay: 240, opacity: 0.45 },
  { height: 32, delay: 120, opacity: 1.0  },
  { height: 22, delay: 120, opacity: 0.35 },
  { height: 20, delay:   0, opacity: 1.0  },
  { height: 14, delay:   0, opacity: 0.35 },
];

// ---------------------------------------------------------------------------
// AnimatedWaveform
// ---------------------------------------------------------------------------

const AnimatedWaveform = React.memo(function AnimatedWaveform() {
  const [anims] = useState(() => BARS.map(() => new Animated.Value(1)));

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(BARS[i].delay),
          Animated.timing(anim, {
            toValue: 0.35,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [anims]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 3,
        height: 72,
        justifyContent: "center",
      }}
    >
      {BARS.map((bar, i) => (
        <Animated.View
          key={i}
          style={{
            width: 5,
            height: bar.height,
            borderRadius: 3,
            backgroundColor: colors.accentPrimary,
            opacity: anims[i].interpolate({
              inputRange:  [0.35, 1],
              outputRange: [bar.opacity * 0.35, bar.opacity],
            }),
            transform: [{ scaleY: anims[i] }],
          }}
        />
      ))}
    </View>
  );
});

// ---------------------------------------------------------------------------
// 3-step flow data
// ---------------------------------------------------------------------------

const STEPS = [
  { icon: "\u{1F517}", label: "Paste a URL or\nupload a file"        },
  { icon: "\u2728",     label: "We create a smart\naudio episode"      },
  { icon: "\u{1F3A7}", label: "Listen anywhere,\nanytime"             },
] as const;

// ---------------------------------------------------------------------------
// Suggestion pills data
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  { label: "A Substack post",  color: "#F97316" },
  { label: "A news article",   color: "#60A5FA" },
  { label: "A PDF from work",  color: "#34C759" },
  { label: "A GitHub README",  color: "#A78BFA" },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NewUserEmptyStateProps {
  onCreateEpisode: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewUserEmptyState({ onCreateEpisode }: NewUserEmptyStateProps) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>

      {/* — Waveform hero — */}
      <View
        style={{
          width: "100%",
          backgroundColor: colors.surface,
          borderRadius: 24,
          paddingTop: 32,
          paddingBottom: 24,
          paddingHorizontal: 16,
          marginBottom: 32,
          alignItems: "center",
        }}
      >
        <AnimatedWaveform />
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.textPrimary,
            textAlign: "center",
            marginTop: 24,
            marginBottom: 8,
          }}
        >
          Turn anything into audio
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            textAlign: "center",
            lineHeight: 20,
            maxWidth: 280,
          }}
        >
          Articles, PDFs, newsletters, docs — we turn them into episodes for your commute.
        </Text>
      </View>

      {/* — 3-step flow — */}
      <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", marginBottom: 32, paddingHorizontal: 8 }}>
        {STEPS.map((step, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center", gap: 10 }}>
            {/* Icon circle */}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 18 }}>{step.icon}</Text>
              {/* Step number badge */}
              <View
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: colors.accentPrimary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "white", fontSize: 8, fontWeight: "700" }}>
                  {i + 1}
                </Text>
              </View>
            </View>
            {/* Label */}
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 16,
              }}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      {/* — Primary CTA — */}
      <EmptyStateCTAButton
        label="Create Your First Episode"
        onPress={onCreateEpisode}
        style={{ marginBottom: 24 }}
      />

      {/* — Suggestion pills — */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 12,
        }}
      >
        Try one of these
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.label}
            onPress={onCreateEpisode}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: colors.surfaceElevated,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: borderRadius.full,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.color }} />
            <Text style={{ fontSize: 12, fontWeight: "500", color: colors.textSecondary }}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
}
