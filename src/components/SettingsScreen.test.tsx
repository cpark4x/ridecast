import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { SettingsScreen, useElevenLabsKey } from "./SettingsScreen";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = v;
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
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
  localStorageMock.removeItem.mockClear();
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
  });
});

describe("SettingsScreen", () => {
  it("saves ElevenLabs key to localStorage on Save", async () => {
    render(<SettingsScreen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("sk_..."), {
      target: { value: "sk_test_key" },
    });
    fireEvent.click(screen.getByText("Save"));
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "ridecast:elevenlabs-api-key",
      "sk_test_key"
    );
  });

  it("removes key from localStorage when saved empty", () => {
    render(<SettingsScreen onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Save"));
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "ridecast:elevenlabs-api-key"
    );
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = vi.fn();
    render(<SettingsScreen onClose={onClose} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows Settings heading", () => {
    render(<SettingsScreen onClose={vi.fn()} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});

describe("useElevenLabsKey", () => {
  it("returns null when no key stored", () => {
    const { result } = renderHook(() => useElevenLabsKey());
    expect(result.current).toBeNull();
  });

  it("returns stored key", () => {
    localStorageMock.getItem.mockReturnValueOnce("sk_stored");
    const { result } = renderHook(() => useElevenLabsKey());
    expect(result.current).toBe("sk_stored");
  });
});
