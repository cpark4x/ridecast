# TestFlight Bug Fixes Implementation Plan

> **Execution:** Use the subagent-driven-development workflow to implement this plan.

**Goal:** Fix 4 bugs found during the first TestFlight session of the Ridecast iOS app.
**Architecture:** All fixes are in the native app layer (`native/`). Bugs 1 and 3 are related — both stem from missing playback-end handling. Bug 4 is a missing field propagation. Bug 2 is a missing `smartTitle` application.
**Tech Stack:** React Native (Expo), react-native-track-player (RNTP), Jest, TypeScript

---

## Bugs at a Glance

| # | Bug | Root Cause | Files |
|---|-----|------------|-------|
| 1 | Playback loops after finishing | `PlaybackService` has no `PlaybackQueueEnded` handler | `player.ts` |
| 3 | Listened status not updating | No completion save when playback ends naturally | `player.ts`, `usePlayer.ts` |
| 4 | Missing album art on lock screen | `itemToTrack` omits `artwork` field; `PlayableItem` lacks `thumbnailUrl` | `types.ts`, `usePlayer.ts`, `libraryHelpers.ts`, `EpisodeCard.tsx` |
| 2 | Raw pipe `\|` in titles | `libraryItemToPlayable` and `handleVersionTap` pass raw title without `smartTitle()` | `libraryHelpers.ts`, `EpisodeCard.tsx` |

Order: 1 → 3 → 4 → 2 (bugs 1 & 3 are related — fix the loop first, then completion tracking)

---

## Pre-flight: Running Tests

All native tests use **Jest** (not Vitest). Run from the `native/` directory:

```bash
cd native && npx jest __tests__/<filename>.test.ts --verbose
```

Full native test suite:

```bash
cd native && npx jest --verbose
```

---

## Task 1: Fix Playback Looping After Track Finishes

**Root cause:** `PlaybackService` in `native/lib/player.ts` registers handlers for remote control events (pause, play, seek, etc.) but has **no handler** for `Event.PlaybackQueueEnded`. When a single-track queue finishes on iOS, RNTP can restart the track because nothing explicitly stops playback. The `RepeatMode.Off` set during setup is necessary but not sufficient — an explicit queue-ended handler is needed.

**Files:**
- Modify: `native/lib/player.ts` (add `PlaybackQueueEnded` handler)
- Modify: `native/__tests__/player.test.ts` (add tests for the new handler)

### Step 1: Write the failing test

Add this test at the end of the `PlaybackService` describe block in `native/__tests__/player.test.ts`:

First, add `PlaybackQueueEnded` to the mock's `Event` object near the top of the file. Find this block:

```ts
Event: {
    RemotePause: "remote-pause",
    RemotePlay: "remote-play",
    RemoteNext: "remote-next",
    RemotePrevious: "remote-previous",
    RemoteSeek: "remote-seek",
    RemoteJumpForward: "remote-jump-forward",
    RemoteJumpBackward: "remote-jump-backward",
  },
```

Replace it with:

```ts
Event: {
    RemotePause: "remote-pause",
    RemotePlay: "remote-play",
    RemoteNext: "remote-next",
    RemotePrevious: "remote-previous",
    RemoteSeek: "remote-seek",
    RemoteJumpForward: "remote-jump-forward",
    RemoteJumpBackward: "remote-jump-backward",
    PlaybackQueueEnded: "playback-queue-ended",
  },
```

Then add the test inside the existing `describe("PlaybackService", ...)` block, after the last `it(...)`:

```ts
  it("PlaybackQueueEnded handler pauses and seeks to start", async () => {
    await PlaybackService();

    const queueEndedCall = tp.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === "playback-queue-ended",
    );
    expect(queueEndedCall).toBeDefined();
    const handler = queueEndedCall![1] as () => Promise<void>;
    await handler();
    expect(tp.pause).toHaveBeenCalledTimes(1);
    expect(tp.seekTo).toHaveBeenCalledWith(0);
  });
```

