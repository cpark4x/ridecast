import { describe, it, expect } from "vitest";
import {
  getMostListenedVersion,
  getCardProgress,
  getVersionProgress,
  isItemPlayed,
} from "../library-progress";

// Fixtures
const UNLISTENED = {
  audioId: "a1",
  durationSecs: 600 as number | null,
  position: 0,
  completed: false,
  status: "ready",
};
const PARTIAL = {
  audioId: "a2",
  durationSecs: 600 as number | null,
  position: 300,
  completed: false,
  status: "ready",
};
const COMPLETED_V = {
  audioId: "a3",
  durationSecs: 600 as number | null,
  position: 600,
  completed: true,
  status: "ready",
};
const NO_DURATION = {
  audioId: null as string | null,
  durationSecs: null as number | null,
  position: 0,
  completed: false,
  status: "generating",
};

describe("getMostListenedVersion", () => {
  it("returns version with highest position/duration ratio", () => {
    const result = getMostListenedVersion([UNLISTENED, PARTIAL, COMPLETED_V]);
    expect(result).toBe(COMPLETED_V);
  });

  it("returns only version in single-item array", () => {
    const result = getMostListenedVersion([PARTIAL]);
    expect(result).toBe(PARTIAL);
  });

  it("returns null for empty array", () => {
    expect(getMostListenedVersion([])).toBeNull();
  });

  it("skips versions with null durationSecs", () => {
    const result = getMostListenedVersion([NO_DURATION, PARTIAL]);
    expect(result).toBe(PARTIAL);
  });

  it("returns null when all versions have null duration", () => {
    expect(getMostListenedVersion([NO_DURATION])).toBeNull();
  });

  it("ranks completed version with position=0 above partial version", () => {
    const completedReset = { ...COMPLETED_V, position: 0 };
    const result = getMostListenedVersion([PARTIAL, completedReset]);
    expect(result).toBe(completedReset);
  });
});

describe("getCardProgress", () => {
  it("returns 0 when all have position=0", () => {
    expect(getCardProgress([UNLISTENED])).toBe(0);
  });

  it("returns ~0.5 for PARTIAL as most-listened", () => {
    expect(getCardProgress([UNLISTENED, PARTIAL])).toBeCloseTo(0.5, 1);
  });

  it("returns 1.0 when a version is completed", () => {
    expect(getCardProgress([UNLISTENED, COMPLETED_V])).toBe(1.0);
  });

  it("returns 0 for empty array", () => {
    expect(getCardProgress([])).toBe(0);
  });

  it("returns 0 when only generating versions exist", () => {
    expect(getCardProgress([NO_DURATION])).toBe(0);
  });

  it("is capped at 1.0 even if position exceeds duration", () => {
    const overshot = { ...PARTIAL, position: 800, durationSecs: 600 };
    expect(getCardProgress([overshot])).toBe(1.0);
  });

  it("returns 1.0 for completed version with position reset to 0", () => {
    const completedReset = { ...COMPLETED_V, position: 0 };
    expect(getCardProgress([completedReset])).toBe(1.0);
  });
});

describe("getVersionProgress", () => {
  it("returns 0 for unlistened", () => {
    expect(getVersionProgress(UNLISTENED)).toBe(0);
  });

  it("returns ~0.5 for halfway", () => {
    expect(getVersionProgress(PARTIAL)).toBeCloseTo(0.5, 1);
  });

  it("returns 1.0 for completed", () => {
    expect(getVersionProgress(COMPLETED_V)).toBe(1.0);
  });

  it("returns 0 when durationSecs null", () => {
    expect(getVersionProgress(NO_DURATION)).toBe(0);
  });

  it("returns 1.0 for completed version even when position is 0", () => {
    const completedReset = { ...COMPLETED_V, position: 0 };
    expect(getVersionProgress(completedReset)).toBe(1.0);
  });
});

describe("isItemPlayed", () => {
  it("returns true when at least one version is completed", () => {
    expect(isItemPlayed([UNLISTENED, COMPLETED_V])).toBe(true);
  });

  it("returns false when none completed", () => {
    expect(isItemPlayed([UNLISTENED, PARTIAL])).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(isItemPlayed([])).toBe(false);
  });
});
