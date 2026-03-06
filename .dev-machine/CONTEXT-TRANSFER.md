# Context Transfer — ridecast2 Dev Machine

**Date:** 2026-03-06
**Project:** ridecast2
**Status:** Phase 2 COMPLETE (13 features total, all specs shipped). All gates green.

---

## Current State

### Health Gates

| Gate | Status | Notes |
|------|--------|-------|
| `npm run lint` | ✅ PASS | 11 warnings (non-blocking) |
| `npm run test` | ✅ PASS | **117 passing**, 7 skipped (DB-dependent) |
| `npm run build` | ✅ PASS | |
| `npm run test:e2e` | ✅ PASS | 5/5 (last verified session 3) |

### Shipped So Far (13 features, 5 machine sessions)

**Phase 1 (session 1+2):** Duration accuracy · Pipeline resilience · ProcessingScreen 4-stage UI · Playback state persistence · Audio duration measurement

**Phase 2 batch 1 (session 3):** ElevenLabs provider + routing · Episode versioning · Commute duration preference

**Phase 2 batch 2 (session 4):** Smart resume · Undo seek · Queue-first home screen

**Phase 2 batch 3 (session 5):** ElevenLabs key settings

---

## Session 5 Summary — 2026-03-06

**Completed:**
- `elevenlabs-key-settings` (commit `75dfd64`) — Full BYOK settings flow: `SettingsScreen.tsx` (new) with password input for ElevenLabs key stored in localStorage, `useElevenLabsKey()` hook, gear icon button in AppShell header, SettingsScreen overlay, ProcessingScreen sends `x-elevenlabs-key` header on generate calls. `createTTSProvider(key?)` accepts optional key param; `ElevenLabsTTSProvider(apiKey?)` constructor updated. Route reads `request.headers.get("x-elevenlabs-key")` and passes to provider. Tests: 7 new tests (SettingsScreen saves/removes key, Cancel calls onClose, Settings heading visible, useElevenLabsKey hook returns null/stored, route forwards header to createTTSProvider). Route test restructured to mock `@/lib/tts/provider` directly instead of `@/lib/tts/openai`.

**Key design decisions:**
- Used lazy `useState(() => readStoredKey())` initializer instead of `useEffect` + `setState` to avoid `react-hooks/set-state-in-effect` lint error (same pattern applied to HomeScreen in session 4).
- Route test refactored: replaced `@/lib/tts/openai` mock with `@/lib/tts/provider` mock so `createTTSProvider` is a `vi.fn()` that can be inspected for call args. `beforeEach` restores default mock return after `vi.clearAllMocks()`.
- ProcessingScreen: both initial run and retry paths send the key header.

**Health gates:** lint ✅ (0 errors, 11 warnings — 1 new `react-hooks/exhaustive-deps` warning on ProcessingScreen line 139, non-blocking) · test ✅ (117 passing, +7 new) · build ✅

**Next session should start with:** Phase 2 is fully complete. Next step is to define Phase 3 specs or ship what's been built. See `ROADMAP.md` and `VISION.md` for iOS strategy.

---

## Product Direction

**Vision:** "Turn anything you want to read into audio worth listening to."

**Platform:** iOS app — free catalog + paid own-content tier. BYOK for advanced users.

Full context: `VISION.md`, `ROADMAP.md`

---

## Phase 2 — COMPLETE

All 13 features shipped across 5 sessions. No remaining `ready` features in STATE.yaml.

### What's Built

| Feature | Commit | Session |
|---------|--------|---------|
| duration-accuracy | — | s1 |
| pipeline-error-resilience | — | s1 |
| processing-screen-upgrade | — | s2 |
| playback-state-persistence | — | s2 |
| audio-duration-measurement | — | s2 |
| elevenlabs-provider | — | s3 |
| elevenlabs-routing | — | s3 |
| episode-versioning | — | s3 |
| commute-duration | — | s3 |
| smart-resume | `5efca83` | s4 |
| undo-seek | `9d4598d` | s4 |
| home-screen-queue-first | `590644a` | s4 |
| elevenlabs-key-settings | `75dfd64` | s5 |

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

// TTS provider factory mock (for route tests)
vi.mock('@/lib/tts/provider', () => ({
  createTTSProvider: vi.fn().mockReturnValue({ generateSpeech: mockGenerateSpeech }),
}));
// In beforeEach — restore after vi.clearAllMocks():
vi.mocked(createTTSProvider).mockReturnValue({ generateSpeech: mockGenerateSpeech });
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
