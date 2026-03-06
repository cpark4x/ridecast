# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** Phase 2 batch 1 complete (9 features total). 4 Phase 2 refinement specs ready. All gates green.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 10 warnings (non-blocking) |
| `npm run test` | ✅ PASS | **95 passing**, 7 skipped (DB-dependent) |
| `npm run build` | ✅ PASS | |
| `npm run test:e2e` | ✅ PASS | 5/5 |

### Shipped So Far (9 features, 3 machine sessions)

**Phase 1 (session 1+2):** Duration accuracy · Pipeline resilience · ProcessingScreen 4-stage UI · Playback state persistence · Audio duration measurement

**Phase 2 batch 1 (session 3):** ElevenLabs provider + routing · Episode versioning · Commute duration preference

---

## Product Direction

**Vision:** "Turn anything you want to read into audio worth listening to."

**Platform:** iOS app — free catalog + paid own-content tier. BYOK for advanced users.

Full context: `VISION.md`, `ROADMAP.md`

---

## Phase 2 Refinement Specs — Ready to Build

4 specs in `specs/features/phase2/`. Build in this order (respect depends_on):

| Priority | Feature | Spec | Effort | Depends on |
|----------|---------|------|--------|------------|
| 1 | smart-resume | `smart-resume.md` | Small | — |
| 2 | undo-seek | `undo-seek.md` | Small | — |
| 3 | home-screen-queue-first | `home-screen-queue-first.md` | Medium | commute-duration (already built) |
| 4 | elevenlabs-key-settings | `elevenlabs-key-settings.md` | Medium | elevenlabs-provider + routing (already built) |

### Key context for each spec

**smart-resume:** Add `pausedAtRef = useRef<number | null>(null)` to PlayerContext. In `togglePlay`, record `Date.now()` on pause; on resume, rewind 3s if paused > 10s. Export `SMART_RESUME_REWIND_SECS = 3` and `SMART_RESUME_THRESHOLD_MS = 10_000` as module constants for tests. Only file: `src/components/PlayerContext.tsx`.

**undo-seek:** Add `undoPosition` state + `undoTimerRef` to ExpandedPlayer. In `seekProgress`, save current `position` to `undoPosition` before seeking, start 4s auto-dismiss timer. Show "↩ Go Back" button below progress bar while `undoPosition !== null`. Only file: `src/components/ExpandedPlayer.tsx`.

**home-screen-queue-first:** New `HomeScreen.tsx` that fetches `/api/library`, flattens ready versions into a queue, shows commute math using `useCommuteDuration()`. AppShell default tab changes from `"upload"` → `"home"`. Add Home tab to BottomNav. Files: HomeScreen.tsx (new), AppShell.tsx, BottomNav.tsx.

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
