jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium", Heavy: "Heavy" },
  NotificationFeedbackType: { Success: "Success", Error: "Error", Warning: "Warning" },
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as ExpoHaptics from "expo-haptics";
import { Haptics } from "../lib/haptics";

describe("Haptics wrapper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("light() calls impactAsync with Light style", async () => {
    await Haptics.light();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
      ExpoHaptics.ImpactFeedbackStyle.Light,
    );
  });

  it("medium() calls impactAsync with Medium style", async () => {
    await Haptics.medium();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
      ExpoHaptics.ImpactFeedbackStyle.Medium,
    );
  });

  it("heavy() calls impactAsync with Heavy style", async () => {
    await Haptics.heavy();
    expect(ExpoHaptics.impactAsync).toHaveBeenCalledWith(
      ExpoHaptics.ImpactFeedbackStyle.Heavy,
    );
  });

  it("success() calls notificationAsync with Success type", async () => {
    await Haptics.success();
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
      ExpoHaptics.NotificationFeedbackType.Success,
    );
  });

  it("error() calls notificationAsync with Error type", async () => {
    await Haptics.error();
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
      ExpoHaptics.NotificationFeedbackType.Error,
    );
  });

  it("warning() calls notificationAsync with Warning type", async () => {
    await Haptics.warning();
    expect(ExpoHaptics.notificationAsync).toHaveBeenCalledWith(
      ExpoHaptics.NotificationFeedbackType.Warning,
    );
  });
});