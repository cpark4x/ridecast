import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { PlayerProvider, usePlayer } from "./PlayerContext";

function TestComponent() {
  const { currentItem, isPlaying, speed, play, togglePlay, setSpeed } = usePlayer();
  return (
    <div>
      <span data-testid="playing">{isPlaying ? "yes" : "no"}</span>
      <span data-testid="speed">{speed}</span>
      <span data-testid="title">{currentItem?.title ?? "none"}</span>
      <button onClick={() => play({ id: "1", title: "Test Audio", duration: 768, format: "narrator", audioUrl: "/audio/test.mp3" })}>
        Play
      </button>
      <button onClick={togglePlay}>Toggle</button>
      <button onClick={() => setSpeed(1.5)}>Speed 1.5</button>
    </div>
  );
}

describe("PlayerContext", () => {
  it("starts with nothing playing", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    expect(screen.getByTestId("playing").textContent).toBe("no");
    expect(screen.getByTestId("title").textContent).toBe("none");
  });

  it("plays an item", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play"));
    expect(screen.getByTestId("playing").textContent).toBe("yes");
    expect(screen.getByTestId("title").textContent).toBe("Test Audio");
  });

  it("toggles play/pause", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play"));
    expect(screen.getByTestId("playing").textContent).toBe("yes");
    fireEvent.click(screen.getByText("Toggle"));
    expect(screen.getByTestId("playing").textContent).toBe("no");
  });

  it("changes speed", () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Speed 1.5"));
    expect(screen.getByTestId("speed").textContent).toBe("1.5");
  });
});

describe("PlayerContext — playback state persistence", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve(null),
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches saved playback state when a new item is played", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ position: 120, speed: 1.5 }),
    });

    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    await waitFor(() => {
      const getCall = fetchMock.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("/api/playback?userId=default-user&audioId=1")
      );
      expect(getCall).toBeDefined();
    });
  });

  it("saves position with completed=true when the ended event fires", async () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    const audioEl = document.querySelector("audio")!;
    await act(async () => {
      audioEl.dispatchEvent(new Event("ended"));
    });

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        (c) => c[0] === "/api/playback" && c[1]?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body);
      expect(body.completed).toBe(true);
      expect(body.audioId).toBe("1");
    });
  });

  it("saves position every 5 seconds while playing", async () => {
    vi.useFakeTimers();

    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    // Count POST calls before advancing time
    const postCallsBefore = fetchMock.mock.calls.filter(
      (c) => c[0] === "/api/playback" && c[1]?.method === "POST"
    ).length;

    // Advance 5 seconds
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    const postCallsAfter = fetchMock.mock.calls.filter(
      (c) => c[0] === "/api/playback" && c[1]?.method === "POST"
    ).length;

    expect(postCallsAfter).toBeGreaterThan(postCallsBefore);

    vi.useRealTimers();
  });
});
