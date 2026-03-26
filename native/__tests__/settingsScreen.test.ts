/**
 * Settings screen — Send Feedback integration test.
 *
 * Verifies that the Support section's "Send Feedback" row is wired to
 * openFeedbackSheet so that pressing it opens the feedback flow.
 *
 * Written as .ts (no JSX) following the same convention as feedbackSheet.test.ts:
 * - No require("react-native") inside jest.mock() factories.  The css-interop
 *   babel transform injects a module-level _ReactNativeCSSInterop import that
 *   would go out-of-scope when jest.mock() factories are hoisted above it.
 * - mock* variable prefix lets babel-jest allow them inside hoisted factories.
 */

// ---------------------------------------------------------------------------
// 1. useFeedbackSheet — provides the openFeedbackSheet spy
// ---------------------------------------------------------------------------
const mockOpenFeedbackSheet = jest.fn();
jest.mock("../lib/useFeedbackSheet", () => ({
  useFeedbackSheet: () => ({ openFeedbackSheet: mockOpenFeedbackSheet }),
}));

// ---------------------------------------------------------------------------
// 2. expo-router — stub routing hooks used by the screen
// ---------------------------------------------------------------------------
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
  // Call the effect callback immediately (simulates screen focus in tests).
  useFocusEffect: (cb: () => unknown) => { cb(); },
}));

// ---------------------------------------------------------------------------
// 3. @clerk/clerk-expo — auth / user data
// ---------------------------------------------------------------------------
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ signOut: jest.fn() }),
  useUser: () => ({ user: null }),
}));

// ---------------------------------------------------------------------------
// 4. ../lib/usePlayer
// ---------------------------------------------------------------------------
jest.mock("../lib/usePlayer", () => ({
  usePlayer: () => ({ speed: 1.0, setSpeed: jest.fn().mockResolvedValue(undefined), currentItem: null }),
}));

// ---------------------------------------------------------------------------
// 5. ../lib/db
// ---------------------------------------------------------------------------
jest.mock("../lib/db", () => ({
  getStorageInfo: jest.fn().mockResolvedValue({ count: 0, totalBytes: 0 }),
  getAllEpisodes: jest.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// 6. ../lib/downloads
// ---------------------------------------------------------------------------
jest.mock("../lib/downloads", () => ({
  deleteDownload: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// 7. ../lib/prefs
// ---------------------------------------------------------------------------
const mockDefaultPrefs = {
  defaultDuration: 15,
  hapticsEnabled: true,
  notificationsEnabled: false,
};
jest.mock("../lib/prefs", () => ({
  getPrefs: jest.fn().mockResolvedValue({
    defaultDuration: 15,
    hapticsEnabled: true,
    notificationsEnabled: false,
  }),
  setPrefs: jest.fn().mockResolvedValue(undefined),
  DEFAULT_PREFS: mockDefaultPrefs,
}));

// ---------------------------------------------------------------------------
// 8. expo-secure-store
// ---------------------------------------------------------------------------
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// 9. expo-notifications
// ---------------------------------------------------------------------------
jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
}));

// ---------------------------------------------------------------------------
// 10. @expo/vector-icons
// ---------------------------------------------------------------------------
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// ---------------------------------------------------------------------------
// 11. react-native-safe-area-context
// ---------------------------------------------------------------------------
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ---------------------------------------------------------------------------
// 12. Transitive native deps
// ---------------------------------------------------------------------------
jest.mock("@react-native-community/slider", () => "Slider");

// ---------------------------------------------------------------------------
// 13. ErrorBoundary — pass through in tests
// ---------------------------------------------------------------------------
jest.mock("../components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: unknown }) => children,
}));

// ---------------------------------------------------------------------------
// Test imports (after all mocks are declared)
// ---------------------------------------------------------------------------
import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";

// ---------------------------------------------------------------------------
// Helper — renders SettingsScreenWrapper via React.createElement (no JSX)
// ---------------------------------------------------------------------------
function renderSettings() {
  // Dynamic require keeps mocks registered before module evaluation.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: SettingsScreenWrapper } = require("../app/settings");
  return render(React.createElement(SettingsScreenWrapper));
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// Settings screen: Send Feedback entry point
// ===========================================================================
describe("Settings screen: Send Feedback entry point", () => {
  it("pressing Send Feedback calls openFeedbackSheet", async () => {
    const utils = renderSettings();

    // Flush async state updates triggered by useFocusEffect (getPrefs, getStorageInfo, etc.)
    await act(async () => {});

    // The "Send Feedback" label is rendered by the Support section's SettingsRow.
    // Pressing the row should invoke openFeedbackSheet from useFeedbackSheet.
    const sendFeedbackRow = utils.getByText("Send Feedback");
    fireEvent.press(sendFeedbackRow);

    expect(mockOpenFeedbackSheet).toHaveBeenCalledTimes(1);
  });
});
