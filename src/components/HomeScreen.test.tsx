import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HomeScreen } from "./HomeScreen";

// Mock dependencies
vi.mock("@/hooks/useCommuteDuration", () => ({
  useCommuteDuration: () => ({ commuteDuration: 22, setCommuteDuration: vi.fn() }),
}));

vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({ play: vi.fn() }),
}));

vi.mock("@/lib/utils/duration", () => ({
  formatDuration: (s: number) => `${Math.floor(s / 60)} min`,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => mockFetch.mockClear());

const READY_LIBRARY = [
  {
    id: "c1",
    title: "Test Article",
    versions: [
      {
        status: "ready",
        audioId: "a1",
        audioUrl: "/audio/a1.mp3",
        durationSecs: 900,
        targetDuration: 15,
        format: "narrator",
      },
    ],
  },
];

describe("HomeScreen", () => {
  it("shows queue count and total duration when episodes are ready", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/1 episode/)).toBeInTheDocument());
    // The commute shows 22 min
    expect(screen.getByText(/22 min/)).toBeInTheDocument();
  });

  it("shows empty state with Upload button when queue is empty", async () => {
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

  it("shows episode title in the queue", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Test Article")).toBeInTheDocument());
  });

  it("shows loading state initially before fetch resolves", async () => {
    // Deferred: fetch returns a promise that we resolve at the end so React can clean up
    let resolveDeferred!: (v: unknown) => void;
    const deferred = new Promise((r) => { resolveDeferred = r; });
    mockFetch.mockReturnValueOnce(deferred);

    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Resolve with a valid response shape so the fetch chain can complete
    resolveDeferred({ ok: true, json: async () => [] });
  });
});
