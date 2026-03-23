import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCommuteDuration } from "./useCommuteDuration";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
});

describe("useCommuteDuration", () => {
  it("returns 15 as default when nothing is stored", () => {
    const { result } = renderHook(() => useCommuteDuration());
    expect(result.current.commuteDuration).toBe(15);
  });

  it("loads stored value from localStorage on mount", async () => {
    localStorageMock.getItem.mockReturnValueOnce("22");
    const { result } = renderHook(() => useCommuteDuration());
    // Wait for useEffect to fire
    await act(async () => {});
    expect(result.current.commuteDuration).toBe(22);
  });

  it("persists new value to localStorage when setCommuteDuration is called", () => {
    const { result } = renderHook(() => useCommuteDuration());
    act(() => {
      result.current.setCommuteDuration(30);
    });
    expect(result.current.commuteDuration).toBe(30);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "ridecast:commute-duration-mins",
      "30"
    );
  });

  it("ignores out-of-range stored values and uses default", async () => {
    localStorageMock.getItem.mockReturnValueOnce("999");
    const { result } = renderHook(() => useCommuteDuration());
    await act(async () => {});
    expect(result.current.commuteDuration).toBe(15);
  });

  it("ignores NaN stored values and uses default", async () => {
    localStorageMock.getItem.mockReturnValueOnce("not-a-number");
    const { result } = renderHook(() => useCommuteDuration());
    await act(async () => {});
    expect(result.current.commuteDuration).toBe(15);
  });
});
