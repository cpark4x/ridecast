import { smartTitle } from "../lib/libraryHelpers";

describe("smartTitle — URL publisher suffix stripping", () => {
  it("strips pipe-separated site name", () => {
    expect(smartTitle("How LeBron Is Defying Age | ESPN.com", "url")).toBe(
      "How LeBron Is Defying Age",
    );
  });

  it("strips pipe with spaces", () => {
    expect(smartTitle("The AI Problem | MIT Technology Review", "url")).toBe(
      "The AI Problem",
    );
  });

  it("strips short hyphen suffix (3 words or fewer)", () => {
    expect(smartTitle("The Future of Work - The Verge", "url")).toBe(
      "The Future of Work",
    );
  });

  it("does NOT strip long hyphen suffix (subtitle)", () => {
    const input = "The Rise of AI - What It Means for Work";
    expect(smartTitle(input, "url")).toBe(input);
  });

  it("passes through clean title unchanged", () => {
    expect(smartTitle("How Transformers Work", "url")).toBe("How Transformers Work");
  });
});

describe("smartTitle — PDF filename cleaning", () => {
  it("strips .pdf extension and converts separators", () => {
    expect(smartTitle("2024_Q3_strategy_report.pdf", "pdf")).toBe(
      "2024 Q3 Strategy Report",
    );
  });

  it("strips _FINAL suffix", () => {
    expect(smartTitle("board_deck_FINAL.pdf", "pdf")).toBe("Board Deck");
  });

  it("strips _v2 suffix", () => {
    expect(smartTitle("proposal_v2.pdf", "pdf")).toBe("Proposal");
  });

  it("handles hyphen separators", () => {
    expect(smartTitle("my-research-paper.pdf", "pdf")).toBe("My Research Paper");
  });

  it("handles .epub extension", () => {
    expect(smartTitle("deep_work.epub", "epub")).toBe("Deep Work");
  });
});

describe("smartTitle — truncation", () => {
  it("truncates long titles with ellipsis", () => {
    const long = "This Is an Extremely Long Article Title That Goes On and On Beyond Any Reasonable Length For Display Purposes";
    const result = smartTitle(long, "url");
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(82); // 80 + ellipsis + possible space
  });

  it("does not truncate short titles", () => {
    expect(smartTitle("Short Title", "url")).toBe("Short Title");
  });
});

describe("smartTitle — edge cases", () => {
  it("returns original for empty string", () => {
    expect(smartTitle("", "url")).toBe("");
  });

  it("collapses extra whitespace", () => {
    expect(smartTitle("Title  With   Extra   Spaces", "url")).toBe(
      "Title With Extra Spaces",
    );
  });

  it("does not apply filename rules to url sourceType", () => {
    expect(smartTitle("Why_AI_Safety_Matters", "url")).toBe("Why_AI_Safety_Matters");
  });
});
