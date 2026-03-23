# Feature: Offline Guards for Upload Flow

> Block uploads before they fail, not after — disable the action buttons when there's no network and show a clear inline banner instead of a cryptic fetch error.

## Motivation

UX audit issue #35. When a user pastes a URL and taps "Fetch URL" without network connectivity, the request silently times out or surfaces a generic "Network request failed" error with no actionable guidance. The same failure mode applies to file upload. The user has no idea whether their content was lost or if they should retry.

The fix has two layers:
1. **Proactive** — detect offline state on modal open and keep buttons disabled while offline, with an inline banner explaining why.
2. **Reactive** — if connectivity drops mid-flow (between mount and tap), the same guard catches it at the moment of the tap.

`@react-native-community/netinfo` handles both layers with a single subscription. **It is already installed** — `native/components/OfflineBanner.tsx` uses it since commit `fd6c6c7`. No new package install is needed.

## Current State

`native/components/OfflineBanner.tsx` (already exists — added in `fd6c6c7`): mounts in the root layout and shows an amber banner for background sync failures. It uses `NetInfo.addEventListener` directly, not a shared hook.

`native/components/UploadModal.tsx`:
- `handleUrlSubmit()` calls `uploadUrl(trimmed)` with no connectivity check
- `handleFilePick()` calls `uploadFile(...)` with no connectivity check
- `handleCreateEpisode()` calls `router.push("/processing")` with no connectivity check
- The "Fetch URL" button is shown/hidden based on `urlText.trim().length > 0 && !loading` — no offline condition
- The file picker button is `disabled={loading}` only — no offline condition

## Changes

### 1. Create `native/hooks/useNetworkStatus.ts` (new file)

Encapsulate the netinfo subscription so it is reusable and testable in isolation. The existing `OfflineBanner` subscribed inline — this hook extracts the pattern for general reuse.

```typescript
import { useState, useEffect } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export interface NetworkStatus {
  /** True when the device has internet access. Optimistic default (true) on first render. */
  isConnected: boolean;
  /** True until the first netinfo event resolves — avoids flashing banner on fast connections. */
  isLoading: boolean;
}

/**
 * Returns live network connectivity status.
 *
 * isLoading is true for the first render cycle only — avoids flashing the
 * offline banner before netinfo resolves on fast connections.
 *
 * Uses isInternetReachable !== false rather than === true so that the
 * null state (reachability not yet determined) is treated as potentially
 * connected, avoiding false-positive offline banners on slow networks.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true, // optimistic default — banner only shows after confirmation
    isLoading: true,
  });

  useEffect(() => {
    // Fetch current state immediately on mount
    NetInfo.fetch().then((state: NetInfoState) => {
      setStatus({
        isConnected: !!(state.isConnected && state.isInternetReachable !== false),
        isLoading: false,
      });
    });

    // Subscribe to future changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: !!(state.isConnected && state.isInternetReachable !== false),
        isLoading: false,
      });
    });

    return unsubscribe;
  }, []);

  return status;
}
```

### 2. Rewrite `native/components/UploadModal.tsx` (complete file)

All changes from current:
- Import `useNetworkStatus` from `../hooks/useNetworkStatus`
- Derive `isOffline = !isConnected && !isLoading`
- Add offline guard (early return with `setErrorMsg`) to `handleUrlSubmit`
- Add offline guard (Alert) to `handleFilePick`
- Add offline guard (Alert) to `handleCreateEpisode`
- Render `OfflineModalBanner` at the top of the input section when offline
- `disabled` + gray styling on "Fetch URL" button when offline
- `disabled={loading || isOffline}` on file picker button
- Render `OfflineModalBanner` above the "Create Episode" button when offline + upload result is present

