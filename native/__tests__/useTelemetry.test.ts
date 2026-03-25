jest.mock("../lib/api", () => ({
  sendTelemetryBatch: jest.fn().mockResolvedValue(undefined),
}));

import React from "react";
import { AppState } from "react-native";
import { renderHook, act } from "@testing-library/react-native";
import { TelemetryProvider, useTelemetry } from "../lib/useTelemetry";
import * as api from "../lib/api";

const mockSendBatch = api.sendTelemetryBatch as jest.Mock;

let appStateChangeListener: ((state: string) => void) | undefined;
let mockSubscriptionRemove: jest.Mock;
let appStateAddEventListenerSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();

  appStateChangeListener = undefined;
  mockSubscriptionRemove = jest.fn();

  appStateAddEventListenerSpy = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((event, handler) => {
      if (event === "change") {
        appStateChangeListener = handler as (state: string) => void;
      }
      return { remove: mockSubscriptionRemove };
    });
});

afterEach(() => {
  appStateAddEventListenerSpy.mockRestore();
  jest.useRealTimers();
});

function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(TelemetryProvider, null, children);
  };
}

describe("useTelemetry", () => {
  it("throws when used outside TelemetryProvider", () => {
    expect(() => {
      renderHook(() => useTelemetry());
    }).toThrow("useTelemetry must be used within TelemetryProvider");
  });

  it("exposes a trackEvent function", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useTelemetry(), { wrapper });
    expect(typeof result.current.trackEvent).toBe("function");
  });

  it("does not send immediately when trackEvent is called", () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.trackEvent("api_error", { status: 500, path: "/api/library" });
    });

    expect(mockSendBatch).not.toHaveBeenCalled();
  });

  it("batches and sends events after 60 seconds", async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.trackEvent("api_error", { status: 500, path: "/api/library" });
      result.current.trackEvent("api_error", { status: 404, path: "/api/content" });
    });

    await act(async () => {
      jest.advanceTimersByTime(60000);
    });

    expect(mockSendBatch).toHaveBeenCalledTimes(1);
    const sentEvents = mockSendBatch.mock.calls[0][0];
    expect(sentEvents).toHaveLength(2);
    expect(sentEvents[0]).toMatchObject({ eventType: "api_error", metadata: { status: 500, path: "/api/library" } });
    expect(sentEvents[1]).toMatchObject({ eventType: "api_error", metadata: { status: 404, path: "/api/content" } });
  });

  it("does not send when queue is empty at interval", async () => {
    renderHook(() => useTelemetry(), { wrapper: makeWrapper() });

    await act(async () => {
      jest.advanceTimersByTime(60000);
    });

    expect(mockSendBatch).not.toHaveBeenCalled();
  });

  it("clears the queue after sending", async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.trackEvent("api_error", { status: 500, path: "/api/library" });
    });

    await act(async () => {
      jest.advanceTimersByTime(60000);
    });

    await act(async () => {
      jest.advanceTimersByTime(60000);
    });

    expect(mockSendBatch).toHaveBeenCalledTimes(1);
  });

  it("exposes flush function for manual send", async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.trackEvent("api_error", { status: 500, path: "/api/library" });
    });

    await act(async () => {
      result.current.flush();
    });

    expect(mockSendBatch).toHaveBeenCalledTimes(1);
    const sentEvents = mockSendBatch.mock.calls[0][0];
    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0]).toMatchObject({ eventType: "api_error", metadata: { status: 500, path: "/api/library" } });
  });

  it("flushes when app goes to background", async () => {
    const wrapper = makeWrapper();
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.trackEvent("api_error", { status: 500, path: "/api/library" });
    });

    expect(appStateChangeListener).toBeDefined();

    await act(async () => {
      appStateChangeListener!("background");
    });

    expect(mockSendBatch).toHaveBeenCalledTimes(1);
    const sentEvents = mockSendBatch.mock.calls[0][0];
    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0]).toMatchObject({
      eventType: "api_error",
      metadata: { status: 500, path: "/api/library" },
    });
  });

  it("removes the AppState subscription on unmount", () => {
    const wrapper = makeWrapper();
    const { unmount } = renderHook(() => useTelemetry(), { wrapper });

    expect(mockSubscriptionRemove).not.toHaveBeenCalled();
    unmount();
    expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);
  });

  it("preserves clientEventIds on retry so server can deduplicate", async () => {
    mockSendBatch.mockRejectedValueOnce(new Error("Network error"));

    const wrapper = makeWrapper();
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.trackEvent("api_error", { status: 500 });
      result.current.trackEvent("api_error", { status: 404 });
    });

    // First flush — sendTelemetryBatch rejects; events should be requeued
    await act(async () => {
      result.current.flush();
    });

    expect(mockSendBatch).toHaveBeenCalledTimes(1);
    const firstCallEvents = mockSendBatch.mock.calls[0][0];
    expect(firstCallEvents[0].clientEventId).toBeDefined();
    expect(firstCallEvents[1].clientEventId).toBeDefined();
    // Each event must have a unique id
    expect(firstCallEvents[0].clientEventId).not.toBe(firstCallEvents[1].clientEventId);

    // Second flush — events requeued, should send same clientEventIds
    await act(async () => {
      result.current.flush();
    });

    expect(mockSendBatch).toHaveBeenCalledTimes(2);
    const secondCallEvents = mockSendBatch.mock.calls[1][0];
    // IDs must be preserved through retry so server can skip duplicates
    expect(secondCallEvents[0].clientEventId).toBe(firstCallEvents[0].clientEventId);
    expect(secondCallEvents[1].clientEventId).toBe(firstCallEvents[1].clientEventId);
  });

  it("requeues events when sendTelemetryBatch fails", async () => {
    mockSendBatch.mockRejectedValueOnce(new Error("Network error"));

    const wrapper = makeWrapper();
    const { result } = renderHook(() => useTelemetry(), { wrapper });

    act(() => {
      result.current.trackEvent("api_error", { status: 500, path: "/api/library" });
    });

    // First flush — sendTelemetryBatch will reject; events should be requeued
    await act(async () => {
      result.current.flush();
    });

    expect(mockSendBatch).toHaveBeenCalledTimes(1);

    // Second flush — events should have been restored to the queue
    await act(async () => {
      result.current.flush();
    });

    expect(mockSendBatch).toHaveBeenCalledTimes(2);
    expect(mockSendBatch.mock.calls[1][0]).toHaveLength(1);
    expect(mockSendBatch.mock.calls[1][0][0]).toMatchObject({
      eventType: "api_error",
      metadata: { status: 500, path: "/api/library" },
    });
  });
});
