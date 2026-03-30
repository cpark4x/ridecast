import React, { useEffect, useRef } from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, typography } from "../../lib/theme";

// ---------------------------------------------------------------------------
// Discover Screen
// Full FTUE implementation: discover-ftue spec (phase5)
// Full screen implementation: discover-screens spec (phase5)
// ---------------------------------------------------------------------------

export default function DiscoverScreen() {
  const router = useRouter();
  const ftueChecked = useRef(false);

  useEffect(() => {
    // Guard: only fire once per mount cycle
    if (ftueChecked.current) return;
    ftueChecked.current = true;

    checkFTUE();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkFTUE() {
    try {
      const completed = await AsyncStorage.getItem("discover_ftue_completed");
      if (!completed) {
        router.replace("/discover-ftue-topics");
      }
    } catch (err) {
      // AsyncStorage failure — skip FTUE gate, show main screen
      console.warn("[discover] FTUE check error:", err);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{ color: colors.textPrimary, fontSize: typography.sizes.h1 }}
        >
          Discover
        </Text>
      </View>
    </SafeAreaView>
  );
}
