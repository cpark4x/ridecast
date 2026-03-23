import React, { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ---------------------------------------------------------------------------
// Confetti particle animation
// ---------------------------------------------------------------------------

interface ConfettiParticleProps {
  color: string;
  offsetX: number;
  offsetY: number;
  delay: number;
  size?: number;
}

function ConfettiParticle({ color, offsetX, offsetY, delay, size = 6 }: ConfettiParticleProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -55,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.9,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1800,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Reset instantly before next loop cycle
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity,    { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [translateY, opacity, delay]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        top: offsetY,
        left: offsetX,
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Confetti configuration — 8 particles around the check circle
// ---------------------------------------------------------------------------

const CONFETTI_DOTS = [
  { color: "#EA580C", offsetX: 14,  offsetY: 20,  delay: 0    },
  { color: "#FBBF24", offsetX: 44,  offsetY: 10,  delay: 300  },
  { color: "#60A5FA", offsetX: 94,  offsetY: 18,  delay: 600  },
  { color: "#34C759", offsetX: 84,  offsetY: 12,  delay: 900  },
  { color: "#A78BFA", offsetX: 6,   offsetY: 28,  delay: 1200 },
  { color: "#F472B6", offsetX: 104, offsetY: 8,   delay: 1500 },
  { color: "#FBBF24", offsetX: 28,  offsetY: 30,  delay: 400  },
  { color: "#EA580C", offsetX: 74,  offsetY: 22,  delay: 700, size: 4 },
] as const;

// ---------------------------------------------------------------------------
// CheckCircleScene — animated circle + confetti
// ---------------------------------------------------------------------------

function CheckCircleScene() {
  const scale   = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
      {/* Confetti particles — rendered behind the circle */}
      {CONFETTI_DOTS.map((dot, i) => (
        <ConfettiParticle key={i} {...dot} />
      ))}

      {/* Outer pulse ring */}
      <View
        style={{
          position: "absolute",
          width: 110,
          height: 110,
          borderRadius: 55,
          borderWidth: 1.5,
          borderColor: "rgba(34,197,94,0.2)",
        }}
      />

      {/* Green check circle */}
      <Animated.View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "#22C55E",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale }],
          opacity,
          shadowColor: "#22C55E",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <Ionicons name="checkmark" size={38} color="white" />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Suggestion card data
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  {
    title:    "A newsletter you love",
    desc:     "Paste a Substack or email newsletter URL",
    accentColor: "#F97316",
    iconName: "mail-outline" as const,
    iconColor: "#F97316",
  },
  {
    title:    "That PDF you've been putting off",
    desc:     "Upload a document and listen instead",
    accentColor: "#34C759",
    iconName: "document-text-outline" as const,
    iconColor: "#34C759",
  },
  {
    title:    "An article you saved",
    desc:     "Paste any URL — we'll extract and convert it",
    accentColor: "#60A5FA",
    iconName: "globe-outline" as const,
    iconColor: "#60A5FA",
  },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AllCaughtUpStats {
  episodeCount: number;
  totalHours: number;
}

interface AllCaughtUpEmptyStateProps {
  stats: AllCaughtUpStats;
  onAddNew: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AllCaughtUpEmptyState({
  stats,
  onAddNew,
}: AllCaughtUpEmptyStateProps) {
  return (
    <View className="flex-1 items-center px-6 pt-6 pb-8">

      {/* — Celebratory hero card — */}
      <View className="w-full bg-gray-50 rounded-3xl pt-8 pb-6 px-4 mb-5 items-center">
        <CheckCircleScene />
        <Text className="text-xl font-bold text-gray-900 text-center mt-5 mb-2">
          You're all caught up!
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-5 max-w-xs">
          You've listened to everything in your queue.{"\n"}Nice work — here's what to add next.
        </Text>
      </View>

      {/* — Stats bar — */}
      <View className="w-full flex-row bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 mb-5 items-center justify-around">
        <View className="items-center">
          <Text className="text-2xl font-bold text-gray-900">{stats.episodeCount}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">episodes</Text>
        </View>
        <View className="w-px h-8 bg-gray-200" />
        <View className="items-center">
          <Text className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">hours listened</Text>
        </View>
      </View>

      {/* — Suggestion cards — */}
      <Text className="text-base font-bold text-gray-900 self-start mb-3">
        Add something new
      </Text>
      <View className="w-full gap-2.5 mb-5">
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.title}
            onPress={onAddNew}
            activeOpacity={0.75}
            className="w-full flex-row items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm overflow-hidden"
          >
            {/* Left accent stripe */}
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 12,
                bottom: 12,
                width: 3,
                borderRadius: 2,
                backgroundColor: s.accentColor,
              }}
            />
            {/* Icon */}
            <View
              className="w-10 h-10 rounded-xl items-center justify-center ml-2"
              style={{ backgroundColor: `${s.accentColor}20` }}
            >
              <Ionicons name={s.iconName} size={20} color={s.iconColor} />
            </View>
            {/* Text */}
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                {s.title}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                {s.desc}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </View>

      {/* — Primary CTA — */}
      <TouchableOpacity
        onPress={onAddNew}
        activeOpacity={0.85}
        className="w-full bg-brand py-4 rounded-2xl items-center"
        accessibilityLabel="Add Something New"
      >
        <Text className="text-base font-bold text-white">Add Something New</Text>
      </TouchableOpacity>

    </View>
  );
}