### Step 2: Run the test to verify it fails

```bash
cd native && npx jest __tests__/player.test.ts --verbose
```

**Expected:** FAIL — `queueEndedCall` is `undefined` because no `PlaybackQueueEnded` listener is registered yet.

### Step 3: Write the fix

In `native/lib/player.ts`, add the `PlaybackQueueEnded` handler at the end of the `PlaybackService` function body (after the `RemoteJumpBackward` handler, before the closing `}`):

```ts
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    await TrackPlayer.pause();
    await TrackPlayer.seekTo(0);
  });
```

### Step 4: Run the test to verify it passes

```bash
cd native && npx jest __tests__/player.test.ts --verbose
```

**Expected:** PASS — all 7 tests green (6 existing + 1 new).

### Step 5: Commit

```bash
git add native/lib/player.ts native/__tests__/player.test.ts && git commit -m "fix: stop playback looping by handling PlaybackQueueEnded event"
```

---

## Task 2: Fix Listened Status Not Updating

**Root cause:** The position-saving interval in `PlayerProvider` (`native/lib/usePlayer.ts`, lines 126–150) runs only while `isPlaying === true`. It checks `completed = dur > 0 && pos >= dur - 1`, but when the track finishes, RNTP's state changes to not-playing, `isPlaying` becomes `false`, the interval's cleanup runs, and the final `completed: true` save is never made. There is no dedicated "playback finished" handler in the React layer.

**Fix approach:**
1. Export a pure `isPlaybackCompleted(position, duration)` helper from `player.ts` (testable)
2. Add a `useEffect` in `PlayerProvider` that watches for the playing→stopped transition at end-of-track, then saves `completed: true` to both local DB and server

**Files:**
- Modify: `native/lib/player.ts` (export `isPlaybackCompleted` helper)
- Modify: `native/lib/usePlayer.ts` (add completion detection `useEffect`)
- Modify: `native/__tests__/player.test.ts` (test the helper)

### Step 1: Write the failing test

Add this new `describe` block at the end of `native/__tests__/player.test.ts` (after the `PlaybackService` describe block):

```ts
describe("isPlaybackCompleted", () => {
  it("returns true when position is within 1 second of duration", () => {
    const { isPlaybackCompleted } = require("../lib/player");
    expect(isPlaybackCompleted(299.5, 300)).toBe(true);
  });

  it("returns true when position equals duration", () => {
    const { isPlaybackCompleted } = require("../lib/player");
    expect(isPlaybackCompleted(300, 300)).toBe(true);
  });

  it("returns false when position is far from end", () => {
    const { isPlaybackCompleted } = require("../lib/player");
    expect(isPlaybackCompleted(100, 300)).toBe(false);
  });

  it("returns false when duration is 0 (no track loaded)", () => {
    const { isPlaybackCompleted } = require("../lib/player");
    expect(isPlaybackCompleted(0, 0)).toBe(false);
  });

  it("returns false for negative values", () => {
    const { isPlaybackCompleted } = require("../lib/player");
    expect(isPlaybackCompleted(-1, 300)).toBe(false);
  });
});
```

### Step 2: Run the test to verify it fails

```bash
cd native && npx jest __tests__/player.test.ts --verbose
```

**Expected:** FAIL — `isPlaybackCompleted` is not exported from `player.ts`.

### Step 3: Write the fix (two parts)

**Part A — Export the helper from `native/lib/player.ts`:**

Add this exported function at the very end of the file, after the `PlaybackService` function:

```ts
/**
 * Returns true when playback position is within 1 second of the track's end.
 * Used to determine when to mark an episode as "completed".
 */
export function isPlaybackCompleted(position: number, duration: number): boolean {
  return duration > 0 && position >= duration - 1;
}
```

**Part B — Add completion detection in `native/lib/usePlayer.ts`:**

First, add `isPlaybackCompleted` to the imports from `./player`. Find:

```ts
import { resolveAudioUrl } from "./downloads";
```

Add this line directly above it:

