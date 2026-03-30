import React, { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, borderRadius } from "../../lib/theme";

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
  { color: colors.accentPrimary, offsetX: 14,  offsetY: 20,  delay: 0    },
  { color: "#FBBF24",            offsetX: 44,  offsetY: 10,  delay: 300  },
  { color: "#60A5FA",            offsetX: 94,  offsetY: 18,  delay: 600  },
  { color: colors.statusSuccess, offsetX: 84,  offsetY: 12,  delay: 900  },
  { color: "#A78BFA",            offsetX: 6,   offsetY: 28,  delay: 1200 },
  { color: "#F472B6",            offsetX: 104, offsetY: 8,   delay: 1500 },
  { color: "#FBBF24",            offsetX: 28,  offsetY: 30,  delay: 400  },
  { color: colors.accentPrimary, offsetX: 74,  offsetY: 22,  delay: 700, size: 4 },
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
          borderColor: "rgba(22,163,74,0.2)",
        }}
      />

      {/* Green check circle — statusSuccess, no shadow */}
      <Animated.View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.statusSuccess,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale }],
          opacity,
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
  },
  {
    title:    "That PDF you've been putting off",
    desc:     "Upload a document and listen instead",
    accentColor: colors.statusSuccess,
    iconName: "document-text-outline" as const,
  },
  {
    title:    "An article you saved",
    desc:     "Paste any URL — we'll extract and convert it",
    accentColor: "#60A5FA",
    iconName: "globe-outline" as const,
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
    <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>

      {/* — Celebratory hero card — */}
      <View
        style={{
          width: "100%",
          backgroundColor: colors.surface,
          borderRadius: 24,
          paddingTop: 32,
          paddingBottom: 24,
          paddingHorizontal: 16,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        <CheckCircleScene />
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.textPrimary,
            textAlign: "center",
            marginTop: 20,
            marginBottom: 8,
          }}
        >
          You're all caught up!
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
          You've listened to everything in your queue.{"\n"}Nice work — here's what to add next.
        </Text>
      </View>

      {/* — Stats bar — */}
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          backgroundColor: colors.surface,
          borderRadius: 16,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginBottom: 20,
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: colors.textPrimary }}>
            {stats.episodeCount}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>episodes</Text>
        </View>
        <View style={{ width: 1, height: 32, backgroundColor: colors.borderDivider }} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: "700", color: colors.textPrimary }}>
            {stats.totalHours.toFixed(1)}
          </Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>hours listened</Text>
        </View>
      </View>

      {/* — Suggestion cards — */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: colors.textPrimary,
          alignSelf: "flex-start",
          marginBottom: 12,
        }}
      >
        Add something new
      </Text>
      <View style={{ width: "100%", gap: 10, marginBottom: 20 }}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.title}
            onPress={onAddNew}
            activeOpacity={0.75}
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              overflow: "hidden",
            }}
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
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
                backgroundColor: `${s.accentColor}20`,
              }}
            >
              <Ionicons name={s.iconName} size={20} color={s.accentColor} />
            </View>
            {/* Text */}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}
                numberOfLines={1}
              >
                {s.title}
              </Text>
              <Text
                style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}
                numberOfLines={1}
              >
                {s.desc}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* — Primary CTA — */}
      <TouchableOpacity
        onPress={onAddNew}
        activeOpacity={0.85}
        style={{
          width: "100%",
          backgroundColor: colors.accentPrimary,
          paddingVertical: 16,
          borderRadius: borderRadius.card,
          alignItems: "center",
        }}
        accessibilityLabel="Add Something New"
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary }}>
          Add Something New
        </Text>
      </TouchableOpacity>

    </View>
  );
}
