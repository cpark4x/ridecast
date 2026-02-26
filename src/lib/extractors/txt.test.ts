import { describe, it, expect } from "vitest";
import { extractTxt } from "./txt";

describe("extractTxt", () => {
  it("extracts text and counts words", () => {
    const input = "The quick brown fox jumps over the lazy dog.";
    const result = extractTxt(input, "sample.txt");

    expect(result.text).toBe("The quick brown fox jumps over the lazy dog.");
    expect(result.wordCount).toBe(9);
    expect(result.title).toBe("sample");
  });

  it("derives title from filename without extension", () => {
    const result = extractTxt("Hello world", "my-great-notes.txt");
    expect(result.title).toBe("my-great-notes");
  });

  it("trims whitespace from text", () => {
    const result = extractTxt("  hello world  \n\n", "test.txt");
    expect(result.text).toBe("hello world");
    expect(result.wordCount).toBe(2);
  });

  it("handles empty text", () => {
    const result = extractTxt("", "empty.txt");
    expect(result.text).toBe("");
    expect(result.wordCount).toBe(0);
  });
});
