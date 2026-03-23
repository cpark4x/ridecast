import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function ShimmerCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ).start();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  return (
    <View style={styles.card}>
      {/* Animated shimmer overlay */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Placeholder layout — mirrors EpisodeCard structure */}
      <View style={styles.body}>
        {/* Title placeholder — two lines */}
        <View style={[styles.line, { width: "75%", marginBottom: 8 }]} />
        <View style={[styles.line, { width: "50%", height: 10, marginBottom: 12 }]} />
        {/* Footer placeholder — source badge + version pill */}
        <View style={styles.footer}>
          <View style={[styles.pill, { width: 36 }]} />
          <View style={[styles.pill, { width: 52 }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    height: 96,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  body: { padding: 16 },
  line: { height: 14, backgroundColor: "#F3F4F6", borderRadius: 99 },
  footer: { flexDirection: "row", gap: 8 },
  pill: { height: 20, backgroundColor: "#F3F4F6", borderRadius: 99 },
});