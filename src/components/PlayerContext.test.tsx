import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { PlayerProvider, usePlayer, SMART_RESUME_THRESHOLD_MS, SMART_RESUME_REWIND_SECS } from "./PlayerContext";

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
    // Default: /api/me returns userId; /api/playback returns no state
    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === "string" && url === "/api/me") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ userId: "user_test123" }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve(null),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches saved playback state when a new item is played", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (typeof url === "string" && url === "/api/me") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ userId: "user_test123" }),
        });
      }
      // playback state GET
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ position: 120, speed: 1.5 }),
      });
    });

    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    await waitFor(() => {
      const getCall = fetchMock.mock.calls.find(
        (c) => typeof c[0] === "string" &&
               c[0].includes("/api/playback") &&
               c[0].includes("audioId=1")
      );
      expect(getCall).toBeDefined();
    });
  });

  it("saves position with completed=true when the ended event fires", async () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    // Wait for /api/me to resolve so userIdRef gets populated
    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    // Allow /api/me fetch to complete
    await act(async () => {
      await Promise.resolve();
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

    // Allow /api/me fetch to complete so userIdRef.current is set
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve(); // double flush for fetch chain
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

// --- Persistence: event-triggered saves (pause, seeked, beforeunload, silent failure) ---
// These tests intentionally do NOT mock /api/me to return a userId.
// With the OLD implementation savePosition returns early when userIdRef.current is null,
// so all POSTs are silently skipped.  The NEW implementation uses 'default-user' and
// requires no /api/me dependency — so all tests below will FAIL until that change lands.

describe("PlayerContext — persistence: event-triggered saves", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // /api/me returns a failure — userIdRef.current will stay null in the old implementation
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

  it("POSTs to /api/playback WITHOUT userId in body", async () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    const audioEl = document.querySelector("audio")!;
    await act(async () => {
      audioEl.dispatchEvent(new Event("pause"));
    });

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        (c) => c[0] === "/api/playback" && c[1]?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body);
      expect(body).not.toHaveProperty("userId");
      expect(body.audioId).toBe("1");
      expect(body.completed).toBe(false);
    });
  });

  it("POSTs to /api/playback when the play event fires (save-on-play)", async () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    // Capture POST count before dispatching play (play() itself may or may not have
    // already fired one — we only care that the native "play" event triggers a save)
    const postsBefore = fetchMock.mock.calls.filter(
      (c) => c[0] === "/api/playback" && c[1]?.method === "POST"
    ).length;

    const audioEl = document.querySelector("audio")!;
    await act(async () => {
      audioEl.dispatchEvent(new Event("play"));
    });

    await waitFor(() => {
      const postsAfter = fetchMock.mock.calls.filter(
        (c) => c[0] === "/api/playback" && c[1]?.method === "POST"
      ).length;
      expect(postsAfter).toBeGreaterThan(postsBefore);
    });
  });

  it("POSTs to /api/playback WITHOUT userId in body when the seeked event fires", async () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    const audioEl = document.querySelector("audio")!;
    await act(async () => {
      audioEl.dispatchEvent(new Event("seeked"));
    });

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        (c) => c[0] === "/api/playback" && c[1]?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall![1].body);
      expect(body).not.toHaveProperty("userId");
    });
  });

  it("POSTs to /api/playback when the beforeunload event fires", async () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    const postsBefore = fetchMock.mock.calls.filter(
      (c) => c[0] === "/api/playback" && c[1]?.method === "POST"
    ).length;

    await act(async () => {
      window.dispatchEvent(new Event("beforeunload"));
    });

    await waitFor(() => {
      const postsAfter = fetchMock.mock.calls.filter(
        (c) => c[0] === "/api/playback" && c[1]?.method === "POST"
      ).length;
      expect(postsAfter).toBeGreaterThan(postsBefore);
    });
  });

  it("does not throw when the /api/playback POST fetch rejects (silent failure)", async () => {
    // Make every fetch reject with a network error
    fetchMock.mockRejectedValue(new Error("network failure"));

    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    const audioEl = document.querySelector("audio")!;

    // None of these should throw
    await expect(
      act(async () => {
        audioEl.dispatchEvent(new Event("pause"));
      })
    ).resolves.not.toThrow();
  });

  it("does NOT include userId in the GET restore URL", async () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    await waitFor(() => {
      const getCall = fetchMock.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("/api/playback") &&
               c[0].includes("audioId=1")
      );
      expect(getCall).toBeDefined();
      expect(getCall![0]).not.toContain("userId");
    });
  });
});

// --- Smart Resume ---

describe("Smart Resume", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve(null) });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("exports SMART_RESUME_REWIND_SECS = 3 and SMART_RESUME_THRESHOLD_MS = 10000", () => {
    expect(SMART_RESUME_REWIND_SECS).toBe(3);
    expect(SMART_RESUME_THRESHOLD_MS).toBe(10_000);
  });

  it("does NOT rewind when pause was short (< threshold)", async () => {
    const now = Date.now();
    const dateSpy = vi.spyOn(Date, "now").mockReturnValue(now);

    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => { fireEvent.click(screen.getByText("Play")); });

    // Set currentTime to 60 on the real DOM audio element
    const audioEl = document.querySelector("audio")!;
    audioEl.currentTime = 60;

    // Pause — same Date.now (short pause)
    await act(async () => { fireEvent.click(screen.getByText("Toggle")); });

    // Resume immediately (same timestamp — 0ms elapsed, well under threshold)
    await act(async () => { fireEvent.click(screen.getByText("Toggle")); });

    expect(audioEl.currentTime).toBe(60); // no rewind

    dateSpy.mockRestore();
  });

  it("rewinds 3 seconds when pause was long (> threshold)", async () => {
    const now = 1_000_000;
    const dateSpy = vi.spyOn(Date, "now");

    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => { fireEvent.click(screen.getByText("Play")); });

    // Set currentTime on the real DOM audio element after play() sets it to 0
    const audioEl = document.querySelector("audio")!;
    audioEl.currentTime = 60;

    // Pause at t=now
    dateSpy.mockReturnValue(now);
    await act(async () => { fireEvent.click(screen.getByText("Toggle")); });

    // Resume at t=now + THRESHOLD + 1s
    dateSpy.mockReturnValue(now + SMART_RESUME_THRESHOLD_MS + 1000);
    await act(async () => { fireEvent.click(screen.getByText("Toggle")); });

    // Should have rewound 3 seconds
    expect(audioEl.currentTime).toBe(60 - SMART_RESUME_REWIND_SECS);

    dateSpy.mockRestore();
  });

  it("does not rewind below 0", async () => {
    const now = 1_000_000;
    const dateSpy = vi.spyOn(Date, "now");

    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => { fireEvent.click(screen.getByText("Play")); });

    // Only 1 second into the track
    const audioEl = document.querySelector("audio")!;
    audioEl.currentTime = 1;

    // Pause at t=now
    dateSpy.mockReturnValue(now);
    await act(async () => { fireEvent.click(screen.getByText("Toggle")); });

    // Resume after threshold
    dateSpy.mockReturnValue(now + SMART_RESUME_THRESHOLD_MS + 1000);
    await act(async () => { fireEvent.click(screen.getByText("Toggle")); });

    // Math.max(0, 1 - 3) = 0
    expect(audioEl.currentTime).toBe(0);

    dateSpy.mockRestore();
  });
});
