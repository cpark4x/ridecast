import { formatDuration, formatDurationMinutes, timeAgo } from "../lib/utils";

describe("formatDuration", () => {
  it("formats 0 seconds as '0:00'", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("formats seconds under 1 minute", () => {
    expect(formatDuration(45)).toBe("0:45");
  });

  it("formats exact minutes as M:00", () => {
    expect(formatDuration(300)).toBe("5:00");
  });

  it("formats minutes and seconds as M:SS", () => {
    expect(formatDuration(323)).toBe("5:23");
  });

  it("formats exactly 1 hour as 1:00:00", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
  });

  it("formats hours, minutes, seconds as H:MM:SS", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("pads single-digit minutes when hours are present", () => {
    expect(formatDuration(3665)).toBe("1:01:05");
  });

  it("floors fractional seconds", () => {
    expect(formatDuration(90.9)).toBe("1:30");
  });
});

describe("formatDurationMinutes", () => {
  it("formats 0 seconds as '0 min'", () => {
    expect(formatDurationMinutes(0)).toBe("0 min");
  });

  it("formats seconds under 1 hour as 'N min'", () => {
    expect(formatDurationMinutes(323)).toBe("5 min");
  });

  it("formats exactly 1 hour as '1 hr'", () => {
    expect(formatDurationMinutes(3600)).toBe("1 hr");
  });

  it("formats over an hour with minutes as '1 hr N min'", () => {
    expect(formatDurationMinutes(3900)).toBe("1 hr 5 min");
  });

  it("formats multiple hours with minutes", () => {
    expect(formatDurationMinutes(7380)).toBe("2 hr 3 min");
  });
});

describe("timeAgo", () => {
  it("returns 'just now' for timestamps within 60 seconds", () => {
    const justNow = new Date(Date.now() - 30 * 1000).toISOString();
    expect(timeAgo(justNow)).toBe("just now");
  });

  it("returns '1 minute ago' for ~1 minute ago", () => {
    const oneMinAgo = new Date(Date.now() - 65 * 1000).toISOString();
    expect(timeAgo(oneMinAgo)).toBe("1 minute ago");
  });

  it("returns 'N minutes ago' for multiple minutes", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5 minutes ago");
  });

  it("returns '1 hour ago' for ~1 hour ago", () => {
    const oneHourAgo = new Date(Date.now() - 70 * 60 * 1000).toISOString();
    expect(timeAgo(oneHourAgo)).toBe("1 hour ago");
  });

  it("returns 'N hours ago' for multiple hours", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(twoHoursAgo)).toBe("2 hours ago");
  });

  it("returns '1 day ago' for ~1 day ago", () => {
    const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(oneDayAgo)).toBe("1 day ago");
  });

  it("returns 'N days ago' for multiple days", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe("3 days ago");
  });
});
