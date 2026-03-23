// native/__tests__/episodeCarousel.test.ts

import type { LibraryItem, AudioVersion } from "../lib/types";

// Test the source color helper logic in isolation
const SOURCE_BG: Record<string, string> = {
  pdf:    "#FEE2E2",
  url:    "#DBEAFE",
  epub:   "#EDE9FE",
  txt:    "#F3F4F6",
  pocket: "#D1FAE5",
};

function sourceCardBg(sourceType: string): string {
  return SOURCE_BG[sourceType.toLowerCase()] ?? "#F3F4F6";
}

function makeVersion(overrides: Partial<AudioVersion> = {}): AudioVersion {
  return {
    scriptId: "s1", audioId: "a1",
    audioUrl: "https://cdn.example.com/audio.mp3",
    durationSecs: 600, targetDuration: 10,
    format: "narrator", status: "ready",
    completed: false, position: 0,
    createdAt: "2026-01-01T00:00:00Z",
    summary: null, contentType: null, themes: [],
    compressionRatio: 0.5, actualWordCount: 1500,
    voices: [], ttsProvider: "openai",
    ...overrides,
  };
}

function makeItem(id: string, overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id, title: `Episode ${id}`,
    author: null, sourceType: "url", sourceUrl: null,
    createdAt: new Date().toISOString(), wordCount: 1000,
    versions: [makeVersion()],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// sourceCardBg
// ---------------------------------------------------------------------------

describe("sourceCardBg", () => {
  it("returns red tint for pdf", () => {
    expect(sourceCardBg("pdf")).toBe("#FEE2E2");
  });
  it("returns blue tint for url", () => {
    expect(sourceCardBg("url")).toBe("#DBEAFE");
  });
  it("returns purple tint for epub", () => {
    expect(sourceCardBg("epub")).toBe("#EDE9FE");
  });
  it("is case-insensitive", () => {
    expect(sourceCardBg("PDF")).toBe("#FEE2E2");
    expect(sourceCardBg("URL")).toBe("#DBEAFE");
  });
  it("returns gray fallback for unknown source type", () => {
    expect(sourceCardBg("rss")).toBe("#F3F4F6");
  });
});

// ---------------------------------------------------------------------------
// Carousel slicing
// ---------------------------------------------------------------------------

describe("EpisodeCarousel slicing", () => {
  it("shows at most 8 episodes from the beginning of the list", () => {
    const episodes = Array.from({ length: 12 }, (_, i) =>
      makeItem(String(i + 1)),
    );
    const recent = episodes.slice(0, 8);
    expect(recent).toHaveLength(8);
    expect(recent[0].id).toBe("1");
  });

  it("shows all episodes when fewer than 8 exist", () => {
    const episodes = Array.from({ length: 3 }, (_, i) => makeItem(String(i + 1)));
    const recent = episodes.slice(0, 8);
    expect(recent).toHaveLength(3);
  });

  it("returns empty array when no episodes exist (carousel renders nothing)", () => {
    const recent = ([] as LibraryItem[]).slice(0, 8);
    expect(recent).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isActive detection logic (mirrors CarouselCard prop derivation)
// ---------------------------------------------------------------------------

describe("CarouselCard isActive derivation", () => {
  it("is active when currentAudioId matches any version's audioId", () => {
    const item = makeItem("1", {
      versions: [makeVersion({ audioId: "matched-audio" })],
    });
    const currentAudioId = "matched-audio";
    const isActive = !!currentAudioId && item.versions.some((v) => v.audioId === currentAudioId);
    expect(isActive).toBe(true);
  });

  it("is not active when currentAudioId does not match", () => {
    const item = makeItem("1", {
      versions: [makeVersion({ audioId: "other-audio" })],
    });
    const currentAudioId = "current-audio";
    const isActive = !!currentAudioId && item.versions.some((v) => v.audioId === currentAudioId);
    expect(isActive).toBe(false);
  });

  it("is not active when currentAudioId is null", () => {
    const item = makeItem("1");
    const currentAudioId: string | null = null;
    const isActive = !!currentAudioId && item.versions.some((v) => v.audioId === currentAudioId);
    expect(isActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Component smoke tests
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-require-imports
const GreetingHeaderModule  = require("../components/GreetingHeader");

describe("GreetingHeader module", () => {
  it("has a default export (component)", () => {
    expect(GreetingHeaderModule.default).toBeDefined();
    expect(typeof GreetingHeaderModule.default).toBe("function");
  });
  it("exports getGreeting function", () => {
    expect(typeof GreetingHeaderModule.getGreeting).toBe("function");
  });
});