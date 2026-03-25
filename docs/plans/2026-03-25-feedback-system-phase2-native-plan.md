# In-App Feedback System — Phase 2: Native App UI

**Status:** 🟡 Tasks 1–7 complete — UI wiring remaining (Tasks 8–11)  
**Depends on:** Phase 1 backend (complete)

## Overview

Adds feedback submission (text + voice) and silent telemetry capture to the Ridecast iOS app, wiring into the Phase 1 backend routes (`POST /api/feedback`, `POST /api/telemetry`).

**Architecture:** API functions in `api.ts` call the backend. A `TelemetryProvider` context holds an in-memory event queue, batches every 60s, and flushes on app-background. A `FeedbackSheet` bottom sheet provides "Type" (text) and "Talk" (voice) tabs, opened from Settings and via a global ref. The sheet auto-detects screen context via `usePathname()` and current episode from `PlayerProvider`.

**Tech stack:** React Native 0.83, Expo SDK 55, expo-av (installed), @gorhom/bottom-sheet v5 (first usage in project), Jest + jest-expo

---

## Completed Work (Tasks 1–7)

### Types — `native/lib/types.ts`

Three types appended to the file:
- `FeedbackResponse` — `{ id: string, summary: string, category: string }`
- `TelemetryEventPayload` — `{ eventType: "api_error" | "playback_failure" | "processing_timeout" | "upload_failure", metadata: Record<string, unknown> }`
- `TelemetryResponse` — `{ id: string }`

### API Functions — `native/lib/api.ts`

Three functions appended after `deleteEpisode`:
- `submitTextFeedback({ text, screenContext, episodeId? })` — POST JSON to `/api/feedback`
- `submitVoiceFeedback({ fileUri, screenContext, episodeId? })` — POST FormData to `/api/feedback` (no Content-Type header; React Native sets multipart boundary automatically)
- `sendTelemetryBatch(events[])` — one POST per event to `/api/telemetry` via `Promise.allSettled`; no-ops on empty array

Tests: `native/__tests__/feedbackApi.test.ts` (6 test cases)

### Telemetry Hook — `native/lib/useTelemetry.ts`

Exports `TelemetryProvider` and `useTelemetry` hook.

- Queue stored in `useRef` (no re-renders on enqueue)
- `trackEvent(eventType, metadata)` — pushes to queue
- `flush()` — sends queue via `sendTelemetryBatch`, clears it; on failure, re-queues events
- Batch timer: `setInterval(flush, 60_000)` — auto-flushes every 60s
- App-background flush: `AppState.addEventListener("change", ...)` — flushes when state goes to "background"
- Throws if `useTelemetry()` is called outside `TelemetryProvider`

Tests: `native/__tests__/useTelemetry.test.ts` (6 test cases)

### Task 6 — Wire TelemetryProvider into `native/app/_layout.tsx` — ✅ Done

Commits: `25da4c5`, `e078e96`

TelemetryProvider wraps AppShell in RootLayout. Nesting order:
```
ErrorBoundary > GestureHandlerRootView > ClerkProvider > ClerkLoaded
  > AuthGate > PlayerProvider > TelemetryProvider > AppShell > Stack
```

### Task 7 — Create `native/components/FeedbackSheet.tsx` — ⚠️ Done (needs human review)

Commits: `a6396af`, `fcd03e1`, `9115453`, `52bef8f`

> **⚠️ SPEC REVIEW WARNING:** Spec review loop exhausted after 3 iterations without formal approval. The last review (iteration 3) flagged one issue: removal of `jest.transformIgnorePatterns` from `native/package.json`. That issue was fixed in commit `52bef8f` (restoring the config to pre-task baseline), but the fix occurred after the review loop had already exhausted. Post-loop verification confirms: `transformIgnorePatterns` is restored, `npx tsc --noEmit` passes, and all 339 tests pass. The only net change to `package.json` is the required `expo-av` dependency addition. **Human reviewer should verify this task is acceptable before proceeding.**

Implementation summary:
- 510-line component at `native/components/FeedbackSheet.tsx`
- Exports `FeedbackSheetRef` interface with `open(): void` and default `forwardRef` export
- Uses `@gorhom/bottom-sheet` (`BottomSheetModal`, `BottomSheetView`, `BottomSheetBackdrop`)
- Two tabs: Type (multiline TextInput + submit) and Talk (voice recording with mic/stop/preview/submit)
- State machine: `idle` → `recording` → `preview` → `submitting` → `done`
- Auto-detects screen context via `usePathname()` and episode via `usePlayer()`
- Added `expo-av` dependency to `native/package.json`

