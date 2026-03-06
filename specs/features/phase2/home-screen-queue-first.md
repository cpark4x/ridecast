# Feature: Queue-First Home Screen

> Replace the Upload tab as the app's landing screen with a queue-first Home screen that shows episodes ready to play and how they fit the user's commute time.

## Motivation

The current app opens on the Upload screen every time. Users who already have episodes ready have to navigate to Library to find them. The VISION.md and mobile UI research both identify queue-first home as a P0 — "You have 3 episodes ready. Your commute is 22 min." is the right first thing a returning user sees.

## Prerequisite

`commute-duration` spec must be implemented first (`useCommuteDuration` hook must exist in `src/hooks/useCommuteDuration.ts`).

## Current State (confirmed in code)

`AppShell.tsx`: 4 tabs — `"upload"`, `"processing"`, `"library"`, `"player"`. Default tab is `"upload"` (`useState("upload")`).

`/api/library` now returns `versions[]` per content item (from episode-versioning spec). `status === "ready"` means at least one audio version exists.

## Changes

### 1. New `HomeScreen` component (`src/components/HomeScreen.tsx`)

```typescript
"use client";

import { useEffect, useState } from "react";
import { useCommuteDuration } from "@/hooks/useCommuteDuration";
import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";

interface ReadyEpisode {
  contentId: string;
  title: string;
  audioId: string;
  audioUrl: string;
  durationSecs: number;
  targetDuration: number;
  format: string;
}

interface HomeScreenProps {
  visible: boolean;
  onUpload: () => void; // navigate to upload tab
}

export function HomeScreen({ visible, onUpload }: HomeScreenProps) {
  const [queue, setQueue] = useState<ReadyEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const { commuteDuration } = useCommuteDuration();
  const { play } = usePlayer();

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetch("/api/library")
      .then((r) => r.json())
      .then((items) => {
        // Flatten all ready versions into a queue, most recent first
        const ready: ReadyEpisode[] = [];
        for (const item of items) {
          for (const v of item.versions ?? []) {
            if (v.status === "ready" && v.audioId && v.audioUrl) {
              ready.push({
                contentId: item.id,
                title: item.title,
                audioId: v.audioId,
                audioUrl: v.audioUrl,
                durationSecs: v.durationSecs ?? 0,
                targetDuration: v.targetDuration,
                format: v.format,
              });
            }
          }
        }
        setQueue(ready);
      })
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const totalQueueSecs = queue.reduce((s, ep) => s + ep.durationSecs, 0);
  const commuteSecs = commuteDuration * 60;
  const fitsCommute = queue.filter((ep) => ep.durationSecs <= commuteSecs);

  function playAll() {
    if (fitsCommute.length > 0) play({
      id: fitsCommute[0].audioId,
      title: fitsCommute[0].title,
      duration: fitsCommute[0].durationSecs,
      format: fitsCommute[0].format,
      audioUrl: fitsCommute[0].audioUrl,
    });
  }

  if (loading) return <div className="p-6 text-center text-white/30 pt-16">Loading...</div>;

  if (queue.length === 0) {
    return (
      <div className="p-6 pt-12 flex flex-col items-center text-center gap-4">
        <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-white/20 fill-none" strokeWidth="1">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <h2 className="text-xl font-bold">Nothing queued</h2>
        <p className="text-sm text-white/55">Upload an article or PDF to generate your first episode.</p>
        <button onClick={onUpload} className="mt-2 px-6 py-3 rounded-[12px] bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold">
          Upload Content
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 pt-6">
      {/* Commute summary */}
      <div className="mb-5">
        <h1 className="text-[26px] font-extrabold tracking-tight mb-1">Your Queue</h1>
        <p className="text-sm text-white/55">
          {queue.length} episode{queue.length !== 1 ? "s" : ""} · {formatDuration(totalQueueSecs)} total
          {" · "}Your commute: <span className="text-white/80 font-semibold">{commuteDuration} min</span>
        </p>
      </div>

      {/* Play button */}
      {fitsCommute.length > 0 && (
        <button
          onClick={playAll}
          className="w-full py-4 rounded-[14px] bg-gradient-to-br from-indigo-500 to-violet-500 text-[15px] font-semibold mb-6 shadow-[0_4px_20px_rgba(99,102,241,0.35)] flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><polygon points="8,5 19,12 8,19" /></svg>
          Start Commute
        </button>
      )}

      {/* Episode list */}
      <div className="flex flex-col gap-2.5">
        {queue.map((ep) => (
          <div
            key={ep.audioId}
            onClick={() => play({ id: ep.audioId, title: ep.title, duration: ep.durationSecs, format: ep.format, audioUrl: ep.audioUrl })}
            className="flex items-center gap-3.5 p-4 rounded-[14px] bg-white/[0.06] border border-white/[0.08] cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/70"><polygon points="8,5 19,12 8,19" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{ep.title}</div>
              <div className="text-xs text-white/55 mt-0.5">{ep.format} · {ep.targetDuration} min target</div>
            </div>
            <span className="text-[13px] font-semibold text-white/55 shrink-0">{formatDuration(ep.durationSecs)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2. Add Home tab to `AppShell.tsx`

Change default tab to `"home"`:
```typescript
const [activeTab, setActiveTab] = useState("home");  // was "upload"
```

Add HomeScreen import and render block alongside the existing screens:
```typescript
import { HomeScreen } from "./HomeScreen";

