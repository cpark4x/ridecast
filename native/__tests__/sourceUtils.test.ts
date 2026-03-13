import { extractDomain, deriveSourceIdentity, hashColor } from "../lib/sourceUtils";

describe("extractDomain", () => {
  it("extracts domain from full URL", () => {
    expect(extractDomain("https://www.espn.com/nba/story")).toBe("espn.com");
  });

  it("strips www prefix", () => {
    expect(extractDomain("https://www.github.com/org/repo")).toBe("github.com");
  });

  it("handles URLs without www", () => {
    expect(extractDomain("https://arxiv.org/abs/2401.00001")).toBe("arxiv.org");
  });

  it("handles subdomains (keeps full domain for substack)", () => {
    expect(extractDomain("https://astralcodexten.substack.com/p/post")).toBe("astralcodexten.substack.com");
  });

  it("returns null for invalid URL", () => {
    expect(extractDomain("not a url")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractDomain("")).toBeNull();
  });
});

describe("deriveSourceIdentity", () => {
  it("returns known brand for nytimes.com", () => {
    const result = deriveSourceIdentity({
      sourceType: "url",
      sourceUrl: "https://www.nytimes.com/2024/article",
    });
    expect(result.sourceName).toBe("New York Times");
    expect(result.sourceBrandColor).toBe("#000000");
    expect(result.sourceDomain).toBe("nytimes.com");
  });

  it("returns title-cased domain for unknown source", () => {
    const result = deriveSourceIdentity({
      sourceType: "url",
      sourceUrl: "https://waitbutwhy.com/article",
    });
    expect(result.sourceName).toBe("Waitbutwhy");
    expect(result.sourceBrandColor).toBeNull();
    expect(result.sourceDomain).toBe("waitbutwhy.com");
  });

  it("returns sourceType label when no URL", () => {
    const result = deriveSourceIdentity({
      sourceType: "pdf",
      sourceUrl: null,
    });
    expect(result.sourceName).toBe("PDF");
    expect(result.sourceDomain).toBeNull();
  });
});

describe("hashColor", () => {
  it("returns a valid hex color", () => {
    expect(hashColor("example.com")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is deterministic", () => {
    expect(hashColor("test.com")).toBe(hashColor("test.com"));
  });

  it("produces different colors for different inputs", () => {
    expect(hashColor("a.com")).not.toBe(hashColor("b.com"));
  });

  it("handles empty string", () => {
    expect(hashColor("")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
