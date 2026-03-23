> **Design reference:** `docs/mockups/player/expanded-player.html` (v2)

# Expanded Player Redesign — Dev-Machine Spec

> **Session 10 note:** Task 1 (expanded-player-schema) completed in session 10. Remaining tasks below.

---

## Files Summary

**Modify:**

| File | Change |
|---|---|
| `src/app/api/process/route.ts` | Add `summary: analysis.summary?.trim() \|\| null` to script create |
| `src/app/api/process/route.test.ts` | 2 new tests: summary saved, empty→null |
| `src/app/api/library/route.ts` | Return summary, contentType, themes, compressionRatio, actualWordCount, voices, ttsProvider per version |
| `src/app/api/library/route.test.ts` | 6 new tests for rich version fields |
| `src/components/PlayerContext.tsx` | Extend PlayableItem; add sleepTimer + setSleepTimer |
| `src/components/PlayerContext.test.tsx` | PlayableItem fields tests + sleep timer tests |
| `src/components/ExpandedPlayer.tsx` | Complete rewrite |
| `src/components/ExpandedPlayer.test.tsx` | Preserve scrubber/undo tests; add skip interval, controls, sleep timer, rich metadata tests |
| `src/components/PlayerBar.tsx` | Dynamic gradient icon + richer subtitle |
| `src/components/PlayerBar.test.tsx` | 4 new subtitle/gradient tests |
| `src/components/HomeScreen.tsx` | Pass new PlayableItem fields in handlePlayAll / handlePlayEpisode |

**Already completed:**
- `prisma/schema.prisma` + `prisma/migrations/` — `summary String?` added to Script ✓

---

## Table of Contents

