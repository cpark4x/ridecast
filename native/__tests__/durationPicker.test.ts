import { findActivePreset } from "../components/DurationPicker";
import { DURATION_PRESETS } from "../lib/constants";

describe("findActivePreset", () => {
  it("returns the index of a matching preset", () => {
    expect(findActivePreset(5, DURATION_PRESETS)).toBe(2); // Summary = 5 min
  });

  it("returns -1 when value does not match any preset", () => {
    expect(findActivePreset(7, DURATION_PRESETS)).toBe(-1);
  });

  it("matches Quick Take (2 min)", () => {
    expect(findActivePreset(2, DURATION_PRESETS)).toBe(0);
  });

  it("matches Deep Dive (30 min)", () => {
    expect(findActivePreset(30, DURATION_PRESETS)).toBe(4);
  });

  it("returns -1 for slider-only value (e.g. 45)", () => {
    expect(findActivePreset(45, DURATION_PRESETS)).toBe(-1);
  });
});