// Add as first screen:
<div className={`absolute inset-0 overflow-y-auto ... ${activeTab === "home" ? "..." : "..."}`}>
  <HomeScreen visible={activeTab === "home"} onUpload={() => setActiveTab("upload")} />
</div>
```

Add `"home"` tab to `BottomNav` (pass to `onTabChange`). Check `BottomNav.tsx` for how to add the new tab.

## Files to Modify

| File | Change |
|---|---|
| `src/components/HomeScreen.tsx` | New file — queue-first home screen |
| `src/components/AppShell.tsx` | Add home tab, change default tab, render HomeScreen |
| `src/components/BottomNav.tsx` | Add home tab icon/label |

## Tests

**File:** `src/components/HomeScreen.test.tsx` (new)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { HomeScreen } from "./HomeScreen";

// Mock dependencies
vi.mock("@/hooks/useCommuteDuration", () => ({
  useCommuteDuration: () => ({ commuteDuration: 22, setCommuteDuration: vi.fn() }),
}));

vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({ play: vi.fn() }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => mockFetch.mockClear());

const READY_LIBRARY = [
  {
    id: "c1", title: "Test Article",
    versions: [{ status: "ready", audioId: "a1", audioUrl: "/audio/a1.mp3", durationSecs: 900, targetDuration: 15, format: "narrator" }],
  },
];

describe("HomeScreen", () => {
  it("shows queue count and total duration when episodes are ready", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/1 episode/)).toBeInTheDocument());
    expect(screen.getByText(/15 min/)).toBeInTheDocument();
  });

  it("shows empty state with Upload button when queue is empty", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
    const onUpload = vi.fn();
    render(<HomeScreen visible={true} onUpload={onUpload} />);
    await waitFor(() => expect(screen.getByText("Nothing queued")).toBeInTheDocument());
    screen.getByText("Upload Content").click();
    expect(onUpload).toHaveBeenCalled();
  });

  it("does not fetch when not visible", () => {
    render(<HomeScreen visible={false} onUpload={vi.fn()} />);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
```

## Success Criteria

```bash
npm run test    # HomeScreen.test.tsx passes; AppShell tests unaffected
npm run build   # no type errors
```

Manual:
- [ ] Open app → lands on Home tab, not Upload
- [ ] With episodes in library → queue shows with "Start Commute" button
- [ ] Empty library → "Nothing queued" + "Upload Content" button navigates to Upload tab
- [ ] Commute duration shows user's saved preference (e.g. 22 min)

## Scope

HomeScreen, AppShell (default tab + render), BottomNav (new tab entry). No API changes. No schema changes. Fetches from existing `/api/library`.
