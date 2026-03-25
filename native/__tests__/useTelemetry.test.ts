jest.mock("../lib/api", () => ({
  sendTelemetryBatch: jest.fn().mockResolvedValue(undefined),
}));

import React from "react";
import { AppState } from "react-native";
import { renderHook, act } from "@testing-library/react-native";
import { TelemetryProvider, useTelemetry } from "../lib/useTelemetry";
import * as api from "../lib/api";

const mockSendBatch = api.sendTelemetryBatch as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
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

    // Retrieve the handler registered with AppState.addEventListener("change", handler)
    const handler = (AppState.addEventListener as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === "change",
    )?.[1] as (state: string) => void;
    expect(handler).toBeDefined();

    await act(async () => {
      handler("background");
    });

    expect(mockSendBatch).toHaveBeenCalledTimes(1);
    const sentEvents = mockSendBatch.mock.calls[0][0];
    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0]).toMatchObject({
      eventType: "api_error",
      metadata: { status: 500, path: "/api/library" },
    });
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
