import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerBar } from "./PlayerBar";

const mockSkipForward = vi.fn();

vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({
    currentItem: { id: "a1", title: "Episode 1", duration: 300, format: "narrator", audioUrl: "/a.mp3" },
    isPlaying: true,
    position: 60,
    togglePlay: vi.fn(),
    skipForward: mockSkipForward,
  }),
}));

vi.mock("@/lib/utils/duration", () => ({ formatDuration: (s: number) => `${s}s` }));

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
});
