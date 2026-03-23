# Feature: ProcessingScreen UI Upgrade

> Replace the loading spinner with a 4-stage designed experience that builds user confidence in the AI during the one moment it has their full attention.

## Motivation

The ProcessingScreen is Ridecast2's most valuable UI moment — and it's currently a spinner. No competitor has a user-triggered AI generation pipeline. Every other audio app plays back pre-existing content. This screen is a first-class product differentiator, not a loading state.

The 4 stages map directly to the two existing API calls:

| Stage | Trigger | Copy |
|---|---|---|
| **Analyzing** | Immediately on "Create Audio" click | "Reading your content — extracting key ideas and structure" |
| **Scripting** | 3 seconds into /api/process | "Writing your episode — shaping ideas into narrative" |
| **Generating** | /api/process completes → /api/audio/generate starts | "Generating audio — your episode is being recorded" |
| **Ready** | /api/audio/generate completes | Episode card + "Play Now" + "Add to Queue" |

## Current State

`src/components/ProcessingScreen.tsx` calls `/api/process` then `/api/audio/generate` sequentially. It renders a loading state during both calls and shows an error or the completed episode on completion. No stage awareness exists.

## Changes

### 1. Stage state machine (`src/components/ProcessingScreen.tsx`)

Add a `stage` state with 4 values:

```typescript
type Stage = 'analyzing' | 'scripting' | 'generating' | 'ready';
const [stage, setStage] = useState<Stage>('analyzing');
```

Stage transitions:
- `analyzing` → immediately on mount / when processing starts
- `scripting` → after a 3-second timer from mount (while /api/process is running)
- `generating` → when /api/process resolves successfully (before /api/audio/generate is called)
- `ready` → when /api/audio/generate resolves successfully

```typescript
useEffect(() => {
  // Advance from analyzing → scripting after 3s
  const timer = setTimeout(() => {
    setStage(prev => prev === 'analyzing' ? 'scripting' : prev);
  }, 3000);
  return () => clearTimeout(timer);
}, []);

// In the process flow:
const processResponse = await fetch('/api/process', ...);
// ...
setStage('generating');  // ← advance before starting audio generation

const audioResponse = await fetch('/api/audio/generate', ...);
// ...
setStage('ready');
```

### 2. Stage display component (`src/components/ProcessingScreen.tsx`)

Replace the current loading state with a stage-aware display:

```typescript
const STAGE_CONFIG = {
  analyzing: {
    icon: '🔍',
    label: 'Analyzing',
    copy: 'Reading your content — extracting key ideas and structure',
  },
  scripting: {
    icon: '✍️',
    label: 'Scripting',
    copy: 'Writing your episode — shaping key ideas into narrative',
  },
  generating: {
    icon: '🎙️',
    label: 'Generating Audio',
    copy: 'Recording your episode — this takes 20–40 seconds',
  },
  ready: {
    icon: '✅',
    label: 'Ready',
    copy: null,  // replaced by episode card
  },
} as const;
```

Render a stage indicator showing:
- Active stage label + copy (centered, clean)
- A horizontal step bar showing 4 steps — current step highlighted
- An animated pulse on the active step icon

### 3. Ready state (`src/components/ProcessingScreen.tsx`)

When `stage === 'ready'`, replace the stage display with an episode card:

```tsx
{stage === 'ready' && audio && (
  <div className="episode-ready-card">
    <div className="title">{script?.contentType} · {audio.durationSecs}s</div>
    <button onClick={() => onComplete(audio.id)} className="play-now-btn">
      ▶ Play Now
    </button>
    <button onClick={() => { addToQueue(audio.id); onComplete(audio.id); }} className="queue-btn">
      Add to Queue
    </button>
  </div>
)}
```

The `onComplete` callback already exists — it routes to the library. `addToQueue` is a new PlayerContext method that adds an audio item to the front of the queue without navigating.

### 4. Error state

Error display should only appear if a stage fails. Show which stage failed with a "Try Again" button:

```tsx
{error && (
  <div className="error-state">
    <p>Something went wrong during {stage === 'generating' ? 'audio generation' : 'script generation'}.</p>
    <button onClick={retry}>Try Again</button>
  </div>
)}
```

If `stage === 'generating'` when the error occurs, "Try Again" should retry audio generation only (reuse the existing scriptId) without re-running the Claude stage.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ProcessingScreen.tsx` | Stage state machine, stage display, ready card, per-stage error |

## Success Criteria

```bash
npm run test
# All existing tests pass (including ProcessingScreen tests if any)

npm run build
# Build succeeds
```

Manual verification:
- [ ] Submit content → immediately see "Analyzing" stage with copy
- [ ] After 3 seconds → stage advances to "Scripting"
- [ ] When /api/process completes → stage advances to "Generating"
- [ ] When /api/audio/generate completes → "Ready" card appears with "Play Now" button
- [ ] Error during generating → shows "Try Again" that retries audio only
- [ ] Step bar shows correct active step at each stage

## Scope

Client-side only. No API changes. No new API endpoints. The stage transitions are driven by the existing API call lifecycle plus a single client-side timer. The "ready" card uses the data already returned by existing API calls.
