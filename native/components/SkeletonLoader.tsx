// native/components/SkeletonLoader.tsx — new file

import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

// ---------------------------------------------------------------------------
// Single shimmer card — matches 3-column EpisodeCard layout
// ---------------------------------------------------------------------------

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const bg = shimmer.interpolate({
    inputRange:  [0, 1],
    outputRange: ["#F3F4F6", "#E5E7EB"],
  });

  return (
    <View className="mx-4 mb-3 bg-white rounded-2xl p-4 shadow-sm overflow-hidden">
      <View className="flex-row gap-3 items-start">
        {/* Left column placeholder — SourceIcon */}
        <Animated.View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: bg }} />

        {/* Center column placeholder */}
        <View className="flex-1 gap-2">
          <Animated.View style={{ height: 13, borderRadius: 4, backgroundColor: bg, width: "72%" }} />
          <Animated.View style={{ height: 10, borderRadius: 4, backgroundColor: bg, width: "48%" }} />
          <Animated.View style={{ height: 10, borderRadius: 4, backgroundColor: bg, width: "88%" }} />
        </View>

        {/* Right column placeholder — duration pill */}
        <Animated.View style={{ width: 48, height: 22, borderRadius: 6, backgroundColor: bg }} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

interface SkeletonListProps {
  count?: number;
}

export function SkeletonList({ count = 4 }: SkeletonListProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}