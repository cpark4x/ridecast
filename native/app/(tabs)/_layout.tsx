import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Haptics } from "../../lib/haptics";
import { colors, sizes } from "../../lib/theme";

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
// Tab layout — 3 tabs: Home / Discover / Library
// ---------------------------------------------------------------------------

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={tabScreenOptions}
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

      {/* Tab 1: Discover — scaffold placeholder, full implementation in discover-screens spec */}
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
    </Tabs>
  );
}