```ts
import { isPlaybackCompleted } from "./player";
```

Then add a ref to track the previous playing state. Find this line (around line 94):

```ts
  // Timestamps for smart resume
  const pausedAtRef = useRef<number | null>(null);
```

Add this line directly above it:

```ts
  // Track previous isPlaying state for completion detection
  const prevPlayingRef = useRef(false);
```

Now add the completion detection `useEffect`. Place it immediately after the position persistence `useEffect` (after the line `}, [isPlaying, currentItem, progress.position, progress.duration, speed]);` around line 150). Add:

```ts
  // -------------------------------------------------------------------------
  // Completion detection: save completed when playback stops at end of track
  // -------------------------------------------------------------------------
  useEffect(() => {
    const wasPlaying = prevPlayingRef.current;
    prevPlayingRef.current = isPlaying;

    // Detect playing → stopped transition at end of track
    if (
      wasPlaying &&
      !isPlaying &&
      currentItem &&
      isPlaybackCompleted(progress.position, progress.duration)
    ) {
      saveLocalPlayback({
        audioId: currentItem.id,
        position: progress.position,
        speed,
        completed: true,
      });
      saveServerPlayback({
        audioId: currentItem.id,
        position: progress.position,
        speed,
        completed: true,
      }).catch(() => {
        /* fire and forget */
      });
    }
  }, [isPlaying, currentItem, progress.position, progress.duration, speed]);
```

### Step 4: Run the test to verify it passes

```bash
cd native && npx jest __tests__/player.test.ts --verbose
```

**Expected:** PASS — all 12 tests green (7 from Task 1 + 5 new).

### Step 5: Commit

```bash
git add native/lib/player.ts native/lib/usePlayer.ts native/__tests__/player.test.ts && git commit -m "fix: mark episodes as completed when playback finishes naturally"
```

---

## Task 3: Fix Missing Album Art on Lock Screen

**Root cause:** Three missing links in the data chain:
1. `PlayableItem` type (`native/lib/types.ts`) has no `thumbnailUrl` field
2. `libraryItemToPlayable()` (`native/lib/libraryHelpers.ts`) doesn't map `thumbnailUrl` from `LibraryItem`
3. `itemToTrack()` (`native/lib/usePlayer.ts`) doesn't set the `artwork` field that RNTP uses for lock screen / Now Playing art

The `LibraryItem` type already has `thumbnailUrl`, and `syncLibrary()` populates it with a Google favicon URL (`https://www.google.com/s2/favicons?domain=...&sz=128`). But it's never propagated to the player.

**Files:**
- Modify: `native/lib/types.ts` (add `thumbnailUrl` to `PlayableItem`)
- Modify: `native/lib/libraryHelpers.ts` (map `thumbnailUrl` in `libraryItemToPlayable`)
- Modify: `native/lib/usePlayer.ts` (add `artwork` to `itemToTrack`)
- Modify: `native/components/EpisodeCard.tsx` (pass `thumbnailUrl` in `handleVersionTap`)
- Modify: `native/__tests__/libraryHelpers.test.ts` (test that `thumbnailUrl` is mapped)

### Step 1: Write the failing test

In `native/__tests__/libraryHelpers.test.ts`, you need to add an import and a new describe block. 

First, add `libraryItemToPlayable` to the imports. Find this line at the top:

```ts
import { getLibraryContext, getTopSourceDomain } from "../lib/libraryHelpers";
```

Replace it with:

```ts
import { getLibraryContext, getTopSourceDomain, libraryItemToPlayable } from "../lib/libraryHelpers";
```

Then add this new describe block at the end of the file:

