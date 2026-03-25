/**
 * FeedbackSheet smoke tests.
 *
 * FeedbackSheet imports @gorhom/bottom-sheet, expo-av, expo-router, and
 * other native modules that need mocking so Jest can load the component as CJS.
 */

// Must be before any import that transitively loads these modules
jest.mock("@gorhom/bottom-sheet", () => ({
  BottomSheetModal: "BottomSheetModal",
  BottomSheetBackdrop: "BottomSheetBackdrop",
  BottomSheetView: "BottomSheetView",
}));

jest.mock("expo-router", () => ({
  usePathname: () => "/home",
}));

jest.mock("expo-av", () => ({
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: class MockRecording {
      prepareToRecordAsync = jest.fn().mockResolvedValue(undefined);
      startAsync = jest.fn().mockResolvedValue(undefined);
      stopAndUnloadAsync = jest.fn().mockResolvedValue(undefined);
      getURI = jest.fn().mockReturnValue("file://test.m4a");
    },
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
    },
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

jest.mock("../lib/usePlayer", () => ({
  usePlayer: () => ({
    currentItem: null,
  }),
}));

jest.mock("../lib/api", () => ({
  submitTextFeedback: jest.fn().mockResolvedValue({ id: "1", summary: "ok", category: "feedback" }),
  submitVoiceFeedback: jest.fn().mockResolvedValue({ id: "2", summary: "ok", category: "feedback" }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock")
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const FeedbackSheetModule = require("../components/FeedbackSheet");

describe("FeedbackSheet component", () => {
  it("has a default export", () => {
    expect(FeedbackSheetModule.default).toBeDefined();
  });

  it("default export is a React component (function or forwardRef object)", () => {
    const comp = FeedbackSheetModule.default;
    // forwardRef wraps the component, producing either a function or
    // an object with $$typeof === REACT_FORWARD_REF_TYPE
    expect(
      typeof comp === "function" ||
        (comp !== null && typeof comp === "object")
    ).toBe(true);
  });
});
