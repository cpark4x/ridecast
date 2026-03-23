import { Alert } from "react-native";

export function showToast(message: string, title = "Ridecast"): void {
  Alert.alert(title, message, [{ text: "OK" }], { cancelable: true });
}

export function showGeneratingToast(): void {
  showToast(
    "Still generating — we'll notify you when it's ready.",
    "Coming Soon",
  );
}
