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
  sleepTimer: null as number | "end" | null,
  setSleepTimer: vi.fn(),
};

const richMockPlayer = {
  ...mockPlayer,
  currentItem: {
    id: "a1",
    title: "Thinking, Fast and Slow",
    duration: 300,
    format: "narrator",
    audioUrl: "/a1.mp3",
    author: "Daniel Kahneman",
    contentType: "science_article",
    sourceType: "url",
    sourceUrl: "https://example.com/article",
    themes: ["psychology", "cognitive bias", "decision theory"],
    summary: "An exploration of the two systems that drive the way we think.",
    wordCount: 8400,
    compressionRatio: 0.15,
    voices: ["alloy"],
    ttsProvider: "openai",
    createdAt: "2026-03-01T00:00:00Z",
    targetDuration: 5,
  },
};

let currentMockPlayer: typeof mockPlayer | typeof richMockPlayer = mockPlayer;

vi.mock("./PlayerContext", () => ({
  usePlayer: () => currentMockPlayer,
}));

vi.mock("@/lib/utils/duration", () => ({
  formatDuration: (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
}));

vi.mock("@/lib/ui/content-display", () => ({
  gradients: ["from-a to-b", "from-c to-d"],
  getGradient: (i: number) => ["from-a to-b", "from-c to-d"][i % 2],
  sourceIcons: { pdf: "M14 2H6", url: "M12 2a10", epub: "M4 19.5", txt: "M14 2H6" },
  timeAgo: () => "2h ago",
  getTitleFallback: (title: string) => title || "fallback.com",
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
  currentMockPlayer = mockPlayer;
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

describe("ExpandedPlayer skip intervals", () => {
  it("skip back button calls skipBack(5)", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/skip back/i));
    expect(mockPlayer.skipBack).toHaveBeenCalledWith(5);
  });

  it("skip forward button calls skipForward(15)", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/skip forward/i));
    expect(mockPlayer.skipForward).toHaveBeenCalledWith(15);
  });

  it("skip labels show '5s' and '15s'", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("5s")).toBeInTheDocument();
    expect(screen.getByText("15s")).toBeInTheDocument();
  });
});

describe("ExpandedPlayer controls", () => {
  it("play/pause button calls togglePlay", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/^(Pause|Play)$/i));
    expect(mockPlayer.togglePlay).toHaveBeenCalled();
  });

  it("onClose called when chevron clicked", () => {
    const onClose = vi.fn();
    render(<ExpandedPlayer onClose={onClose} onCarMode={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/minimize/i));
    expect(onClose).toHaveBeenCalled();
  });

  it("onCarMode called when Car Mode clicked", () => {
    const onCarMode = vi.fn();
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={onCarMode} />);
    fireEvent.click(screen.getByLabelText(/car mode/i));
    expect(onCarMode).toHaveBeenCalled();
  });

  it("speed cycles when speed button clicked", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/playback speed/i));
    expect(mockPlayer.setSpeed).toHaveBeenCalledWith(1.25);
  });
});

describe("ExpandedPlayer sleep timer", () => {
  it("shows Sleep button", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByLabelText(/sleep timer/i)).toBeInTheDocument();
  });

  it("cycles off→15min→30min→45min→end→off", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const btn = screen.getByLabelText(/sleep timer/i);

    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(mockPlayer.setSleepTimer).toHaveBeenNthCalledWith(1, 15);
    expect(mockPlayer.setSleepTimer).toHaveBeenNthCalledWith(2, 30);
    expect(mockPlayer.setSleepTimer).toHaveBeenNthCalledWith(3, 45);
    expect(mockPlayer.setSleepTimer).toHaveBeenNthCalledWith(4, "end");
    expect(mockPlayer.setSleepTimer).toHaveBeenNthCalledWith(5, null);
  });
});

describe("ExpandedPlayer rich metadata", () => {
  beforeEach(() => {
    currentMockPlayer = richMockPlayer;
  });

  it("shows episode title", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("Thinking, Fast and Slow")).toBeInTheDocument();
  });

  it("shows 'By Daniel Kahneman' when author provided", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText(/Daniel Kahneman/)).toBeInTheDocument();
  });

  it("does not show 'By ' when author is null", () => {
    currentMockPlayer = mockPlayer;
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.queryByText(/^By\s/)).not.toBeInTheDocument();
  });

  it("shows content type badge 'Science Article'", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("Science Article")).toBeInTheDocument();
  });

  it("shows theme chips", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("psychology")).toBeInTheDocument();
    expect(screen.getByText("cognitive bias")).toBeInTheDocument();
    expect(screen.getByText("decision theory")).toBeInTheDocument();
  });

  it("shows About section with AI summary", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText(/two systems/)).toBeInTheDocument();
  });

  it("hides About section when summary is null", () => {
    currentMockPlayer = {
      ...richMockPlayer,
      currentItem: { ...richMockPlayer.currentItem, summary: null },
    };
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.queryByText("About")).not.toBeInTheDocument();
  });

  it("shows 'Read Along' card always", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText(/Read Along/)).toBeInTheDocument();
  });

  it("shows source domain", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText(/example\.com/)).toBeInTheDocument();
  });

  it("shows 'View Original Article' link when sourceUrl present", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText(/View Original/)).toBeInTheDocument();
  });

  it("hides 'View Original Article' when sourceUrl null", () => {
    currentMockPlayer = {
      ...richMockPlayer,
      currentItem: { ...richMockPlayer.currentItem, sourceUrl: null },
    };
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.queryByText(/View Original/)).not.toBeInTheDocument();
  });

  it("shows word count '8,400 words'", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText(/8,400/)).toBeInTheDocument();
  });
});

describe("ExpandedPlayer empty state", () => {
  it("renders null when currentItem is null", () => {
    currentMockPlayer = { ...mockPlayer, currentItem: null } as typeof mockPlayer;
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
