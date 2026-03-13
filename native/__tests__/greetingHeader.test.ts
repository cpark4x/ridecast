// native/__tests__/greetingHeader.test.ts

import { getGreeting } from "../components/GreetingHeader";

// ---------------------------------------------------------------------------
// getGreeting
// ---------------------------------------------------------------------------

describe("getGreeting", () => {
  const RealDate = Date;

  function mockHour(hour: number) {
    global.Date = class extends RealDate {
      getHours() { return hour; }
    } as typeof Date;
  }

  afterEach(() => {
    global.Date = RealDate;
  });

  it("returns 'Good morning' for hour < 12", () => {
    mockHour(7);
    expect(getGreeting()).toBe("Good morning");
  });

  it("returns 'Good morning' at midnight (hour 0)", () => {
    mockHour(0);
    expect(getGreeting()).toBe("Good morning");
  });

  it("returns 'Good afternoon' for hour 12", () => {
    mockHour(12);
    expect(getGreeting()).toBe("Good afternoon");
  });

  it("returns 'Good afternoon' for hour 16", () => {
    mockHour(16);
    expect(getGreeting()).toBe("Good afternoon");
  });

  it("returns 'Good evening' for hour 17", () => {
    mockHour(17);
    expect(getGreeting()).toBe("Good evening");
  });

  it("returns 'Good evening' for hour 23", () => {
    mockHour(23);
    expect(getGreeting()).toBe("Good evening");
  });
});