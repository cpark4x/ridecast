import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LibraryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900">Library</Text>
        <Text className="text-base text-gray-500 mt-2">Library screen placeholder</Text>
      </View>
    </SafeAreaView>
  );
}
