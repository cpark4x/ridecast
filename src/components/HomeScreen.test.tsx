import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HomeScreen } from "./HomeScreen";

// Mock dependencies
const mockPlay = vi.fn();
const mockPlayQueue = vi.fn();
const mockTogglePlay = vi.fn();

vi.mock("@/hooks/useCommuteDuration", () => ({
  useCommuteDuration: () => ({ commuteDuration: 22, setCommuteDuration: vi.fn() }),
}));

vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({
    play: mockPlay,
    playQueue: mockPlayQueue,
    currentItem: null,
    isPlaying: false,
    position: 0,
    queue: [],
    queueIndex: 0,
    togglePlay: mockTogglePlay,
  }),
}));

vi.mock("@/lib/utils/duration", () => ({
  formatDuration: (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${m}:00`;
  },
}));

vi.mock("@/lib/ui/content-display", () => ({
  gradients: ["from-a to-b", "from-c to-d", "from-e to-f", "from-g to-h"],
  getGradient: (i: number) => ["from-a to-b", "from-c to-d", "from-e to-f", "from-g to-h"][i % 4],
  sourceIcons: {
    pdf: "M14 2H6",
    url: "M12 2a10",
    epub: "M4 19.5",
    txt: "M14 2H6",
  },
  timeAgo: () => "2h ago",
  getTitleFallback: (title: string) => title || "fallback.com",
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockClear();
  mockPlay.mockClear();
  mockPlayQueue.mockClear();
  mockTogglePlay.mockClear();
});

const READY_LIBRARY = [
  {
    id: "c1",
    title: "Test Article",
    author: null,
    sourceType: "url",
    sourceUrl: "https://example.com",
    createdAt: new Date().toISOString(),
    wordCount: 5000,
    versions: [
      {
        scriptId: "s1",
        status: "ready",
        audioId: "a1",
        audioUrl: "/audio/a1.mp3",
        durationSecs: 900,
        targetDuration: 15,
        format: "narrator",
        completed: false,
        position: 0,
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: "c2",
    title: "Another Article",
    author: "Jane Doe",
    sourceType: "pdf",
    sourceUrl: null,
    createdAt: new Date().toISOString(),
    wordCount: 3000,
    versions: [
      {
        scriptId: "s2",
        status: "ready",
        audioId: "a2",
        audioUrl: "/audio/a2.mp3",
        durationSecs: 300,
        targetDuration: 5,
        format: "narrator",
        completed: false,
        position: 120,
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

describe("HomeScreen", () => {
  it("shows time-based greeting", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument());
  });

  it("shows episode count in subtitle", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/2 episodes/)).toBeInTheDocument());
  });

  it("shows Play All button when episodes exist", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Play All")).toBeInTheDocument());
  });

  it("calls playQueue with all ready episodes when Play All clicked", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => screen.getByText("Play All"));
    fireEvent.click(screen.getByText("Play All"));
    expect(mockPlayQueue).toHaveBeenCalledTimes(1);
    const queueItems = mockPlayQueue.mock.calls[0][0];
    expect(queueItems).toHaveLength(2);
    expect(queueItems[0].id).toBe("a1");
    expect(queueItems[1].id).toBe("a2");
  });

  it("shows 'Up Next' header and 'Recent' chip", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Up Next")).toBeInTheDocument());
    expect(screen.getByText("Recent")).toBeInTheDocument();
  });

  it("shows episode titles in cards", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Test Article")).toBeInTheDocument());
    expect(screen.getByText("Another Article")).toBeInTheDocument();
  });

  it("filters out completed episodes", async () => {
    const withCompleted = [
      ...READY_LIBRARY,
      {
        id: "c3",
        title: "Finished Article",
        author: null,
        sourceType: "txt",
        sourceUrl: null,
        createdAt: new Date().toISOString(),
        wordCount: 2000,
        versions: [
          {
            scriptId: "s3",
            status: "ready",
            audioId: "a3",
            audioUrl: "/audio/a3.mp3",
            durationSecs: 600,
            targetDuration: 10,
            format: "narrator",
            completed: true,
            position: 600,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => withCompleted });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Test Article")).toBeInTheDocument());
    expect(screen.queryByText("Finished Article")).not.toBeInTheDocument();
  });

  it("shows 'Nothing queued' empty state with Upload button", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const onUpload = vi.fn();
    render(<HomeScreen visible={true} onUpload={onUpload} />);
    await waitFor(() => expect(screen.getByText("Nothing queued")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Upload Content"));
    expect(onUpload).toHaveBeenCalled();
  });

  it("does not fetch when not visible", () => {
    render(<HomeScreen visible={false} onUpload={vi.fn()} />);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows 'Loading...' before fetch resolves", async () => {
    let resolveDeferred!: (v: unknown) => void;
    const deferred = new Promise((r) => { resolveDeferred = r; });
    mockFetch.mockReturnValueOnce(deferred);

    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Resolve so React can clean up
    resolveDeferred({ ok: true, json: async () => [] });
  });

  it("does not show 'narrator' or 'Narrator' labels", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => screen.getByText("Test Article"));
    expect(screen.queryByText("narrator")).not.toBeInTheDocument();
    expect(screen.queryByText("Narrator")).not.toBeInTheDocument();
  });

  it("does not show 'min target' labels", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => screen.getByText("Test Article"));
    expect(screen.queryByText(/min target/)).not.toBeInTheDocument();
  });
});
