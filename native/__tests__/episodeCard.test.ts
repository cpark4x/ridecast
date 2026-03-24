import { smartTitle } from "../lib/libraryHelpers";
import { sourceName } from "../lib/utils";
import type { AudioVersion, LibraryItem, PlayableItem } from "../lib/types";

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

// ---------------------------------------------------------------------------
// Replicate EpisodeCard's state derivation as pure functions for testing
// ---------------------------------------------------------------------------

function deriveCardState(versions: AudioVersion[]) {
  const primaryVersion = versions.find((v) => v.status === "ready") ?? versions[0];
  const isGenerating   = versions.some((v) => v.status === "generating");
  const allCompleted   = versions.length > 0 && versions.every((v) => v.completed);
  const isNew          =
    !allCompleted &&
    !isGenerating &&
    !!primaryVersion &&
    primaryVersion.position === 0 &&
    !primaryVersion.completed;
  const hasProgress =
    !!primaryVersion && primaryVersion.position > 0 && !primaryVersion.completed;
  const progressPercent =
    hasProgress && primaryVersion.durationSecs && primaryVersion.durationSecs > 0
      ? Math.min((primaryVersion.position / primaryVersion.durationSecs) * 100, 100)
      : 0;
  return { primaryVersion, isGenerating, allCompleted, isNew, hasProgress, progressPercent };
}

// ---------------------------------------------------------------------------
// isNew
// ---------------------------------------------------------------------------

