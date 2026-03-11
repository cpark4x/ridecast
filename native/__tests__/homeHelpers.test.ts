import { getUnlistenedItems, libraryItemToPlayable } from "../lib/libraryHelpers";
import type { LibraryItem, AudioVersion } from "../lib/types";

function makeVersion(
  overrides: Partial<{
    status: "ready" | "generating" | "processing";
    completed: boolean;
    position: number;
    audioId: string | null;
    audioUrl: string | null;
    durationSecs: number | null;
    format: string;
    targetDuration: number;
    contentType: string | null;
    summary: string | null;
    themes: string[];
  }> = {},
): AudioVersion {
  return {
    scriptId: "s1",
    audioId: "audio-1",
    audioUrl: "https://cdn.example.com/audio.mp3",
    durationSecs: 300,
    targetDuration: 5,
    format: "narrator",
    status: "ready",
    completed: false,
    position: 0,
    createdAt: "2026-01-01T00:00:00Z",
    summary: null,
    contentType: null,
    themes: [],
    compressionRatio: 0.5,
    actualWordCount: 750,
    voices: [],
    ttsProvider: "openai",
    ...overrides,
  };
}

function makeItem(
  id: string,
  versions: AudioVersion[],
  overrides: Partial<LibraryItem> = {},
): LibraryItem {
  return {
    id,
    title: `Episode ${id}`,
    author: "Author",
    sourceType: "url",
    sourceUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    wordCount: 1000,
    versions,
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// getUnlistenedItems
// ──────────────────────────────────────────────────────────────────────────────

describe("getUnlistenedItems", () => {
  it("includes episodes with a ready version at position 0 (not started)", () => {
    const item = makeItem("1", [makeVersion({ status: "ready", position: 0, completed: false })]);
    expect(getUnlistenedItems([item]).map((i) => i.id)).toContain("1");
  });

  it("includes episodes with a ready version that has progress but is not completed", () => {
    const item = makeItem("2", [makeVersion({ status: "ready", position: 42, completed: false })]);
    expect(getUnlistenedItems([item]).map((i) => i.id)).toContain("2");
  });

  it("excludes episodes where the only ready version is completed", () => {
    const item = makeItem("3", [makeVersion({ status: "ready", position: 300, completed: true })]);
    expect(getUnlistenedItems([item])).toHaveLength(0);
  });

  it("excludes episodes with no ready versions (only generating)", () => {
    const item = makeItem("4", [makeVersion({ status: "generating" })]);
    expect(getUnlistenedItems([item])).toHaveLength(0);
  });

  it("includes episodes with mixed versions as long as one ready+unlistened exists", () => {
    const item = makeItem("5", [
      makeVersion({ status: "ready", position: 0, completed: false }),
      makeVersion({ status: "ready", position: 300, completed: true }),
    ]);
    expect(getUnlistenedItems([item]).map((i) => i.id)).toContain("5");
  });

  it("excludes items with empty versions array", () => {
    const item = makeItem("6", []);
    expect(getUnlistenedItems([item])).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// libraryItemToPlayable
// ──────────────────────────────────────────────────────────────────────────────

describe("libraryItemToPlayable", () => {
  it("returns a PlayableItem from a ready version", () => {
    const item = makeItem("1", [
      makeVersion({ audioId: "a1", audioUrl: "https://cdn.example.com/a1.mp3", durationSecs: 300 }),
    ]);
    const playable = libraryItemToPlayable(item);
    expect(playable).not.toBeNull();
    expect(playable!.id).toBe("a1");
    expect(playable!.audioUrl).toBe("https://cdn.example.com/a1.mp3");
    expect(playable!.duration).toBe(300);
    expect(playable!.title).toBe("Episode 1");
  });

  it("uses targetDuration * 60 when durationSecs is null", () => {
    const item = makeItem("1", [
      makeVersion({ audioId: "a1", audioUrl: "https://cdn.example.com/a1.mp3", durationSecs: null, targetDuration: 5 }),
    ]);
    const playable = libraryItemToPlayable(item);
    expect(playable!.duration).toBe(300); // 5 * 60
  });

  it("returns null when there is no ready version with audioId and audioUrl", () => {
    const item = makeItem("1", [makeVersion({ status: "generating" })]);
    expect(libraryItemToPlayable(item)).toBeNull();
  });

  it("returns null when audioId is null", () => {
    const item = makeItem("1", [makeVersion({ audioId: null })]);
    expect(libraryItemToPlayable(item)).toBeNull();
  });

  it("returns null when audioUrl is null", () => {
    const item = makeItem("1", [makeVersion({ audioUrl: null })]);
    expect(libraryItemToPlayable(item)).toBeNull();
  });

  it("picks the first ready version when multiple exist", () => {
    const item = makeItem("1", [
      makeVersion({ status: "generating" }),
      makeVersion({ audioId: "a-first", audioUrl: "https://cdn.example.com/first.mp3" }),
      makeVersion({ audioId: "a-second", audioUrl: "https://cdn.example.com/second.mp3" }),
    ]);
    const playable = libraryItemToPlayable(item);
    expect(playable!.id).toBe("a-first");
  });

  it("maps contentType, themes, and summary from the version", () => {
    const item = makeItem("1", [
      makeVersion({
        audioId: "a1",
        audioUrl: "https://cdn.example.com/a1.mp3",
        contentType: "article",
        summary: "A great read",
        themes: ["tech", "ai"],
      }),
    ]);
    const playable = libraryItemToPlayable(item);
    expect(playable!.contentType).toBe("article");
    expect(playable!.summary).toBe("A great read");
    expect(playable!.themes).toEqual(["tech", "ai"]);
  });
});