```ts
// ---------------------------------------------------------------------------
// libraryItemToPlayable — artwork propagation
// ---------------------------------------------------------------------------

describe("libraryItemToPlayable — artwork", () => {
  it("includes thumbnailUrl in the returned PlayableItem", () => {
    const item = makeItem("c1", [makeVersion({ audioId: "a1", audioUrl: "https://cdn.example.com/a1.mp3" })], {
      thumbnailUrl: "https://www.google.com/s2/favicons?domain=example.com&sz=128",
    });
    const playable = libraryItemToPlayable(item);
    expect(playable).not.toBeNull();
    expect(playable!.thumbnailUrl).toBe(
      "https://www.google.com/s2/favicons?domain=example.com&sz=128",
    );
  });

  it("sets thumbnailUrl to null when LibraryItem has no thumbnail", () => {
    const item = makeItem("c2", [makeVersion({ audioId: "a2", audioUrl: "https://cdn.example.com/a2.mp3" })]);
    const playable = libraryItemToPlayable(item);
    expect(playable).not.toBeNull();
    expect(playable!.thumbnailUrl).toBeUndefined();
  });
});
```

### Step 2: Run the test to verify it fails

```bash
cd native && npx jest __tests__/libraryHelpers.test.ts --verbose
```

**Expected:** FAIL — `playable.thumbnailUrl` is `undefined` because `PlayableItem` has no such field and `libraryItemToPlayable` doesn't map it.

### Step 3: Write the fix (three parts)

**Part A — Add `thumbnailUrl` to `PlayableItem` type in `native/lib/types.ts`:**

Find the `PlayableItem` interface. Add `thumbnailUrl` after the `createdAt` field (last field before the closing `}`):

```ts
  thumbnailUrl?: string | null;
```

So the end of `PlayableItem` should look like:

```ts
  createdAt?: string | null;
  thumbnailUrl?: string | null;
}
```

**Part B — Map `thumbnailUrl` in `libraryItemToPlayable` in `native/lib/libraryHelpers.ts`:**

Find this block inside `libraryItemToPlayable` (around line 37):

```ts
  return {
    id:               version.audioId,
    title:            item.title,
    duration:         version.durationSecs ?? version.targetDuration * 60,
    format:           version.format,
    audioUrl:         version.audioUrl,
    author:           item.author,
    sourceType:       item.sourceType,
    sourceUrl:        item.sourceUrl,
    sourceDomain:     item.sourceDomain,   // for smartTitle
    sourceName:       item.sourceName,     // for player bar subtitle
    sourceBrandColor: item.sourceBrandColor, // for SourceIcon
    contentType:      version.contentType,
    themes:           version.themes,
    summary:          version.summary,
    targetDuration:   version.targetDuration,
    createdAt:        item.createdAt,
  };
```

Add `thumbnailUrl` as the last field before the closing `};`:

```ts
  return {
    id:               version.audioId,
    title:            item.title,
    duration:         version.durationSecs ?? version.targetDuration * 60,
    format:           version.format,
    audioUrl:         version.audioUrl,
    author:           item.author,
    sourceType:       item.sourceType,
    sourceUrl:        item.sourceUrl,
    sourceDomain:     item.sourceDomain,   // for smartTitle
    sourceName:       item.sourceName,     // for player bar subtitle
    sourceBrandColor: item.sourceBrandColor, // for SourceIcon
    contentType:      version.contentType,
    themes:           version.themes,
    summary:          version.summary,
    targetDuration:   version.targetDuration,
    createdAt:        item.createdAt,
    thumbnailUrl:     item.thumbnailUrl,   // for lock screen artwork
  };
```

**Part C — Add `artwork` to `itemToTrack` in `native/lib/usePlayer.ts`:**

Find the `itemToTrack` function (around line 65):

```ts
function itemToTrack(item: PlayableItem) {
  return {
    id: item.id,
    url: item.audioUrl,
    title: item.title,
    artist: item.author ?? undefined,
    duration: item.duration,
  };
}
```

Replace it with:

```ts
function itemToTrack(item: PlayableItem) {
  return {
    id: item.id,
    url: item.audioUrl,
    title: item.title,
    artist: item.author ?? undefined,
    duration: item.duration,
    artwork: item.thumbnailUrl ?? undefined,
  };
}
```

