# Home Screen Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Home tab into a playback-focused queue screen with time-based greeting, "Play All" with auto-advance, progress tracking, and a streamlined 2-tab navigation bar with FAB for upload.

**Architecture:** The API layer gains playback state joins and author fields. PlayerContext gains queue support and a userId fix. The BottomNav shrinks to 2 tabs with a FAB overlay for Upload. HomeScreen is rewritten from scratch to match the mockup in `docs/mockups/home-daily-drive.html`. Shared utilities (gradients, timeAgo, source icons) are extracted from LibraryScreen into a shared module.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (CSS custom properties), Prisma (PostgreSQL), Vitest + React Testing Library, Clerk auth.

**Design reference:** `docs/mockups/home-daily-drive.html` — open in any browser, no server needed.

**Current test baseline:** 160 passing, 7 skipped. Every task must maintain or increase this count.

---

## Table of Contents

1. [Task 1: API — Join PlaybackState to library endpoint](#task-1-api--join-playbackstate-to-library-endpoint)
2. [Task 2: PlayerContext — Fix hardcoded userId](#task-2-playercontext--fix-hardcoded-userid)
3. [Task 3: PlayerContext — Add queue support](#task-3-playercontext--add-queue-support)
4. [Task 4: UploadScreen — Add shorter duration presets](#task-4-uploadscreen--add-shorter-duration-presets)
5. [Task 5: Tab bar restructure — BottomNav + AppShell](#task-5-tab-bar-restructure--bottomnav--appshell)
6. [Task 6: Extract shared utilities from LibraryScreen](#task-6-extract-shared-utilities-from-libraryscreen)
7. [Task 7: HomeScreen — Complete rewrite](#task-7-homescreen--complete-rewrite)
8. [Task 8: Title fallback logic](#task-8-title-fallback-logic)
9. [Task 9: Build verification and manual testing](#task-9-build-verification-and-manual-testing)

---

## Task 1: API — Join PlaybackState to library endpoint

**Why:** The Home screen needs to know which episodes are completed (to hide them) and which are partially listened (to show progress bars). The current `/api/library` endpoint does NOT return any playback state. We also need the `author` field from Content and the `sourceUrl` field for title fallback logic later.

**Files:**
- Modify: `src/app/api/library/route.ts`
- Modify: `src/app/api/library/route.test.ts`

### Step 1: Write failing tests for the new fields

Open `src/app/api/library/route.test.ts`. The existing test file mocks `prisma.content.findMany`. We need to:
1. Add `playbackState` data to the mock return values
2. Add `author` and `sourceUrl` fields to mock content items
3. Write new tests asserting the API response includes `completed`, `position`, `author`, and `sourceUrl`

Replace the **entire** contents of `src/app/api/library/route.test.ts` with:

```typescript
import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

// Mock auth
vi.mock("@/lib/auth", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user_test123"),
}));

// vi.mock is hoisted — declare mockFindMany with vi.hoisted() so it's available in the factory
const { mockFindMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    content: {
      findMany: mockFindMany,
    },
  },
}));

const twoScriptItem = [
  {
    id: "c1",
    title: "Test Article",
    author: "Jane Doe",
    sourceType: "url",
    sourceUrl: "https://example.com/article",
    createdAt: new Date("2026-03-01"),
    wordCount: 3000,
    scripts: [
      {
        id: "s1",
        format: "narrator",
        targetDuration: 5,
        createdAt: new Date("2026-03-01"),
        audio: [
          {
            id: "a1",
            filePath: "/audio/a1.mp3",
            durationSecs: 310,
            createdAt: new Date(),
            playbackState: [
              { position: 120.5, completed: false },
            ],
          },
        ],
      },
      {
        id: "s2",
        format: "conversation",
        targetDuration: 15,
        createdAt: new Date("2026-03-01"),
        audio: [
          {
            id: "a2",
            filePath: "/audio/a2.mp3",
            durationSecs: 920,
            createdAt: new Date(),
            playbackState: [],
          },
        ],
      },
    ],
  },
];

describe("GET /api/library", () => {
  it("returns versions array with one entry per audio", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions).toHaveLength(2);
    expect(data[0].versions[0].targetDuration).toBe(5); // sorted shortest first
    expect(data[0].versions[1].targetDuration).toBe(15);
  });

  it("versions contain expected fields (audioId, audioUrl, durationSecs, format, status)", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    const v = data[0].versions[0];
    expect(v.scriptId).toBe("s1");
    expect(v.audioId).toBe("a1");
    expect(v.audioUrl).toBe("/audio/a1.mp3");
    expect(v.durationSecs).toBe(310);
    expect(v.format).toBe("narrator");
    expect(v.status).toBe("ready");
  });

  it("returns status 'generating' for scripts with no audio", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c2",
        title: "Processing",
        author: null,
        sourceType: "pdf",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 1000,
        scripts: [
          {
            id: "s3",
            format: "narrator",
            targetDuration: 10,
            createdAt: new Date(),
            audio: [],
          },
        ],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].status).toBe("generating");
    expect(data[0].versions[0].audioId).toBeNull();
    expect(data[0].versions[0].audioUrl).toBeNull();
  });

  it("returns versions:[] for items with no scripts yet", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c3",
        title: "Fresh Upload",
        author: null,
        sourceType: "txt",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 500,
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions).toHaveLength(0);
  });

  // --- NEW: playback state fields ---

  it("returns completed and position on each version from PlaybackState", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();

    // First version has playbackState with position=120.5, completed=false
    expect(data[0].versions[0].completed).toBe(false);
    expect(data[0].versions[0].position).toBe(120.5);

    // Second version has empty playbackState — defaults
    expect(data[0].versions[1].completed).toBe(false);
    expect(data[0].versions[1].position).toBe(0);
  });

  // --- NEW: author and sourceUrl fields ---

  it("returns author field from Content", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].author).toBe("Jane Doe");
  });

  it("returns sourceUrl field from Content", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].sourceUrl).toBe("https://example.com/article");
  });

  it("returns null author when Content has no author", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c4",
        title: "No Author",
        author: null,
        sourceType: "pdf",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 200,
        scripts: [],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].author).toBeNull();
  });
});
```

### Step 2: Run tests — verify the new tests fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/app/api/library/route.test.ts
```

**Expected:** The 4 original tests pass. The 3 new tests (`completed and position`, `author field`, `sourceUrl field`) **FAIL** because the current route does not return those fields.

### Step 3: Implement — modify the library route

Replace the **entire** contents of `src/app/api/library/route.ts` with:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  createdAt: string;
  completed: boolean;
  position: number;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    const items = await prisma.content.findMany({
      where: { userId },
      include: {
        scripts: {
          include: {
            audio: {
              include: {
                playbackState: {
                  where: { userId },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const library = items.map((item) => ({
      id: item.id,
      title: item.title,
      author: item.author ?? null,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl ?? null,
      createdAt: item.createdAt.toISOString(),
      wordCount: item.wordCount,
      versions: item.scripts
        .flatMap((script): AudioVersion[] => {
          if (script.audio.length === 0) {
            // Script exists but no audio yet
            return [
              {
                scriptId: script.id,
                audioId: null,
                audioUrl: null,
                durationSecs: null,
                targetDuration: script.targetDuration,
                format: script.format,
                status: "generating",
                createdAt: script.createdAt.toISOString(),
                completed: false,
                position: 0,
              },
            ];
          }
          return script.audio.map((audio) => {
            const pb = audio.playbackState?.[0];
            return {
              scriptId: script.id,
              audioId: audio.id,
              audioUrl: audio.filePath,
              durationSecs: audio.durationSecs,
              targetDuration: script.targetDuration,
              format: script.format,
              status: "ready" as const,
              createdAt: audio.createdAt.toISOString(),
              completed: pb?.completed ?? false,
              position: pb?.position ?? 0,
            };
          });
        })
        .sort((a, b) => a.targetDuration - b.targetDuration), // shortest first
    }));

    return NextResponse.json(library);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  }
}
```

**What changed vs. the old route:**
1. The Prisma query now includes `playbackState: { where: { userId }, take: 1 }` nested under `audio`.
2. Each version object now includes `completed` and `position` fields, extracted from `audio.playbackState[0]` with defaults of `false` and `0`.
3. The top-level item now includes `author` and `sourceUrl` fields.

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/app/api/library/route.test.ts
```

**Expected:** All 8 tests pass (4 existing + 4 new).

### Step 5: Commit

```bash
git add src/app/api/library/route.ts src/app/api/library/route.test.ts
git commit -m "feat(api): join PlaybackState to library endpoint, add author and sourceUrl fields"
```

---

## Task 2: PlayerContext — Fix hardcoded userId

**Why:** `PlayerContext.tsx` hardcodes `userId: "default-user"` in every `POST /api/playback` call. This means all users share the same playback state. The server-side `/api/playback` route already uses `getCurrentUserId()` from Clerk and ignores the `userId` field in the request body. The fix is simple: stop sending `userId` in the request body entirely — the server determines the user from the auth session.

**Files:**
- Modify: `src/components/PlayerContext.tsx`
- Modify: `src/components/PlayerContext.test.tsx`

### Step 1: Write failing test

In `src/components/PlayerContext.test.tsx`, find the test block `"PlayerContext — persistence: event-triggered saves"`. We need to update the existing tests that assert `userId=default-user` to instead assert that no `userId` is sent.

Find this test (around line 193):

```typescript
  it("POSTs to /api/playback with userId=default-user when the pause event fires", async () => {
```

Replace the **entire test** with:

```typescript
  it("POSTs to /api/playback WITHOUT userId in body (server determines user from auth)", async () => {
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
```

Then find this test (around line 243):

```typescript
  it("POSTs to /api/playback with userId=default-user when the seeked event fires", async () => {
```

Replace the **entire test** with:

```typescript
  it("POSTs to /api/playback WITHOUT userId when the seeked event fires", async () => {
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
```

Then find this test (around line 308):

```typescript
  it("includes userId=default-user in the GET restore URL when a new item loads", async () => {
```

Replace the **entire test** with:

```typescript
  it("does NOT include userId in the GET restore URL (server determines user from auth)", async () => {
    render(<PlayerProvider><TestComponent /></PlayerProvider>);

    await act(async () => {
      fireEvent.click(screen.getByText("Play"));
    });

    await waitFor(() => {
      const getCall = fetchMock.mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("/api/playback") &&
               c[0].includes("audioId=1") &&
               !c[0].includes("userId")
      );
      expect(getCall).toBeDefined();
    });
  });
```

### Step 2: Run tests — verify they fail

```bash
npx vitest run src/components/PlayerContext.test.tsx
```

**Expected:** The 3 modified tests FAIL because the current code still sends `userId: "default-user"` in POST bodies and includes `userId=default-user` in GET URLs.

### Step 3: Implement — remove userId from PlayerContext

In `src/components/PlayerContext.tsx`, find the `savePosition` callback (around line 49):

```typescript
  const savePosition = useCallback(async (completed = false) => {
    if (!currentItemIdRef.current || !audioRef.current) return;
    await fetch("/api/playback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "default-user",
        audioId: currentItemIdRef.current,
        position: audioRef.current.currentTime,
        speed: audioRef.current.playbackRate,
        completed,
      }),
    }).catch(() => {}); // silent — don't interrupt playback for save failures
  }, []);
```

Replace with (remove the `userId` line):

```typescript
  const savePosition = useCallback(async (completed = false) => {
    if (!currentItemIdRef.current || !audioRef.current) return;
    await fetch("/api/playback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioId: currentItemIdRef.current,
        position: audioRef.current.currentTime,
        speed: audioRef.current.playbackRate,
        completed,
      }),
    }).catch(() => {}); // silent — don't interrupt playback for save failures
  }, []);
```

Then find the restore-position effect (around line 68):

```typescript
    fetch(`/api/playback?userId=default-user&audioId=${currentItem.id}`)
```

Replace with:

```typescript
    fetch(`/api/playback?audioId=${currentItem.id}`)
```

### Step 4: Note on the GET playback API

The `/api/playback` GET route at `src/app/api/playback/route.ts` already uses `getCurrentUserId()` for the `userId`, not the query param. The old query param `userId=default-user` was redundant. No server change needed.

### Step 5: Run tests — verify all pass

```bash
npx vitest run src/components/PlayerContext.test.tsx
```

**Expected:** All tests pass. The 3 modified tests now correctly assert no `userId` in requests.

### Step 6: Run full test suite to check for regressions

```bash
npx vitest run
```

**Expected:** 160+ passing, 7 skipped, 0 failures.

### Step 7: Commit

```bash
git add src/components/PlayerContext.tsx src/components/PlayerContext.test.tsx
git commit -m "fix(player): remove hardcoded userId from playback state requests — server uses Clerk auth"
```

---

## Task 3: PlayerContext — Add queue support

**Why:** The "Play All" button on the Home screen needs to start a queue of episodes and auto-advance between them. Currently `PlayerContext` only supports `play(item)` for a single item.

**Files:**
- Modify: `src/components/PlayerContext.tsx`
- Modify: `src/components/PlayerContext.test.tsx`

### Step 1: Write failing tests for queue behavior

Add the following test block at the **end** of `src/components/PlayerContext.test.tsx`:

```tsx
// --- Queue Support ---

describe("PlayerContext — queue support", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve(null) });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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
        ])}>
          Play Queue
        </button>
        <button onClick={skipToNext}>Next</button>
        <button onClick={skipToPrevious}>Previous</button>
      </div>
    );
  }

  it("playQueue sets the queue and plays the first item", () => {
    render(<PlayerProvider><QueueTestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play Queue"));
    expect(screen.getByTestId("title").textContent).toBe("First");
    expect(screen.getByTestId("queue-length").textContent).toBe("3");
    expect(screen.getByTestId("queue-index").textContent).toBe("0");
  });

  it("skipToNext advances to the next item in the queue", () => {
    render(<PlayerProvider><QueueTestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play Queue"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("title").textContent).toBe("Second");
    expect(screen.getByTestId("queue-index").textContent).toBe("1");
  });

  it("skipToPrevious goes back to the previous item", () => {
    render(<PlayerProvider><QueueTestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play Queue"));
    fireEvent.click(screen.getByText("Next")); // -> Second
    fireEvent.click(screen.getByText("Previous")); // -> First
    expect(screen.getByTestId("title").textContent).toBe("First");
    expect(screen.getByTestId("queue-index").textContent).toBe("0");
  });

  it("skipToNext does nothing when at end of queue", () => {
    render(<PlayerProvider><QueueTestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play Queue"));
    fireEvent.click(screen.getByText("Next")); // -> Second
    fireEvent.click(screen.getByText("Next")); // -> Third
    fireEvent.click(screen.getByText("Next")); // at end, no-op
    expect(screen.getByTestId("title").textContent).toBe("Third");
    expect(screen.getByTestId("queue-index").textContent).toBe("2");
  });

  it("skipToPrevious does nothing when at start of queue", () => {
    render(<PlayerProvider><QueueTestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play Queue"));
    fireEvent.click(screen.getByText("Previous")); // at start, no-op
    expect(screen.getByTestId("title").textContent).toBe("First");
    expect(screen.getByTestId("queue-index").textContent).toBe("0");
  });

  it("auto-advances to next item when audio ends", async () => {
    render(<PlayerProvider><QueueTestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play Queue"));
    expect(screen.getByTestId("title").textContent).toBe("First");

    // Simulate the audio 'ended' event
    const audioEl = document.querySelector("audio")!;
    await act(async () => {
      audioEl.dispatchEvent(new Event("ended"));
    });

    expect(screen.getByTestId("title").textContent).toBe("Second");
    expect(screen.getByTestId("queue-index").textContent).toBe("1");
  });

  it("queue defaults to empty array and index 0", () => {
    render(<PlayerProvider><QueueTestComponent /></PlayerProvider>);
    expect(screen.getByTestId("queue-length").textContent).toBe("0");
    expect(screen.getByTestId("queue-index").textContent).toBe("0");
  });
});
```

### Step 2: Run tests — verify they fail

```bash
npx vitest run src/components/PlayerContext.test.tsx
```

**Expected:** The new queue tests FAIL because `playQueue`, `queue`, `queueIndex`, `skipToNext`, `skipToPrevious` don't exist on the context yet.

### Step 3: Implement queue support in PlayerContext

In `src/components/PlayerContext.tsx`, make these changes:

**3a.** Add `queue`, `queueIndex`, `playQueue`, `skipToNext`, `skipToPrevious` to the `PlayerState` interface:

Find:
```typescript
interface PlayerState {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  position: number;
  speed: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (item: PlayableItem) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setPosition: (position: number) => void;
  skipForward: (seconds: number) => void;
  skipBack: (seconds: number) => void;
}
```

Replace with:
```typescript
interface PlayerState {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  position: number;
  speed: number;
  queue: PlayableItem[];
  queueIndex: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (item: PlayableItem) => void;
  playQueue: (items: PlayableItem[]) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setPosition: (position: number) => void;
  skipForward: (seconds: number) => void;
  skipBack: (seconds: number) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
}
```

**3b.** Add state variables inside `PlayerProvider`, after the existing state declarations:

After:
```typescript
  const [speed, setSpeedState] = useState(1.0);
```

Add:
```typescript
  const [queue, setQueue] = useState<PlayableItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
```

**3c.** Add refs to track queue for the ended-event handler (refs avoid stale closures):

After:
```typescript
  const pausedAtRef = useRef<number | null>(null);
```

Add:
```typescript
  const queueRef = useRef<PlayableItem[]>([]);
  const queueIndexRef = useRef(0);
```

**3d.** Keep refs in sync with state. Add after the existing `currentItemIdRef` sync effect:

After:
```typescript
  useEffect(() => {
    currentItemIdRef.current = currentItem?.id ?? null;
  }, [currentItem?.id]);
```

Add:
```typescript
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);
```

**3e.** Modify the `onEnded` handler to auto-advance. Find:

```typescript
    const onEnded = () => {
      setIsPlaying(false);
      savePosition(true); // completed = true
    };
```

Replace with:
```typescript
    const onEnded = () => {
      savePosition(true); // completed = true
      // Auto-advance to next item in queue
      const nextIndex = queueIndexRef.current + 1;
      if (nextIndex < queueRef.current.length) {
        const nextItem = queueRef.current[nextIndex];
        setQueueIndex(nextIndex);
        setCurrentItem(nextItem);
        setPositionState(0);
        if (audio) {
          audio.src = nextItem.audioUrl;
          audio.currentTime = 0;
          audio.play().catch(console.error);
        }
      } else {
        setIsPlaying(false);
      }
    };
```

**3f.** Add the `playQueue` callback after the existing `play` callback:

After the `play` callback's closing `);`, add:

```typescript
  const playQueue = useCallback(
    (items: PlayableItem[]) => {
      if (items.length === 0) return;
      setQueue(items);
      setQueueIndex(0);
      // Play the first item
      const first = items[0];
      setCurrentItem(first);
      setIsPlaying(true);
      setPositionState(0);
      const audio = audioRef.current;
      if (audio) {
        audio.src = first.audioUrl;
        audio.playbackRate = speed;
        audio.currentTime = 0;
        audio.play().catch(console.error);
      }
    },
    [speed],
  );
```

**3g.** Add `skipToNext` and `skipToPrevious` callbacks after `playQueue`:

```typescript
  const skipToNext = useCallback(() => {
    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) return; // at end
    setQueueIndex(nextIndex);
    const item = queue[nextIndex];
    setCurrentItem(item);
    setIsPlaying(true);
    setPositionState(0);
    const audio = audioRef.current;
    if (audio) {
      audio.src = item.audioUrl;
      audio.playbackRate = speed;
      audio.currentTime = 0;
      audio.play().catch(console.error);
    }
  }, [queue, queueIndex, speed]);

  const skipToPrevious = useCallback(() => {
    const prevIndex = queueIndex - 1;
    if (prevIndex < 0) return; // at start
    setQueueIndex(prevIndex);
    const item = queue[prevIndex];
    setCurrentItem(item);
    setIsPlaying(true);
    setPositionState(0);
    const audio = audioRef.current;
    if (audio) {
      audio.src = item.audioUrl;
      audio.playbackRate = speed;
      audio.currentTime = 0;
      audio.play().catch(console.error);
    }
  }, [queue, queueIndex, speed]);
```

**3h.** Update the Provider value to include the new fields. Find:

```typescript
      value={{ currentItem, isPlaying, position, speed, audioRef, play, togglePlay, setSpeed, setPosition, skipForward, skipBack }}
```

Replace with:
```typescript
      value={{ currentItem, isPlaying, position, speed, queue, queueIndex, audioRef, play, playQueue, togglePlay, setSpeed, setPosition, skipForward, skipBack, skipToNext, skipToPrevious }}
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/components/PlayerContext.test.tsx
```

**Expected:** All existing tests + all 7 new queue tests pass.

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** 160+ passing (now higher with new tests), 0 failures.

### Step 6: Commit

```bash
git add src/components/PlayerContext.tsx src/components/PlayerContext.test.tsx
git commit -m "feat(player): add queue support — playQueue, skipToNext, skipToPrevious, auto-advance on ended"
```

---

## Task 4: UploadScreen — Add shorter duration presets

**Why:** 5 minutes is too long as the shortest duration option. Some articles are short enough for 2-3 minute summaries.

**Files:**
- Modify: `src/components/UploadScreen.tsx`
- Modify: `src/hooks/useCommuteDuration.ts`

### Step 1: Update useCommuteDuration to accept min=2

In `src/hooks/useCommuteDuration.ts`, find:
```typescript
      if (!isNaN(parsed) && parsed >= 5 && parsed <= 60) {
```

Replace with:
```typescript
      if (!isNaN(parsed) && parsed >= 2 && parsed <= 60) {
```

### Step 2: Update UploadScreen presets and slider

In `src/components/UploadScreen.tsx`, find:
```typescript
  const [selectedPreset, setSelectedPreset] = useState(() =>
    [5, 15, 30].includes(commuteDuration) ? commuteDuration : 0
  );
```

Replace with:
```typescript
  const [selectedPreset, setSelectedPreset] = useState(() =>
    [2, 3, 5, 15, 30].includes(commuteDuration) ? commuteDuration : 0
  );
```

Find the `presets` array:
```typescript
  const presets = [
    { minutes: 5, label: "Quick Summary" },
    { minutes: 15, label: "Main Points" },
    { minutes: 30, label: "Deep Dive" },
  ];
```

Replace with:
```typescript
  const presets = [
    { minutes: 2, label: "Quick Take" },
    { minutes: 3, label: "Brief" },
    { minutes: 5, label: "Summary" },
    { minutes: 15, label: "Main Points" },
    { minutes: 30, label: "Deep Dive" },
  ];
```

Find the slider `min` attribute:
```typescript
              min="5"
```

Replace with:
```typescript
              min="2"
```

Find the slider tick labels:
```typescript
              {[5, 15, 30, 45, 60].map((t) => (
```

Replace with:
```typescript
              {[2, 15, 30, 45, 60].map((t) => (
```

Find the `handleSliderChange` function's preset check:
```typescript
    if ([5, 15, 30].includes(value)) {
```

Replace with:
```typescript
    if ([2, 3, 5, 15, 30].includes(value)) {
```

Find the `handleCreateAudio` function's reset logic:
```typescript
      setSelectedPreset([5, 15, 30].includes(commuteDuration) ? commuteDuration : 0);
```

Replace with:
```typescript
      setSelectedPreset([2, 3, 5, 15, 30].includes(commuteDuration) ? commuteDuration : 0);
```

### Step 3: Verify build passes

```bash
npx vitest run src/components/UploadScreen.test.tsx
```

**Expected:** All existing UploadScreen tests still pass (they don't test specific preset values).

### Step 4: Commit

```bash
git add src/components/UploadScreen.tsx src/hooks/useCommuteDuration.ts
git commit -m "feat(upload): add 2-min and 3-min duration presets, lower slider minimum to 2"
```

---

## Task 5: Tab bar restructure — BottomNav + AppShell

**Why:** The current tab bar has 4 tabs (Home, Upload, Library, Player). The redesign reduces this to 2 tabs (Home, Library) with a floating action button (FAB) for Upload and a gear icon for Settings (already partially implemented in AppShell).

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/AppShell.test.tsx` (if tests reference old tabs)

### Step 1: Read the existing AppShell test to understand what needs updating

Check `src/components/AppShell.test.tsx` for any references to the old tab structure that would break.

### Step 2: Rewrite BottomNav with 2 tabs + FAB

Replace the **entire** contents of `src/components/BottomNav.tsx` with:

```tsx
"use client";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFabClick: () => void;
}

const tabs = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="4" height="16" rx="1.5" />
        <rect x="10" y="4" width="4" height="16" rx="1.5" />
        <rect x="17" y="4" width="4" height="16" rx="1.5" />
      </svg>
    ),
  },
];

export function BottomNav({ activeTab, onTabChange, onFabClick }: BottomNavProps) {
  return (
    <>
      <nav
        className="absolute bottom-0 left-0 right-0 h-16 flex items-center justify-around border-t border-black/[0.07] z-50 pb-[env(safe-area-inset-bottom)]"
        style={{ background: "linear-gradient(to top, rgba(247,246,243,0.98) 60%, rgba(247,246,243,0.85))", backdropFilter: "blur(20px)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all select-none ${
              activeTab === tab.id ? "text-[var(--accent-text)]" : "text-[var(--text-dim)]"
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Floating Action Button — Upload */}
      <button
        onClick={onFabClick}
        aria-label="Upload content"
        className="absolute bottom-[56px] right-5 z-[51] w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-[0_2px_8px_rgba(234,88,12,0.35),0_6px_20px_rgba(234,88,12,0.20)] border-2 border-white/25 active:scale-95 transition-transform"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );
}
```

### Step 3: Update AppShell for new navigation

In `src/components/AppShell.tsx`, make these changes:

**3a.** Change the default active tab from `"upload"` to `"home"`:

Find:
```typescript
  const [activeTab, setActiveTab] = useState("upload");
```
Replace with:
```typescript
  const [activeTab, setActiveTab] = useState("home");
```

**3b.** Add state for the upload modal:

After:
```typescript
  const [showSettings, setShowSettings] = useState(false);
```
Add:
```typescript
  const [showUploadModal, setShowUploadModal] = useState(false);
```

**3c.** Update `handleProcess` to close the upload modal:

Find:
```typescript
  const handleProcess = useCallback((contentId: string, targetMinutes: number) => {
    setProcessing({ contentId, targetMinutes });
    setActiveTab("processing");
  }, []);
```
Replace with:
```typescript
  const handleProcess = useCallback((contentId: string, targetMinutes: number) => {
    setProcessing({ contentId, targetMinutes });
    setShowUploadModal(false);
    setActiveTab("processing");
  }, []);
```

**3d.** Update the BottomNav component call to pass `onFabClick`:

Find:
```typescript
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
```
Replace with:
```typescript
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onFabClick={() => setShowUploadModal(true)} />
```

**3e.** Change the Upload Screen panel from a tab panel to a modal overlay. Find the Upload Screen section:

```typescript
      {/* Upload Screen */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "upload" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: hasPlayerBar ? "130px" : "64px" }}>
        <UploadScreen onProcess={handleProcess} onImportPocket={() => setActiveTab("pocket-import")} />
      </div>
```

Replace with:
```typescript
      {/* Upload Modal Overlay */}
      {showUploadModal && (
        <div className="absolute inset-0 z-[60] flex flex-col">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowUploadModal(false)} />
          <div className="relative mt-auto bg-[var(--bg)] rounded-t-[20px] max-h-[90%] overflow-y-auto animate-[slideUp_0.3s_ease]">
            <div className="flex items-center justify-between p-4 pb-0">
              <h2 className="text-lg font-bold">Add Content</h2>
              <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)]">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--text-mid)] fill-none" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <UploadScreen onProcess={handleProcess} onImportPocket={() => { setShowUploadModal(false); setActiveTab("pocket-import"); }} />
          </div>
        </div>
      )}
```

**3f.** Remove the Player Tab panel (it's no longer a tab). Find and DELETE the entire Player Tab section:

```typescript
      {/* Player Tab (empty state) */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "player" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: hasPlayerBar ? "130px" : "64px" }}>
        {currentItem ? (
          ...
        ) : (
          ...
        )}
      </div>
```

**3g.** Update the HomeScreen `onUpload` callback to open the modal:

Find:
```typescript
        <HomeScreen visible={activeTab === "home"} onUpload={() => setActiveTab("upload")} />
```
Replace with:
```typescript
        <HomeScreen visible={activeTab === "home"} onUpload={() => setShowUploadModal(true)} />
```

### Step 4: Verify build

```bash
npx vitest run src/components/AppShell.test.tsx src/components/UploadScreen.test.tsx
```

**Expected:** Tests pass (or need minor updates if they reference old tabs). If any AppShell tests reference clicking the "Upload" tab, update them to use the FAB button instead.

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass.

### Step 6: Commit

```bash
git add src/components/BottomNav.tsx src/components/AppShell.tsx
git commit -m "feat(nav): restructure to 2 tabs (Home, Library) + FAB for upload + modal overlay"
```

---

## Task 6: Extract shared utilities from LibraryScreen

**Why:** HomeScreen needs the same gradient array, source icons, and `timeAgo()` function that LibraryScreen uses. Extract them into a shared module to avoid duplication.

**Files:**
- Create: `src/lib/utils/content-display.ts`
- Create: `src/lib/utils/content-display.test.ts`
- Modify: `src/components/LibraryScreen.tsx` (import from shared module)

### Step 1: Write tests for the shared utilities

Create `src/lib/utils/content-display.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { timeAgo, gradients, sourceIcons, getGradient, getTitleFallback } from "./content-display";

describe("timeAgo", () => {
  it("returns 'Just now' for < 1 minute ago", () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe("Just now");
  });

  it("returns minutes for < 60 minutes", () => {
    const date = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("15m ago");
  });

  it("returns hours for < 24 hours", () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("3h ago");
  });

  it("returns days for < 7 days", () => {
    const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("2d ago");
  });

  it("returns weeks for >= 7 days", () => {
    const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(date)).toBe("2w ago");
  });
});

describe("gradients", () => {
  it("has 4 gradient strings", () => {
    expect(gradients).toHaveLength(4);
  });
});

describe("getGradient", () => {
  it("cycles through gradients by index", () => {
    expect(getGradient(0)).toBe(gradients[0]);
    expect(getGradient(4)).toBe(gradients[0]); // wraps
    expect(getGradient(1)).toBe(gradients[1]);
  });
});

describe("sourceIcons", () => {
  it("has entries for pdf, epub, url, txt", () => {
    expect(sourceIcons.pdf).toBeDefined();
    expect(sourceIcons.epub).toBeDefined();
    expect(sourceIcons.url).toBeDefined();
    expect(sourceIcons.txt).toBeDefined();
  });
});

describe("getTitleFallback", () => {
  it("returns title when title is non-empty", () => {
    expect(getTitleFallback("My Article", null, "url", "2026-03-01")).toBe("My Article");
  });

  it("returns domain from sourceUrl when title is empty", () => {
    expect(getTitleFallback("", "https://nytimes.com/article/foo", "url", "2026-03-01")).toBe("nytimes.com");
  });

  it("returns domain from sourceUrl when title is whitespace-only", () => {
    expect(getTitleFallback("   ", "https://www.example.com/page", "url", "2026-03-01")).toBe("example.com");
  });

  it("returns sourceType + date when both title and sourceUrl are empty", () => {
    expect(getTitleFallback("", null, "pdf", "2026-03-01T12:00:00Z")).toBe("PDF \u00b7 Mar 1, 2026");
  });

  it("strips www. prefix from domain", () => {
    expect(getTitleFallback("", "https://www.bbc.co.uk/news", "url", "2026-03-01")).toBe("bbc.co.uk");
  });
});
```

### Step 2: Run tests — verify they fail

```bash
npx vitest run src/lib/utils/content-display.test.ts
```

**Expected:** FAIL — module doesn't exist yet.

### Step 3: Create the shared module

Create `src/lib/utils/content-display.ts`:

```typescript
/**
 * Shared display utilities for content items.
 * Used by HomeScreen, LibraryScreen, and any future content UI.
 */

/** Gradient class strings for Tailwind — cycle with getGradient(index). */
export const gradients = [
  "from-[#EA580C] to-[#F97316]",
  "from-pink-500 to-rose-500",
  "from-teal-500 to-cyan-500",
  "from-amber-500 to-red-500",
];

/** Get a gradient by index, cycling through the array. */
export function getGradient(index: number): string {
  return gradients[index % gradients.length];
}

/** SVG path data for source-type icons. Use inside a <path d={...} /> element. */
export const sourceIcons: Record<string, string> = {
  pdf: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
  epub: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  url: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  txt: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
};

/** Relative time string: "Just now", "5m ago", "3h ago", "2d ago", "1w ago". */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/**
 * Generate a display title with fallback logic:
 * 1. Use title if non-empty
 * 2. Extract domain from sourceUrl (strip www.)
 * 3. Fall back to "SOURCETYPE \u00b7 Mon D, YYYY"
 */
export function getTitleFallback(
  title: string,
  sourceUrl: string | null,
  sourceType: string,
  createdAt: string,
): string {
  // 1. Use title if non-blank
  if (title.trim()) return title;

  // 2. Extract domain from sourceUrl
  if (sourceUrl) {
    try {
      const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
      if (hostname) return hostname;
    } catch {
      // invalid URL — fall through
    }
  }

  // 3. sourceType + formatted date
  const date = new Date(createdAt);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${sourceType.toUpperCase()} \u00b7 ${formatted}`;
}
```

### Step 4: Run tests — verify they pass

```bash
npx vitest run src/lib/utils/content-display.test.ts
```

**Expected:** All 12 tests pass.

### Step 5: Update LibraryScreen to import from shared module

In `src/components/LibraryScreen.tsx`, find and remove the local declarations:

```typescript
const gradients = [
  "from-[#EA580C] to-[#F97316]",
  "from-pink-500 to-rose-500",
  "from-teal-500 to-cyan-500",
  "from-amber-500 to-red-500",
];

const sourceIcons: Record<string, string> = {
  pdf: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
  epub: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  url: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  txt: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
};
```

And the local `timeAgo` function inside the component:
```typescript
  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    ...
  }
```

Replace with an import at the top of the file (after the existing imports):
```typescript
import { gradients, sourceIcons, timeAgo } from "@/lib/utils/content-display";
```

**Important:** The local `timeAgo` was defined inside the component function. Move the import to the top-level. Inside the component, delete the `function timeAgo(...)` block entirely and use the imported version.

### Step 6: Run LibraryScreen tests

```bash
npx vitest run src/components/LibraryScreen.test.tsx
```

**Expected:** All tests pass.

### Step 7: Commit

```bash
git add src/lib/utils/content-display.ts src/lib/utils/content-display.test.ts src/components/LibraryScreen.tsx
git commit -m "refactor: extract gradients, sourceIcons, timeAgo, getTitleFallback into shared content-display utils"
```

---

## Task 7: HomeScreen — Complete rewrite

**Why:** The current HomeScreen is a basic list with "Your Queue" heading, commute-time copy, and no visual distinction between cards. The redesign is a complete rewrite to match the mockup at `docs/mockups/home-daily-drive.html`.

**Files:**
- Rewrite: `src/components/HomeScreen.tsx`
- Rewrite: `src/components/HomeScreen.test.tsx`

### Step 1: Write tests for the new HomeScreen

Replace the **entire** contents of `src/components/HomeScreen.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HomeScreen } from "./HomeScreen";

// Mock dependencies
vi.mock("@/hooks/useCommuteDuration", () => ({
  useCommuteDuration: () => ({ commuteDuration: 22, setCommuteDuration: vi.fn() }),
}));

const mockPlay = vi.fn();
const mockPlayQueue = vi.fn();
vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({
    play: mockPlay,
    playQueue: mockPlayQueue,
    currentItem: null,
    isPlaying: false,
    position: 0,
    queue: [],
    queueIndex: 0,
    togglePlay: vi.fn(),
  }),
}));

vi.mock("@/lib/utils/duration", () => ({
  formatDuration: (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
}));

vi.mock("@/lib/utils/content-display", () => ({
  gradients: ["from-orange-500 to-orange-400", "from-pink-500 to-rose-500", "from-teal-500 to-cyan-500", "from-amber-500 to-red-500"],
  getGradient: (i: number) => ["from-orange-500 to-orange-400", "from-pink-500 to-rose-500", "from-teal-500 to-cyan-500", "from-amber-500 to-red-500"][i % 4],
  sourceIcons: { pdf: "M14 2H6", epub: "M4 19.5", url: "M12 2a10", txt: "M14 2H6" },
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
});

const READY_LIBRARY = [
  {
    id: "c1",
    title: "Test Article",
    author: null,
    sourceType: "url",
    sourceUrl: "https://example.com",
    createdAt: new Date().toISOString(),
    versions: [
      {
        status: "ready",
        audioId: "a1",
        audioUrl: "/audio/a1.mp3",
        durationSecs: 900,
        targetDuration: 15,
        format: "narrator",
        completed: false,
        position: 0,
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
    versions: [
      {
        status: "ready",
        audioId: "a2",
        audioUrl: "/audio/a2.mp3",
        durationSecs: 300,
        targetDuration: 5,
        format: "narrator",
        completed: false,
        position: 120,
      },
    ],
  },
];

describe("HomeScreen", () => {
  it("shows time-based greeting", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => {
      // Should show one of: "Good morning", "Good afternoon", "Good evening"
      const greeting = screen.getByText(/Good (morning|afternoon|evening)/);
      expect(greeting).toBeInTheDocument();
    });
  });

  it("shows episode count and total duration in subtitle", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/2 episodes/)).toBeInTheDocument();
    });
  });

  it("shows Play All button when there are episodes", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Play All")).toBeInTheDocument();
    });
  });

  it("calls playQueue when Play All is clicked", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => screen.getByText("Play All"));
    fireEvent.click(screen.getByText("Play All"));
    expect(mockPlayQueue).toHaveBeenCalledTimes(1);
    expect(mockPlayQueue).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "a1" }),
        expect.objectContaining({ id: "a2" }),
      ])
    );
  });

  it("shows 'Up Next' section header with 'Recent' chip", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Up Next")).toBeInTheDocument();
      expect(screen.getByText("Recent")).toBeInTheDocument();
    });
  });

  it("shows episode titles in cards", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Test Article")).toBeInTheDocument();
      expect(screen.getByText("Another Article")).toBeInTheDocument();
    });
  });

  it("filters out completed episodes", async () => {
    const withCompleted = [
      ...READY_LIBRARY,
      {
        id: "c3",
        title: "Finished Article",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: new Date().toISOString(),
        versions: [
          {
            status: "ready",
            audioId: "a3",
            audioUrl: "/audio/a3.mp3",
            durationSecs: 600,
            targetDuration: 10,
            format: "narrator",
            completed: true,
            position: 600,
          },
        ],
      },
    ];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => withCompleted });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText("Test Article")).toBeInTheDocument();
      expect(screen.queryByText("Finished Article")).not.toBeInTheDocument();
    });
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

  it("shows loading state initially before fetch resolves", async () => {
    let resolveDeferred!: (v: unknown) => void;
    const deferred = new Promise((r) => { resolveDeferred = r; });
    mockFetch.mockReturnValueOnce(deferred);

    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    resolveDeferred({ ok: true, json: async () => [] });
  });

  it("does not show 'narrator' or 'format' labels on cards", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => screen.getByText("Test Article"));
    expect(screen.queryByText("narrator")).not.toBeInTheDocument();
    expect(screen.queryByText("Narrator")).not.toBeInTheDocument();
  });

  it("does not show 'min target' labels on cards", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => READY_LIBRARY });
    render(<HomeScreen visible={true} onUpload={vi.fn()} />);
    await waitFor(() => screen.getByText("Test Article"));
    expect(screen.queryByText(/min target/)).not.toBeInTheDocument();
  });
});
```

### Step 2: Run tests — verify they fail

```bash
npx vitest run src/components/HomeScreen.test.tsx
```

**Expected:** Most tests FAIL because the current HomeScreen doesn't have greeting, Play All, etc.

### Step 3: Rewrite HomeScreen.tsx

Replace the **entire** contents of `src/components/HomeScreen.tsx` with:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useCommuteDuration } from "@/hooks/useCommuteDuration";
import { usePlayer, PlayableItem } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";
import { getGradient, sourceIcons, timeAgo, getTitleFallback } from "@/lib/utils/content-display";

interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  createdAt: string;
  completed: boolean;
  position: number;
}

interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}

interface HomeScreenProps {
  visible: boolean;
  onUpload: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen({ visible, onUpload }: HomeScreenProps) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const { commuteDuration } = useCommuteDuration();
  const { play, playQueue, currentItem, isPlaying, position, togglePlay } = usePlayer();

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    fetch("/api/library")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (!cancelled) setItems([]); });

    return () => { cancelled = true; };
  }, [visible]);

  const loading = items === null;

  // Filter to unlistened episodes with ready audio
  const unlistened = (items ?? [])
    .map((item) => {
      // Pick the best version: shortest ready version that fits commute
      const readyVersions = item.versions.filter((v) => v.status === "ready" && v.audioId && v.audioUrl);
      // All versions completed? Filter out entirely
      const allCompleted = readyVersions.length > 0 && readyVersions.every((v) => v.completed);
      if (allCompleted) return null;

      // Pick the first non-completed ready version (sorted shortest first by API)
      const version = readyVersions.find((v) => !v.completed) ?? readyVersions[0];
      if (!version) return null;

      return { ...item, version };
    })
    .filter(Boolean) as (LibraryItem & { version: AudioVersion })[];

  const totalDurationSecs = unlistened.reduce((sum, ep) => sum + (ep.version.durationSecs ?? 0), 0);
  const totalDurationMins = Math.round(totalDurationSecs / 60);

  function handlePlayAll() {
    const playableItems: PlayableItem[] = unlistened.map((ep) => ({
      id: ep.version.audioId!,
      title: getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt),
      duration: ep.version.durationSecs ?? 0,
      format: ep.version.format,
      audioUrl: ep.version.audioUrl!,
    }));
    playQueue(playableItems);
  }

  function handlePlayEpisode(ep: LibraryItem & { version: AudioVersion }) {
    play({
      id: ep.version.audioId!,
      title: getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt),
      duration: ep.version.durationSecs ?? 0,
      format: ep.version.format,
      audioUrl: ep.version.audioUrl!,
    });
  }

  if (loading) {
    return <div className="p-6 text-center text-[var(--text-dim)] pt-16">Loading...</div>;
  }

  if (unlistened.length === 0) {
    return (
      <div className="p-6 pt-12 flex flex-col items-center text-center gap-4">
        <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-[var(--text-dim)] fill-none" strokeWidth="1">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <h2 className="text-xl font-bold">Nothing queued</h2>
        <p className="text-sm text-[var(--text-mid)]">Upload an article or PDF to generate your first episode.</p>
        <button
          onClick={onUpload}
          className="mt-2 px-6 py-3 rounded-[12px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-sm font-semibold text-white"
        >
          Upload Content
        </button>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="px-5 pt-6 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight leading-tight">{getGreeting()}</h1>
          <p className="text-sm text-[var(--text-mid)] mt-1 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-60">
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M6 3.5V6l1.75 1.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{totalDurationMins} min</span>
            <span className="w-[3px] h-[3px] rounded-full bg-[var(--text-dim)] mx-0.5" />
            <span>{unlistened.length} episode{unlistened.length !== 1 ? "s" : ""}</span>
          </p>
        </div>
      </div>

      {/* Play All CTA */}
      <div className="px-5 pt-4 pb-1">
        <button
          onClick={handlePlayAll}
          className="w-full py-4 rounded-[16px] bg-[var(--accent)] text-[17px] font-semibold text-white flex items-center justify-center gap-2.5 shadow-[0_1px_2px_rgba(234,88,12,0.20),0_4px_16px_rgba(234,88,12,0.28)] hover:brightness-105 active:scale-[0.98] transition-all"
        >
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="10" height="11" viewBox="0 0 10 11" fill="none">
              <path d="M2 1.5l7 4-7 4V1.5Z" fill="white"/>
            </svg>
          </span>
          Play All
        </button>
      </div>

      {/* Currently Playing */}
      {currentItem && (
        <>
          <div className="px-5 pt-5 pb-2.5 flex items-center gap-2">
            <h2 className="text-base font-bold">Now Playing</h2>
          </div>
          <div className="mx-5 bg-[var(--surface)] rounded-[var(--radius)] p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.06)] border border-black/[0.06] relative">
            {/* Playing badge */}
            <div className="absolute -top-px left-3.5 bg-[var(--accent)] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-b-[7px] flex items-center gap-1">
              <span className="w-[5px] h-[5px] rounded-full bg-white/80 animate-pulse" />
              Playing
            </div>
            <div className="flex items-start gap-3 mt-2.5">
              <div className="w-[52px] h-[52px] rounded-[10px] bg-gradient-to-br from-[#EA580C] via-[#FB923C] to-[#FDE68A] flex items-center justify-center shrink-0 shadow-[0_2px_6px_rgba(234,88,12,0.25)]">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white opacity-85">
                  <path d={sourceIcons.url} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold leading-snug line-clamp-2">{currentItem.title}</div>
                <div className="text-xs text-[var(--text-mid)] mt-0.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-text)] bg-[var(--accent-light)] px-1.5 py-0.5 rounded-[5px]">
                    {currentItem.format === "conversation" ? "Chat" : currentItem.format.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-[0_2px_8px_rgba(234,88,12,0.30)] shrink-0 mt-2"
              >
                {isPlaying ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2.5" y="2" width="3.5" height="10" rx="1.5" fill="white"/>
                    <rect x="8" y="2" width="3.5" height="10" rx="1.5" fill="white"/>
                  </svg>
                ) : (
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                    <path d="M1 1l10 6-10 6V1z" fill="white"/>
                  </svg>
                )}
              </button>
            </div>
            {/* Progress bar */}
            {currentItem.duration > 0 && (
              <div className="mt-3">
                <div className="w-full h-[3px] bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--accent)] to-[#FB923C] rounded-full"
                    style={{ width: `${Math.min(100, (position / currentItem.duration) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[11px] text-[var(--text-dim)] tabular-nums">{formatDuration(position)}</span>
                  <span className="text-[11px] text-[var(--text-mid)] font-medium tabular-nums">
                    {formatDuration(Math.max(0, currentItem.duration - position))} left
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Up Next */}
      <div className="px-5 pt-5 pb-2.5 flex items-center gap-2">
        <h2 className="text-base font-bold">Up Next</h2>
        <span className="text-[11px] font-semibold text-[var(--text-mid)] bg-[var(--surface-2)] rounded-full px-2 py-0.5 border border-black/[0.07]">
          Recent
        </span>
      </div>

      <div className="px-5 flex flex-col gap-2">
        {unlistened.map((ep, i) => {
          const v = ep.version;
          const displayTitle = getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt);
          const progressPct = v.durationSecs && v.position > 0
            ? Math.min(100, (v.position / v.durationSecs) * 100)
            : 0;

          return (
            <div
              key={ep.id}
              onClick={() => handlePlayEpisode(ep)}
              className="flex items-center gap-3 p-3 rounded-[var(--radius)] bg-[var(--surface)] border border-black/[0.05] shadow-[var(--shadow)] cursor-pointer hover:bg-[var(--surface-2)] active:scale-[0.98] transition-all"
            >
              {/* Gradient art */}
              <div className={`w-11 h-11 rounded-[9px] bg-gradient-to-br ${getGradient(i)} flex items-center justify-center shrink-0 shadow-[0_2px_5px_rgba(0,0,0,0.12)]`}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white opacity-85">
                  <path d={sourceIcons[ep.sourceType] || sourceIcons.txt} />
                </svg>
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-snug line-clamp-2">{displayTitle}</div>
                <div className="text-[11px] text-[var(--text-mid)] mt-0.5 flex items-center gap-0">
                  <span className="font-semibold">{ep.sourceType.toUpperCase()}</span>
                  <span className="w-[3px] h-[3px] rounded-full bg-[var(--text-dim)] mx-1.5" />
                  <span className="text-[var(--text-dim)]">{timeAgo(ep.createdAt)}</span>
                </div>
                {/* Progress bar for partially listened */}
                {progressPct > 0 && (
                  <div className="mt-1.5">
                    <div className="w-full h-[2px] bg-[var(--surface-2)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--accent)] to-[#FB923C] rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Duration badge */}
              <span className="text-xs font-semibold text-[var(--text-mid)] bg-[var(--surface-2)] rounded-[7px] px-2 py-1 tabular-nums shrink-0 self-start mt-0.5">
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

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/components/HomeScreen.test.tsx
```

**Expected:** All 12 tests pass.

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 6: Commit

```bash
git add src/components/HomeScreen.tsx src/components/HomeScreen.test.tsx
git commit -m "feat(home): complete rewrite — greeting, Play All, queue cards, progress bars, no listened episodes"
```

---

## Task 8: Title fallback logic

**Why:** Some content items have empty titles. The Home screen and Library should always show a readable title.

**NOTE:** This was already implemented in Task 6 as `getTitleFallback()` in `src/lib/utils/content-display.ts`, and it's already used in the HomeScreen from Task 7. This task verifies the integration works end-to-end and applies the same fallback to LibraryScreen.

**Files:**
- Modify: `src/components/LibraryScreen.tsx` (apply getTitleFallback)

### Step 1: Apply title fallback to LibraryScreen

In `src/components/LibraryScreen.tsx`, the `LibraryItem` interface needs `author` and `sourceUrl` fields to match the updated API. Find:

```typescript
interface LibraryItem {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}
```

Replace with:
```typescript
interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}
```

Then update the import at the top to include `getTitleFallback`:

```typescript
import { gradients, sourceIcons, timeAgo, getTitleFallback } from "@/lib/utils/content-display";
```

Find where the title is displayed (around line 143):
```typescript
                    <div className="text-sm font-semibold truncate mb-0.5">{item.title}</div>
```

Replace with:
```typescript
                    <div className="text-sm font-semibold truncate mb-0.5">{getTitleFallback(item.title, item.sourceUrl, item.sourceType, item.createdAt)}</div>
```

### Step 2: Run tests

```bash
npx vitest run src/components/LibraryScreen.test.tsx
```

**Expected:** All tests pass.

### Step 3: Commit

```bash
git add src/components/LibraryScreen.tsx
git commit -m "feat(library): apply title fallback for empty titles using getTitleFallback"
```

---

## Task 9: Build verification and manual testing

**Why:** Final verification that everything compiles, all tests pass, and there are no regressions.

### Step 1: Run full test suite

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run
```

**Expected:** 160+ tests passing (higher now with new tests), 7 skipped, 0 failures.

### Step 2: Run type check

```bash
npx tsc --noEmit
```

**Expected:** No type errors.

### Step 3: Run build

```bash
npx next build
```

**Expected:** Build succeeds with no errors. Warnings about unused vars are acceptable if minor.

### Step 4: Manual verification checklist

Start the dev server (`npx next dev`) and verify in the browser:

- [ ] Home tab shows time-based greeting (Good morning/afternoon/evening)
- [ ] Subtitle shows "X min · Y episodes"
- [ ] "Play All" button is visible and accent-colored
- [ ] Clicking "Play All" starts playing and shows Now Playing card
- [ ] Episode cards show gradient squares with source-type icons
- [ ] Episode cards show sourceType + timeAgo subtitle (e.g. "URL · 2h ago")
- [ ] No "narrator" or "min target" labels visible
- [ ] Partially-listened episodes show a thin progress bar
- [ ] Completed episodes do NOT appear on Home
- [ ] Tab bar shows only Home and Library (2 tabs)
- [ ] FAB button (orange "+") appears above tab bar
- [ ] Tapping FAB opens Upload as a modal overlay
- [ ] Gear icon in top-right opens Settings
- [ ] Upload screen shows 5 presets: 2, 3, 5, 15, 30 minutes
- [ ] Slider minimum is 2 (not 5)
- [ ] Library tab still works correctly
- [ ] Episodes with empty titles show domain fallback or sourceType + date

### Step 5: Commit if any manual-test-driven fixes were needed

```bash
git add -A
git commit -m "fix: manual testing adjustments for home screen redesign"
```

---

## Summary of commits (in order)

1. `feat(api): join PlaybackState to library endpoint, add author and sourceUrl fields`
2. `fix(player): remove hardcoded userId from playback state requests — server uses Clerk auth`
3. `feat(player): add queue support — playQueue, skipToNext, skipToPrevious, auto-advance on ended`
4. `feat(upload): add 2-min and 3-min duration presets, lower slider minimum to 2`
5. `feat(nav): restructure to 2 tabs (Home, Library) + FAB for upload + modal overlay`
6. `refactor: extract gradients, sourceIcons, timeAgo, getTitleFallback into shared content-display utils`
7. `feat(home): complete rewrite — greeting, Play All, queue cards, progress bars, no listened episodes`
8. `feat(library): apply title fallback for empty titles using getTitleFallback`
9. `fix: manual testing adjustments for home screen redesign` (only if needed)
