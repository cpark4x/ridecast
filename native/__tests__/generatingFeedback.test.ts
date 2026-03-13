import type { LibraryItem, AudioVersion } from "../lib/types";

function makeVersion(overrides: Partial<AudioVersion> = {}): AudioVersion {
  return {
    scriptId: "s1",
    audioId: null,
    audioUrl: null,
    durationSecs: null,
    targetDuration: 5,
    format: "brief",
    status: "generating",
    completed: false,
    position: 0,
    createdAt: new Date().toISOString(),
    summary: null,
    contentType: null,
    themes: [],
    compressionRatio: 0,
    actualWordCount: 0,
    voices: [],
    ttsProvider: "elevenlabs",
    ...overrides,
  };
}

function makeItem(versions: AudioVersion[]): LibraryItem {
  return {
    id: "c1",
    title: "Test",
    author: null,
    sourceType: "url",
    sourceUrl: "https://example.com",
    wordCount: 800,
    createdAt: new Date().toISOString(),
    versions,
  };
}

/** Reproduces handleCardPress logic from library.tsx */
function handleCardPress(
  item: LibraryItem,
  onToast: () => void,
  onPlay: (id: string) => void,
): void {
  const readyVersion = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!readyVersion || !readyVersion.audioId || !readyVersion.audioUrl) {
    const isGenerating = item.versions.some(
      (v) => v.status === "generating" || v.status === "processing",
    );
    if (isGenerating || item.versions.length === 0) {
      onToast();
    }
    return;
  }
  onPlay(readyVersion.audioId);
}

describe("handleCardPress — generating feedback", () => {
  it("calls onToast when status is generating", () => {
    const onToast = jest.fn();
    const onPlay = jest.fn();
    handleCardPress(makeItem([makeVersion({ status: "generating" })]), onToast, onPlay);
    expect(onToast).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("calls onToast when status is processing", () => {
    const onToast = jest.fn();
    const onPlay = jest.fn();
    handleCardPress(makeItem([makeVersion({ status: "processing" })]), onToast, onPlay);
    expect(onToast).toHaveBeenCalledTimes(1);
  });

  it("calls onToast when versions array is empty", () => {
    const onToast = jest.fn();
    const onPlay = jest.fn();
    handleCardPress(makeItem([]), onToast, onPlay);
    expect(onToast).toHaveBeenCalledTimes(1);
  });

  it("calls onPlay when ready version exists", () => {
    const onToast = jest.fn();
    const onPlay = jest.fn();
    handleCardPress(
      makeItem([makeVersion({ status: "ready", audioId: "a1", audioUrl: "https://cdn/a.mp3" })]),
      onToast,
      onPlay,
    );
    expect(onPlay).toHaveBeenCalledWith("a1");
    expect(onToast).not.toHaveBeenCalled();
  });

  it("does not call onToast for ready version with null audioUrl", () => {
    const onToast = jest.fn();
    const onPlay = jest.fn();
    handleCardPress(
      makeItem([makeVersion({ status: "ready", audioId: "a1", audioUrl: null })]),
      onToast,
      onPlay,
    );
    expect(onToast).not.toHaveBeenCalled();
    expect(onPlay).not.toHaveBeenCalled();
  });
});
