import "../global.css";
import { useEffect } from "react";
import { AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "../lib/auth";
import { setTokenProvider } from "../lib/api";
import { setupPlayer } from "../lib/player";
import { PlaybackService } from "../lib/player";
import { PlayerProvider, usePlayer } from "../lib/usePlayer";
import PlayerBar from "../components/PlayerBar";
import ExpandedPlayer from "../components/ExpandedPlayer";
import OfflineBanner from "../components/OfflineBanner";
import TrackPlayer from "react-native-track-player";
import { initializeCarPlay } from "../lib/carplay";
import { syncLibrary, syncPlayback } from "../lib/sync";

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
  const { expandedPlayerVisible, setExpandedPlayerVisible } = usePlayer();

  // Set up RNTP once on mount, then initialize CarPlay (fire-and-forget)
  useEffect(() => {
    setupPlayer()
      .then(() => initializeCarPlay())
      .catch((err) => console.warn("[player] setup error:", err));
  }, []);

  // Sync library + playback every time the app returns to the foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        syncLibrary().catch(console.warn);
        syncPlayback().catch(console.warn);
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      {children}
      <PlayerBar />
      <ExpandedPlayer
        visible={expandedPlayerVisible}
        onDismiss={() => setExpandedPlayerVisible(false)}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                    headerShown: false,
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
    </GestureHandlerRootView>
  );
}
