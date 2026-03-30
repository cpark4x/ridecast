// native/app/sign-in.tsx
// Sign-In screen — dark theme visual refresh
// Spec: specs/features/phase5/redesign-sign-in.md (F-P5-UI-03)
// Auth logic unchanged: useOAuth + startOAuthFlow (Clerk native pattern)

import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useCallback, useState } from "react";
import { colors } from "../lib/theme";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth logic unchanged — keep useOAuth + startOAuthFlow (AC-4)
  const handleAppleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/"),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      setError("Sign in failed. Please try again.");
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
  }, [startOAuthFlow]);

  return (
    // AC-1: Dark background, no white/light background
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>

      {/* ── AtmosphereLayer — decorative radial glows (AC-2, AC-7, AC-10) ── */}
      {/* Both use pointerEvents: 'none' — do not intercept touches */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
        {/* OrangeGlow */}
        <View
          style={{
            position: "absolute",
            top: -60,
            alignSelf: "center",
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: "rgba(255,107,53,0.15)",
          }}
        />
        {/* TealGlow */}
        <View
          style={{
            position: "absolute",
            bottom: 160,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: "rgba(13,148,136,0.12)",
          }}
        />
      </View>

      {/* ── BrandSection ── */}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 }}>
        {/* AC-3: Real logo asset, NOT generic icon */}
        {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
        <Image
          source={require("../../ui-studio/components/ridecast-logo-clean.png")}
          style={{ width: 200, height: 56, resizeMode: "contain" }}
        />
        {/* App name */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: colors.textPrimary,
            marginTop: 16,
          }}
        >
          Ridecast
        </Text>
        {/* Tagline */}
        <Text
          style={{
            fontSize: 15,
            fontWeight: "400",
            color: colors.textSecondary,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          Turn any article, PDF, or link into a podcast episode you can listen to on your commute.
        </Text>
        {/* Subtagline */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: "400",
            color: colors.textTertiary,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          Upload. Listen. Learn.
        </Text>
      </View>

      {/* ── AuthSection ── */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* AC-5, AC-6: White pill button, black icon + text */}
        <TouchableOpacity
          onPress={handleAppleSignIn}
          disabled={loading}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 9999,
            height: 52,
            paddingHorizontal: 24,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {loading ? (
            // AC loading spinner: black on white button
            <ActivityIndicator color="#000000" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="#000000" />
              <Text
                style={{
                  color: "#000000",
                  fontSize: 16,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                Continue with Apple
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Error text — uses statusError token */}
        {error && (
          <Text
            style={{
              color: colors.statusError,
              fontSize: 14,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            {error}
          </Text>
        )}

        {/* AC-8: Legal text in textTertiary */}
        <Text
          style={{
            fontSize: 12,
            color: colors.textTertiary,
            textAlign: "center",
            marginTop: 16,
          }}
        >
          By continuing, you agree to our Terms and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}
