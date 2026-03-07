import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ExpandedPlayer } from "./ExpandedPlayer";

// Mock usePlayer
const mockSetPosition = vi.fn();
const mockPlayer = {
  currentItem: {
    id: "a1",
    title: "Test Episode",
    duration: 300,
    format: "narrator",
    audioUrl: "/a1.mp3",
  },
  isPlaying: false,
  position: 60, // currently at 60 seconds
  speed: 1.0,
  togglePlay: vi.fn(),
  setSpeed: vi.fn(),
  setPosition: mockSetPosition,
  skipForward: vi.fn(),
  skipBack: vi.fn(),
};

vi.mock("./PlayerContext", () => ({
  usePlayer: () => mockPlayer,
}));

vi.mock("@/lib/utils/duration", () => ({
  formatDuration: (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
}));

/** Simulate a click on the progress bar div with mocked getBoundingClientRect */
function seekOnProgressBar(container: HTMLElement, clickXFraction = 0.8) {
  const progressBar = container.querySelector("[data-testid='progress-bar']") as HTMLElement;
  if (!progressBar) throw new Error("progress-bar not found — add data-testid to progress div");

  // Mock getBoundingClientRect so the seek math works
  vi.spyOn(progressBar, "getBoundingClientRect").mockReturnValue({
    left: 0, width: 320, top: 0, right: 320, bottom: 4, height: 4,
    x: 0, y: 0, toJSON: () => {},
  } as DOMRect);

  fireEvent.click(progressBar, { clientX: clickXFraction * 320 });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => vi.useRealTimers());

describe("ExpandedPlayer scrubber handle", () => {
  it("renders a slider with correct aria-valuenow", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "60");
    expect(slider).toHaveAttribute("aria-valuemax", "300");
  });

  it("renders a scrubber thumb element inside the slider", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const thumb = container.querySelector("[class*='rounded-full'][class*='bg-white'][class*='absolute']");
    expect(thumb).not.toBeNull();
  });
});

describe("Undo Seek", () => {
  it("does not show Go Back button initially", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    // Suppress unused warning
    void container;
    expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
  });

  it("shows Go Back button after a seek", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    seekOnProgressBar(container);
    expect(screen.getByText("Go Back")).toBeInTheDocument();
  });

  it("calls setPosition with saved position when Go Back is clicked", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    seekOnProgressBar(container, 0.8); // seeks to 80% of 300s = 240s
    fireEvent.click(screen.getByText("Go Back"));
    // Should restore to the original position (60s) before the seek
    expect(mockSetPosition).toHaveBeenLastCalledWith(60);
  });

  it("hides Go Back button after clicking it", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    seekOnProgressBar(container);
    expect(screen.getByText("Go Back")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Go Back"));
    expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
  });

  it("hides Go Back button after 4 seconds (auto-dismiss)", async () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    seekOnProgressBar(container);
    expect(screen.getByText("Go Back")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4100);
    });

    expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
  });

  it("resets the 4s timer when seeking again while Go Back is showing", async () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);

    // First seek
    seekOnProgressBar(container, 0.5);
    expect(screen.getByText("Go Back")).toBeInTheDocument();

    // Advance 2s (timer not yet fired)
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("Go Back")).toBeInTheDocument();

    // Second seek — should reset the 4s timer
    seekOnProgressBar(container, 0.9);
    expect(screen.getByText("Go Back")).toBeInTheDocument();

    // Advance 2s more — original timer would have fired at 4s, but was reset
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("Go Back")).toBeInTheDocument(); // still showing

    // Advance 2s more (total 6s from first seek, 4s from second seek)
    await act(async () => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
  });
});
