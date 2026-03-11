import { describe, it, expect } from "vitest";
import { parseConversationScript } from "./script-parser";

describe("parseConversationScript", () => {
  it("splits conversation by speaker labels", () => {
    const script = `[Host A] Hey, so I just read this article.
[Host B] Oh yeah? What was it about?
[Host A] It was about building systems for productivity.`;

    const segments = parseConversationScript(script);

    expect(segments).toHaveLength(3);
    expect(segments[0].speaker).toBe("Host A");
    expect(segments[0].text).toBe("Hey, so I just read this article.");
    expect(segments[1].speaker).toBe("Host B");
    expect(segments[1].text).toBe("Oh yeah? What was it about?");
    expect(segments[2].speaker).toBe("Host A");
    expect(segments[2].text).toBe(
      "It was about building systems for productivity."
    );
  });

  it("handles multi-line speaker turns", () => {
    const script = `[Host A] This is line one.
And this continues the same turn.
[Host B] Now it's my turn.`;

    const segments = parseConversationScript(script);

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe(
      "This is line one.\nAnd this continues the same turn."
    );
    expect(segments[1].text).toBe("Now it's my turn.");
  });

  it("returns empty array for empty input", () => {
    expect(parseConversationScript("")).toEqual([]);
  });

  it("handles text without speaker labels as narrator", () => {
    const script = "Just plain text without any labels.";
    const segments = parseConversationScript(script);

    expect(segments).toHaveLength(1);
    expect(segments[0].speaker).toBe("narrator");
    expect(segments[0].text).toBe("Just plain text without any labels.");
  });
});