**Part D — Pass `thumbnailUrl` in `handleVersionTap` in `native/components/EpisodeCard.tsx`:**

Find this block inside the `handleVersionTap` function (around line 201):

```ts
    const playable: PlayableItem = {
      id:              v.audioId,
      title:           item.title,
      duration:        v.durationSecs ?? v.targetDuration * 60,
      format:          v.format,
      audioUrl:        v.audioUrl ?? "",
      author:          item.author,
      sourceType:      item.sourceType,
      sourceUrl:       item.sourceUrl,
      sourceDomain:    item.sourceDomain,
      sourceName:      item.sourceName,
      sourceBrandColor: item.sourceBrandColor,
      contentType:     v.contentType,
      themes:          v.themes,
      summary:         v.summary,
      targetDuration:  v.targetDuration,
      createdAt:       item.createdAt,
    };
```

Add `thumbnailUrl` as the last field:

```ts
    const playable: PlayableItem = {
      id:              v.audioId,
      title:           item.title,
      duration:        v.durationSecs ?? v.targetDuration * 60,
      format:          v.format,
      audioUrl:        v.audioUrl ?? "",
      author:          item.author,
      sourceType:      item.sourceType,
      sourceUrl:       item.sourceUrl,
      sourceDomain:    item.sourceDomain,
      sourceName:      item.sourceName,
      sourceBrandColor: item.sourceBrandColor,
      contentType:     v.contentType,
      themes:          v.themes,
      summary:         v.summary,
      targetDuration:  v.targetDuration,
      createdAt:       item.createdAt,
      thumbnailUrl:    item.thumbnailUrl,
    };
```

### Step 4: Run the test to verify it passes

```bash
cd native && npx jest __tests__/libraryHelpers.test.ts --verbose
```

**Expected:** PASS — all tests green including the 2 new artwork tests.

### Step 5: Commit

```bash
git add native/lib/types.ts native/lib/usePlayer.ts native/lib/libraryHelpers.ts native/components/EpisodeCard.tsx native/__tests__/libraryHelpers.test.ts && git commit -m "fix: propagate thumbnailUrl to track player for lock screen artwork"
```

---

## Task 4: Fix Title Rendering (Raw Pipe Characters)

**Root cause:** When building a `PlayableItem`, both `libraryItemToPlayable()` and `handleVersionTap()` set `title: item.title` — the raw, unprocessed title from the API. The `smartTitle()` function (which strips publisher suffixes like `| ESPN.com`, cleans filename-style titles, and collapses whitespace) is only applied in `EpisodeCard.tsx` for display. The player bar, expanded player, and lock screen all receive the raw title with pipe characters visible.

Example: `"Sunday Letters | Sam Schillace"` → `smartTitle` would clean this to `"Sunday Letters"`, but the player shows the raw version with the `|`.

**Files:**
- Modify: `native/lib/libraryHelpers.ts` (apply `smartTitle` in `libraryItemToPlayable`)
- Modify: `native/components/EpisodeCard.tsx` (apply `smartTitle` in `handleVersionTap`)
- Modify: `native/__tests__/libraryHelpers.test.ts` (test that title is cleaned)

### Step 1: Write the failing test

Add this new describe block at the end of `native/__tests__/libraryHelpers.test.ts` (after the artwork tests added in Task 3):

