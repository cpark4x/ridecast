import { describe, it, expect } from "vitest";
import { timeAgo, gradients, sourceIcons, getGradient, getTitleFallback } from "../content-display";

describe("timeAgo", () => {
  it("returns 'Just now' for < 1 minute ago", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("Just now");
  });

  it("returns minutes for < 60 minutes", () => {
    const date = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("15m ago");
  });

  it("returns hours for < 24 hours", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("3h ago");
  });

  it("returns days for < 7 days", () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("2d ago");
  });

  it("returns weeks for >= 7 days", () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("2w ago");
  });
});

describe("gradients", () => {
  it("has 4 gradient strings", () => {
    expect(gradients).toHaveLength(4);
  });
});

describe("getGradient", () => {
  it("cycles through gradients by index", () => {
    expect(getGradient(0)).toBe(gradients[0]);
    expect(getGradient(4)).toBe(gradients[0]);
    expect(getGradient(1)).toBe(gradients[1]);
  });
});

describe("sourceIcons", () => {
  it("has entries for pdf, epub, url, txt", () => {
    expect(sourceIcons.pdf).toBeDefined();
    expect(sourceIcons.epub).toBeDefined();
    expect(sourceIcons.url).toBeDefined();
    expect(sourceIcons.txt).toBeDefined();
  });
});

describe("getTitleFallback", () => {
  it("returns title when title is non-empty", () => {
    expect(getTitleFallback("My Article", null, "url", "2026-03-01")).toBe("My Article");
  });

  it("returns domain from sourceUrl when title is empty", () => {
    expect(getTitleFallback("", "https://nytimes.com/article/foo", "url", "2026-03-01")).toBe("nytimes.com");
  });

  it("returns domain from sourceUrl when title is whitespace-only", () => {
    expect(getTitleFallback("   ", "https://www.example.com/page", "url", "2026-03-01")).toBe("example.com");
  });

  it("returns sourceType + date when both title and sourceUrl are empty", () => {
    expect(getTitleFallback("", null, "pdf", "2026-03-01T12:00:00Z")).toBe("PDF · Mar 1, 2026");
  });

  it("strips www. prefix from domain", () => {
    expect(getTitleFallback("", "https://www.bbc.co.uk/news", "url", "2026-03-01")).toBe("bbc.co.uk");
  });
});