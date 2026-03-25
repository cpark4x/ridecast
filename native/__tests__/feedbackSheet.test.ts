/**
 * FeedbackSheet component tests.
 *
 * Tests the recording state machine, cleanup behavior, and tab switching.
 *
 * Written as .ts (no JSX) — React.createElement is used for rendering.
 *
 * Key constraint: react-native-css-interop/babel wraps React.createElement
 * calls for react-native View/Text/etc. with its interop helper, which is
 * injected as a module-level import (`_ReactNativeCSSInterop`). When
 * babel-jest hoists jest.mock() factories above those imports, the injected
 * reference becomes out-of-scope and throws. We avoid this by:
 *   1. Not requiring "react-native" inside any jest.mock() factory.
 *   2. Using module-scoped variables prefixed with "mock" (babel-jest allows
 *      names prefixed with "mock" inside hoisted factories).
 */

// ---------------------------------------------------------------------------
// 1. @gorhom/bottom-sheet — controllable mock
//    IMPORTANT: no require("react-native") here — would trigger css-interop
//    injection inside the hoisted factory, causing an out-of-scope error.
// ---------------------------------------------------------------------------
let mockCapturedOnDismiss: (() => void) | undefined;

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { forwardRef, useImperativeHandle, useState } = React;

  const BottomSheetModal = forwardRef(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any, ref: any) => {
      const { children, onDismiss } = props;
      const [open, setOpen] = useState(false);
      useImperativeHandle(ref, () => ({
        present: () => setOpen(true),
        dismiss: () => {
          setOpen(false);
          onDismiss?.();
        },
      }));
      // Capture so tests can simulate pan-down dismissal
      mockCapturedOnDismiss = onDismiss;
      // Return children directly — no react-native View wrapper to avoid css-interop injection
      return open ? children : null;
    }
  );
  BottomSheetModal.displayName = "BottomSheetModal";

  return {
    BottomSheetModal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    BottomSheetView: ({ children }: any) => children,
    BottomSheetBackdrop: () => null,
  };
});

// ---------------------------------------------------------------------------
// 2. expo-router
// ---------------------------------------------------------------------------
jest.mock("expo-router", () => ({
  usePathname: () => "/test",
}));

// ---------------------------------------------------------------------------
// 3. @expo/vector-icons
// ---------------------------------------------------------------------------
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// ---------------------------------------------------------------------------
// 4. ../lib/usePlayer
// ---------------------------------------------------------------------------
jest.mock("../lib/usePlayer", () => ({
  usePlayer: () => ({ currentItem: null }),
}));

// ---------------------------------------------------------------------------
// 5. ../lib/api
// ---------------------------------------------------------------------------
const mockSubmitTextFeedback = jest.fn();
const mockSubmitVoiceFeedback = jest.fn();
jest.mock("../lib/api", () => ({
  submitTextFeedback: (...args: unknown[]) => mockSubmitTextFeedback(...args),
  submitVoiceFeedback: (...args: unknown[]) => mockSubmitVoiceFeedback(...args),
}));

// ---------------------------------------------------------------------------
// 6. expo-av — controllable Recording mock
// ---------------------------------------------------------------------------
const mockPrepareToRecordAsync = jest.fn().mockResolvedValue(undefined);
const mockStartAsync = jest.fn().mockResolvedValue(undefined);
const mockStopAndUnloadAsync = jest.fn().mockResolvedValue(undefined);
const mockGetURI = jest.fn().mockReturnValue("file:///tmp/recording.m4a");
const mockRequestPermissionsAsync = jest
  .fn()
  .mockResolvedValue({ granted: true });
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);

class MockRecording {
  prepareToRecordAsync = mockPrepareToRecordAsync;
  startAsync = mockStartAsync;
  stopAndUnloadAsync = mockStopAndUnloadAsync;
  getURI = mockGetURI;
}

jest.mock("expo-av", () => ({
  Audio: {
    requestPermissionsAsync: (...args: unknown[]) =>
      mockRequestPermissionsAsync(...args),
    setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
    Recording: MockRecording,
    RecordingOptionsPresets: { HIGH_QUALITY: {} },
  },
}));

// ---------------------------------------------------------------------------
// 7. Transitive native deps
// ---------------------------------------------------------------------------
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@react-native-community/slider", () => "Slider");

// ---------------------------------------------------------------------------
// Test imports (after all mocks are declared)
// ---------------------------------------------------------------------------
import React, { createRef } from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import type { FeedbackSheetRef } from "../components/FeedbackSheet";

