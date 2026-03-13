import React, { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

function AnimatedWaveform() {
  const anims = useRef(BARS.map(() => new Animated.Value(1))).current;

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
            backgroundColor: "#EA580C",
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
}

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
    <View className="flex-1 items-center px-6 pt-6 pb-8">

      {/* — Waveform hero — */}
      <View className="w-full bg-gray-50 rounded-3xl pt-8 pb-6 px-4 mb-8 items-center">
        <AnimatedWaveform />
        <Text className="text-xl font-bold text-gray-900 text-center mt-6 mb-2">
          Turn anything into audio
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-5 max-w-xs">
          Articles, PDFs, newsletters, docs — we turn them into episodes for your commute.
        </Text>
      </View>

      {/* — 3-step flow — */}
      <View className="w-full flex-row justify-between mb-8 px-2">
        {STEPS.map((step, i) => (
          <View key={i} className="flex-1 items-center gap-2.5">
            {/* Icon circle */}
            <View className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 items-center justify-center">
              <Text style={{ fontSize: 18 }}>{step.icon}</Text>
              {/* Step number badge */}
              <View
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand items-center justify-center"
              >
                <Text className="text-white text-xs font-bold" style={{ fontSize: 8 }}>
                  {i + 1}
                </Text>
              </View>
            </View>
            {/* Label */}
            <Text className="text-xs font-semibold text-gray-500 text-center leading-4">
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      {/* — Primary CTA — */}
      <TouchableOpacity
        onPress={onCreateEpisode}
        activeOpacity={0.85}
        className="w-full bg-brand py-4 rounded-2xl items-center mb-6"
        accessibilityLabel="Create Your First Episode"
      >
        <Text className="text-base font-bold text-white">
          Create Your First Episode
        </Text>
      </TouchableOpacity>

      {/* — Suggestion pills — */}
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Try one of these
      </Text>
      <View className="flex-row flex-wrap gap-2 justify-center">
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.label}
            onPress={onCreateEpisode}
            className="flex-row items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full"
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.color }} />
            <Text className="text-xs font-medium text-gray-600">{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
}
