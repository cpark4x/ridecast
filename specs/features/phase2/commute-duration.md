# Feature: Commute Duration Preference

> Remember the user's last-chosen episode duration and use it as the default next time, creating a personalized default that reflects their real commute length.

## Motivation

The duration slider currently defaults to 15 minutes every time. Users who commute for 22 minutes have to re-select that every session. Persisting the last-used duration as a preference serves three purposes:
1. Better UX immediately — the slider starts where the user left it
2. Provides commute duration data for the queue-first home screen ("Your commute is 22 min")
3. Prerequisite for the "Ready to Commute" notification (needs to know how long the commute is)

## Changes

### 1. `src/hooks/useCommuteDuration.ts` (new file)

```typescript
import { useState, useEffect } from "react";

const STORAGE_KEY = "ridecast:commute-duration-mins";
const DEFAULT_DURATION = 15;

export function useCommuteDuration() {
  const [commuteDuration, setCommuteDurationState] = useState<number>(DEFAULT_DURATION);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 5 && parsed <= 60) {
          setCommuteDurationState(parsed);
        }
      }
    } catch {
      // localStorage unavailable (e.g. SSR) — use default
    }
  }, []);

  function setCommuteDuration(minutes: number) {
    setCommuteDurationState(minutes);
    try {
      localStorage.setItem(STORAGE_KEY, String(minutes));
    } catch {
      // ignore write failures
    }
  }

  return { commuteDuration, setCommuteDuration };
}
```

### 2. Use the hook in `src/components/UploadScreen.tsx`

Replace the hardcoded `useState(15)` defaults with values from the hook:

```typescript
// Before
const [selectedPreset, setSelectedPreset] = useState(15);
const [sliderValue, setSliderValue] = useState(15);

// After
import { useCommuteDuration } from "@/hooks/useCommuteDuration";

const { commuteDuration, setCommuteDuration } = useCommuteDuration();
const [selectedPreset, setSelectedPreset] = useState(() =>
  [5, 15, 30].includes(commuteDuration) ? commuteDuration : 0
);
const [sliderValue, setSliderValue] = useState(commuteDuration);
```

Update `handleSliderChange` to persist the new value:
```typescript
function handleSliderChange(value: number) {
  setSliderValue(value);
  setCommuteDuration(value);  // ← persist
  if ([5, 15, 30].includes(value)) {
    setSelectedPreset(value);
  } else {
    setSelectedPreset(0);
  }
}
```

Update `handlePresetClick` similarly:
```typescript
function handlePresetClick(minutes: number) {
  setSelectedPreset(minutes);
  setSliderValue(minutes);
  setCommuteDuration(minutes);  // ← persist
}
```

Also update `handleCreateAudio` reset to restore to `commuteDuration` (not hardcoded 15):
```typescript
function handleCreateAudio() {
  if (preview) {
    onProcess(preview.id, sliderValue);
    setPreview(null);
    setUrl("");
    setError(null);
    setSelectedPreset([5, 15, 30].includes(commuteDuration) ? commuteDuration : 0);
    setSliderValue(commuteDuration);
  }
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useCommuteDuration.ts` | New file — localStorage hook |
| `src/components/UploadScreen.tsx` | Use hook for duration default; persist on change |

## Tests

**File:** `src/hooks/useCommuteDuration.test.ts` (new)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommuteDuration } from "./useCommuteDuration";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: () => { store = {}; },
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
});

describe("useCommuteDuration", () => {
  it("returns 15 as default when nothing is stored", () => {
    const { result } = renderHook(() => useCommuteDuration());
    expect(result.current.commuteDuration).toBe(15);
  });

  it("loads stored value from localStorage on mount", () => {
    localStorageMock.getItem.mockReturnValueOnce("22");
    const { result } = renderHook(() => useCommuteDuration());
    expect(result.current.commuteDuration).toBe(22);
  });

  it("persists new value to localStorage when setCommuteDuration is called", () => {
    const { result } = renderHook(() => useCommuteDuration());
    act(() => { result.current.setCommuteDuration(30); });
    expect(result.current.commuteDuration).toBe(30);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("ridecast:commute-duration-mins", "30");
  });

  it("ignores out-of-range stored values and uses default", () => {
    localStorageMock.getItem.mockReturnValueOnce("999");
    const { result } = renderHook(() => useCommuteDuration());
    expect(result.current.commuteDuration).toBe(15);
  });
});
```

## Success Criteria

```bash
npm run test    # useCommuteDuration.test.ts passes; UploadScreen tests unaffected
npm run build   # no type errors
```

Manual verification:
- [ ] Set slider to 22 minutes → refresh page → slider defaults to 22 minutes
- [ ] Select "Main Points" (15 min) preset → refresh → slider defaults to 15 minutes
- [ ] Process audio at 22 min → upload form resets → slider resets to 22 min (not 15)

## Scope

`useCommuteDuration` hook and `UploadScreen.tsx` only. No new UI components. No settings screen. No server changes. The hook is pure localStorage — no API calls. Future consumers (home screen, notification) can import `useCommuteDuration()` directly.
