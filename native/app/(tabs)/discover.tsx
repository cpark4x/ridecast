import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography } from "../../lib/theme";

// ---------------------------------------------------------------------------
// Discover Screen — scaffold placeholder (AC-9)
// Full implementation: discover-screens spec (phase5)
// ---------------------------------------------------------------------------

export default function DiscoverScreen(): JSX.Element {
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
