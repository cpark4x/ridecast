# Feature: Offline Guards for Upload Flow

> Block uploads before they fail, not after — disable the action buttons when there's no network and show a clear inline banner instead of a cryptic fetch error.

## Motivation

UX audit issue #35. When a user pastes a URL and taps "Fetch URL" without network connectivity, the request silently times out or surfaces a generic "Network request failed" error with no actionable guidance. The same failure mode applies to file upload. The user has no idea whether their content was lost or if they should retry.

The fix has two layers:
1. **Proactive** — detect offline state on modal open and keep buttons disabled while offline, with an inline banner explaining why.
2. **Reactive** — if connectivity drops mid-flow (between mount and tap), the same guard catches it at the moment of the tap.

`@react-native-community/netinfo` handles both layers with a single subscription.

**Note:** `fd6c6c7` added an offline banner component to the app shell for background sync failures. Check `native/components/` before building a new one — if `OfflineBanner` or similar exists, reuse it inside the modal rather than creating a duplicate.

## Current State

`native/components/UploadModal.tsx`:
- `handleUrlSubmit()` calls `uploadUrl(trimmed)` with no connectivity check
- `handleFilePick()` calls `uploadFile(...)` with no connectivity check
- `handleCreateEpisode()` calls `router.push("/processing")` with no connectivity check
- The "Fetch URL" button is shown/hidden based on `urlText.trim().length > 0 && !loading` — no offline condition
- The file picker button is `disabled={loading}` only — no offline condition

## Changes

### 1. Install dependency

```bash
cd native
npx expo install @react-native-community/netinfo
```

`expo install` picks the Expo-compatible version and adds it to `package.json`. No manual pod install needed for Expo managed workflow; for bare workflow, run `pod install` after.

### 2. Create `native/hooks/useNetworkStatus.ts` (new)

Encapsulate the netinfo subscription so it's reusable and testable in isolation.

```typescript
import { useState, useEffect } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

export interface NetworkStatus {
  isConnected: boolean;
  isLoading: boolean; // true until first netinfo event resolves
}

/**
 * Returns live network connectivity status.
 * isLoading is true for the first render cycle only — avoids flashing the
 * offline banner on fast connections before netinfo resolves.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,  // optimistic default — banner only shows after confirmation
    isLoading: true,
  });

  useEffect(() => {
    // Fetch current state immediately
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

> Using `isInternetReachable !== false` (rather than `=== true`) handles the case where netinfo hasn't resolved reachability yet (`null`) — treating it as potentially connected to avoid false-positive offline banners on slow networks.

### 3. Add offline banner inside `native/components/UploadModal.tsx`

First, check if an `OfflineBanner` component already exists:

```bash
ls native/components/ | grep -i offline
```

If an `OfflineBanner` component exists from `fd6c6c7`, import and reuse it. If not, add an inline banner directly in the modal:

```tsx
// Inline banner (use only if OfflineBanner component doesn't already exist)
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
```

### 4. Wire offline state into `native/components/UploadModal.tsx`

```typescript
import { useNetworkStatus } from "../hooks/useNetworkStatus";

