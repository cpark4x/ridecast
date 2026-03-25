import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { AppState } from "react-native";
import { sendTelemetryBatch } from "./api";
import type { TelemetryEventPayload } from "./types";

const BATCH_INTERVAL_MS = 60_000;

interface TelemetryContextType {
  trackEvent(
    eventType: TelemetryEventPayload["eventType"],
    metadata: Record<string, unknown>,
  ): void;
  flush(): void;
}

const TelemetryContext = createContext<TelemetryContextType | null>(null);

export function useTelemetry(): TelemetryContextType {
  const ctx = useContext(TelemetryContext);
  if (ctx === null) {
    throw new Error("useTelemetry must be used within TelemetryProvider");
  }
  return ctx;
}

export function TelemetryProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const queueRef = useRef<TelemetryEventPayload[]>([]);

  const flush = useCallback(() => {
    if (queueRef.current.length === 0) return;
    const events = queueRef.current;
    queueRef.current = [];
    sendTelemetryBatch(events).catch(() => {
      queueRef.current = [...events, ...queueRef.current];
    });
  }, []);

  const trackEvent = useCallback(
    (
      eventType: TelemetryEventPayload["eventType"],
      metadata: Record<string, unknown>,
    ) => {
      queueRef.current.push({ eventType, metadata });
    },
    [],
  );

  useEffect(() => {
    const id = setInterval(flush, BATCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [flush]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        flush();
      }
    });
    return () => subscription.remove();
  }, [flush]);

  return React.createElement(
    TelemetryContext.Provider,
    { value: { trackEvent, flush } },
    children,
  );
}