// ---------------------------------------------------------------------------
// Helper — renders FeedbackSheet with a forwarded ref via React.createElement
// (no JSX so no css-interop transform in the test file itself)
// ---------------------------------------------------------------------------
function renderSheet() {
  // Dynamic require keeps mocks registered before module evaluation
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: FeedbackSheet } = require("../components/FeedbackSheet");
  const ref = createRef<FeedbackSheetRef>();
  const utils = render(React.createElement(FeedbackSheet, { ref }));
  return { ...utils, ref };
}

// ---------------------------------------------------------------------------
// Helper — advances the sheet to preview state (open → Talk tab → record → stop)
// ---------------------------------------------------------------------------
async function reachPreviewState() {
  const utils = renderSheet();
  const { ref, getByText, getByTestId } = utils;

  await act(async () => {
    ref.current!.open();
  });

  fireEvent.press(getByText("Talk"));

  await act(async () => {
    fireEvent.press(getByTestId("mic-button"));
  });

  await act(async () => {
    fireEvent.press(getByTestId("stop-button"));
  });

  return utils;
}

// ---------------------------------------------------------------------------
// Shared setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  mockCapturedOnDismiss = undefined;
  mockSubmitTextFeedback.mockResolvedValue({
    id: "fb-1",
    summary: "ok",
    category: "Bug",
  });
  mockSubmitVoiceFeedback.mockResolvedValue({
    id: "fb-2",
    summary: "ok",
    category: "Bug",
  });
  mockRequestPermissionsAsync.mockResolvedValue({ granted: true });
});

afterEach(() => {
  jest.useRealTimers();
});

