import React from "react";
import { Text, View } from "react-native";
import NetInfo from "@react-native-community/netinfo";

/**
 * Slim amber banner that appears at the top of the screen when the device
 * has no internet connection.  Uses react-native-community/netinfo.
 *
 * Positioning: rendered in the root layout, above the Stack navigator but
 * below the StatusBar, so it overlays every screen.
 */
export default function OfflineBanner() {
  const [isConnected, setIsConnected] = React.useState<boolean | null>(true);

  React.useEffect(() => {
    // Subscribe to connectivity changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    return unsubscribe;
  }, []);

  if (isConnected !== false) return null;

  return (
    <View
      style={{ height: 32, backgroundColor: "#F59E0B" }}
      className="items-center justify-center"
    >
      <Text className="text-white text-xs font-semibold">
        No internet connection
      </Text>
    </View>
  );
}