```tsx
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { uploadFile, uploadUrl } from "../lib/api";
import { DURATION_PRESETS } from "../lib/constants";
import type { UploadResponse } from "../lib/types";
import { estimateReadingTime } from "../lib/utils";
import DurationPicker from "./DurationPicker";
import { useNetworkStatus } from "../hooks/useNetworkStatus";

// ---------------------------------------------------------------------------
// Inline offline banner (scoped to the modal only)
// ---------------------------------------------------------------------------

function OfflineModalBanner() {
  return (
    <View className="flex-row items-center gap-2 bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 mb-4">
      <Ionicons name="cloud-offline-outline" size={18} color="#6B7280" />
      <Text className="text-sm text-gray-600 flex-1">
        You're offline — connect to upload content
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UploadModalProps {
  visible: boolean;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UploadModal({ visible, onDismiss }: UploadModalProps) {
  const router = useRouter();
  const { isConnected, isLoading } = useNetworkStatus();

  // isOffline is only true once netinfo resolves — avoids false-positive banner
  // on first render before connectivity is determined
  const isOffline = !isConnected && !isLoading;

  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetMinutes, setTargetMinutes] = useState<number>(DURATION_PRESETS[2].minutes);

  const urlInputRef = useRef<TextInput>(null);

  // — Reset when modal opens / closes —————————————————————————————————————
  function handleDismiss() {
    setUrlText("");
    setLoading(false);
    setUploadResult(null);
    setErrorMsg(null);
    setTargetMinutes(DURATION_PRESETS[2].minutes);
    onDismiss();
  }

  // — URL upload —————————————————————————————————————————————————————————
  async function handleUrlSubmit() {
    const trimmed = urlText.trim();
    if (!trimmed) return;

    if (isOffline) {
      setErrorMsg("You're offline — connect to upload content");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await uploadUrl(trimmed);
      setUploadResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  // — File upload —————————————————————————————————————————————————————————
  async function handleFilePick() {
    if (isOffline) {
      Alert.alert(
        "You're offline",
        "Connect to the internet to upload a file.",
        [{ text: "OK" }],
      );
      return;
    }

    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/epub+zip",
          "text/plain",
        ],
        copyToCacheDirectory: true,
      });
    } catch {
      Alert.alert("Error", "Could not open document picker.");
      return;
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "application/octet-stream";
    const name = asset.name ?? "upload";

    setLoading(true);
    setErrorMsg(null);
    try {
      const uploadRes = await uploadFile(asset.uri, name, mimeType);
      setUploadResult(uploadRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  // — Create Episode ————————————————————————————————————————————————————
  function handleCreateEpisode() {
    if (!uploadResult) return;

    if (isOffline) {
      Alert.alert(
        "You're offline",
        "Connect to the internet to create an episode.",
        [{ text: "OK" }],
      );
      return;
    }

    handleDismiss();
    router.push({
      pathname: "/processing",
      params: {
        contentId: uploadResult.id,
        targetMinutes: String(targetMinutes),
      },
    });
  }

  const readingTime = uploadResult ? estimateReadingTime(uploadResult.wordCount) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
      {/* Dimmed backdrop */}
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={handleDismiss}
      />

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="bg-white rounded-t-3xl"
      >
        {/* Drag handle */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 rounded-full bg-gray-300" />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <Text className="text-xl font-bold text-gray-900 mt-3 mb-5">Add Content</Text>

          {/* — Section 1: Input ——————————————————————————————————————————— */}
          {!uploadResult && (
            <>
              {/* Offline banner — shown when modal is open and offline */}
              {isOffline && <OfflineModalBanner />}

              {/* URL input */}
              <TextInput
                ref={urlInputRef}
                className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                placeholder="Paste a URL…"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                value={urlText}
                onChangeText={setUrlText}
                returnKeyType="go"
                onSubmitEditing={handleUrlSubmit}
                autoFocus
              />

              {urlText.trim().length > 0 && !loading && (
                <TouchableOpacity
                  onPress={handleUrlSubmit}
                  disabled={isOffline}
                  className={`mt-2 py-2.5 rounded-xl items-center ${
                    isOffline ? "bg-gray-200" : "bg-brand"
                  }`}
                >
                  <Text
                    className={`font-semibold text-sm ${
                      isOffline ? "text-gray-400" : "text-white"
                    }`}
                  >
                    Fetch URL
                  </Text>
                </TouchableOpacity>
              )}

              {/* OR divider */}
              <View className="flex-row items-center my-4 gap-3">
                <View className="flex-1 h-px bg-gray-200" />
                <Text className="text-xs text-gray-400 font-medium">or</Text>
                <View className="flex-1 h-px bg-gray-200" />
              </View>

              {/* File picker */}
              <TouchableOpacity
                onPress={handleFilePick}
                disabled={loading || isOffline}
                className={`flex-row items-center justify-center border-2 border-dashed rounded-xl py-4 gap-2 ${
                  isOffline ? "border-gray-200" : "border-gray-300"
                }`}
              >
                <Ionicons
                  name="document-outline"
                  size={20}
                  color={isOffline ? "#D1D5DB" : "#6B7280"}
                />
                <Text
                  className={`text-base font-medium ${
                    isOffline ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  Choose File
                </Text>
                <Text className={`text-xs ${isOffline ? "text-gray-300" : "text-gray-400"}`}>
                  (PDF, EPUB, TXT)
                </Text>
              </TouchableOpacity>

              {/* Loading spinner */}
              {loading && (
                <View className="items-center mt-6">
                  <ActivityIndicator size="large" color="#EA580C" />
                  <Text className="text-sm text-gray-500 mt-2">Processing…</Text>
                </View>
              )}

              {/* Error */}
              {errorMsg && (
                <View className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <Text className="text-sm text-red-700">{errorMsg}</Text>
                </View>
              )}
            </>
          )}

          {/* — Section 2: Preview + Duration picker ——————————————————————— */}
          {uploadResult && (
            <>
              {/* Offline banner above Create Episode button */}
              {isOffline && <OfflineModalBanner />}

              {/* Content preview */}
              <View className="bg-gray-50 rounded-2xl p-4 mb-5">
                <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={2}>
                  {uploadResult.title}
                </Text>
                {uploadResult.author && (
                  <Text className="text-sm text-gray-500 mb-2">{uploadResult.author}</Text>
                )}
                <View className="flex-row gap-3 flex-wrap">
                  <View className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    <Text className="text-xs text-gray-600">
                      {uploadResult.wordCount.toLocaleString()} words
                    </Text>
                  </View>
                  {readingTime !== null && (
                    <View className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                      <Text className="text-xs text-gray-600">~{readingTime} min read</Text>
                    </View>
                  )}
                  <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                    <Text className="text-xs text-orange-700 font-medium">
                      {uploadResult.sourceType.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Duration picker */}
              <Text className="text-sm font-semibold text-gray-700 mb-3">Episode Length</Text>
              <DurationPicker value={targetMinutes} onChange={setTargetMinutes} />

              {/* Create Episode button */}
              <TouchableOpacity
                onPress={handleCreateEpisode}
                disabled={isOffline}
                className={`mt-6 py-4 rounded-2xl items-center ${
                  isOffline ? "bg-gray-200" : "bg-brand"
                }`}
              >
                <Text
                  className={`font-bold text-base ${
                    isOffline ? "text-gray-400" : "text-white"
                  }`}
                >
                  Create Episode
                </Text>
              </TouchableOpacity>

              {/* Change content */}
              <TouchableOpacity
                onPress={() => setUploadResult(null)}
                className="mt-3 items-center"
              >
                <Text className="text-sm text-gray-400">Use different content</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
```

## Files to Create/Modify

| File | Change |
|---|---|
| `native/hooks/useNetworkStatus.ts` | New — netinfo subscription hook with `isConnected` + `isLoading` |
| `native/components/UploadModal.tsx` | Full rewrite: add `useNetworkStatus`, `OfflineModalBanner`, offline guards in all three handlers, disable buttons, show banner |

> `@react-native-community/netinfo` is already installed (used by `native/components/OfflineBanner.tsx` since commit `fd6c6c7`). No `expo install` needed.

## Tests

**File:** `native/hooks/__tests__/useNetworkStatus.test.ts` (new)

```typescript
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react-hooks";

const mockFetch = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    fetch: mockFetch,
    addEventListener: mockAddEventListener,
  },
}));

