# Feature: Playback State Persistence

> Wire up the existing /api/playback endpoint into PlayerContext so position is saved and restored reliably — eliminating the ElevenReader failure mode.

## Motivation

`/api/playback` (GET/POST) exists and works. `PlayerContext.tsx` does not call it. Position sync is the #1 cause of negative reviews in ElevenReader (30–60 minute regression on reopen). This is a reliability contract, not a feature. A commute product that loses your position is broken.

**Requirements:**
- Position written on: play, pause, seek, every 5s during active playback, and on page unload
- Position restored on: app mount when an audio item is active
- Acceptable drift: ≤5 seconds
- Test matrix: pause → reopen, background → reopen, seek → reopen

## Current State

`src/app/api/playback/route.ts` handles:
- `GET /api/playback?userId=&audioId=` → returns `PlaybackState` record
- `POST /api/playback` with `{ userId, audioId, position, speed, completed }` → upserts

`PlayerContext.tsx` manages audio playback state in memory only. No calls to `/api/playback`.

The `PlaybackState` Prisma model has: `position` (secs), `speed`, `completed`, `@@unique(userId, audioId)`.

`DEFAULT_USER_ID = "default-user"` is used throughout.

## Changes

### 1. Restore position on load (`src/components/PlayerContext.tsx`)

When `currentItem` changes to a new audio item, fetch saved position:

```typescript
useEffect(() => {
  if (!currentItem?.audioId) return;

  fetch(`/api/playback?userId=default-user&audioId=${currentItem.audioId}`)
    .then(r => r.ok ? r.json() : null)
    .then(state => {
      if (state?.position && audioRef.current) {
        audioRef.current.currentTime = state.position;
      }
      if (state?.speed && audioRef.current) {
        audioRef.current.playbackRate = state.speed;
        setSpeed(state.speed);
      }
    })
    .catch(() => {}); // silent — position loss is acceptable on network failure
}, [currentItem?.audioId]);
```

### 2. Save position on events (`src/components/PlayerContext.tsx`)

Create a `savePosition` helper that calls POST /api/playback:

```typescript
const savePosition = useCallback(async (completed = false) => {
  if (!currentItem?.audioId || !audioRef.current) return;
  await fetch('/api/playback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'default-user',
      audioId: currentItem.audioId,
      position: audioRef.current.currentTime,
      speed: audioRef.current.playbackRate,
      completed,
    }),
  }).catch(() => {}); // silent — don't interrupt playback for save failures
}, [currentItem?.audioId]);
```

Wire `savePosition` to these events:

```typescript
// On pause
const handlePause = useCallback(() => {
  setIsPlaying(false);
  savePosition();
}, [savePosition]);

// On seek (timeupdate after seek)
audioRef.current.addEventListener('seeked', () => savePosition());

// On ended
const handleEnded = useCallback(() => {
  setIsPlaying(false);
  savePosition(true); // completed = true
}, [savePosition]);

// On page unload
useEffect(() => {
  const handleUnload = () => savePosition();
  window.addEventListener('beforeunload', handleUnload);
  return () => window.removeEventListener('beforeunload', handleUnload);
}, [savePosition]);
```

### 3. Polling during active playback (`src/components/PlayerContext.tsx`)

Save position every 5 seconds during playback to handle force-quits and crashes:

```typescript
useEffect(() => {
  if (!isPlaying) return;
  const interval = setInterval(() => savePosition(), 5000);
  return () => clearInterval(interval);
}, [isPlaying, savePosition]);
```

This ensures maximum drift of 5 seconds for any interruption scenario.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/PlayerContext.tsx` | Add restore-on-load effect, savePosition helper, event wiring, 5s polling |

## Success Criteria

```bash
npm run test
# Existing tests pass
```

Manual test matrix (run each scenario):
- [ ] Play 30 seconds → pause → refresh page → position restores within 5 seconds of where paused
- [ ] Play 60 seconds → close tab → reopen → position restores within 5 seconds
- [ ] Seek to 2:30 → wait 1 second → refresh → position near 2:30
- [ ] Play to end → mark as completed → reopen → position at end, completed = true

## Scope

PlayerContext.tsx only. No changes to `/api/playback` route (it already works correctly). No schema changes. No new dependencies.
