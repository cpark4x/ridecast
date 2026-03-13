import React from "react";
import { ActivityIndicator, View } from "react-native";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  centered?: boolean;
}

export default function LoadingSpinner({
  size = "small",
  centered = false,
}: LoadingSpinnerProps) {
  if (centered) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size={size} color="#EA580C" />
      </View>
    );
  }
  return <ActivityIndicator size={size} color="#EA580C" />;
}