describe("useNetworkStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it("returns isLoading=true on first render before netinfo resolves", async () => {
    // fetch never resolves — simulates slow netinfo
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    mockAddEventListener.mockReturnValueOnce(jest.fn());

    const { useNetworkStatus } = await import("../useNetworkStatus");
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isConnected).toBe(true); // optimistic default
  });

  it("returns isConnected=true and isLoading=false when netinfo reports connected", async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: true, isInternetReachable: true });
    mockAddEventListener.mockReturnValueOnce(jest.fn());

    const { useNetworkStatus } = await import("../useNetworkStatus");
    const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

    await waitForNextUpdate();

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns isConnected=false when netinfo reports offline", async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: false, isInternetReachable: false });
    mockAddEventListener.mockReturnValueOnce(jest.fn());

    const { useNetworkStatus } = await import("../useNetworkStatus");
    const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

    await waitForNextUpdate();

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("treats isInternetReachable=null as connected (not yet determined)", async () => {
    mockFetch.mockResolvedValueOnce({ isConnected: true, isInternetReachable: null });
    mockAddEventListener.mockReturnValueOnce(jest.fn());

    const { useNetworkStatus } = await import("../useNetworkStatus");
    const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

    await waitForNextUpdate();

    // null !== false, so this is treated as connected
    expect(result.current.isConnected).toBe(true);
  });

  it("updates when network status changes via addEventListener callback", async () => {
    let capturedCallback: ((state: object) => void) | null = null;

    mockFetch.mockResolvedValueOnce({ isConnected: true, isInternetReachable: true });
    mockAddEventListener.mockImplementationOnce((cb: (state: object) => void) => {
      capturedCallback = cb;
      return jest.fn(); // unsubscribe fn
    });

    const { useNetworkStatus } = await import("../useNetworkStatus");
    const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());
    await waitForNextUpdate();

    expect(result.current.isConnected).toBe(true);

    act(() => {
      capturedCallback?.({ isConnected: false, isInternetReachable: false });
    });

    expect(result.current.isConnected).toBe(false);
  });

  it("calls the unsubscribe function returned by addEventListener on unmount", async () => {
    const unsubscribe = jest.fn();
    mockFetch.mockResolvedValueOnce({ isConnected: true, isInternetReachable: true });
    mockAddEventListener.mockReturnValueOnce(unsubscribe);

    const { useNetworkStatus } = await import("../useNetworkStatus");
    const { unmount } = renderHook(() => useNetworkStatus());

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
```

**File:** `native/components/__tests__/UploadModal-offline.test.tsx` (new)

```typescript
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Must mock before component imports
jest.mock("../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => ({ isConnected: false, isLoading: false }),
}));
jest.mock("../../lib/api", () => ({
  uploadUrl: jest.fn(),
  uploadFile: jest.fn(),
}));
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("../../lib/constants", () => ({
  DURATION_PRESETS: [
    { minutes: 3, label: "3 min" },
    { minutes: 5, label: "5 min" },
    { minutes: 10, label: "10 min" },
  ],
}));
jest.mock("../../lib/utils", () => ({
  estimateReadingTime: jest.fn(() => 10),
}));
jest.mock("../DurationPicker", () => {
  const { View } = require("react-native");
  return () => <View testID="duration-picker" />;
});