---

### Task 8 — Settings integration — `native/app/settings.tsx`

Add a "Support" section with a "Send Feedback" row, placed between the Storage and About sections.

- Import `FeedbackSheet` and `FeedbackSheetRef` from `"../components/FeedbackSheet"`
- Add `const feedbackRef = useRef<FeedbackSheetRef>(null)` inside `SettingsScreen`
- Add `SettingsRow`: label "Send Feedback", subtitle "Report a bug or share an idea", `onPress` calls `feedbackRef.current?.open()`
- Mount `<FeedbackSheet ref={feedbackRef} />` at the bottom of the return (before closing `SafeAreaView`)

Verify: `cd native && npx tsc --noEmit --pretty`

---

### Task 9 — Create `native/lib/useFeedbackSheet.ts`

Lightweight context so non-Settings surfaces (e.g., a future shake gesture) can open the sheet without prop-drilling.

```typescript
interface FeedbackSheetContextType {
  openFeedbackSheet: () => void;
}

export const FeedbackSheetContext = createContext<FeedbackSheetContextType | null>(null);

export function useFeedbackSheet() {
  const ctx = useContext(FeedbackSheetContext);
  if (!ctx) throw new Error("useFeedbackSheet must be used within FeedbackSheetContext.Provider");
  return ctx;
}
```

---

### Task 10 — Wire FeedbackSheet globally via AppShell — `native/app/_layout.tsx`

Inside the `AppShell` function:

1. Add `const feedbackRef = useRef<FeedbackSheetRef>(null)`
2. Add `const feedbackCtx = useMemo(() => ({ openFeedbackSheet: () => feedbackRef.current?.open() }), [])`
3. Wrap the AppShell return with `<FeedbackSheetContext.Provider value={feedbackCtx}>`
4. Mount `<FeedbackSheet ref={feedbackRef} />` inside the root `View`, after `ExpandedPlayer`

Import additions needed: `useRef`, `useMemo` (add to existing React import), `FeedbackSheet`, `FeedbackSheetRef`, `FeedbackSheetContext`.

Verify: `cd native && npx tsc --noEmit --pretty`

---

### Task 11 — Verification

Run full native test suite:
```bash
cd native && node --experimental-vm-modules node_modules/.bin/jest 2>&1 | tail -20
```

Expected: all tests pass, including `feedbackApi.test.ts` (6) and `useTelemetry.test.ts` (6).

If `FeedbackSheet` imports cause failures in other test files (due to `expo-av` or `@gorhom/bottom-sheet`), add `jest.mock()` stubs for those modules in the affected test files.

Check TypeScript:
```bash
cd native && npx tsc --noEmit --pretty 2>&1 | tail -10
```

---

## File Reference

| File | Status | Description |
|------|--------|-------------|
| `native/lib/types.ts` | ✅ Done | FeedbackResponse, TelemetryEventPayload, TelemetryResponse |
| `native/lib/api.ts` | ✅ Done | submitTextFeedback, submitVoiceFeedback, sendTelemetryBatch |
| `native/__tests__/feedbackApi.test.ts` | ✅ Done | API function tests (6) |
| `native/lib/useTelemetry.ts` | ✅ Done | TelemetryProvider + useTelemetry hook |
| `native/__tests__/useTelemetry.test.ts` | ✅ Done | Telemetry hook tests (6) |
| `native/app/_layout.tsx` | ✅/⏳ | TelemetryProvider wired (Task 6); global FeedbackSheet remaining (Task 10) |
| `native/components/FeedbackSheet.tsx` | ⚠️ Done | Bottom sheet with Type + Talk tabs (spec review loop exhausted — human verify) |
| `native/app/settings.tsx` | ⏳ Remaining | Add Support section with Send Feedback row |
| `native/lib/useFeedbackSheet.ts` | ⏳ Remaining | Global context for FeedbackSheet access |

---

## Deferred

- Shake gesture to open FeedbackSheet (needs `expo-sensors`)
- Daily telemetry cron job
- Voice waveform visualization