1. [Task 2: Save Claude's summary to DB](#task-2-save-claudes-summary-to-db)
2. [Task 3: API — Return rich metadata](#task-3-api--return-rich-metadata-for-player)
3. [Task 4: Extend PlayableItem interface](#task-4-extend-playableitem-interface)
4. [Task 5: Rewrite ExpandedPlayer.tsx](#task-5-rewrite-expandedplayertsx)
5. [Task 6: Update PlayerBar mini-player](#task-6-update-playerbar-mini-player)
6. [Task 7: Sleep Timer implementation](#task-7-sleep-timer-implementation)
7. [Task 8: Build verification](#task-8-build-verification)

---

## Task 2: Save Claude's summary to DB

**Feature ID:** `expanded-player-save-summary`
**depends_on:** `["expanded-player-schema"]` (completed ✓)

**Why:** `ai.analyze()` returns `summary` but it's discarded. One-line fix: add `summary: analysis.summary?.trim() || null` to `prisma.script.create`.

**Files:** `src/app/api/process/route.ts`, `src/app/api/process/route.test.ts`

### Tests — add inside existing describe block

```typescript
it("saves summary from AI analysis to the script record", async () => {
  // mockAnalyze returns { summary: "A fascinating exploration..." }
  // expect mockScriptCreate called with data containing:
  //   { summary: "A fascinating exploration..." }
});
it("saves null when analysis returns empty summary", async () => {
  // mockAnalyze returns { summary: "" }
  // expect mockScriptCreate called with data containing: { summary: null }
});
```

### Implementation — one-line change in route.ts

In `prisma.script.create({ data: { ... } })`, add after `themes: analysis.themes`:
```typescript
        summary: analysis.summary?.trim() || null,
```

### Commit
```bash
git add src/app/api/process/route.ts src/app/api/process/route.test.ts
git commit -m "feat(process): persist AI-generated summary to Script record for expanded player"
```

---

## Task 3: API — Return rich metadata for player

**Feature ID:** `expanded-player-api`
**depends_on:** `["expanded-player-schema"]` (completed ✓)

**Why:** ExpandedPlayer needs summary, contentType, themes, compressionRatio, actualWordCount, voices, ttsProvider from each version. These fields already exist in the DB — just map them into the response.

**Files:** `src/app/api/library/route.ts`, `src/app/api/library/route.test.ts`

### Tests — add 6 new tests at end of existing describe block

Update `twoScriptItem` mock to include: `contentType: "science_article"`, `themes: ["cognitive bias", "decision making"]`, `compressionRatio: 0.15`, `actualWordCount: 450`, `summary: "A fascinating exploration..."`, and audio fields `voices: ["alloy"]`, `ttsProvider: "openai"`.

```typescript
it("returns contentType on each version", /* expect data[0].versions[0].contentType === "science_article" */);
it("returns themes array on each version", /* expect toEqual(["cognitive bias", "decision making"]) */);
it("returns summary on each version", /* both versions get same summary */);
it("returns null summary when script has no summary", /* summary: null in mock → toBeNull() */);
it("returns compressionRatio and actualWordCount", /* 0.15 and 450 */);
it("returns voices array and ttsProvider", /* ["alloy"] and "openai"; conversation version has ["alloy","echo"] */);
```

### Implementation — extend version map in route.ts

In the `return script.audio.map((audio) => { ... })` block, add after `position: pb?.position ?? 0`:

```typescript
              summary: script.summary ?? null,
              contentType: script.contentType ?? null,
              themes: script.themes ?? [],
              compressionRatio: script.compressionRatio,
              actualWordCount: script.actualWordCount,
              voices: audio.voices ?? [],
              ttsProvider: audio.ttsProvider,
```

Add same fields (with null/empty defaults) to the "generating" stub branch.

Update `AudioVersion` interface to include the 7 new fields.

### Commit
```bash
git add src/app/api/library/route.ts src/app/api/library/route.test.ts
git commit -m "feat(api): return rich metadata per version for expanded player (summary, contentType, themes, voices, ttsProvider)"
```

---

## Task 4: Extend PlayableItem interface

**Feature ID:** `expanded-player-playable-item`
**depends_on:** `["expanded-player-api"]`

**Why:** ExpandedPlayer reads rich metadata from `currentItem`. All new fields are optional (`?`) for backward compat with existing `play()` call sites.

**Files:** `src/components/PlayerContext.tsx`, `src/components/HomeScreen.tsx`

### Tests — add describe block at end of PlayerContext.test.tsx

```tsx
describe("PlayerContext — extended PlayableItem fields", () => {
  // RichItemComponent renders: summary, author, contentType, sourceUrl, themes, compressionRatio
  // Calls play() with full rich item including all new optional fields

  it("accepts and exposes extended PlayableItem fields on currentItem", () => {
    // after fireEvent.click("Play Rich"):
    // summary → "An exploration of cognitive biases."
    // author → "Daniel Kahneman"
    // content-type → "science_article"
    // source-url → "https://example.com/article"
    // themes → "psychology,decision making"
    // compression → "0.15"
  });
  it("existing play() calls without new fields still work (backward compat)", () => {
    // summary testid shows "no-summary" when currentItem has no extended fields
  });
});
```

### Implementation

**Extend `PlayableItem` interface** in `PlayerContext.tsx`:

```typescript
export interface PlayableItem {
  id: string;           // audioId
  title: string;
  duration: number;     // seconds
  format: string;       // "narrator" | "conversation"
  audioUrl: string;
  // Extended — all optional for backward compat
  author?: string | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  contentType?: string | null;
  themes?: string[];
  summary?: string | null;
  targetDuration?: number | null;
  wordCount?: number | null;
  compressionRatio?: number | null;
  voices?: string[];
  ttsProvider?: string | null;
  createdAt?: string | null;
}
```

**Update HomeScreen.tsx** — add optional fields to `handlePlayAll` and `handlePlayEpisode` PlayableItem construction:

```typescript
      author: ep.author ?? null,
      sourceType: ep.sourceType,
      sourceUrl: ep.sourceUrl ?? null,
      contentType: ep.version.contentType ?? null,
      themes: ep.version.themes ?? [],
      summary: ep.version.summary ?? null,
      targetDuration: ep.version.targetDuration,
      wordCount: ep.wordCount,
      compressionRatio: ep.version.compressionRatio,
      voices: ep.version.voices ?? [],
      ttsProvider: ep.version.ttsProvider ?? null,
      createdAt: ep.version.createdAt,
```

Also add the new optional fields to the `AudioVersion` interface in `HomeScreen.tsx`.

### Commit
```bash
git add src/components/PlayerContext.tsx src/components/HomeScreen.tsx
git commit -m "feat(player): extend PlayableItem interface with optional rich metadata fields for expanded player"
```

---

## Task 5: Rewrite ExpandedPlayer.tsx

**Feature ID:** `expanded-player-rewrite`
**depends_on:** `["expanded-player-playable-item"]`

**Why:** Replace static full-screen player with a scrollable three-section layout: (1) artwork + info + progress, (2) About + Read Along + Sections, (3) Episode Details. Fixed controls bar at bottom with 5s back / 15s forward skip. Sleep timer cycles Off→15m→30m→45m→End→Off.

**Files:** `src/components/ExpandedPlayer.tsx`, `src/components/ExpandedPlayer.test.tsx`

### Tests — replace entire ExpandedPlayer.test.tsx

**Preserve all existing tests** (scrubber handle, undo seek — 10 tests). Add:

```tsx
// Mock setup: baseMockPlayer (minimal PlayableItem, position:60, duration:300)
//             richMockPlayer (full PlayableItem: author, contentType, themes, summary, sourceUrl, wordCount, etc.)
// vi.mock("./PlayerContext") with currentMockPlayer variable; vi.mock("@/lib/ui/content-display")

describe("ExpandedPlayer skip intervals", () => {
  it("skip back button calls skipBack(5)");      // aria-label /skip back/i → skipBack(5)
  it("skip forward button calls skipForward(15)"); // aria-label /skip forward/i → skipForward(15)
  it("skip labels show '5s' and '15s'");
});

describe("ExpandedPlayer controls", () => {
  it("play/pause button calls togglePlay");
  it("onClose called when chevron clicked");      // aria-label /minimize|close|collapse/i
  it("onCarMode called when Car Mode clicked");
  it("speed cycles when speed button clicked");   // 1x → setSpeed(1.25)
});

describe("ExpandedPlayer sleep timer", () => {
  it("shows Sleep button");
  it("cycles off → 15min → 30min → 45min → end → off", () => {
    // 5 clicks; check /15/, /30/, /45/, /end/i text; 5th click removes them
  });
});

describe("ExpandedPlayer rich metadata", () => {
  beforeEach(() => { currentMockPlayer = richMockPlayer; });
  it("shows episode title");
  it("shows 'By Daniel Kahneman' when author provided");
  it("does not show 'By ' when author is null");
  it("shows content type badge 'Science Article'");
  it("shows theme chips: psychology, cognitive bias, decision theory");
  it("shows About section with AI summary");
  it("hides About section when summary is null");
  it("shows 'Read Along' card always");
  it("shows source domain 'example.com'");
  it("shows 'View Original Article' link when sourceUrl present");
  it("hides 'View Original Article' when sourceUrl null");
  it("shows timeAgo in details");
  it("shows word count '8,400 words'");
});

describe("ExpandedPlayer empty state", () => {
  it("renders null when currentItem is null");
});
```

### Implementation — replace entire ExpandedPlayer.tsx

**Key architecture:**
- `CONTENT_GRADIENTS` record: `science_article→[#0D9488,#14B8A6]`, `business_book→[#EA580C,#F97316]`, `technical_paper→[#2563EB,#3B82F6]`, `news_article→[#DB2777,#EC4899]`, `fiction→[#7C3AED,#8B5CF6]`, `biography→[#065F46,#059669]`, `self_help→[#B45309,#D97706]`, `educational→[#1D4ED8,#2563EB]`. Default: `[#EA580C,#F97316]`.
- `CONTENT_TYPE_LABELS` record: human-readable labels (e.g. `science_article → "Science Article"`).
- `SLEEP_CYCLE: [null, 15, 30, 45, "end"]` — local state, cycles on button click.
- Sleep timer: local component state (will move to context in Task 7). `setInterval(60_000)` counts down and pauses audio when reaches 0.
- `seekProgress`: saves undo position, 4s auto-dismiss timer (same as current implementation).
- Props: `{ onClose: () => void; onCarMode: () => void }`
- Layout:
  1. Fixed top bar: chevron (aria-label "Minimize player") + "Now Playing" + share icon
  2. Scrollable content (`pb-[140px]`): artwork (140px gradient), source pill, title, "By author", contentType badge, theme chips, progress bar with scrubber, undo seek button, time labels
  3. Section 2 (border-top): "About" (when summary), Read Along card (always), Sections (4 placeholder)
  4. Section 3: "Episode Details" — source domain + "View Original Article" link, original word count, "this version" compression, voice, created timeAgo
  5. Fixed bottom controls (`absolute bottom-0`): skip-back(5s) | play/pause(68px) | skip-forward(15s) + speed/sleep/car-mode row

```tsx
// Key: data-testid="progress-bar" on the progress div (for existing seek tests)
// aria-label="Minimize player" on close chevron
// aria-label="Skip back 5 seconds" / "Skip forward 15 seconds"
// aria-label="Change playback speed" / "Sleep timer" / "Car Mode"
// aria-label={isPlaying ? "Pause" : "Play"} on main play button
```

### Commit
```bash
git add src/components/ExpandedPlayer.tsx src/components/ExpandedPlayer.test.tsx
git commit -m "feat(player): rewrite ExpandedPlayer — scrollable layout, rich metadata, 5s/15s skips, sleep timer, dynamic gradients"
```

---

## Task 6: Update PlayerBar mini-player

**Feature ID:** `expanded-player-minibar`
**depends_on:** `["expanded-player-playable-item"]`

**Why:** Mini-player icon gradient should match content type. Subtitle should show `sourceType · timeAgo` when available, falling back to `format · duration`.

**Files:** `src/components/PlayerBar.tsx`, `src/components/PlayerBar.test.tsx`

### Tests — replace entire PlayerBar.test.tsx

```tsx
// baseMockItem: minimal PlayableItem (no sourceType/createdAt)
// richMockItem: PlayableItem with sourceType:"url", contentType:"science_article", createdAt:"2026-03-01T00:00:00Z"
// vi.mock("@/lib/ui/content-display", () => ({ timeAgo: () => "3h ago" }))

describe("PlayerBar", () => {
  it("renders a skip-forward button");
  it("calls skipForward(30) when skip button clicked");   // mini-player keeps 30s
  it("skip button click does NOT trigger onExpand");
  it("shows episode title");
  // NEW:
  it("shows 'url · 3h ago' subtitle when sourceType + createdAt available", () => {
    // currentMock = richMockItem; expect /url\s*·\s*3h ago/i
  });
  it("falls back to 'narrator · {duration}' when sourceType absent", () => {
    // baseMockItem; expect /narrator/i
  });
  it("does NOT show 'narrator' as standalone label when sourceType available", () => {
    // richMockItem; queryByText(/^narrator$/i) → not in document
  });
  it("skip intervals shown as '30s' in mini-player");
});
```

### Implementation — replace entire PlayerBar.tsx

```tsx
"use client";
import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";
import { timeAgo } from "@/lib/ui/content-display";

// Same CONTENT_GRADIENTS map as ExpandedPlayer — keep in sync
// getIconGradient(contentType?) → [from, to]

export function PlayerBar({ onExpand }: { onExpand: () => void }) {
  const { currentItem, isPlaying, position, togglePlay, skipForward } = usePlayer();
  if (!currentItem) return null;

  const progress = currentItem.duration > 0 ? (position / currentItem.duration) * 100 : 0;
  const [gradFrom, gradTo] = getIconGradient(currentItem.contentType);

  // Subtitle: sourceType·timeAgo preferred; falls back to format·duration
  const subtitle = currentItem.sourceType && currentItem.createdAt
    ? `${currentItem.sourceType} · ${timeAgo(currentItem.createdAt)}`
    : `${currentItem.format} · ${formatDuration(currentItem.duration)}`;

  return (
    <div onClick={onExpand} data-testid="player-bar"
      className="absolute bottom-16 left-2 right-2 h-[58px] flex items-center gap-3 px-3 z-[60] cursor-pointer rounded-[14px] border border-[#EA580C]/20"
      style={{ background: `linear-gradient(135deg, ${gradFrom}26, ${gradTo}1a)`, backdropFilter: "blur(24px)" }}>
      {/* Dynamic gradient icon: w-[38px] h-[38px] with gradFrom→gradTo */}
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{currentItem.title}</div>
        <div className="text-[11px] text-[var(--text-mid)]">{subtitle}</div>
      </div>
      {/* Play/pause button: e.stopPropagation(), togglePlay() */}
      {/* Skip forward button: aria-label="Skip forward 30 seconds", skipForward(30), "30s" label */}
      {/* Progress bar: absolute bottom-0, width: progress% */}
    </div>
  );
}
```

### Commit
```bash
git add src/components/PlayerBar.tsx src/components/PlayerBar.test.tsx
git commit -m "feat(player): update PlayerBar with dynamic content-type gradient and richer subtitle"
```

---

## Task 7: Sleep Timer implementation

**Feature ID:** `expanded-player-sleep-timer`
**depends_on:** `[]`

**Why:** Move sleep timer from ExpandedPlayer local state into `PlayerContext` so it persists across navigation and is accessible from the mini-player. ExpandedPlayer updated to use context version.

**Files:** `src/components/PlayerContext.tsx`, `src/components/PlayerContext.test.tsx`, `src/components/ExpandedPlayer.tsx`

### Tests — add describe block at end of PlayerContext.test.tsx

```tsx
describe("PlayerContext — sleep timer", () => {
  // vi.useFakeTimers() in beforeEach; vi.useRealTimers() in afterEach
  // SleepTestComponent: shows sleepTimer value, buttons to set 15 / "end" / null

  it("sleepTimer defaults to null (off)");
  it("setSleepTimer(15) sets the timer value to 15");
  it("setSleepTimer(null) cancels the timer");
  it("setSleepTimer('end') sets timer to 'end'");
  it("pauses playback after sleep timer minutes elapse", async () => {
    // Play, setSleepTimer(15), vi.advanceTimersByTime(15*60*1000+100)
    // → timer shows "off" (auto-cleared after pause)
  });
});
```

### Implementation

**Add to `PlayerState` interface:**
```typescript
  sleepTimer: number | "end" | null;
  setSleepTimer: (value: number | "end" | null) => void;
```

**Add state + ref inside `PlayerProvider`:**
```typescript
  const [sleepTimer, setSleepTimerState] = useState<number | "end" | null>(null);
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

**Add `setSleepTimer` callback:**
```typescript
  const setSleepTimer = useCallback((value: number | "end" | null) => {
    if (sleepIntervalRef.current) { clearInterval(sleepIntervalRef.current); sleepIntervalRef.current = null; }
    setSleepTimerState(value);
    if (value === null || value === "end") return;
    const totalMs = value * 60_000;
    // setInterval every 60s to count down setSleepTimerState(remaining)
    // setTimeout at totalMs to pause audio, setIsPlaying(false), clear interval, setSleepTimerState(null)
  }, []);
```

**Add cleanup useEffect:**
```typescript
  useEffect(() => () => { if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current); }, []);
```

**Update Provider value** to include `sleepTimer, setSleepTimer`.

**Update ExpandedPlayer.tsx** — remove local sleep state, use `sleepTimer, setSleepTimer` from `usePlayer()`. Replace `cycleSleepTimer` with:
```typescript
  function cycleSleepTimer() {
    const CYCLE: Array<number | "end" | null> = [null, 15, 30, 45, "end"];
    setSleepTimer(CYCLE[(CYCLE.indexOf(sleepTimer) + 1) % CYCLE.length]);
  }
  const sleepLabel = sleepTimer === null ? "" : sleepTimer === "end" ? "End" : `${sleepTimer}m`;
```

### Commit
```bash
git add src/components/PlayerContext.tsx src/components/PlayerContext.test.tsx src/components/ExpandedPlayer.tsx
git commit -m "feat(player): add sleep timer to PlayerContext — cycles off/15/30/45/end, pauses on expiry"
```

---

## Task 8: Build verification

```bash
npx vitest run    # All tests pass, 0 failures
npm run lint      # No new errors (existing 10 no-unused-vars warnings OK)
npm run build     # Build succeeds
```

```bash
git add -A
git commit -m "chore: build verification — expanded player 10 pts complete"
```

---

## Success Criteria

### Schema + API
- [ ] `POST /api/process` saves AI summary → Script record
- [ ] `GET /api/library` returns `summary`, `contentType`, `themes`, `compressionRatio`, `actualWordCount`, `voices`, `ttsProvider` per version
- [ ] All library route tests pass (existing + 6 new)

### PlayableItem
- [ ] `PlayableItem` has all new optional fields; existing `play()` call sites unchanged
- [ ] HomeScreen passes rich fields in `handlePlayAll` / `handlePlayEpisode`

### ExpandedPlayer
- [ ] Gradient artwork color varies by contentType
- [ ] Title, "By {author}", contentType badge, theme chips visible
- [ ] Progress bar + undo seek still works (all existing tests pass)
- [ ] Skip back calls `skipBack(5)` — **5s**, skip forward calls `skipForward(15)` — **15s**
- [ ] "About" section: shown when summary present, hidden when null
- [ ] "Read Along" card always visible
- [ ] "Episode Details": source domain + "View Original Article" link (when sourceUrl present), word count, compression %, voice, created
- [ ] Sleep timer cycles: Off → 15m → 30m → 45m → End → Off
- [ ] All ExpandedPlayer tests pass

### PlayerBar
- [ ] Icon uses content-type-specific gradient (not always orange)
- [ ] Subtitle: `{sourceType} · {timeAgo}` when available, else `{format} · {duration}`
- [ ] Skip forward still calls `skipForward(30)` (mini-player keeps 30s)

### Sleep Timer
- [ ] `sleepTimer` and `setSleepTimer` exposed from `usePlayer()`
- [ ] Minute timer counts down and pauses audio on expiry
- [ ] `null` cancels; `"end"` accepted without countdown

---

## Out of Scope

| What | Why |
|---|---|
| "Read Along" time-syncing | Requires word-level TTS timestamps (not available from OpenAI TTS) |
| Real section extraction | H2/H3 parsing deferred; 4 placeholder sections used |
| "Other Versions" switcher | Needs new API endpoint; deferred |
| Queue display in ExpandedPlayer | Owned by home-screen spec; future polish |
| Sleep timer "end of episode" wiring | `"end"` stored in context but pause-on-ended logic deferred |
