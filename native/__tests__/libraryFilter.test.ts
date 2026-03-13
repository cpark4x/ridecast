import { filterEpisodes } from "../lib/libraryHelpers";
import type { LibraryItem, LibraryFilter } from "../lib/types";

function makeVersion(
  overrides: Partial<{
    status: "ready" | "generating" | "processing";
    completed: boolean;
    position: number;
  }> = {},
) {
  return {
    scriptId: "s1",
    audioId: "a1",
    audioUrl: "https://cdn.example.com/audio.mp3",
    durationSecs: 300,
    targetDuration: 5,
    format: "narrator",
    status: "ready" as const,
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
  versions: ReturnType<typeof makeVersion>[],
): LibraryItem {
  return {
    id,
    title: `Episode ${id}`,
    author: null,
    sourceType: "url",
    sourceUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    wordCount: 1000,
    versions,
  };
}

describe("filterEpisodes", () => {
  const readyUnstarted = makeItem("1", [makeVersion()]);
  const inProgress = makeItem("2", [makeVersion({ position: 42, completed: false })]);
  const completed = makeItem("3", [makeVersion({ position: 300, completed: true })]);
  const generating = makeItem("4", [makeVersion({ status: "generating" })]);
  const multiVersionMixed = makeItem("5", [
    makeVersion({ completed: true }),
    makeVersion({ status: "generating" }),
  ]);
  const allItems = [readyUnstarted, inProgress, completed, generating, multiVersionMixed];

  it("filter 'all' returns every item", () => {
    expect(filterEpisodes(allItems, "all")).toEqual(allItems);
  });

  it("filter 'in_progress' returns items with position > 0 and not completed", () => {
    const result = filterEpisodes(allItems, "in_progress");
    expect(result.map((i) => i.id)).toContain("2");
    expect(result.map((i) => i.id)).not.toContain("1");
    expect(result.map((i) => i.id)).not.toContain("3");
  });

  it("filter 'completed' returns items where all versions are completed", () => {
    const result = filterEpisodes(allItems, "completed");
    expect(result.map((i) => i.id)).toContain("3");
    expect(result.map((i) => i.id)).not.toContain("1");
    expect(result.map((i) => i.id)).not.toContain("2");
  });

  it("filter 'generating' returns items where any version has status generating", () => {
    const result = filterEpisodes(allItems, "generating");
    expect(result.map((i) => i.id)).toContain("4");
    expect(result.map((i) => i.id)).toContain("5");
    expect(result.map((i) => i.id)).not.toContain("1");
    expect(result.map((i) => i.id)).not.toContain("2");
    expect(result.map((i) => i.id)).not.toContain("3");
  });

  it("item with empty versions is not in_progress, not completed, not generating", () => {
    const empty = makeItem("6", []);
    const result = filterEpisodes([empty], "in_progress");
    expect(result).toHaveLength(0);
  });

  // --- active filter ---

  it("filter 'active' excludes items where every version is completed", () => {
    const result = filterEpisodes(allItems, "active");
    // completed item (id=3) has all versions completed → excluded
    expect(result.map((i) => i.id)).not.toContain("3");
  });

  it("filter 'active' includes unlistened items (position=0, not completed)", () => {
    const result = filterEpisodes(allItems, "active");
    expect(result.map((i) => i.id)).toContain("1");
  });

  it("filter 'active' includes in-progress items", () => {
    const result = filterEpisodes(allItems, "active");
    expect(result.map((i) => i.id)).toContain("2");
  });

  it("filter 'active' includes generating items", () => {
    const result = filterEpisodes(allItems, "active");
    expect(result.map((i) => i.id)).toContain("4");
  });

  it("filter 'active' includes items with mixed completed/incomplete versions", () => {
    const result = filterEpisodes(allItems, "active");
    expect(result.map((i) => i.id)).toContain("5");
  });

  it("filter 'active' includes items with no versions (queued)", () => {
    const empty = makeItem("7", []);
    const result = filterEpisodes([empty], "active");
    expect(result).toHaveLength(1);
  });

  it("filter 'active' excludes multi-version item where ALL versions are completed", () => {
    const allDone = makeItem("8", [
      makeVersion({ completed: true }),
      makeVersion({ completed: true }),
    ]);
    const result = filterEpisodes([allDone], "active");
    expect(result).toHaveLength(0);
  });

  it("filter 'active' includes items with processing status", () => {
    const item = makeItem("9", [makeVersion({ status: "processing", completed: false })]);
    const result = filterEpisodes([item], "active");
    expect(result).toHaveLength(1);
  });

  it("filter 'active' returns correct count from mixed list", () => {
    // allItems: 1=unstarted(active), 2=in_progress(active), 3=completed(excluded),
    //           4=generating(active), 5=mixed(active)
    const result = filterEpisodes(allItems, "active");
    expect(result).toHaveLength(4);
  });
});
