> **Design reference:** `docs/plans/2026-03-10-home-screen-redesign.md`
> **Mockup:** `docs/mockups/home/home-daily-drive.html`

# Home Screen Redesign — Dev-Machine Spec

> **Session 10 note:** Tasks 1, 2, 4, 5, 6, 8 completed in session 10. Remaining tasks below.

---

## Files Summary

**Remaining (modify):**

| File | Purpose |
|---|---|
| `src/components/PlayerContext.tsx` | Add queue support |
| `src/components/PlayerContext.test.tsx` | Queue tests |
| `src/components/HomeScreen.tsx` | Complete rewrite |
| `src/components/HomeScreen.test.tsx` | HomeScreen tests |

**Completed in session 10 (no further changes needed):**
- `src/app/api/library/route.ts` + `route.test.ts` — PlaybackState join, author, sourceUrl ✓
- `src/components/PlayerContext.tsx` — hardcoded userId removed ✓
- `src/components/UploadScreen.tsx` + `useCommuteDuration.ts` — 2min/3min presets ✓
- `src/components/BottomNav.tsx` + `AppShell.tsx` + `AppShell.test.tsx` — 2 tabs + FAB ✓
- `src/lib/ui/content-display.ts` + `__tests__/content-display.test.ts` — shared utils ✓

---

## Table of Contents

