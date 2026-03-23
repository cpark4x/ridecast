# Feature: True Audio Duration Measurement

> Replace the MP3 buffer-size estimate with accurate duration from audio metadata so the duration accuracy metric is actually meaningful.

## Motivation

Duration accuracy is Ridecast2's core promise. But the current system doesn't accurately measure the duration it produces.

**Current implementation** (`src/app/api/audio/generate/route.ts`):
```typescript
const fileSizeBytes = audioBuffer.length;
const durationFromFile = fileSizeBytes / 16000;  // assumes 128kbps mono — wrong
```

This estimate assumes a fixed 128kbps mono bitrate. Problems:
- OpenAI TTS outputs at variable quality/bitrate depending on voice and text
- ElevenLabs (Phase 2) uses different encoding entirely
- A 90-second script at a faster voice pace could produce an 80-second file that the estimate reads as 95 seconds
- You cannot know if duration accuracy improvements are working if you can't measure the output accurately

**Fix:** Use `music-metadata` to parse actual MP3 headers and read the real duration.

## Changes

### 1. Install dependency

```bash
npm install music-metadata
```

`music-metadata` is a well-maintained, zero-native-dependency library that parses audio file metadata including duration from MP3 headers. It works on `Buffer` directly.

### 2. Replace duration estimate (`src/app/api/audio/generate/route.ts`)

```typescript
// Before
const fileSizeBytes = audioBuffer.length;
const durationFromFile = fileSizeBytes / 16000;
const wordCount = script.scriptText.split(/\s+/).length;
const durationFromWords = (wordCount / WORDS_PER_MINUTE) * 60;
const durationSecs = durationFromFile > 10
  ? Math.round(durationFromFile)
  : Math.round(durationFromWords);

// After
import { parseBuffer } from 'music-metadata';

let durationSecs: number;
try {
  const metadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
  const parsed = metadata.format.duration;
  if (parsed && parsed > 0) {
    durationSecs = Math.round(parsed);
  } else {
    throw new Error('No duration in metadata');
  }
} catch {
  // Fallback: word-count estimate (better than buffer-size estimate)
  const wordCount = script.scriptText.split(/\s+/).length;
  durationSecs = Math.round((wordCount / WORDS_PER_MINUTE) * 60);
  console.warn('[duration] music-metadata parse failed; falling back to word-count estimate');
}
```

### 3. Update the duration accuracy log (`src/app/api/audio/generate/route.ts`)

The existing log line compares `durationSecs` to `targetSecs`. With accurate measurement this becomes meaningful:

```typescript
const targetSecs = script.targetDuration * 60;
const deltaSecs = durationSecs - targetSecs;
const deltaPct = Math.round((deltaSecs / targetSecs) * 100);
console.log(
  `[duration] Measured: ${durationSecs}s actual vs ${targetSecs}s target ` +
  `(${deltaSecs > 0 ? '+' : ''}${deltaSecs}s / ${deltaPct > 0 ? '+' : ''}${deltaPct}%). ` +
  `Source: music-metadata. Script: ${script.actualWordCount ?? '?'} words.`
);
```

### 4. Persist measured duration accuracy (`src/app/api/audio/generate/route.ts`)

The `Audio` record stores `durationSecs`. Consider adding `targetDurationSecs` to the Audio record to enable retrospective accuracy analysis — but this requires a schema migration. **Keep this optional:** store `durationSecs` accurately (as above); the accuracy delta can be computed from `Script.targetDuration`. No migration required for the core fix.

## Files to Modify

| File | Change |
|------|--------|
| `package.json` + `package-lock.json` | Add `music-metadata` dependency |
| `src/app/api/audio/generate/route.ts` | Replace buffer-size estimate with `parseBuffer` + fallback |

## Success Criteria

```bash
npm install  # music-metadata installed

npm run test
# All existing tests pass

npm run build
# Build succeeds with new import
```

Manual verification:
- [ ] Generate a 5-minute episode → check server log: `[duration] Measured: Xs actual vs 300s target`
- [ ] `durationSecs` stored in Audio record matches actual playback duration within ±3 seconds
- [ ] Generate a 15-minute episode → log shows realistic duration (~850–950 seconds), not a buffer-size guess
- [ ] If `parseBuffer` fails (corrupt buffer) → fallback log appears, word-count estimate used, no crash

## Scope

`src/app/api/audio/generate/route.ts` and the `npm install` only. No schema changes. No client changes. No changes to other API routes. The fallback ensures zero regression if `music-metadata` fails on an unusual audio file.
