# Fix: Progress Bar Scrubber Handle

> Add a visible drag thumb to the ExpandedPlayer progress bar so it looks and feels interactive.

## Problem

The progress bar in `ExpandedPlayer.tsx` is a `h-1` (4px) line. There is no visual handle/thumb. On mobile where hover states don't exist, users cannot see that the bar is tappable or find the grab point. The visual audit called it "decorative, not interactive."

## Current Code (confirmed)

```typescript
// ExpandedPlayer.tsx — current progress bar
<div onClick={seekProgress} className="w-full h-1 bg-white/10 rounded-sm cursor-pointer relative group hover:h-1.5 transition-all">
  <div className="h-full rounded-sm relative" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
</div>
```

No thumb element. `hover:h-1.5` only works on desktop.

## Fix

Add a white circle thumb positioned at the current progress point:

```typescript
<div
  onClick={seekProgress}
  className="w-full h-5 flex items-center cursor-pointer group relative"  // h-5 = 20px touch target
  role="slider"
  aria-valuemin={0}
  aria-valuemax={duration}
  aria-valuenow={Math.floor(position)}
>
  {/* Track */}
  <div className="absolute w-full h-1 bg-white/10 rounded-full">
    {/* Fill */}
    <div
      className="absolute h-full rounded-full"
      style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
    />
    {/* Thumb */}
    <div
      className="absolute w-3 h-3 bg-white rounded-full shadow-md -translate-y-1/2 -translate-x-1/2 top-1/2 transition-transform group-active:scale-125"
      style={{ left: `${progress}%` }}
    />
  </div>
</div>
```

Key changes:
- Outer div is `h-5` (20px) for a tap target that meets the 44px minimum when combined with padding — easier to tap on mobile
- White circle `w-3 h-3` (12px) positioned at `left: progress%` via inline style
- `group-active:scale-125` on the thumb gives tactile feedback on press
- `role="slider"` with aria attributes for accessibility
- Remove `hover:h-1.5` — replaced by the thumb as the interactive affordance

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ExpandedPlayer.tsx` | Replace progress bar div with thumb-bearing version |

## Tests

**File:** `src/components/ExpandedPlayer.test.tsx` (update)

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpandedPlayer } from "./ExpandedPlayer";

vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({
    currentItem: { id: "a1", title: "Test", duration: 300, format: "narrator", audioUrl: "/a.mp3" },
    isPlaying: true,
    position: 150,
    speed: 1.0,
    togglePlay: vi.fn(),
    setSpeed: vi.fn(),
    setPosition: vi.fn(),
    skipForward: vi.fn(),
    skipBack: vi.fn(),
  }),
}));

vi.mock("@/lib/utils/duration", () => ({ formatDuration: (s: number) => `${s}s` }));

describe("ExpandedPlayer scrubber", () => {
  it("renders a slider with correct aria-valuenow", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "150");
    expect(slider).toHaveAttribute("aria-valuemax", "300");
  });

  it("renders a scrubber thumb element", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    // Thumb is a white rounded circle inside the slider
    const thumb = container.querySelector("[class*='rounded-full'][class*='bg-white'][class*='absolute']");
    expect(thumb).not.toBeNull();
  });
});
```

## Success Criteria

```bash
npm run test    # scrubber tests pass; no regressions
npm run build   # no type errors
```

Manual:
- [ ] Progress bar shows a white circle dot at the current playback position
- [ ] Tapping anywhere on the progress area seeks to that position
- [ ] Thumb moves as audio plays
- [ ] Tapping the thumb area is easy with one thumb on a phone

## Scope

`ExpandedPlayer.tsx` only. No changes to PlayerContext, PlayerBar, or any API.
