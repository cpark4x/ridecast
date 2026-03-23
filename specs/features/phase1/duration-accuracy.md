# Feature: Duration Accuracy

> Tighten script duration control so generated audio reliably lands within ±15% of the user's target.

## Motivation

Duration is the core promise of Ridecast2 — users pick a commute length and expect the audio to fill it. PR #15 added a word count validation loop with one retry, which eliminated catastrophic misses. The remaining gap:

- **Tolerance is too wide:** ±30% means a 15-minute target can produce 10.5–19.5 minutes of audio. A 10-minute result for a 15-minute commute feels broken.
- **One retry isn't enough:** LLMs are stochastic. A first retry with soft guidance often shifts slightly but stays out of range. A second retry with a hard constraint ("write exactly N words") captures most of the remaining failures.
- **Silent failure:** When both retries miss, the code proceeds with best effort and logs to the server console only. The user never knows their audio is off-target.

## Changes

### 1. Tighten tolerance to ±15% (`src/lib/ai/claude.ts`)

Change `minWords` / `maxWords` from ±30% to ±15%:

```typescript
// Before
const minWords = Math.round(targetWords * 0.7);
const maxWords = Math.round(targetWords * 1.3);

// After
const minWords = Math.round(targetWords * 0.85);
const maxWords = Math.round(targetWords * 1.15);
```

Apply the same change in `buildScriptPrompt` where `minWords`/`maxWords` are recalculated for the prompt string.

### 2. Add a second retry with a hard constraint (`src/lib/ai/claude.ts`)

After the first retry still misses, add a second retry using a hard constraint prompt. Update `generateScript`:

```typescript
// After first retry, if still out of range:
const hardConstraintPrompt = `${prompt}

HARD CONSTRAINT — DO NOT EXCEED OR FALL SHORT: Your script must contain between ${minWords} and ${maxWords} words. Count your words carefully before finishing. The target is EXACTLY ${targetWords} words.`;

result = await this.callGenerateScript(hardConstraintPrompt, targetWords);
```

Log result either way. Two retries is the maximum — don't loop further.

### 3. Raise `max_tokens` floor (`src/lib/ai/claude.ts`)

`callGenerateScript` currently sets `max_tokens: targetWords * 2`. For short targets (5 min = 750 words), this is 1500 tokens — a tight ceiling. Raise the floor to 2048:

```typescript
max_tokens: Math.max(targetWords * 2, 2048),
```

### 4. Store word count deviation on Script record (`src/app/api/process/route.ts` + `prisma/schema.prisma`)

Add `actualWordCount Int?` to the `Script` model so the deviation is persisted and queryable:

```prisma
model Script {
  // ... existing fields
  actualWordCount Int?   // words in generated script; null if not measured
}
```

In `/api/process/route.ts`, after `generateScript` returns, persist the word count:

```typescript
const script = await db.script.create({
  data: {
    // ... existing fields
    actualWordCount: generated.wordCount,
  },
});
```

Run `npm run db:migrate` to apply the schema change.

### 5. Surface advisory to user when target is missed (`src/app/api/process/route.ts`)

After generation, if `actualWordCount` is still outside ±15% of target, include an advisory in the API response:

```typescript
const deviation = Math.abs(generated.wordCount - targetWords) / targetWords;
const durationAdvisory = deviation > 0.15
  ? `Note: Script is ${generated.wordCount < targetWords ? 'shorter' : 'longer'} than your ${config.targetMinutes}-minute target.`
  : null;

return NextResponse.json({ ...script, durationAdvisory });
```

In `ProcessingScreen.tsx`, display the advisory below the audio player if present:

```tsx
{durationAdvisory && (
  <div className="text-xs text-amber-400/80 text-center mt-2">{durationAdvisory}</div>
)}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/ai/claude.ts` | Tighten tolerance to ±15%; add second retry; raise `max_tokens` floor |
| `prisma/schema.prisma` | Add `actualWordCount Int?` to `Script` model |
| `src/app/api/process/route.ts` | Persist `actualWordCount`; add `durationAdvisory` to response |
| `src/components/ProcessingScreen.tsx` | Display advisory when API returns one |

## Success Criteria

```bash
npm run test
# All existing tests pass

npm run build
# Build succeeds

npm run db:migrate
# Migration applies cleanly
```

Unit test for `generateScript` (add to `src/lib/ai/claude.test.ts` if it exists, or create it):
- Mock `callGenerateScript` to return out-of-range on first call, in-range on second → verify result is in range
- Mock to return out-of-range on all calls → verify `actualWordCount` is stored and `durationAdvisory` is returned

## Scope

Changes are confined to the script generation path. No changes to TTS, extractors, or UI layout. The `durationAdvisory` is advisory only — never blocks playback.
