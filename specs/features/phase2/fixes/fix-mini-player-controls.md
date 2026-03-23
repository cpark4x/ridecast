# Fix: Mini-Player Skip Controls

> Add a skip-forward 30s button to the PlayerBar so commuters can skip without expanding the full player.

## Problem

The PlayerBar (`src/components/PlayerBar.tsx`) shows only a play/pause button. Every 4.8★ audio app includes at minimum a forward skip in the mini-player. Spotify, Overcast, Pocket Casts all have it. Without it, users must expand the full player just to skip an intro or ad — a two-tap action that should be one.

## Current Code (confirmed)

```typescript
// PlayerBar.tsx — current controls
<button
  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
  className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shrink-0 ..."
>
  {isPlaying ? <PauseIcon /> : <PlayIcon />}
</button>
```

Only one button. No skip controls.

## Fix

Add a +30s skip-forward button to the right of play/pause. Keep the bar compact — use a smaller icon without a background circle:

```typescript
// Import skipForward from usePlayer — already available
const { currentItem, isPlaying, position, togglePlay, skipForward } = usePlayer();

// Add after the play/pause button:
<button
  onClick={(e) => { e.stopPropagation(); skipForward(30); }}
  aria-label="Skip forward 30 seconds"
  className="w-[34px] h-[34px] flex flex-col items-center justify-center shrink-0 transition-all active:scale-[0.88] relative"
>
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/70">
    <path d="M11.5 15.5V8.5L17 12l-5.5 3.5z"/>
    <rect x="18" y="7" width="2" height="10" rx="0.5"/>
  </svg>
  <span className="absolute -bottom-3 text-[8px] font-semibold text-white/30">30s</span>
</button>
```

The label `30s` below the icon matches the pattern used in ExpandedPlayer.

## Files to Modify

| File | Change |
|---|---|
| `src/components/PlayerBar.tsx` | Add `skipForward` from `usePlayer()`, render +30s skip button after play/pause |

## Tests

**File:** `src/components/PlayerBar.test.tsx` (update or create)

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerBar } from "./PlayerBar";

const mockSkipForward = vi.fn();

vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({
    currentItem: { id: "a1", title: "Episode 1", duration: 300, format: "narrator", audioUrl: "/a.mp3" },
    isPlaying: true,
    position: 60,
    togglePlay: vi.fn(),
    skipForward: mockSkipForward,
  }),
}));

vi.mock("@/lib/utils/duration", () => ({ formatDuration: (s: number) => `${s}s` }));

describe("PlayerBar", () => {
  it("renders a skip-forward button", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    expect(screen.getByRole("button", { name: /skip forward/i })).toBeInTheDocument();
  });

  it("calls skipForward(30) when skip button is clicked", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /skip forward/i }));
    expect(mockSkipForward).toHaveBeenCalledWith(30);
  });

  it("skip button click does not trigger onExpand", () => {
    const onExpand = vi.fn();
    render(<PlayerBar onExpand={onExpand} />);
    fireEvent.click(screen.getByRole("button", { name: /skip forward/i }));
    expect(onExpand).not.toHaveBeenCalled();
  });
});
```

## Success Criteria

```bash
npm run test    # PlayerBar tests pass; no regressions
npm run build   # no type errors
```

Manual:
- [ ] Mini-player shows play/pause AND a skip-forward icon with "30s" label
- [ ] Tapping skip-forward jumps 30 seconds without expanding the player
- [ ] Tapping anywhere else on the bar still expands the player

## Scope

`PlayerBar.tsx` only. One additional import (`skipForward` from `usePlayer`). No API changes, no schema changes.
