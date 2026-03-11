import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProcessingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900">Processing</Text>
        <Text className="text-base text-gray-500 mt-2">Processing screen placeholder</Text>
      </View>
    </SafeAreaView>
  );
}
