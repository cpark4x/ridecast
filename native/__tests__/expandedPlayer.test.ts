import { nextSpeed } from "../lib/utils";

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

describe("nextSpeed", () => {
  it("advances from first speed to second", () => {
    expect(nextSpeed(0.5, SPEEDS)).toBe(0.75);
  });

  it("advances from a middle speed to the next", () => {
    expect(nextSpeed(1.0, SPEEDS)).toBe(1.25);
  });

  it("wraps from last speed back to first", () => {
    expect(nextSpeed(2.0, SPEEDS)).toBe(0.5);
  });

  it("wraps to first when speed is not in the list", () => {
    expect(nextSpeed(3.0, SPEEDS)).toBe(0.5);
  });

  it("advances from 1.75 to 2.0", () => {
    expect(nextSpeed(1.75, SPEEDS)).toBe(2.0);
  });
});
