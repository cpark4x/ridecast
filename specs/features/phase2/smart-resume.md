# Feature: Smart Resume

> Auto-rewind 3 seconds when resuming playback after a pause longer than 10 seconds, so listeners never miss words after an interruption.

## Motivation

Every commute has 4–8 interruptions — traffic stops, announcements, phone calls. When playback resumes after a pause, the listener has lost their place. Overcast's Smart Resume is cited as the most-praised feature in the category. Users save real listening time because they don't have to manually seek back. This is a reliability contract, not a nice-to-have.

## Current State (confirmed in code)

`PlayerContext.tsx` — `togglePlay`:
```typescript
const togglePlay = useCallback(() => {
  setIsPlaying((prev) => {
    const next = !prev;
    const audio = audioRef.current;
    if (audio) {
      if (next) audio.play().catch(console.error);  // ← resume here — no rewind
      else audio.pause();
    }
    return next;
  });
}, []);
```

No pause-time tracking exists. Resume always plays from exact pause position.

## Changes

### 1. Track pause timestamp (`src/components/PlayerContext.tsx`)

Add a ref to record when audio was paused:

```typescript
const pausedAtRef = useRef<number | null>(null);
```

Update `togglePlay` to:
1. Record `Date.now()` when pausing
2. On resume: if paused for > 10 seconds, rewind 3 seconds before playing

```typescript
const SMART_RESUME_REWIND_SECS = 3;
const SMART_RESUME_THRESHOLD_MS = 10_000; // 10 seconds

const togglePlay = useCallback(() => {
  setIsPlaying((prev) => {
    const next = !prev;
    const audio = audioRef.current;
    if (audio) {
      if (next) {
        // Smart Resume: rewind if paused for > 10s
        if (
          pausedAtRef.current !== null &&
          Date.now() - pausedAtRef.current > SMART_RESUME_THRESHOLD_MS
        ) {
          audio.currentTime = Math.max(0, audio.currentTime - SMART_RESUME_REWIND_SECS);
        }
        pausedAtRef.current = null;
        audio.play().catch(console.error);
      } else {
        pausedAtRef.current = Date.now();
        audio.pause();
      }
    }
    return next;
  });
}, []);
```

### 2. Export constants for testability

Add as module-level constants (not inside the component) so tests can reference them:

```typescript
export const SMART_RESUME_REWIND_SECS = 3;
export const SMART_RESUME_THRESHOLD_MS = 10_000;
```

## Files to Modify

| File | Change |
|---|---|
| `src/components/PlayerContext.tsx` | Add `pausedAtRef`, update `togglePlay` with rewind logic, export constants |

## Tests

**File:** `src/components/PlayerContext.test.tsx` (update existing or create)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { PlayerProvider, usePlayer, SMART_RESUME_THRESHOLD_MS, SMART_RESUME_REWIND_SECS } from "./PlayerContext";

// Mock HTMLAudioElement
const mockAudio = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  currentTime: 60,  // start at 60 seconds
  playbackRate: 1,
  src: "",
  preload: "",
  duration: 300,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAudio.currentTime = 60;
  // Provide the mock audio element via ref
  vi.spyOn(global, "HTMLAudioElement").mockImplementation(() => mockAudio as unknown as HTMLAudioElement);
});

describe("Smart Resume", () => {
  it("does NOT rewind when pause was short (< threshold)", async () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: PlayerProvider });

    // Pause
    act(() => result.current.togglePlay());
    // Resume immediately (< 10s)
    act(() => result.current.togglePlay());

    expect(mockAudio.currentTime).toBe(60); // no rewind
    expect(mockAudio.play).toHaveBeenCalled();
  });

  it("rewinds 3 seconds when pause was long (> threshold)", async () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: PlayerProvider });
    const now = Date.now();
    const dateSpy = vi.spyOn(Date, "now");

    // Pause at t=0
    dateSpy.mockReturnValue(now);
    act(() => result.current.togglePlay());

    // Resume at t=THRESHOLD+1s
    dateSpy.mockReturnValue(now + SMART_RESUME_THRESHOLD_MS + 1000);
    act(() => result.current.togglePlay());

    expect(mockAudio.currentTime).toBe(60 - SMART_RESUME_REWIND_SECS); // rewound
    expect(mockAudio.play).toHaveBeenCalled();

    dateSpy.mockRestore();
  });

  it("does not rewind below 0", async () => {
    const { result } = renderHook(() => usePlayer(), { wrapper: PlayerProvider });
    mockAudio.currentTime = 1; // only 1 second in
    const now = Date.now();
    const dateSpy = vi.spyOn(Date, "now");

    dateSpy.mockReturnValue(now);
    act(() => result.current.togglePlay());
    dateSpy.mockReturnValue(now + SMART_RESUME_THRESHOLD_MS + 1000);
    act(() => result.current.togglePlay());

    expect(mockAudio.currentTime).toBe(0); // clamped to 0
    dateSpy.mockRestore();
  });
});
```

## Success Criteria

```bash
npm run test    # Smart Resume tests pass; existing PlayerContext tests unaffected
npm run build   # no type errors
```

Manual verification:
- [ ] Pause audio for < 10 seconds → resume → plays from exact pause position
- [ ] Pause audio for > 10 seconds → resume → plays from 3 seconds before pause position
- [ ] Pause at < 3 seconds into track → resume after 10s → plays from 0:00, not negative

## Scope

`PlayerContext.tsx` only. No UI changes. No API changes. The rewind is silent — no toast or indicator. Users experience it as "the audio always picks up right where I need it."
