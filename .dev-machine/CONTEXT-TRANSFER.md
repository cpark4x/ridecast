# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** Visual pass complete. 3 UI fix specs ready. All gates green.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (non-blocking) |
| `npm run test` | ✅ PASS | **117 passing**, 7 skipped |
| `npm run build` | ✅ PASS | |
| `npm run test:e2e` | ✅ PASS | 5/5 |

### Total shipped: 13 features across 5 machine sessions

---

## Visual Pass Findings (2026-03-06)

A browser visual audit was run at http://localhost:3000. The core UI shell is solid. Three issues need fixing:

| Issue | Screen | Confirmed in code? |
|-------|--------|--------------------|
| No drag thumb on progress bar | ExpandedPlayer | ✅ Yes — `h-1` bar, no thumb element |
| No skip controls in mini-player | PlayerBar | ✅ Yes — only play/pause button |
| 370px dead space on Upload screen | UploadScreen | ✅ Yes — nothing below URL input |

---

## Fix Specs — Ready to Build

3 specs in `specs/features/phase2/fixes/`:

| Priority | Feature | Spec | Files |
|----------|---------|------|-------|
| 1 | fix-scrubber-handle | `fixes/fix-scrubber-handle.md` | ExpandedPlayer.tsx only |
| 2 | fix-mini-player-controls | `fixes/fix-mini-player-controls.md` | PlayerBar.tsx only |
| 3 | fix-upload-polish | `fixes/fix-upload-polish.md` | UploadScreen.tsx only |

### Key implementation notes

**fix-scrubber-handle:**
- Replace `h-1` progress bar with an `h-5` (20px touch target) wrapper
- Add `role="slider"` with aria-valuemin/max/now
- White circle thumb `w-3 h-3` positioned at `left: progress%` via inline style
- `group-active:scale-125` on thumb for tactile feedback
- Remove `hover:h-1.5` (desktop-only, mobile users never see it)

**fix-mini-player-controls:**
- Add `skipForward` from `usePlayer()` — already exists in PlayerContext
- Add one button: +30s skip with `e.stopPropagation()` to avoid triggering `onExpand`
- `aria-label="Skip forward 30 seconds"` for accessibility + testability
- Keep it compact — no background circle, just icon + "30s" label below

**fix-upload-polish:**
- Change drop zone copy: `"Tap to browse files"` / `"or drag and drop · PDF, EPUB, TXT up to 50MB"`
- Add `{!preview && (...)}` "Works with" grid below URL input: 2×2 grid of icon+label+desc tiles
- Content: Articles & URLs 🌐, PDFs 📄, EPUBs 📚, Text files 📝
- Tiles disappear when preview card is showing (the `!preview` condition handles this)

---

## Test Mock Patterns

```typescript
// PlayerContext mock (use for PlayerBar, ExpandedPlayer tests)
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

// useCommuteDuration mock (use for UploadScreen tests)
vi.mock("@/hooks/useCommuteDuration", () => ({
  useCommuteDuration: () => ({ commuteDuration: 15, setCommuteDuration: vi.fn() }),
}));

// Duration utils mock
vi.mock("@/lib/utils/duration", () => ({ formatDuration: (s: number) => `${s}s` }));
```

---

## Development Environment

- **DB:** PostgreSQL 16 via Docker on port 5433 (`docker compose up -d`)
- **Architecture:** `specs/architecture.md` — always read first in each session
- **Tests should NEVER make real API calls** — mock all Claude/OpenAI/ElevenLabs calls

## Commands

```bash
npm run lint && npm run test && npm run build   # standard verification
amplifier recipe execute .dev-machine/recipes/build.yaml   # run dev machine
```
