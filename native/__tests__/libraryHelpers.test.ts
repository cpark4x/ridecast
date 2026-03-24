import { getLibraryContext, getTopSourceDomain, libraryItemToPlayable } from "../lib/libraryHelpers";
import type { AudioVersion, LibraryItem } from "../lib/types";

// ---------------------------------------------------------------------------
// Test factory helpers
// ---------------------------------------------------------------------------

function makeVersion(overrides: Partial<AudioVersion> = {}): AudioVersion {
  return {
    scriptId:        "s1",
    audioId:         "audio-1",
    audioUrl:        "https://cdn.example.com/audio.mp3",
    durationSecs:    300,
    targetDuration:  5,
    format:          "narrator",
    status:          "ready",
    completed:       false,
    position:        0,
    createdAt:       "2026-01-01T00:00:00Z",
    summary:         null,
    contentType:     null,
    themes:          [],
    compressionRatio: 0.5,
    actualWordCount: 750,
    voices:          [],
    ttsProvider:     "openai",
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
    author: null,
    sourceType: "url",
    sourceUrl: null,
    createdAt: new Date().toISOString(),
    wordCount: 1000,
    versions,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getLibraryContext
// ---------------------------------------------------------------------------

describe("getLibraryContext", () => {
  it("returns 'new_user' when items array is empty", () => {
    expect(getLibraryContext([])).toBe("new_user");
  });

  it("returns 'all_caught_up' when every version of every item is completed", () => {
    const completedItem = makeItem("1", [
      makeVersion({ completed: true, position: 300 }),
    ]);
    expect(getLibraryContext([completedItem])).toBe("all_caught_up");
  });

  it("returns 'all_caught_up' when multiple items all completed", () => {
    const items = [
      makeItem("1", [makeVersion({ completed: true })]),
      makeItem("2", [makeVersion({ scriptId: "s2", completed: true })]),
    ];
    expect(getLibraryContext(items)).toBe("all_caught_up");
  });

  it("does NOT return 'all_caught_up' when some versions are incomplete", () => {
    const items = [
      makeItem("1", [makeVersion({ completed: true })]),
      makeItem("2", [makeVersion({ scriptId: "s2", completed: false })]),
    ];
    expect(getLibraryContext(items)).not.toBe("all_caught_up");
  });

  it("returns 'stale' when all items have createdAt > 7 days ago", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const oldItem = makeItem("1", [makeVersion()], { createdAt: eightDaysAgo });
    expect(getLibraryContext([oldItem])).toBe("stale");
  });

  it("returns 'stale' when newest item is exactly 8 days old", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const items = [
      makeItem("1", [makeVersion()], { createdAt: eightDaysAgo }),
      makeItem("2", [makeVersion({ scriptId: "s2" })], { createdAt: eightDaysAgo }),
    ];
    expect(getLibraryContext(items)).toBe("stale");
  });

  it("returns 'normal' when a fresh item (< 7 days old) exists", () => {
    const freshItem = makeItem("1", [makeVersion()], {
      createdAt: new Date().toISOString(),
    });
    expect(getLibraryContext([freshItem])).toBe("normal");
  });

  it("returns 'normal' when mix of old and fresh items exists", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const items = [
      makeItem("1", [makeVersion()], { createdAt: eightDaysAgo }),
      makeItem("2", [makeVersion({ scriptId: "s2" })], { createdAt: new Date().toISOString() }),
    ];
    expect(getLibraryContext(items)).toBe("normal");
  });

  it("'all_caught_up' takes priority over 'stale'", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const completedOld = makeItem("1", [makeVersion({ completed: true })], {
      createdAt: eightDaysAgo,
    });
    expect(getLibraryContext([completedOld])).toBe("all_caught_up");
  });

  it("returns 'all_caught_up' only when versions array is non-empty", () => {
    const emptyVersionsItem = makeItem("1", []);
    expect(getLibraryContext([emptyVersionsItem])).not.toBe("all_caught_up");
  });
});

// ---------------------------------------------------------------------------
// getTopSourceDomain
// ---------------------------------------------------------------------------

describe("getTopSourceDomain", () => {
  it("returns null when no items have a sourceUrl", () => {
    const item = makeItem("1", [makeVersion()], { sourceUrl: null });
    expect(getTopSourceDomain([item])).toBeNull();
  });

  it("returns the only domain when one item has a sourceUrl", () => {
    const item = makeItem("1", [makeVersion()], { sourceUrl: "https://espn.com/article" });
    expect(getTopSourceDomain([item])).toBe("espn.com");
  });

  it("strips www from domains", () => {
    const item = makeItem("1", [makeVersion()], { sourceUrl: "https://www.espn.com/article" });
    expect(getTopSourceDomain([item])).toBe("espn.com");
  });

  it("returns the most frequent domain", () => {
    const items: LibraryItem[] = [
      makeItem("1", [makeVersion()], { sourceUrl: "https://espn.com/a1" }),
      makeItem("2", [makeVersion()], { sourceUrl: "https://espn.com/a2" }),
      makeItem("3", [makeVersion()], { sourceUrl: "https://nytimes.com/a3" }),
    ];
    expect(getTopSourceDomain(items)).toBe("espn.com");
  });

  it("returns null when no items exist", () => {
    expect(getTopSourceDomain([])).toBeNull();
  });

  it("skips items with malformed sourceUrl without throwing", () => {
    const items: LibraryItem[] = [
      makeItem("1", [makeVersion()], { sourceUrl: "not-a-url" }),
      makeItem("2", [makeVersion()], { sourceUrl: "https://espn.com/article" }),
    ];
    expect(() => getTopSourceDomain(items)).not.toThrow();
    expect(getTopSourceDomain(items)).toBe("espn.com");
  });
});

describe("libraryItemToPlayable — artwork", () => {
  it("includes thumbnailUrl in the returned PlayableItem", () => {
    const item = makeItem("c1", [makeVersion({ audioId: "a1", audioUrl: "https://cdn.example.com/a1.mp3" })], {
      thumbnailUrl: "https://www.google.com/s2/favicons?domain=example.com&sz=128",
    });
    const playable = libraryItemToPlayable(item);
    expect(playable).not.toBeNull();
    expect(playable!.thumbnailUrl).toBe(
      "https://www.google.com/s2/favicons?domain=example.com&sz=128",
    );
  });
  it("sets thumbnailUrl to null when LibraryItem has no thumbnail", () => {
    const item = makeItem("c2", [makeVersion({ audioId: "a2", audioUrl: "https://cdn.example.com/a2.mp3" })]);
    const playable = libraryItemToPlayable(item);
    expect(playable).not.toBeNull();
    expect(playable!.thumbnailUrl).toBeUndefined();
  });
});
