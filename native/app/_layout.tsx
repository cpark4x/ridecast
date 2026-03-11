import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="processing"
          options={{ presentation: "fullScreenModal", gestureEnabled: false }}
        />
        <Stack.Screen
          name="settings"
          options={{ presentation: "modal", headerShown: true, title: "Settings" }}
        />
        <Stack.Screen
          name="sign-in"
          options={{ presentation: "fullScreenModal", gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
