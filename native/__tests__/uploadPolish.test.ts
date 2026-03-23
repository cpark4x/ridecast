// native/__tests__/uploadPolish.test.ts
// Tests for upload-polish feature: validateUrl and humaniseError logic
// These are tested as extracted copies since the originals are module-internal.

// ---------------------------------------------------------------------------
// validateUrl — extracted inline for testing (mirrors the module-internal fn)
// ---------------------------------------------------------------------------

function validateUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Please enter a URL before continuing.";
  try {
    const u = new URL(trimmed);
    if (!["http:", "https:"].includes(u.protocol)) {
      return "URL must start with http:// or https://";
    }
    return null;
  } catch {
    return "That doesn't look like a valid URL. Try something like https://example.com/article\u2026";
  }
}

describe("validateUrl", () => {
  it("returns error for empty string", () => {
    expect(validateUrl("")).toBe("Please enter a URL before continuing.");
  });

  it("returns error for whitespace-only string", () => {
    expect(validateUrl("   ")).toBe("Please enter a URL before continuing.");
  });

  it("returns null for valid https URL", () => {
    expect(validateUrl("https://example.com/article")).toBeNull();
  });

  it("returns null for valid http URL", () => {
    expect(validateUrl("http://example.com")).toBeNull();
  });

  it("returns error for ftp URL", () => {
    expect(validateUrl("ftp://example.com")).toBe(
      "URL must start with http:// or https://",
    );
  });

  it("returns error for malformed URL", () => {
    expect(validateUrl("not-a-url")).toMatch(/doesn't look like a valid URL/);
  });

  it("trims whitespace before validation", () => {
    expect(validateUrl("  https://example.com  ")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// humaniseError — extracted inline for testing (mirrors the module-internal fn)
// ---------------------------------------------------------------------------

function humaniseError(err: unknown, statusCode?: number): string {
  if (statusCode === 409) {
    return "This content is already in your library.";
  }
  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
    return "We couldn't read that page. It may require a login or be unavailable.";
  }
  if (statusCode !== undefined && statusCode >= 500) {
    return "The server ran into an error. Please try again in a moment.";
  }
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return "The request timed out. Check your connection and try again.";
    }
    if (
      err.message.toLowerCase().includes("network") ||
      err.message.toLowerCase().includes("fetch")
    ) {
      return "No internet connection. Please check your network.";
    }
  }
  return "Something went wrong. Please try again.";
}

describe("humaniseError", () => {
  it("returns duplicate message for 409", () => {
    expect(humaniseError(new Error("whatever"), 409)).toBe(
      "This content is already in your library.",
    );
  });

  it("returns client error message for 4xx", () => {
    expect(humaniseError(new Error("whatever"), 422)).toBe(
      "We couldn't read that page. It may require a login or be unavailable.",
    );
  });

  it("returns server error message for 5xx", () => {
    expect(humaniseError(new Error("whatever"), 500)).toBe(
      "The server ran into an error. Please try again in a moment.",
    );
  });

  it("returns timeout message for AbortError", () => {
    const err = new Error("The operation was aborted");
    err.name = "AbortError";
    expect(humaniseError(err)).toBe(
      "The request timed out. Check your connection and try again.",
    );
  });

  it("returns network message for network errors", () => {
    expect(humaniseError(new Error("Network request failed"))).toBe(
      "No internet connection. Please check your network.",
    );
  });

  it("returns network message for fetch errors", () => {
    expect(humaniseError(new Error("Failed to fetch"))).toBe(
      "No internet connection. Please check your network.",
    );
  });

  it("returns generic message for unknown errors", () => {
    expect(humaniseError("unknown")).toBe(
      "Something went wrong. Please try again.",
    );
  });

  it("returns generic message for null", () => {
    expect(humaniseError(null)).toBe(
      "Something went wrong. Please try again.",
    );
  });
});