1. [Task 3: PlayerContext — Add queue support](#task-3-playercontext--add-queue-support)
2. [Task 7: HomeScreen — Complete rewrite](#task-7-homescreen--complete-rewrite)
3. [Task 9: Build verification](#task-9-build-verification-and-manual-testing)

---

## Task 3: PlayerContext — Add queue support

**Feature ID:** `home-screen-playercontext-queue`
**depends_on:** `["home-screen-playercontext-userid"]` (completed ✓)

**Why:** The "Play All" button needs `playQueue(items[])` to start a sequence with auto-advance. `skipToNext`/`skipToPrevious` support manual navigation.

**Files:** `src/components/PlayerContext.tsx`, `src/components/PlayerContext.test.tsx`

### Tests — add describe block at end of PlayerContext.test.tsx

```tsx
describe("PlayerContext — queue support", () => {
  // Standard fetchMock beforeEach/afterEach stubs

  function QueueTestComponent() {
    const { currentItem, queue, queueIndex, playQueue, skipToNext, skipToPrevious } = usePlayer();
    return (
      <div>
        <span data-testid="title">{currentItem?.title ?? "none"}</span>
        <span data-testid="queue-length">{queue.length}</span>
        <span data-testid="queue-index">{queueIndex}</span>
        <button onClick={() => playQueue([
          { id: "q1", title: "First", duration: 300, format: "narrator", audioUrl: "/a1.mp3" },
          { id: "q2", title: "Second", duration: 400, format: "narrator", audioUrl: "/a2.mp3" },
          { id: "q3", title: "Third", duration: 500, format: "narrator", audioUrl: "/a3.mp3" },
        ])}>Play Queue</button>
        <button onClick={skipToNext}>Next</button>
        <button onClick={skipToPrevious}>Previous</button>
      </div>
    );
  }

  it("playQueue sets queue and plays first item", () => {
    // click Play Queue → title=First, queue-length=3, queue-index=0
  });
  it("skipToNext advances to next item", () => {
    // Play Queue → Next → title=Second, queue-index=1
  });
  it("skipToPrevious goes back", () => {
    // Play Queue → Next → Previous → title=First, queue-index=0
  });
  it("skipToNext does nothing at end of queue", () => {
    // 3× Next → still title=Third, queue-index=2
  });
  it("skipToPrevious does nothing at start", () => {
    // Play Queue → Previous → still title=First, queue-index=0
  });
  it("auto-advances when audio 'ended' event fires", async () => {
    // playQueue → audioEl.dispatchEvent(new Event("ended")) → title=Second
  });
  it("queue and queueIndex default to [] and 0", () => {
    // queue-length=0, queue-index=0
  });
});
```

### Implementation

**1. Extend `PlayerState` interface** — add after existing fields:

```typescript
  queue: PlayableItem[];
  queueIndex: number;
  playQueue: (items: PlayableItem[]) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
```

**2. State + refs inside `PlayerProvider`** (after `[speed]` state):

```typescript
  const [queue, setQueue] = useState<PlayableItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const queueRef = useRef<PlayableItem[]>([]);
  const queueIndexRef = useRef(0);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
```

**3. Update `onEnded` handler** (replace existing):

```typescript
  const onEnded = () => {
    savePosition(true);
    const nextIndex = queueIndexRef.current + 1;
    if (nextIndex < queueRef.current.length) {
      const nextItem = queueRef.current[nextIndex];
      setQueueIndex(nextIndex);
      setCurrentItem(nextItem);
      setPositionState(0);
      if (audio) { audio.src = nextItem.audioUrl; audio.currentTime = 0; audio.play().catch(console.error); }
    } else {
      setIsPlaying(false);
    }
  };
```

**4. Add `playQueue` callback** (after existing `play`):

```typescript
  const playQueue = useCallback((items: PlayableItem[]) => {
    if (items.length === 0) return;
    setQueue(items); setQueueIndex(0);
    const first = items[0];
    setCurrentItem(first); setIsPlaying(true); setPositionState(0);
    const audio = audioRef.current;
    if (audio) { audio.src = first.audioUrl; audio.playbackRate = speed; audio.currentTime = 0; audio.play().catch(console.error); }
  }, [speed]);
```

**5. Add `skipToNext` / `skipToPrevious`** (standard pattern: guard bounds, setQueueIndex, setCurrentItem, play audio).

**6. Update Provider `value` spread** to include `queue, queueIndex, playQueue, skipToNext, skipToPrevious`.

### Commit
```bash
git add src/components/PlayerContext.tsx src/components/PlayerContext.test.tsx
git commit -m "feat(player): add queue support — playQueue, skipToNext, skipToPrevious, auto-advance on ended"
```

---

## Task 7: HomeScreen — Complete rewrite

**Feature ID:** `home-screen-rewrite`
**depends_on:** `["home-screen-api", "home-screen-playercontext-queue", "home-screen-content-display-utils", "home-screen-nav-restructure"]`

**Why:** Replace bare queue list with the Daily Drive design: time-based greeting, total duration + episode count, Play All button, Now Playing card (when audio active), Up Next list (unlistened only, progress bars on partial episodes). Design source: `docs/mockups/home/home-daily-drive.html`.

**Files:** `src/components/HomeScreen.tsx`, `src/components/HomeScreen.test.tsx`

### Tests — replace entire HomeScreen.test.tsx

```tsx
// Mocks needed:
// - "@/hooks/useCommuteDuration" → { commuteDuration: 22, setCommuteDuration: vi.fn() }
// - "./PlayerContext" → { usePlayer: () => ({ play: mockPlay, playQueue: mockPlayQueue,
//     currentItem: null, isPlaying: false, position: 0, queue: [], queueIndex: 0, togglePlay: vi.fn() }) }
// - "@/lib/utils/duration" → { formatDuration: (s) => `${Math.floor(s/60)}:...` }
// - "@/lib/ui/content-display" → { gradients:[...4], getGradient:(i)=>..., sourceIcons:{...},
//     timeAgo:()=>"2h ago", getTitleFallback:(title)=>title||"fallback.com" }
// global.fetch = mockFetch

const READY_LIBRARY = [
  { id: "c1", title: "Test Article", author: null, sourceType: "url",
    sourceUrl: "https://example.com", createdAt: new Date().toISOString(),
    versions: [{ status: "ready", audioId: "a1", audioUrl: "/audio/a1.mp3",
                 durationSecs: 900, targetDuration: 15, format: "narrator",
                 completed: false, position: 0 }] },
  { id: "c2", title: "Another Article", author: "Jane Doe", sourceType: "pdf",
    sourceUrl: null, createdAt: new Date().toISOString(),
    versions: [{ status: "ready", audioId: "a2", audioUrl: "/audio/a2.mp3",
                 durationSecs: 300, targetDuration: 5, format: "narrator",
                 completed: false, position: 120 }] },
];

describe("HomeScreen", () => {
  it("shows time-based greeting", async () => {
    // expect /Good (morning|afternoon|evening)/
  });
  it("shows episode count in subtitle", async () => {
    // expect /2 episodes/
  });
  it("shows Play All button when episodes exist", async () => {
    // expect screen.getByText("Play All")
  });
  it("calls playQueue with all ready episodes when Play All clicked", async () => {
    // mockPlayQueue called with [{id:"a1",...}, {id:"a2",...}]
  });
  it("shows 'Up Next' header and 'Recent' chip", async () => { /* ... */ });
  it("shows episode titles in cards", async () => {
    // "Test Article" and "Another Article" visible
  });
  it("filters out completed episodes", async () => {
    // add c3 with completed:true → queryByText("Finished Article") not in document
  });
  it("shows 'Nothing queued' empty state with Upload button", async () => {
    // fetch returns [] → "Nothing queued" visible; click "Upload Content" → onUpload called
  });
  it("does not fetch when not visible", () => {
    // render visible=false → mockFetch not called
  });
  it("shows 'Loading...' before fetch resolves", async () => {
    // deferred fetch → "Loading..." visible immediately
  });
  it("does not show 'narrator' or 'Narrator' labels", async () => { /* ... */ });
  it("does not show 'min target' labels", async () => { /* ... */ });
});
```

### Implementation — replace entire HomeScreen.tsx

```tsx
"use client";
import { useEffect, useState } from "react";
import { useCommuteDuration } from "@/hooks/useCommuteDuration";
import { usePlayer, PlayableItem } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";
import { getGradient, sourceIcons, timeAgo, getTitleFallback } from "@/lib/ui/content-display";

interface AudioVersion {
  scriptId: string; audioId: string | null; audioUrl: string | null;
  durationSecs: number | null; targetDuration: number; format: string;
  status: "ready" | "generating" | "processing"; createdAt: string;
  completed: boolean; position: number;
}
interface LibraryItem {
  id: string; title: string; author: string | null; sourceType: string;
  sourceUrl: string | null; createdAt: string; wordCount: number; versions: AudioVersion[];
}
interface HomeScreenProps { visible: boolean; onUpload: () => void; }

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function HomeScreen({ visible, onUpload }: HomeScreenProps) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const { play, playQueue, currentItem, isPlaying, position, togglePlay } = usePlayer();

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    fetch("/api/library").then(r => r.json()).then(data => {
      if (!cancelled) setItems(Array.isArray(data) ? data : []);
    }).catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [visible]);

  // Build unlistened list: filter to items with at least one non-completed ready version
  // Pick first non-completed ready version per item (API already sorts shortest first)
  const unlistened = (items ?? []).map(item => {
    const readyVersions = item.versions.filter(v => v.status === "ready" && v.audioId && v.audioUrl);
    if (readyVersions.length > 0 && readyVersions.every(v => v.completed)) return null;
    const version = readyVersions.find(v => !v.completed) ?? readyVersions[0];
    return version ? { ...item, version } : null;
  }).filter(Boolean) as (LibraryItem & { version: AudioVersion })[];

  const totalMins = Math.round(unlistened.reduce((s, ep) => s + (ep.version.durationSecs ?? 0), 0) / 60);

  function handlePlayAll() {
    playQueue(unlistened.map(ep => ({
      id: ep.version.audioId!,
      title: getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt),
      duration: ep.version.durationSecs ?? 0, format: ep.version.format,
      audioUrl: ep.version.audioUrl!,
    })));
  }

  if (items === null) return <div className="p-6 text-center pt-16">Loading...</div>;

  if (unlistened.length === 0) return (
    <div className="p-6 pt-12 flex flex-col items-center text-center gap-4">
      {/* music note SVG icon */}
      <h2 className="text-xl font-bold">Nothing queued</h2>
      <p className="text-sm text-[var(--text-mid)]">Upload an article or PDF to generate your first episode.</p>
      <button onClick={onUpload} className="mt-2 px-6 py-3 rounded-[12px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-sm font-semibold text-white">
        Upload Content
      </button>
    </div>
  );

  return (
    <div className="pb-6">
      {/* HEADER */}
      <div className="px-5 pt-6 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">{getGreeting()}</h1>
          <p className="text-sm text-[var(--text-mid)] mt-1">
            {/* clock SVG */} {totalMins} min · {unlistened.length} episode{unlistened.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* PLAY ALL */}
      <div className="px-5 pt-4 pb-1">
        <button onClick={handlePlayAll}
          className="w-full py-4 rounded-[16px] bg-[var(--accent)] text-[17px] font-semibold text-white flex items-center justify-center gap-2.5 shadow-[0_4px_16px_rgba(234,88,12,0.28)] active:scale-[0.98] transition-all">
          {/* play icon */} Play All
        </button>
      </div>

      {/* NOW PLAYING — shown when currentItem is active */}
      {currentItem && (
        <div className="mx-5 mt-5 bg-[var(--surface)] rounded-[var(--radius)] p-3.5 border border-black/[0.06] relative">
          {/* "Playing" badge, thumbnail, title, format badge, play/pause button, progress bar */}
          {/* currentItem.duration > 0: thin progress bar + elapsed/remaining labels */}
        </div>
      )}

      {/* UP NEXT */}
      <div className="px-5 pt-5 pb-2.5 flex items-center gap-2">
        <h2 className="text-base font-bold">Up Next</h2>
        <span className="text-[11px] font-semibold bg-[var(--surface-2)] rounded-full px-2 py-0.5">Recent</span>
      </div>

      <div className="px-5 flex flex-col gap-2">
        {unlistened.map((ep, i) => {
          const v = ep.version;
          const displayTitle = getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt);
          const progressPct = v.durationSecs && v.position > 0 ? Math.min(100, (v.position / v.durationSecs) * 100) : 0;
          return (
            <div key={ep.id} onClick={() => play({ id: v.audioId!, title: displayTitle,
                duration: v.durationSecs ?? 0, format: v.format, audioUrl: v.audioUrl! })}
              className="flex items-center gap-3 p-3 rounded-[var(--radius)] bg-[var(--surface)] border border-black/[0.05] cursor-pointer active:scale-[0.98]">
              <div className={`w-11 h-11 rounded-[9px] bg-gradient-to-br ${getGradient(i)} flex items-center justify-center shrink-0`}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white opacity-85">
                  <path d={sourceIcons[ep.sourceType] || sourceIcons.txt} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-snug line-clamp-2">{displayTitle}</div>
                <div className="text-[11px] text-[var(--text-mid)] mt-0.5">
                  <span className="font-semibold">{ep.sourceType.toUpperCase()}</span>
                  <span className="mx-1.5">·</span>
                  <span>{timeAgo(ep.createdAt)}</span>
                </div>
                {progressPct > 0 && (
                  <div className="mt-1.5 w-full h-[2px] bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[var(--accent)] to-[#FB923C]" style={{ width: `${progressPct}%` }} />
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-[var(--text-mid)] bg-[var(--surface-2)] rounded-[7px] px-2 py-1 shrink-0">
                {formatDuration(v.durationSecs ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Commit
```bash
git add src/components/HomeScreen.tsx src/components/HomeScreen.test.tsx
git commit -m "feat(home): complete rewrite — greeting, Play All, queue cards, progress bars, no listened episodes"
```

---

## Task 9: Build verification and manual testing

```bash
npx vitest run          # All tests pass (160+ passing, 7 skipped, 0 failures)
npm run lint            # No new errors
npx next build          # Build succeeds
```

Manual checklist:
- [ ] Home shows time-based greeting
- [ ] "Play All" starts playback, Now Playing card appears
- [ ] Episode cards: gradient squares, no "narrator" labels, no "min target"
- [ ] Partial episodes show thin progress bar
- [ ] Completed episodes absent from Home
- [ ] Tab bar has 2 tabs only; FAB opens Upload modal; presets 2/3/5/15/30 min

---

## Success Criteria

- [ ] `GET /api/library` returns `completed`, `position`, `author`, `sourceUrl` per version ✓ (session 10)
- [ ] PlayerContext uses Clerk userId, not "default-user" ✓ (session 10)
- [ ] `playQueue([items])` plays first item and auto-advances on ended
- [ ] `skipToNext()` and `skipToPrevious()` work correctly
- [ ] Upload presets include 2min and 3min, slider min=2 ✓ (session 10)
- [ ] BottomNav: 2 tabs (Home, Library) + FAB ✓ (session 10)
- [ ] HomeScreen: greeting, Play All, Now Playing, Up Next (unlistened only)
- [ ] Episode cards: gradients, source icons, sourceType + timeAgo subtitle
- [ ] Empty title falls back to URL domain or sourceType + date
- [ ] All tests pass; `npm run build` succeeds

---

## Out of Scope

| What | Why |
|---|---|
| Content discovery / "For You" backend | No content sources yet; deferred |
| Newsletter/RSS subscriptions | Separate Phase 3 feature |
| Sort controls | Newest-first sufficient for now |
| font-semibold → font-bold migration | Cosmetic, separate PR |
