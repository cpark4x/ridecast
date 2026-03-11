import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerBar } from "./PlayerBar";

const mockSkipForward = vi.fn();
const mockTogglePlay = vi.fn();

// Default: base mock item (no sourceType/createdAt)
let currentMockItem: Record<string, unknown> | null = {
  id: "a1",
  title: "Episode 1",
  duration: 300,
  format: "narrator",
  audioUrl: "/a.mp3",
};

vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({
    currentItem: currentMockItem,
    isPlaying: true,
    position: 60,
    togglePlay: mockTogglePlay,
    skipForward: mockSkipForward,
  }),
}));

vi.mock("@/lib/utils/duration", () => ({ formatDuration: (s: number) => `${s}s` }));
vi.mock("@/lib/ui/content-display", () => ({ timeAgo: () => "3h ago" }));

beforeEach(() => {
  mockSkipForward.mockClear();
  mockTogglePlay.mockClear();
  currentMockItem = {
    id: "a1",
    title: "Episode 1",
    duration: 300,
    format: "narrator",
    audioUrl: "/a.mp3",
  };
});

describe("PlayerBar", () => {
  it("renders a skip-forward button", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    expect(screen.getByRole("button", { name: /skip forward/i })).toBeInTheDocument();
  });

  it("calls skipForward(30) when skip button is clicked", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /skip forward/i }));
    expect(mockSkipForward).toHaveBeenCalledWith(30);
  });

  it("skip button click does not trigger onExpand", () => {
    const onExpand = vi.fn();
    render(<PlayerBar onExpand={onExpand} />);
    fireEvent.click(screen.getByRole("button", { name: /skip forward/i }));
    expect(onExpand).not.toHaveBeenCalled();
  });

  it("shows episode title", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    expect(screen.getByText("Episode 1")).toBeInTheDocument();
  });

  it("shows 'url · 3h ago' subtitle when sourceType + createdAt available", () => {
    currentMockItem = {
      id: "a1",
      title: "Episode 1",
      duration: 300,
      format: "narrator",
      audioUrl: "/a.mp3",
      sourceType: "url",
      contentType: "science_article",
      createdAt: "2026-03-01T00:00:00Z",
    };
    render(<PlayerBar onExpand={vi.fn()} />);
    expect(screen.getByText(/url\s*·\s*3h ago/i)).toBeInTheDocument();
  });

  it("falls back to 'narrator · {duration}' when sourceType absent", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    expect(screen.getByText(/narrator/i)).toBeInTheDocument();
  });

  it("does NOT show 'narrator' as standalone label when sourceType available", () => {
    currentMockItem = {
      id: "a1",
      title: "Episode 1",
      duration: 300,
      format: "narrator",
      audioUrl: "/a.mp3",
      sourceType: "url",
      contentType: "science_article",
      createdAt: "2026-03-01T00:00:00Z",
    };
    render(<PlayerBar onExpand={vi.fn()} />);
    expect(screen.queryByText(/^narrator$/i)).not.toBeInTheDocument();
  });

  it("skip intervals shown as '30s' in mini-player", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    expect(screen.getByText("30s")).toBeInTheDocument();
  });
});
