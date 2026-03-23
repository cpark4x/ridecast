import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useCallback, useState } from "react";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        {/* Value Prop */}
        <View className="w-20 h-20 rounded-[22px] bg-brand items-center justify-center mb-8">
          <Ionicons name="headset" size={40} color="white" />
        </View>
        <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
          Ridecast
        </Text>
        <Text className="text-base text-gray-500 text-center mb-2 leading-relaxed">
          Turn any article, PDF, or link into a podcast episode you can listen
          to on your commute.
        </Text>
        <Text className="text-sm text-gray-400 text-center mb-12">
          Upload. Listen. Learn.
        </Text>

        {/* Sign In Button */}
        <TouchableOpacity
          onPress={handleAppleSignIn}
          disabled={loading}
          className="w-full flex-row items-center justify-center bg-black rounded-2xl py-4 px-6"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Continue with Apple
              </Text>
            </>
          )}
        </TouchableOpacity>

        {error && (
          <Text className="text-red-500 text-sm mt-4 text-center">{error}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
