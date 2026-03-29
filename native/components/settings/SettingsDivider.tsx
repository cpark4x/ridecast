import React from "react";
import { View } from "react-native";
import { colors } from "../../lib/theme";

export default function SettingsDivider() {
  return <View style={{ height: 1, backgroundColor: colors.borderDivider, marginHorizontal: 16 }} />;
}
