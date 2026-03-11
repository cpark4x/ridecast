import { useState } from "react";

const STORAGE_KEY = "ridecast:commute-duration-mins";
const DEFAULT_DURATION = 15;

function readStoredDuration(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 2 && parsed <= 60) {
        return parsed;
      }
    }
  } catch {
    // localStorage unavailable (e.g. SSR) — use default
  }
  return DEFAULT_DURATION;
}

export function useCommuteDuration() {
  // Lazy initializer — reads localStorage once on first render, no extra render cycle
  const [commuteDuration, setCommuteDurationState] = useState<number>(readStoredDuration);

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