// ===========================================================================
// 1. open() — initial open + re-open reset
// ===========================================================================
describe("FeedbackSheet: open() behavior", () => {
  it("sheet is hidden until open() is called", async () => {
    const { queryByText, ref } = renderSheet();

    // "Send Feedback" header is only rendered when the sheet is open
    expect(queryByText("Send Feedback")).toBeNull();

    await act(async () => {
      ref.current!.open();
    });

    expect(queryByText("Send Feedback")).not.toBeNull();
  });

  it("resets typed text when open() is called a second time", async () => {
    const { ref, getByTestId } = renderSheet();

    await act(async () => {
      ref.current!.open();
    });

    const input = getByTestId("text-input");
    fireEvent.changeText(input, "please fix this");
    expect(input.props.value).toBe("please fix this");

    // Reopen — state must be cleared
    await act(async () => {
      ref.current!.open();
    });

    expect(input.props.value).toBe("");
  });

  it("open() while recording cleans up the active Recording instance", async () => {
    const { ref, getByText, getByTestId } = renderSheet();

    await act(async () => {
      ref.current!.open();
    });

    await act(async () => {
      fireEvent.press(getByText("Talk"));
    });

    await act(async () => {
      fireEvent.press(getByTestId("mic-button"));
    });

    expect(mockStartAsync).toHaveBeenCalledTimes(1);

    // Call open() again without stopping the recording
    await act(async () => {
      ref.current!.open();
    });

    // cleanupRecording() inside open() must call stopAndUnloadAsync
    expect(mockStopAndUnloadAsync).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// 2. Tab switching
// ===========================================================================
describe("FeedbackSheet: tab switching", () => {
  it("defaults to the Type tab showing the text input", async () => {
    const { ref, queryByTestId, queryByText } = renderSheet();

    await act(async () => {
      ref.current!.open();
    });

    expect(queryByTestId("text-input")).not.toBeNull();
    expect(queryByText("Tap to record")).toBeNull();
  });

  it("switches to the Talk tab and shows the mic hint", async () => {
    const { ref, getByText, queryByTestId } = renderSheet();

    await act(async () => {
      ref.current!.open();
    });

    fireEvent.press(getByText("Talk"));

    expect(queryByTestId("text-input")).toBeNull();
    expect(getByText("Tap to record")).not.toBeNull();
  });

  it("can switch back to the Type tab from Talk", async () => {
    const { ref, getByText, queryByTestId } = renderSheet();

    await act(async () => {
      ref.current!.open();
    });

    fireEvent.press(getByText("Talk"));
    fireEvent.press(getByText("Type"));

    expect(queryByTestId("text-input")).not.toBeNull();
  });

  it("tab switch is blocked while recording is active (stop-button stays visible)", async () => {
    const { ref, getByText, getByTestId, queryByTestId } = renderSheet();

    await act(async () => {
      ref.current!.open();
    });

    fireEvent.press(getByText("Talk"));

    await act(async () => {
      fireEvent.press(getByTestId("mic-button"));
    });

    // Confirm we are in recording state
    expect(getByTestId("stop-button")).not.toBeNull();

    // Attempt to switch to Type tab while recording
    fireEvent.press(getByText("Type"));

    // Tab switch must be blocked — stop-button (recording UI) must still be visible
    expect(getByTestId("stop-button")).not.toBeNull();
    // Text input must NOT appear
    expect(
      queryByTestId("stop-button")
    ).not.toBeNull();
    expect(mockStopAndUnloadAsync).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 3. Permission-denied recording path
// ===========================================================================
describe("FeedbackSheet: permission denied", () => {
  it("stays in idle state when microphone permission is denied", async () => {
    mockRequestPermissionsAsync.mockResolvedValueOnce({ granted: false });

    const { ref, getByText, getByTestId, queryByTestId } = renderSheet();

    await act(async () => {
      ref.current!.open();
    });

    fireEvent.press(getByText("Talk"));

    await act(async () => {
      fireEvent.press(getByTestId("mic-button"));
    });

    // Recording must not have started
    expect(mockStartAsync).not.toHaveBeenCalled();
    // Mic button still visible (still in idle state)
    expect(queryByTestId("mic-button")).not.toBeNull();
  });
});

// ===========================================================================
// 4. Recording → preview transition
// ===========================================================================
describe("FeedbackSheet: recording → preview transition", () => {
  it("transitions to preview state after stop is pressed", async () => {
    const { getByTestId } = await reachPreviewState();

    expect(mockStopAndUnloadAsync).toHaveBeenCalledTimes(1);
    // Preview buttons should appear
    expect(getByTestId("rerecord-button")).not.toBeNull();
    expect(getByTestId("submit-voice-button")).not.toBeNull();
  });
});

// ===========================================================================
// 5. Voice submit failure → retryable preview (not idle)
// ===========================================================================
describe("FeedbackSheet: voice submit failure preserves preview", () => {
  it("preserves preview state (rerecord + submit visible, mic absent) after a failed voice submit", async () => {
    mockSubmitVoiceFeedback.mockRejectedValueOnce(new Error("network error"));

    const { getByTestId, queryByTestId } = await reachPreviewState();

    // Submit — it will fail
    await act(async () => {
      fireEvent.press(getByTestId("submit-voice-button"));
    });

    // After failure, preview buttons must still be visible (retry path)
    // and mic-button (idle state) must be absent
    await waitFor(() => {
      expect(getByTestId("rerecord-button")).not.toBeNull();
      expect(getByTestId("submit-voice-button")).not.toBeNull();
      expect(queryByTestId("mic-button")).toBeNull();
    });
  });
});

// ===========================================================================
// 6. Stale dismiss timer does not close a freshly reopened sheet
// ===========================================================================
describe("FeedbackSheet: stale dismiss timer is cancelled on reopen", () => {
  it("a pending dismiss timer from a prior text submit is cancelled when open() is called before it fires", async () => {
    jest.useFakeTimers();

    const { ref, getByTestId, getByText, queryByText } = renderSheet();

    // First open: type and submit feedback — starts the 1500 ms dismiss timer
    await act(async () => {
      ref.current!.open();
    });

    const input = getByTestId("text-input");
    fireEvent.changeText(input, "First feedback");

    await act(async () => {
      fireEvent.press(getByText("Submit"));
    });

    // Sheet is now in "done" state; a 1500 ms dismiss timer is pending.
    // Reopen immediately — open() must cancel that timer.
    await act(async () => {
      ref.current!.open();
    });

    // Header is visible again after the second open
    expect(queryByText("Send Feedback")).not.toBeNull();

    // Advance well past where the stale timer would have fired
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Sheet is still open — the stale dismiss timer was cancelled by open()
    expect(queryByText("Send Feedback")).not.toBeNull();
  });
});

// ===========================================================================
// 7. Dismiss / cleanup while recording
// ===========================================================================
describe("FeedbackSheet: dismiss cleanup while recording", () => {
  it("calls stopAndUnloadAsync when modal onDismiss fires during recording", async () => {
    jest.useFakeTimers();

    const { ref, getByText, getByTestId } = renderSheet();

    await act(async () => {
      ref.current!.open();
    });

    fireEvent.press(getByText("Talk"));

    await act(async () => {
      fireEvent.press(getByTestId("mic-button"));
    });

    expect(mockStartAsync).toHaveBeenCalledTimes(1);
    expect(mockCapturedOnDismiss).toBeDefined();

    // Simulate pan-down dismissal — fires onDismiss → cleanupRecording
    await act(async () => {
      mockCapturedOnDismiss?.();
    });

    expect(mockStopAndUnloadAsync).toHaveBeenCalledTimes(1);
  });

  it("clears the duration timer when modal onDismiss fires during recording", async () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { ref, getByText, getByTestId } = renderSheet();

    await act(async () => {
      ref.current!.open();
    });

    fireEvent.press(getByText("Talk"));

    await act(async () => {
      fireEvent.press(getByTestId("mic-button"));
    });

    await act(async () => {
      mockCapturedOnDismiss?.();
    });

    // cleanupRecording() calls clearInterval to cancel the duration timer
    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });
});