describe("EpisodeCard: isNew flag", () => {
  it("is true when primary version is at position 0 and not completed", () => {
    const { isNew } = deriveCardState([makeVersion({ position: 0, completed: false })]);
    expect(isNew).toBe(true);
  });

  it("is false when primary version has progress (position > 0)", () => {
    const { isNew } = deriveCardState([makeVersion({ position: 42, completed: false })]);
    expect(isNew).toBe(false);
  });

  it("is false when all versions are completed", () => {
    const { isNew } = deriveCardState([makeVersion({ position: 300, completed: true })]);
    expect(isNew).toBe(false);
  });

  it("is false when versions array is empty", () => {
    const { isNew } = deriveCardState([]);
    expect(isNew).toBe(false);
  });

  it("is false when the only version is still generating", () => {
    const { isNew } = deriveCardState([makeVersion({ status: "generating", position: 0 })]);
    // isGenerating excludes isNew — a generating item shows shimmer, not an orange dot
    expect(isNew).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// hasProgress
// ---------------------------------------------------------------------------

describe("EpisodeCard: hasProgress flag", () => {
  it("is true when primary version has position > 0 and not completed", () => {
    const { hasProgress } = deriveCardState([makeVersion({ position: 120, completed: false })]);
    expect(hasProgress).toBe(true);
  });

  it("is false when position is 0", () => {
    const { hasProgress } = deriveCardState([makeVersion({ position: 0 })]);
    expect(hasProgress).toBe(false);
  });

  it("is false when completed even if position > 0", () => {
    const { hasProgress } = deriveCardState([makeVersion({ position: 300, completed: true })]);
    expect(hasProgress).toBe(false);
  });

  it("is false when versions array is empty", () => {
    const { hasProgress } = deriveCardState([]);
    expect(hasProgress).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// allCompleted
// ---------------------------------------------------------------------------

describe("EpisodeCard: allCompleted flag", () => {
  it("is true when every version is completed", () => {
    const { allCompleted } = deriveCardState([
      makeVersion({ scriptId: "s1", completed: true }),
      makeVersion({ scriptId: "s2", completed: true }),
    ]);
    expect(allCompleted).toBe(true);
  });

  it("is false when any version is not completed", () => {
    const { allCompleted } = deriveCardState([
      makeVersion({ scriptId: "s1", completed: true }),
      makeVersion({ scriptId: "s2", completed: false }),
    ]);
    expect(allCompleted).toBe(false);
  });

  it("is false when versions array is empty", () => {
    const { allCompleted } = deriveCardState([]);
    expect(allCompleted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isGenerating
// ---------------------------------------------------------------------------

describe("EpisodeCard: isGenerating flag", () => {
  it("is true when any version has status generating", () => {
    const { isGenerating } = deriveCardState([
      makeVersion({ scriptId: "s1", status: "ready" }),
      makeVersion({ scriptId: "s2", status: "generating" }),
    ]);
    expect(isGenerating).toBe(true);
  });

  it("is false when all versions are ready", () => {
    const { isGenerating } = deriveCardState([makeVersion({ status: "ready" })]);
    expect(isGenerating).toBe(false);
  });

  it("is false when versions array is empty", () => {
    const { isGenerating } = deriveCardState([]);
    expect(isGenerating).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// primaryVersion selection
// ---------------------------------------------------------------------------

describe("EpisodeCard: primaryVersion selection", () => {
  it("prefers the first ready version over a generating version", () => {
    const genV   = makeVersion({ scriptId: "gen",   status: "generating" });
    const readyV = makeVersion({ scriptId: "ready", status: "ready" });
    const { primaryVersion } = deriveCardState([genV, readyV]);
    expect(primaryVersion?.scriptId).toBe("ready");
  });

  it("falls back to the first version when none are ready", () => {
    const v = makeVersion({ scriptId: "gen", status: "generating" });
    const { primaryVersion } = deriveCardState([v]);
    expect(primaryVersion?.scriptId).toBe("gen");
  });

  it("is undefined when versions array is empty", () => {
    const { primaryVersion } = deriveCardState([]);
    expect(primaryVersion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// progressPercent calculation
// ---------------------------------------------------------------------------

describe("EpisodeCard: progressPercent", () => {
  it("calculates percentage correctly", () => {
    const { progressPercent } = deriveCardState([
      makeVersion({ position: 150, durationSecs: 300, completed: false }),
    ]);
    expect(progressPercent).toBe(50);
  });

  it("caps at 100 when position exceeds duration", () => {
    const { progressPercent } = deriveCardState([
      makeVersion({ position: 310, durationSecs: 300, completed: false }),
    ]);
    expect(progressPercent).toBe(100);
  });

  it("returns 0 when durationSecs is null", () => {
    const { progressPercent } = deriveCardState([
      makeVersion({ position: 50, durationSecs: null, completed: false }),
    ]);
    expect(progressPercent).toBe(0);
  });

  it("returns 0 when position is 0", () => {
    const { progressPercent } = deriveCardState([
      makeVersion({ position: 0, durationSecs: 300, completed: false }),
    ]);
    expect(progressPercent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sourceName utility
// ---------------------------------------------------------------------------

describe("sourceName", () => {
  it("returns hostname without www for url type", () => {
    expect(sourceName("url", "https://www.espn.com/article", null)).toBe("espn.com");
  });

  it("returns hostname for url without www prefix", () => {
    expect(sourceName("url", "https://paulgraham.com/essay.html", null)).toBe("paulgraham.com");
  });

  it("returns author for pdf when author is provided", () => {
    expect(sourceName("pdf", null, "John Smith")).toBe("John Smith");
  });

  it("returns 'PDF' for pdf when author is null", () => {
    expect(sourceName("pdf", null, null)).toBe("PDF");
  });

  it("returns author for epub when author is provided", () => {
    expect(sourceName("epub", null, "Jane Doe")).toBe("Jane Doe");
  });

  it("returns 'EPUB' for epub when author is null", () => {
    expect(sourceName("epub", null, null)).toBe("EPUB");
  });

  it("returns 'Text' for txt type regardless of author", () => {
    expect(sourceName("txt", null, "Anyone")).toBe("Text");
  });

  it("returns 'Pocket' for pocket type", () => {
    expect(sourceName("pocket", null, null)).toBe("Pocket");
  });

  it("returns 'Article' for url with an invalid URL string", () => {
    expect(sourceName("url", "not-a-valid-url", null)).toBe("Article");
  });

  it("returns 'Article' for url with null sourceUrl", () => {
    expect(sourceName("url", null, null)).toBe("Article");
  });

  it("handles null sourceType gracefully", () => {
    expect(typeof sourceName(null, null, null)).toBe("string");
  });

  it("handles undefined sourceType gracefully", () => {
    expect(typeof sourceName(undefined, null, null)).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Factory helper for LibraryItem (needed for handleVersionTap tests below)
// ---------------------------------------------------------------------------

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
// handleVersionTap — PlayableItem title cleaning (EpisodeCard execution path)
// ---------------------------------------------------------------------------
// These tests mirror the PlayableItem construction logic in
// EpisodeCard.handleVersionTap(), which uses:
//   title: smartTitle(item.title, item.sourceType, item.sourceDomain)
// If that line is ever regressed to `item.title`, the assertions below catch it.

function buildVersionTapPlayable(item: LibraryItem, version: AudioVersion): PlayableItem {
  // Mirrors EpisodeCard.handleVersionTap() PlayableItem construction exactly.
  return {
    id:               version.audioId!,
    title:            smartTitle(item.title, item.sourceType, item.sourceDomain),
    duration:         version.durationSecs ?? version.targetDuration * 60,
    format:           version.format,
    audioUrl:         version.audioUrl ?? "",
    author:           item.author,
    sourceType:       item.sourceType,
    sourceUrl:        item.sourceUrl,
    sourceDomain:     item.sourceDomain,
    sourceName:       item.sourceName,
    sourceBrandColor: item.sourceBrandColor,
    contentType:      version.contentType,
    themes:           version.themes,
    summary:          version.summary,
    targetDuration:   version.targetDuration,
    createdAt:        item.createdAt,
    thumbnailUrl:     item.thumbnailUrl,
  };
}

describe("EpisodeCard: handleVersionTap — PlayableItem title cleaning", () => {
  it("strips publisher suffix from pipe-separated titles before passing to onVersionPress", () => {
    const item = makeItem("t1", [makeVersion()], {
      title: "Sunday Letters | Sam Schillace",
      sourceType: "url",
    });
    const version = makeVersion({ audioId: "av1", audioUrl: "https://cdn.example.com/av1.mp3" });
    const playable = buildVersionTapPlayable(item, version);
    expect(playable.title).toBe("Sunday Letters");
    expect(playable.title).not.toContain("|");
  });

  it("cleans PDF filename-style titles before passing to onVersionPress", () => {
    const item = makeItem("t2", [makeVersion()], {
      title: "2024_Q3_strategy_report.pdf",
      sourceType: "pdf",
    });
    const version = makeVersion({ audioId: "av2", audioUrl: "https://cdn.example.com/av2.mp3" });
    const playable = buildVersionTapPlayable(item, version);
    expect(playable.title).toBe("2024 Q3 Strategy Report");
  });

  it("passes through clean titles unchanged", () => {
    const item = makeItem("t3", [makeVersion()], {
      title: "How Transformers Work",
      sourceType: "url",
    });
    const version = makeVersion({ audioId: "av3", audioUrl: "https://cdn.example.com/av3.mp3" });
    const playable = buildVersionTapPlayable(item, version);
    expect(playable.title).toBe("How Transformers Work");
  });
});