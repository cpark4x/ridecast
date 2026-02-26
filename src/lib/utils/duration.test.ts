import { describe, it, expect } from "vitest";
import { minutesToWords, wordsToMinutes, formatDuration } from "./duration";

describe("minutesToWords", () => {
  it("converts 5 minutes to 750 words", () => {
    expect(minutesToWords(5)).toBe(750);
  });

  it("converts 15 minutes to 2250 words", () => {
    expect(minutesToWords(15)).toBe(2250);
  });

  it("converts 20 minutes to 3000 words", () => {
    expect(minutesToWords(20)).toBe(3000);
  });

  it("converts 30 minutes to 4500 words", () => {
    expect(minutesToWords(30)).toBe(4500);
  });
});

describe("wordsToMinutes", () => {
  it("converts 3000 words to 20 minutes", () => {
    expect(wordsToMinutes(3000)).toBe(20);
  });

  it("rounds to nearest integer", () => {
    expect(wordsToMinutes(1000)).toBe(7);
  });
});

describe("formatDuration", () => {
  it("formats seconds to mm:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(768)).toBe("12:48");
    expect(formatDuration(3600)).toBe("60:00");
  });
});
