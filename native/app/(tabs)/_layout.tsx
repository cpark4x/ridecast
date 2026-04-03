import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Haptics } from "../../lib/haptics";
import { colors, sizes } from "../../lib/theme";
import PlayerBar from "../../components/PlayerBar";

// ---------------------------------------------------------------------------
// Exported for testability (TabLayout.test.tsx — AC-2 through AC-5)
// ---------------------------------------------------------------------------

export const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor:   colors.accentPrimary,    // '#FF6B35'
  tabBarInactiveTintColor: colors.textTertiary,     // '#6B7280'
  tabBarStyle: {
    backgroundColor: colors.surface,               // '#1A1A2E'
    borderTopColor:  colors.borderDivider,          // 'rgba(255,255,255,0.06)'
    borderTopWidth:  1,
    height:          sizes.tabBarHeight,            // 56
  },
  lazy: true,
} as const;

// ---------------------------------------------------------------------------
// Icon name helpers — exported for testability (AC-6, AC-7, AC-8)
// focused → filled variant; unfocused → outline variant
// ---------------------------------------------------------------------------

export function getHomeIcon(focused: boolean): React.ComponentProps<typeof Ionicons>["name"] {
  return focused ? "home" : "home-outline";
}

export function getDiscoverIcon(focused: boolean): React.ComponentProps<typeof Ionicons>["name"] {
  return focused ? "compass" : "compass-outline";
}

export function getLibraryIcon(focused: boolean): React.ComponentProps<typeof Ionicons>["name"] {
  return focused ? "library" : "library-outline";
}

// ---------------------------------------------------------------------------
// Custom tab bar — PlayerBar floats directly above the native tab bar.
// We own safe-area handling at the wrapper level: paddingBottom pushes content
// above the home indicator and the background colour fills the gap.
// BottomTabBar's own bottom inset is zeroed out to prevent double-counting.
// ---------------------------------------------------------------------------

function TabBarWithPlayer(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colors.surface, paddingBottom: insets.bottom }}>
      <PlayerBar />
      <BottomTabBar {...props} insets={{ ...props.insets, bottom: 0 }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tab layout — 3 tabs: Home / Discover / Library
// ---------------------------------------------------------------------------

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={tabScreenOptions}
      tabBar={(props) => <TabBarWithPlayer {...props} />}
      screenListeners={{
        tabPress: () => {
          void Haptics.light();
        },
      }}
    >
      {/* Tab 0: Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={getHomeIcon(focused)} size={size} color={color} />
          ),
        }}
      />

      {/* Tab 1: Discover — full implementation (discover-screens spec, F-P5-UI-11) */}
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={getDiscoverIcon(focused)} size={size} color={color} />
          ),
        }}
      />

      {/* Tab 2: Library */}
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons name={getLibraryIcon(focused)} size={size} color={color} />
          ),
        }}
      />

      {/* Hidden drill-down: Source Detail — accessible from Library or Discover */}
      <Tabs.Screen
        name="source-detail"
        options={{ href: null, headerShown: false }}
      />

      {/* Hidden drill-down: Discover Topic — registered in tab shell so tab bar + mini player remain visible */}
      <Tabs.Screen
        name="discover-topic"
        options={{ href: null, headerShown: false }}
      />
    </Tabs>
  );
}