import UploadModal from "../UploadModal";
import { uploadUrl } from "../../lib/api";
import { Alert } from "react-native";

jest.spyOn(Alert, "alert");

describe("UploadModal — offline state", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders the offline banner when modal is open and offline", () => {
    const { getByText } = render(
      <UploadModal visible onDismiss={jest.fn()} />,
    );
    expect(getByText(/You're offline/i)).toBeTruthy();
  });

  it("does not call uploadUrl when Fetch URL is tapped while offline", async () => {
    const { getByPlaceholderText, getByText } = render(
      <UploadModal visible onDismiss={jest.fn()} />,
    );

    fireEvent.changeText(getByPlaceholderText("Paste a URL…"), "https://example.com");
    fireEvent.press(getByText("Fetch URL"));

    expect(uploadUrl).not.toHaveBeenCalled();
  });

  it("sets an error message when Fetch URL is tapped while offline", async () => {
    const { getByPlaceholderText, getByText } = render(
      <UploadModal visible onDismiss={jest.fn()} />,
    );

    fireEvent.changeText(getByPlaceholderText("Paste a URL…"), "https://example.com");
    fireEvent.press(getByText("Fetch URL"));

    expect(getByText(/You're offline/i)).toBeTruthy();
  });

  it("renders the Fetch URL button as disabled when offline", () => {
    const { getByPlaceholderText, getByText } = render(
      <UploadModal visible onDismiss={jest.fn()} />,
    );
    fireEvent.changeText(getByPlaceholderText("Paste a URL…"), "https://example.com");

    const btn = getByText("Fetch URL").parent;
    expect(btn?.props.disabled).toBe(true);
  });

  it("shows an Alert when Choose File is tapped while offline", () => {
    const { getByText } = render(
      <UploadModal visible onDismiss={jest.fn()} />,
    );
    fireEvent.press(getByText("Choose File"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "You're offline",
      expect.stringContaining("Connect"),
      expect.any(Array),
    );
  });
});
```

## Success Criteria

```bash
cd native
npx jest hooks/__tests__/useNetworkStatus.test.ts
# 6 tests pass

npx jest components/__tests__/UploadModal-offline.test.tsx
# 5 tests pass

npx tsc --noEmit
# No type errors
```

Manual verification (use Airplane Mode on device or simulator):
- [ ] Open UploadModal → offline banner "You're offline — connect to upload content" appears immediately (no delay)
- [ ] Banner does NOT flash on fast connections before netinfo resolves
- [ ] Paste a URL → "Fetch URL" button renders visually disabled (gray background, gray text, not brand orange)
- [ ] Tap "Fetch URL" while offline → no network call made, no spinner, error message appears inline
- [ ] Tap "Choose File" while offline → Alert appears with "You're offline" title, document picker does NOT open
- [ ] Re-enable network → offline banner disappears, buttons become active without closing/reopening modal
- [ ] With network: paste URL → tap "Fetch URL" → normal upload flow proceeds
- [ ] After successful upload (upload result showing): go offline → offline banner appears above "Create Episode" button, button becomes disabled
- [ ] Tap "Create Episode" while offline → Alert fires, navigation does NOT happen

## Scope

Upload flow only. The processing screen (`/processing`) and audio generation route do not get offline guards in this spec — they have their own error handling and the user has already committed by navigating there. No changes to the home or library screens. No changes to the API layer or backend. The `useNetworkStatus` hook is general-purpose and can be reused elsewhere, but wiring other usages is out of scope. The existing `OfflineBanner` component in the root layout is unchanged — the `OfflineModalBanner` is a separate inline component scoped to the modal only, intentionally simpler (no subscription, reads from `useNetworkStatus` result passed via props from the parent modal component).
