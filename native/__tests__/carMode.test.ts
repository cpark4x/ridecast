import { CAR_MODE_SKIP_SECS } from "../lib/constants";

describe("CAR_MODE_SKIP_SECS", () => {
  it("is 30 seconds (larger interval for eyes-off driving)", () => {
    expect(CAR_MODE_SKIP_SECS).toBe(30);
  });

  it("is greater than the standard 15s forward skip", () => {
    expect(CAR_MODE_SKIP_SECS).toBeGreaterThan(15);
  });

  it("is greater than the standard 5s back skip", () => {
    expect(CAR_MODE_SKIP_SECS).toBeGreaterThan(5);
  });
});