```ts
// ---------------------------------------------------------------------------
// libraryItemToPlayable — title cleaning
// ---------------------------------------------------------------------------

describe("libraryItemToPlayable — title cleaning", () => {
  it("strips publisher suffix from pipe-separated titles", () => {
    const item = makeItem("c1", [makeVersion({ audioId: "a1", audioUrl: "https://cdn.example.com/a1.mp3" })], {
      title: "Sunday Letters | Sam Schillace",
      sourceType: "url",
    });
    const playable = libraryItemToPlayable(item);
    expect(playable).not.toBeNull();
    expect(playable!.title).toBe("Sunday Letters");
    expect(playable!.title).not.toContain("|");
  });

  it("cleans PDF filename-style titles", () => {
    const item = makeItem("c2", [makeVersion({ audioId: "a2", audioUrl: "https://cdn.example.com/a2.mp3" })], {
      title: "2024_Q3_strategy_report.pdf",
      sourceType: "pdf",
    });
    const playable = libraryItemToPlayable(item);
    expect(playable).not.toBeNull();
    expect(playable!.title).toBe("2024 Q3 Strategy Report");
  });

  it("passes through clean titles unchanged", () => {
    const item = makeItem("c3", [makeVersion({ audioId: "a3", audioUrl: "https://cdn.example.com/a3.mp3" })], {
      title: "How Transformers Work",
      sourceType: "url",
    });
    const playable = libraryItemToPlayable(item);
    expect(playable).not.toBeNull();
    expect(playable!.title).toBe("How Transformers Work");
  });
});
```

### Step 2: Run the test to verify it fails

```bash
cd native && npx jest __tests__/libraryHelpers.test.ts --verbose
```

**Expected:** FAIL — the first test expects `"Sunday Letters"` but gets `"Sunday Letters | Sam Schillace"` because `libraryItemToPlayable` passes the raw title.

### Step 3: Write the fix (two parts)

**Part A — Apply `smartTitle` in `libraryItemToPlayable` in `native/lib/libraryHelpers.ts`:**

Find the return object inside `libraryItemToPlayable`. Change the `title` line from:

```ts
    title:            item.title,
```

to:

```ts
    title:            smartTitle(item.title, item.sourceType, item.sourceDomain),
```

**Part B — Apply `smartTitle` in `handleVersionTap` in `native/components/EpisodeCard.tsx`:**

Find the PlayableItem construction in `handleVersionTap`. Change the `title` line from:

```ts
      title:           item.title,
```

to:

```ts
      title:           smartTitle(item.title, item.sourceType, item.sourceDomain),
```

Note: `smartTitle` is already imported in `EpisodeCard.tsx` (line 14: `import { smartTitle } from "../lib/libraryHelpers"`), so no new import is needed.

### Step 4: Run the test to verify it passes

```bash
cd native && npx jest __tests__/libraryHelpers.test.ts --verbose
```

**Expected:** PASS — all tests green including the 3 new title-cleaning tests.

### Step 5: Run the full native test suite

```bash
cd native && npx jest --verbose
```

**Expected:** All test files pass. No regressions from any of the 4 fixes.

### Step 6: Commit

```bash
git add native/lib/libraryHelpers.ts native/components/EpisodeCard.tsx native/__tests__/libraryHelpers.test.ts && git commit -m "fix: apply smartTitle to player titles to remove raw pipe characters"
```

---

## Summary of All Changes

| File | Change |
|------|--------|
| `native/lib/player.ts` | Add `PlaybackQueueEnded` handler; export `isPlaybackCompleted` helper |
| `native/lib/usePlayer.ts` | Import `isPlaybackCompleted`; add `prevPlayingRef`; add completion detection `useEffect`; add `artwork` to `itemToTrack` |
| `native/lib/types.ts` | Add `thumbnailUrl` to `PlayableItem` interface |
| `native/lib/libraryHelpers.ts` | Add `thumbnailUrl` mapping + `smartTitle` call in `libraryItemToPlayable` |
| `native/components/EpisodeCard.tsx` | Add `thumbnailUrl` + `smartTitle` call in `handleVersionTap` |
| `native/__tests__/player.test.ts` | Add `PlaybackQueueEnded` to mock; add queue-ended test; add `isPlaybackCompleted` tests |
| `native/__tests__/libraryHelpers.test.ts` | Add artwork propagation tests; add title cleaning tests |

**Commits (4 total):**
1. `fix: stop playback looping by handling PlaybackQueueEnded event`
2. `fix: mark episodes as completed when playback finishes naturally`
3. `fix: propagate thumbnailUrl to track player for lock screen artwork`
4. `fix: apply smartTitle to player titles to remove raw pipe characters`
