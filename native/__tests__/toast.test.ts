import { Alert } from "react-native";
import { showToast, showGeneratingToast } from "../lib/toast";

jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

beforeEach(() => jest.clearAllMocks());

describe("toast", () => {
  it("showToast calls Alert.alert with default title", () => {
    showToast("Hello world");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Ridecast",
      "Hello world",
      [{ text: "OK" }],
      { cancelable: true },
    );
  });

  it("showToast uses custom title when provided", () => {
    showToast("A message", "Custom");
    expect(Alert.alert).toHaveBeenCalledWith(
      "Custom",
      "A message",
      expect.any(Array),
      expect.any(Object),
    );
  });

  it("showGeneratingToast shows 'Coming Soon' title with generating message", () => {
    showGeneratingToast();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Coming Soon",
      expect.stringContaining("Still generating"),
      expect.any(Array),
      expect.any(Object),
    );
  });
});