export default function UploadModal({ visible, onDismiss }: UploadModalProps) {
  const { isConnected, isLoading } = useNetworkStatus();
  const isOffline = !isConnected && !isLoading;

  // ... existing state unchanged
```

Add the offline guard to `handleUrlSubmit`:

```typescript
async function handleUrlSubmit() {
  const trimmed = urlText.trim();
  if (!trimmed) return;

  if (isOffline) {
    setErrorMsg("You're offline — connect to upload content");
    return;
  }

  setLoading(true);
  setErrorMsg(null);
  // ... rest unchanged
}
```

Add the offline guard to `handleFilePick`:

```typescript
async function handleFilePick() {
  if (isOffline) {
    Alert.alert(
      "You're offline",
      "Connect to the internet to upload a file.",
      [{ text: "OK" }],
    );
    return;
  }
  // ... rest unchanged
}
```

Add the offline guard to `handleCreateEpisode`:

```typescript
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
```

### 5. Disable action buttons and show banner when offline

In the `ScrollView` content, add the offline banner at the top of the input section and apply `disabled` to action buttons:

```tsx
{/* Offline banner — shown before upload result exists */}
{!uploadResult && isOffline && <OfflineModalBanner />}

{/* URL submit button — disabled when offline */}
{urlText.trim().length > 0 && !loading && (
  <TouchableOpacity
    onPress={handleUrlSubmit}
    disabled={isOffline}
    className={`mt-2 py-2.5 rounded-xl items-center ${
      isOffline ? "bg-gray-200" : "bg-brand"
    }`}
  >
    <Text className={`font-semibold text-sm ${isOffline ? "text-gray-400" : "text-white"}`}>
      Fetch URL
    </Text>
  </TouchableOpacity>
)}

{/* File picker button — disabled when offline */}
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
  <Text className={`text-base font-medium ${isOffline ? "text-gray-300" : "text-gray-600"}`}>
    Choose File
  </Text>
  <Text className={`text-xs ${isOffline ? "text-gray-300" : "text-gray-400"}`}>
    (PDF, EPUB, TXT)
  </Text>
</TouchableOpacity>

{/* After upload result — disable Create Episode when offline */}
{uploadResult && isOffline && <OfflineModalBanner />}

{uploadResult && (
  <TouchableOpacity
    onPress={handleCreateEpisode}
    disabled={isOffline}
    className={`mt-6 py-4 rounded-2xl items-center ${isOffline ? "bg-gray-200" : "bg-brand"}`}
  >
    <Text className={`font-bold text-base ${isOffline ? "text-gray-400" : "text-white"}`}>
      Create Episode
    </Text>
  </TouchableOpacity>
)}
```

## Files to Create/Modify

| File | Change |
|---|---|
| `native/hooks/useNetworkStatus.ts` | New — netinfo subscription hook |
| `native/components/UploadModal.tsx` | Add `useNetworkStatus`, offline guards in all three handlers, disable buttons, show banner |
| `native/package.json` | Add `@react-native-community/netinfo` (via `expo install`) |

## Tests

**File:** `native/hooks/__tests__/useNetworkStatus.test.ts` (new)

```typescript
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react-hooks";

const mockNetInfo = {
  fetch: jest.fn(),
  addEventListener: jest.fn(() => jest.fn()), // returns unsubscribe fn
};

jest.mock("@react-native-community/netinfo", () => mockNetInfo);

describe("useNetworkStatus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns isLoading=true on first render before netinfo resolves", async () => {
    mockNetInfo.fetch.mockResolvedValueOnce(new Promise(() => {})); // never resolves
    mockNetInfo.addEventListener.mockReturnValueOnce(jest.fn());

    const { useNetworkStatus } = await import("../useNetworkStatus");
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isLoading).toBe(true);
  });

  it("returns isConnected=true when netinfo reports connected", async () => {
    mockNetInfo.fetch.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
    });
    mockNetInfo.addEventListener.mockReturnValueOnce(jest.fn());

    const { useNetworkStatus } = await import("../useNetworkStatus");
    const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

    await waitForNextUpdate();
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("returns isConnected=false when netinfo reports offline", async () => {
    mockNetInfo.fetch.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    });
    mockNetInfo.addEventListener.mockReturnValueOnce(jest.fn());

    const { useNetworkStatus } = await import("../useNetworkStatus");
    const { result, waitForNextUpdate } = renderHook(() => useNetworkStatus());

    await waitForNextUpdate();
    expect(result.current.isConnected).toBe(false);
  });

  it("updates when network status changes via addEventListener callback", async () => {
    let capturedCallback: ((state: object) => void) | null = null;

    mockNetInfo.fetch.mockResolvedValueOnce({ isConnected: true, isInternetReachable: true });
    mockNetInfo.addEventListener.mockImplementationOnce((cb: (state: object) => void) => {
      capturedCallback = cb;
      return jest.fn();
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
    mockNetInfo.fetch.mockResolvedValueOnce({ isConnected: true, isInternetReachable: true });
    mockNetInfo.addEventListener.mockReturnValueOnce(unsubscribe);

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

// Mock offline
jest.mock("../../hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => ({ isConnected: false, isLoading: false }),
}));
jest.mock("../../lib/api", () => ({
  uploadUrl: jest.fn(),
  uploadFile: jest.fn(),
}));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));

import UploadModal from "../UploadModal";
import { uploadUrl } from "../../lib/api";

describe("UploadModal — offline state", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not call uploadUrl when offline and URL is submitted", async () => {
    const { getByPlaceholderText, getByText } = render(
      <UploadModal visible onDismiss={jest.fn()} />,
    );

    fireEvent.changeText(getByPlaceholderText("Paste a URL…"), "https://example.com");
    fireEvent.press(getByText("Fetch URL"));

    expect(uploadUrl).not.toHaveBeenCalled();
  });

  it("renders the offline banner when modal is open and offline", () => {
    const { getByText } = render(<UploadModal visible onDismiss={jest.fn()} />);
    expect(getByText(/You're offline/i)).toBeTruthy();
  });

  it("renders the Fetch URL button as disabled when offline", () => {
    const { getByText } = render(<UploadModal visible onDismiss={jest.fn()} />);
    // After typing a URL, the button appears — it should be disabled
    const { getByPlaceholderText } = render(<UploadModal visible onDismiss={jest.fn()} />);
    fireEvent.changeText(getByPlaceholderText("Paste a URL…"), "https://example.com");
    const btn = getByText("Fetch URL");
    expect(btn.props.accessibilityState?.disabled ?? btn.parent?.props.disabled).toBe(true);
  });
});
```

## Success Criteria

```bash
cd native
npx jest hooks/__tests__/useNetworkStatus.test.ts
# 5 tests pass

npx jest components/__tests__/UploadModal-offline.test.tsx
# 3 tests pass
```

Manual verification (use Airplane Mode on device or simulator):
- [ ] Open UploadModal → offline banner "You're offline — connect to upload content" appears immediately
- [ ] Paste a URL → "Fetch URL" button renders visually disabled (gray, not brand orange)
- [ ] Tap "Fetch URL" while offline → no network call made, no spinner
- [ ] Tap "Choose File" while offline → Alert appears, document picker does not open
- [ ] Re-enable network → banner disappears, buttons become active without closing/reopening modal
- [ ] With network: paste URL → tap "Fetch URL" → normal upload flow proceeds

## Scope

Upload flow only. The processing screen (`/processing`) and audio generation route do not get offline guards in this spec — they have their own error handling and the user has already committed to the action by navigating there. No changes to the home or library screens. No changes to the API layer or backend. The netinfo hook is general-purpose and can be reused elsewhere (e.g., a future app-level offline banner) but wiring those usages is out of scope here.
