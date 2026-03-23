import { formatStorageSize } from "../lib/utils";

describe("formatStorageSize", () => {
  it("formats bytes less than 1 MB as KB", () => {
    expect(formatStorageSize(512 * 1024)).toBe("512 KB");
  });

  it("formats exactly 1 MB", () => {
    expect(formatStorageSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats multi-megabyte values with one decimal", () => {
    expect(formatStorageSize(5.5 * 1024 * 1024)).toBe("5.5 MB");
  });

  it("formats zero bytes as 0 KB", () => {
    expect(formatStorageSize(0)).toBe("0 KB");
  });

  it("formats values less than 1 KB as 0 KB", () => {
    expect(formatStorageSize(500)).toBe("0 KB");
  });

  it("rounds MB to one decimal place", () => {
    // 10.25 MB
    expect(formatStorageSize(10.25 * 1024 * 1024)).toBe("10.3 MB");
  });
});
