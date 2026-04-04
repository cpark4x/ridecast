# Pipeline Resilience Design

## Goal

Make the 3-step content processing pipeline (upload → process → audio/generate) resilient to dropped connections on mobile. When the client disconnects mid-processing, the server continues, updates DB state, and the ProcessingScreen auto-recovers by polling — no user action required.

## Background

The current ProcessingScreen awaits each HTTP response sequentially. On mobile, dropped connections during long-running steps (Claude scripting, TTS generation) leave the user stranded with no recovery path. The server may have completed work, but the client has no way to know. Users must manually retry from scratch, wasting time and API credits.

## Approach

Idempotent steps + status polling. No new tables, no new protocols. Leverages the existing Content → Script → Audio chain as an implicit state machine by making it explicit. Each pipeline step checks for already-completed work before doing anything, and a single `pipelineStatus` field on Content drives both server-side transitions and client-side UI.

## Architecture

```
Client (ProcessingScreen)          Server (API Routes)           Database
─────────────────────────          ───────────────────           ────────
fire POST /api/process ──────────► set status='scripting'  ────► Content
start polling /api/library         check: Script exists?          │
        │                          no → call Claude → create      │
        │                          set status='generating' ──────►│
        │◄──── poll sees           │                              │
        │      'generating'        │                              │
fire POST /api/audio/generate ───► check: Audio exists?           │
        │                          no → TTS → Azure → create      │
        │                          set status='ready' ───────────►│
        │◄──── poll sees 'ready'   │                              │
navigate to player                 │                              │
```

If the client disconnects at any point, the server finishes its current step and updates the DB. When the client reconnects or the ProcessingScreen remounts, polling picks up the current state and resumes from where it left off.

## Components

### Data Model

One new field on the Content model. No new tables.

```prisma
model Content {
  // ... existing fields ...
  pipelineStatus  String   @default("idle")
  pipelineError   String?
}
```

`pipelineStatus` values:

| Status       | Meaning                                       |
|--------------|-----------------------------------------------|
| `idle`       | Not yet started                               |
| `scripting`  | `/api/process` is running (Claude)            |
| `generating` | `/api/audio/generate` is running (TTS)        |
| `ready`      | Has Audio record, playable                    |
| `error`      | A step failed; `pipelineError` has the message |

One migration required. No backfill needed — existing records default to `idle`. Content already with Audio can be reconciled on next library fetch.

### API: `/api/process`

1. **START:** Set `Content.pipelineStatus = 'scripting'`
2. **CHECK:** If Script already exists for this `contentId` → return it immediately (idempotent)
3. **WORK:** Call Claude → create Script record
4. **END:** Set `Content.pipelineStatus = 'generating'`
5. **ERROR:** Set `Content.pipelineStatus = 'error'`, `Content.pipelineError = message`

### API: `/api/audio/generate`

1. **CHECK:** If Audio already exists for this `scriptId` → return it immediately (idempotent)
2. **WORK:** TTS cascade → Azure upload → create Audio record
3. **END:** Set `Content.pipelineStatus = 'ready'`
4. **ERROR:** Set `Content.pipelineStatus = 'error'`, `Content.pipelineError = message`

### API: `/api/library`

Already returns Content + Script + Audio. Add `pipelineStatus` and `pipelineError` to each item in the response. No structural change — two new fields.

### API: `POST /api/content/[id]/reset` (new route)

- Resets `pipelineStatus` to `'idle'` and clears `pipelineError`
- Used by the "Try Again" button in ProcessingScreen
- Does NOT delete Script or Audio records — resume picks up from last completed step

### Client: ProcessingScreen

Current pattern: await HTTP response from each step sequentially.
New pattern: fire the HTTP call, immediately start polling, let DB state drive UI transitions.

```
OLD: call /api/process → await → call /api/audio/generate → await → navigate to player

NEW: call /api/process (don't await) → start polling /api/library every 3s
     poll sees 'generating' → call /api/audio/generate (don't await)
     poll sees 'ready' → navigate to player
     poll sees 'error' → show pipelineError + retry button
```

Visual state mapping:

| `pipelineStatus` | UI                                      |
|-------------------|-----------------------------------------|
| `scripting`       | "Step 2 of 3 · Writing script..."       |
| `generating`      | "Step 3 of 3 · Generating audio..."     |
| `ready`           | Navigate to player                      |
| `error`           | Show error message + "Try Again" button |

**Optimistic local state:** Set local state to `'scripting'` immediately when firing `/api/process` to avoid race condition where first poll sees `'idle'` before server sets status. Polling only overrides if it sees a *different* status from the DB.

**Polling intervals:** 3s during the scripting step. Back off to 5s after 30s during the generating step (TTS can take 2–5 min).

## Data Flow

1. User taps "Process" → client fires `POST /api/process` (fire-and-forget) and sets local state to `scripting`
2. Client starts polling `GET /api/library` every 3s
3. Server receives `/api/process` → sets `pipelineStatus='scripting'` → checks for existing Script → calls Claude → creates Script → sets `pipelineStatus='generating'`
4. Client poll detects `generating` → fires `POST /api/audio/generate` (fire-and-forget)
5. Server receives `/api/audio/generate` → checks for existing Audio → runs TTS cascade → uploads to Azure → creates Audio → sets `pipelineStatus='ready'`
6. Client poll detects `ready` → navigates to player

**Disconnect recovery:** If the client drops at any point, the server completes its current step. When ProcessingScreen remounts, it reads `pipelineStatus` from the first poll and resumes from the correct step — no duplicate work due to idempotency checks.

## Error Handling

1. Server sets `pipelineStatus='error'` + `pipelineError=message`
2. ProcessingScreen poll detects error state
3. Shows error message + "Try Again" button
4. "Try Again" calls `POST /api/content/[id]/reset` → resets `pipelineStatus` to `'idle'`
5. Pipeline re-triggers from the failed step (Script/Audio records from completed steps are preserved — no reprocessing from scratch)

## Testing Strategy

### 1. Idempotency Unit Tests

Call `/api/process` twice for the same `contentId`. Second call must return existing Script without calling Claude. Same pattern for `/api/audio/generate` — second call returns existing Audio without invoking TTS.

### 2. Recovery Integration Test

Set `pipelineStatus='scripting'` directly in DB (simulating dropped connection mid-process), call `/api/process` again, verify it completes cleanly and transitions to `'generating'`.

### 3. Poll-Driven Flow E2E

ProcessingScreen fires the pipeline, connection interrupted after `/api/process` fires, verify screen auto-recovers and navigates to player when `'ready'` is polled.

## Open Questions

None — design validated and ready for implementation.
