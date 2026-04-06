"use client";

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ProcessingScreen } from "./ProcessingScreen";

// Mock fetch so the pipeline starts but never completes during these tests.
// Tests here only assert on initial render state — we don't need (or want)
// the fetch to resolve. A pending promise avoids both the console.error noise
// and the act() warnings that come from async state updates mid-assertion.
beforeEach(() => {
  vi.spyOn(global, "fetch").mockImplementation(() => new Promise(() => {}));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderProcessingScreen() {
  return render(
    <ProcessingScreen
      contentId="content-test"
      targetMinutes={15}
      onComplete={vi.fn()}
    />,
  );
}

describe("ProcessingScreen — 4-stage UI", () => {
  it('shows "Analyzing" as the active stage label on initial render', () => {
    renderProcessingScreen();
    // Stage label is "Analyzing" — appears in both the active-stage display and the step bar
    expect(screen.getAllByText("Analyzing").length).toBeGreaterThanOrEqual(1);
  });

  it("shows the analyzing copy text on initial render", () => {
    renderProcessingScreen();
    expect(
      screen.getByText(/Reading your content/i),
    ).toBeInTheDocument();
  });

  it("renders all 4 stage labels in the step bar", () => {
    renderProcessingScreen();
    // The step bar should always show all 4 stages
    expect(screen.getByText("Scripting")).toBeInTheDocument();
    expect(screen.getByText("Generating Audio")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("does not render old stage label 'Analyzing content...'", () => {
    renderProcessingScreen();
    // Old 3-stage ProcessingScreen had "Analyzing content..." — new 4-stage uses "Analyzing"
    expect(screen.queryByText(/Analyzing content/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Fire-and-poll behavior tests (Task 10)
// These verify the new pipeline pattern:
//   1. Fire /api/process (don't await)
//   2. Poll /api/library every 3 s to track pipelineStatus
//   3. React to status changes (generating → fire audio, ready → onComplete, error → show message)
// ---------------------------------------------------------------------------
describe("ProcessingScreen — fire-and-poll behavior", () => {
  // Build a mock Response-like object from JSON data
  function okJson(data: unknown): Promise<Response> {
    return Promise.resolve({
      ok: true,
      json: async () => data,
    } as Response);
  }

  // Route fetch calls by URL substring; unmapped URLs return a pending promise
  function mockFetch(
    routes: Record<string, (init?: RequestInit) => Promise<Response>>,
  ) {
    return vi.spyOn(global, "fetch").mockImplementation(
      (url: RequestInfo | URL, init?: RequestInit) => {
        const u = url.toString();
        for (const [pattern, handler] of Object.entries(routes)) {
          if (u.includes(pattern)) return handler(init);
        }
        return new Promise(() => {}); // pending by default
      },
    );
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Outer afterEach also runs vi.restoreAllMocks()
  });

  // 1 — fires /api/process on mount
  it("fires /api/process on mount with correct params", () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementation(() => new Promise(() => {}));
    render(
      <ProcessingScreen contentId="c1" targetMinutes={10} onComplete={vi.fn()} />,
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/process",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ contentId: "c1", targetMinutes: 10 }),
      }),
    );
  });

  // 2 — starts polling /api/library after 3 s
  it("starts polling /api/library after firing /api/process", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockImplementation(() => new Promise(() => {}));
    render(
      <ProcessingScreen contentId="c1" targetMinutes={10} onComplete={vi.fn()} />,
    );
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/library",
      expect.any(Object),
    );
  });

  // 3 — advances to "Generating Audio" stage when poll returns generating
  it("advances to generating stage when poll returns pipelineStatus=generating", async () => {
    mockFetch({
      "/api/library": () =>
        okJson([
          {
            id: "c1",
            pipelineStatus: "generating",
            pipelineError: null,
            versions: [
              { scriptId: "s1", audioId: null, createdAt: "2026-01-01T00:00:00Z" },
            ],
          },
        ]),
    });
    render(
      <ProcessingScreen contentId="c1" targetMinutes={10} onComplete={vi.fn()} />,
    );
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    // When stage is actively 'generating', "Generating Audio" appears in BOTH the
    // active-stage display header AND the step bar (2+ occurrences).
    // While stage is 'analyzing'/'scripting', it only appears once (step bar only).
    expect(screen.getAllByText("Generating Audio").length).toBeGreaterThanOrEqual(2);
  });

  // 4 — fires /api/audio/generate with correct scriptId when poll returns generating
  it("fires /api/audio/generate when poll returns pipelineStatus=generating", async () => {
    const fetchSpy = mockFetch({
      "/api/library": () =>
        okJson([
          {
            id: "c1",
            pipelineStatus: "generating",
            pipelineError: null,
            versions: [
              { scriptId: "s1", audioId: null, createdAt: "2026-01-01T00:00:00Z" },
            ],
          },
        ]),
      "/api/audio/generate": () => new Promise(() => {}),
    });
    render(
      <ProcessingScreen contentId="c1" targetMinutes={10} onComplete={vi.fn()} />,
    );
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/audio/generate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ scriptId: "s1" }),
      }),
    );
  });

  // 5 — calls onComplete(audioId) when poll returns ready (after autoCompleteDelay)
  it("calls onComplete when poll returns pipelineStatus=ready", async () => {
    const onComplete = vi.fn();
    mockFetch({
      "/api/library": () =>
        okJson([
          {
            id: "c1",
            pipelineStatus: "ready",
            pipelineError: null,
            versions: [
              {
                scriptId: "s1",
                audioId: "a1",
                durationSecs: 120,
                createdAt: "2026-01-01T00:00:00Z",
              },
            ],
          },
        ]),
    });
    render(
      <ProcessingScreen contentId="c1" targetMinutes={10} onComplete={onComplete} />,
    );
    // Step 1: advance to the first poll tick (3 s).
    // advanceTimersByTimeAsync awaits the entire async interval callback
    // (two internal `await`s: fetch + res.json()) before act() returns, so
    // setState('ready') + setAudioRecord() are fully committed and the
    // autoComplete useEffect has already registered its setTimeout by the
    // time we reach step 2. This is deterministic on both fast (macOS) and
    // slow (Ubuntu CI) schedulers, unlike advanceTimersByTime which only
    // fires the callback synchronously and leaves the async chain pending.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    // Step 2: advance past autoCompleteDelay (1 500 ms in non-E2E mode).
    // The setTimeout registered by the ready useEffect fires here.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(onComplete).toHaveBeenCalledWith("a1");
  });

  // 6 — shows pipelineError text when poll returns error status
  it("shows pipelineError message when poll returns error status", async () => {
    mockFetch({
      "/api/library": () =>
        okJson([
          {
            id: "c1",
            pipelineStatus: "error",
            pipelineError: "Claude service unavailable",
            versions: [],
          },
        ]),
    });
    render(
      <ProcessingScreen contentId="c1" targetMinutes={10} onComplete={vi.fn()} />,
    );
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText("Claude service unavailable")).toBeInTheDocument();
  });

  // 7 — Try Again button calls /api/content/[id]/reset then increments attempt
  it("Try Again button calls /api/content/[id]/reset", async () => {
    // The new fire-and-poll implementation surfaces errors exclusively via
    // pipelineStatus='error' from /api/library — not from /api/process failures.
    const fetchSpy = mockFetch({
      "/api/library": () =>
        okJson([
          {
            id: "c1",
            pipelineStatus: "error",
            pipelineError: "Claude service unavailable",
            versions: [],
          },
        ]),
      "/api/content/c1/reset": () => okJson({ ok: true }),
    });

    render(
      <ProcessingScreen contentId="c1" targetMinutes={10} onComplete={vi.fn()} />,
    );

    // Advance past the first poll tick so the error state renders
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Try Again"));
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/content/c1/reset",
      expect.objectContaining({ method: "POST" }),
    );
  });

  // 8 — Fix 1 regression: selects the version matching the current run's scriptId
  // (not the first version with an audioId, which may be an old run)
  it("selects the audio version matching the current run's scriptId, not the first version with audioId", async () => {
    const onComplete = vi.fn();
    let pollCount = 0;
    mockFetch({
      "/api/library": () => {
        pollCount++;
        if (pollCount === 1) {
          // First poll: generating — captures scriptId 's1' as current run
          return okJson([
            {
              id: "c1",
              pipelineStatus: "generating",
              pipelineError: null,
              versions: [
                { scriptId: "s1", audioId: null, createdAt: "2026-01-01T00:00:00Z" },
              ],
            },
          ]);
        }
        // Second poll: ready — two versions, OLD one listed first
        return okJson([
          {
            id: "c1",
            pipelineStatus: "ready",
            pipelineError: null,
            versions: [
              {
                scriptId: "old-script",
                audioId: "old-audio",
                durationSecs: 60,
                createdAt: "2025-01-01T00:00:00Z",
              },
              {
                scriptId: "s1",
                audioId: "new-audio",
                durationSecs: 120,
                createdAt: "2026-01-01T00:00:00Z",
              },
            ],
          },
        ]);
      },
      "/api/audio/generate": () => new Promise(() => {}),
    });
    render(
      <ProcessingScreen contentId="c1" targetMinutes={10} onComplete={onComplete} />,
    );
    // First poll tick — captures scriptId, fires audio.
    // advanceTimersByTimeAsync awaits the full async callback chain so
    // currentScriptId.value is written before the second tick fires.
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    // Second poll tick — ready with two versions; state fully commits inside act().
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    // Auto-complete delay — fires the setTimeout registered by the ready useEffect.
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    // Must pick the version matching the current run's scriptId, not the older one
    expect(onComplete).toHaveBeenCalledWith("new-audio");
    expect(onComplete).not.toHaveBeenCalledWith("old-audio");
  });

  // 9 — Fix 2 regression: Strict Mode cleanup must be synchronous
  // Before Fix 2, the leaked interval fires /api/audio/generate twice in Strict Mode.
  // After Fix 2, synchronous cleanup ensures only one interval is active → called once.
  it("fires /api/audio/generate exactly once in React.StrictMode (no leaked interval)", async () => {
    const fetchSpy = mockFetch({
      "/api/library": () =>
        okJson([
          {
            id: "c1",
            pipelineStatus: "generating",
            pipelineError: null,
            versions: [
              { scriptId: "s1", audioId: null, createdAt: "2026-01-01T00:00:00Z" },
            ],
          },
        ]),
      "/api/audio/generate": () => new Promise(() => {}),
    });
    render(
      <React.StrictMode>
        <ProcessingScreen contentId="c1" targetMinutes={10} onComplete={vi.fn()} />
      </React.StrictMode>,
    );
    await act(async () => { vi.advanceTimersByTime(3000); });
    const audioGenerateCalls = fetchSpy.mock.calls.filter(
      ([url]) => url.toString().includes("/api/audio/generate"),
    );
    expect(audioGenerateCalls).toHaveLength(1);
  });
});
