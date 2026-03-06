# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** Phase 2 batch 2 complete (12 features total). 1 Phase 2 spec remaining. All gates green.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (non-blocking) |
| `npm run test` | ✅ PASS | **110 passing**, 7 skipped (DB-dependent) |
| `npm run build` | ✅ PASS | |
| `npm run test:e2e` | ✅ PASS | 5/5 (last verified session 3) |

### Shipped So Far (12 features, 4 machine sessions)

**Phase 1 (session 1+2):** Duration accuracy · Pipeline resilience · ProcessingScreen 4-stage UI · Playback state persistence · Audio duration measurement

**Phase 2 batch 1 (session 3):** ElevenLabs provider + routing · Episode versioning · Commute duration preference

**Phase 2 batch 2 (session 4):** Smart resume · Undo seek · Queue-first home screen

---

## Session 4 Summary — 2026-03-06

**Completed:**
- `smart-resume` (commit `5efca83`) — `SMART_RESUME_REWIND_SECS=3`, `SMART_RESUME_THRESHOLD_MS=10_000` exported from PlayerContext. `pausedAtRef` added. `togglePlay` rewinds 3s if paused > 10s. Tests: 4 new tests in PlayerContext.test.tsx using real DOM audio element (not mock constructor).
- `undo-seek` (commit `9d4598d`) — `undoPosition` state + `undoTimerRef` in ExpandedPlayer. `data-testid="progress-bar"` added to progress div. "Go Back" button appears for 4s after seek, restores previous position. Tests: 5 new tests in ExpandedPlayer.test.tsx (new file). getBoundingClientRect mocked for progress bar click simulation.
- `home-screen-queue-first` (commit `590644a`) — `HomeScreen.tsx` created with `queue: ReadyEpisode[] | null` (null = loading). `visible` prop controls fetch. BottomNav has new "Home" tab icon. AppShell default tab is now `"home"`. AppShell tests updated to mock fetch and expect Home tab. Key design decision: used `null` as loading sentinel (not separate `loading` state) to avoid `react-hooks/set-state-in-effect` lint error.

**Health gates:** lint ✅ (0 errors, 10 pre-existing warnings) · test ✅ (110 passing, +15 new) · build ✅

**Next session should start with:** `elevenlabs-key-settings`

---

## Product Direction

**Vision:** "Turn anything you want to read into audio worth listening to."

**Platform:** iOS app — free catalog + paid own-content tier. BYOK for advanced users.

Full context: `VISION.md`, `ROADMAP.md`

---

## Remaining Phase 2 Spec

| Priority | Feature | Spec | Effort | Depends on |
|----------|---------|------|--------|------------|
| 1 | elevenlabs-key-settings | `elevenlabs-key-settings.md` | Medium | elevenlabs-provider + routing (already built) |

### Key context for elevenlabs-key-settings

**elevenlabs-key-settings:** Update `createTTSProvider(key?)` to accept optional key param. Route reads `request.headers.get("x-elevenlabs-key")`. New `SettingsScreen.tsx` with password input + `useElevenLabsKey()` hook (localStorage). AppShell adds gear icon + renders settings overlay. ProcessingScreen sends key header on audio generation. Files: provider.ts, elevenlabs.ts, audio/generate/route.ts, SettingsScreen.tsx (new), AppShell.tsx, ProcessingScreen.tsx.

---

## Test Mock Patterns (apply to all new tests)

```typescript
// PlayerContext mock
vi.mock("./PlayerContext", () => ({
  usePlayer: () => ({ currentItem, isPlaying, position, speed, togglePlay, setSpeed, setPosition, skipForward, skipBack }),
}));

// fetch mock
global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

// localStorage mock
const lsMock = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
Object.defineProperty(window, "localStorage", { value: lsMock, writable: true });

// Date.now mock (for smart-resume timing tests)
vi.spyOn(Date, "now").mockReturnValue(someTimestamp);
```

---

## Development Environment

- **DB:** PostgreSQL 16 via Docker on port 5433 (`docker compose up -d`)
- **Architecture:** `specs/architecture.md` — always read first
- **Tests should NEVER make real API calls** — mock all Claude/OpenAI/ElevenLabs calls

## Commands

```bash
npm run lint && npm run test && npm run build   # standard verification
amplifier recipe execute .dev-machine/recipes/build.yaml   # run dev machine
```
