import { estimateReadingTime } from "../lib/utils";

describe("estimateReadingTime", () => {
  it("estimates 4 minutes for 1000-word article at 250 WPM", () => {
    // 1000 / 250 = 4
    expect(estimateReadingTime(1000)).toBe(4);
  });

  it("rounds up to at least 1 minute", () => {
    expect(estimateReadingTime(50)).toBe(1);
  });

  it("handles larger word counts", () => {
    // 5000 / 250 = 20
    expect(estimateReadingTime(5000)).toBe(20);
  });

  it("rounds partial minutes up", () => {
    // 300 / 250 = 1.2 → 2
    expect(estimateReadingTime(300)).toBe(2);
  });
});
