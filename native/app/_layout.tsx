import "../global.css";
import { useEffect } from "react";
import { View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "../lib/auth";
import { setTokenProvider } from "../lib/api";
import { setupPlayer } from "../lib/player";
import { PlaybackService } from "../lib/player";
import { PlayerProvider } from "../lib/usePlayer";
import PlayerBar from "../components/PlayerBar";
import TrackPlayer from "react-native-track-player";

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

// MUST be called at module scope — not inside a component
TrackPlayer.registerPlaybackService(() => PlaybackService);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Wire Clerk's getToken into the API client
  useEffect(() => {
    setTokenProvider(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    const onSignInScreen = segments[0] === "sign-in";
    if (!isSignedIn && !onSignInScreen) {
      router.replace("/sign-in");
    } else if (isSignedIn && onSignInScreen) {
      router.replace("/");
    }
  }, [isSignedIn, isLoaded, segments, router]);

  return <>{children}</>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  // Set up RNTP once on mount
  useEffect(() => {
    setupPlayer().catch((err) =>
      console.warn("[player] setupPlayer error:", err),
    );
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      <PlayerBar />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <StatusBar style="dark" />
        <AuthGate>
          <PlayerProvider>
            <AppShell>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="processing"
                  options={{
                    presentation: "fullScreenModal",
                    gestureEnabled: false,
                  }}
                />
                <Stack.Screen
                  name="settings"
                  options={{
                    presentation: "modal",
                    headerShown: true,
                    title: "Settings",
                  }}
                />
                <Stack.Screen
                  name="sign-in"
                  options={{
                    presentation: "fullScreenModal",
                    gestureEnabled: false,
                  }}
                />
              </Stack>
            </AppShell>
          </PlayerProvider>
        </AuthGate>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
