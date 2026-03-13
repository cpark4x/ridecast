import { formatDuration, formatDurationMinutes, timeAgo, sourceName, timeRemaining } from "../lib/utils";

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

// ─── sourceName ──────────────────────────────────────────────────────────────

describe("sourceName", () => {
  it("extracts domain from sourceUrl, stripping www", () => {
    expect(sourceName("url", "https://www.espn.com/article/123", null)).toBe(
      "espn.com",
    );
  });

  it("extracts domain without www prefix", () => {
    expect(sourceName("url", "https://nytimes.com/section/sports", null)).toBe(
      "nytimes.com",
    );
  });

  it("falls back to author when sourceUrl is null", () => {
    expect(sourceName("pdf", null, "John Smith")).toBe("John Smith");
  });

  it("falls back to author when sourceUrl is empty string", () => {
    expect(sourceName("pdf", "", "Jane Doe")).toBe("Jane Doe");
  });

  it("falls back to uppercase sourceType when no URL and no author", () => {
    expect(sourceName("epub", null, null)).toBe("EPUB");
  });

  it("falls back to uppercase sourceType when URL is malformed", () => {
    expect(sourceName("txt", "not-a-url", null)).toBe("TXT");
  });

  it("prioritises URL over author", () => {
    expect(
      sourceName("url", "https://medium.com/post/123", "Medium Staff"),
    ).toBe("medium.com");
  });

  it("handles undefined sourceUrl and author gracefully", () => {
    expect(sourceName("pocket", undefined, undefined)).toBe("POCKET");
  });
});

// ─── timeRemaining ───────────────────────────────────────────────────────────

describe("timeRemaining", () => {
  it("returns minutes when ≥ 60 seconds remain", () => {
    expect(timeRemaining(60, 780)).toBe("12 min left");
  });

  it("returns 1 min left when exactly 60 seconds remain", () => {
    expect(timeRemaining(0, 60)).toBe("1 min left");
  });

  it("returns seconds when < 60 seconds remain", () => {
    expect(timeRemaining(730, 760)).toBe("30 sec left");
  });

  it("returns '0 sec left' when position is past end", () => {
    expect(timeRemaining(800, 760)).toBe("0 sec left");
  });

  it("returns '0 sec left' when position equals duration", () => {
    expect(timeRemaining(600, 600)).toBe("0 sec left");
  });

  it("ceils fractional seconds", () => {
    expect(timeRemaining(0.9, 60)).toBe("1 min left");
  });

  it("ceils fractional minutes", () => {
    expect(timeRemaining(59, 780)).toBe("13 min left");
  });
});
