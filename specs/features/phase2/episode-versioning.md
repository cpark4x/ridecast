# Feature: Episode Versioning

> Show all audio versions per content item in the library — so a user can have a 5-minute summary AND a 30-minute deep dive from the same source.

## Motivation

Currently the library shows only the latest audio per content item. The data model already supports multiple scripts and audios per content (`Content → Script[] → Audio[]`). This spec exposes that in the API and UI. No competitor does this — it's a genuine differentiator.

## Current State

**`/api/library` route** (confirmed in code): takes `latestScript = scripts[scripts.length - 1]` and `latestAudio = latestScript.audio[latestScript.audio.length - 1]`. All other versions are silently dropped.

**`LibraryScreen.tsx`**: renders one row per `LibraryItem`. `LibraryItem` has a single `audioId`, `durationSecs`, `audioUrl`. No concept of multiple versions.

## Changes

### 1. Update API response shape (`src/app/api/library/route.ts`)

Replace the flat single-version response with a versions array:

```typescript
// New LibraryItem shape returned by the API
interface LibraryItem {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}

interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;   // minutes (e.g. 5, 15, 30)
  format: string;           // "narrator" | "conversation"
  status: "ready" | "generating" | "processing";
  createdAt: string;
}
```

Implementation:
```typescript
const library = items.map((item) => ({
  id: item.id,
  title: item.title,
  sourceType: item.sourceType,
  createdAt: item.createdAt.toISOString(),
  wordCount: item.wordCount,
  versions: item.scripts
    .flatMap((script) => {
      if (script.audio.length === 0) {
        // Script exists but no audio yet
        return [{
          scriptId: script.id,
          audioId: null,
          audioUrl: null,
          durationSecs: null,
          targetDuration: script.targetDuration,
          format: script.format,
          status: "generating" as const,
          createdAt: script.createdAt.toISOString(),
        }];
      }
      return script.audio.map((audio) => ({
        scriptId: script.id,
        audioId: audio.id,
        audioUrl: audio.filePath,
        durationSecs: audio.durationSecs,
        targetDuration: script.targetDuration,
        format: script.format,
        status: "ready" as const,
        createdAt: audio.createdAt.toISOString(),
      }));
    })
    .sort((a, b) => a.targetDuration - b.targetDuration), // shortest first
}));
```

If `versions` is empty, the item has no scripts yet — include it with `versions: []` and no status.

### 2. Update `LibraryScreen.tsx`

Update the `LibraryItem` interface to match the new API shape. Update `handlePlay` to take an `AudioVersion`.

**Display logic:**
- If `versions.length === 1`: show the single version inline (current behavior, no expansion needed)
- If `versions.length > 1`: show a chevron; tap the card to expand and see all versions
- If `versions.length === 0`: show "Processing" badge (no versions yet)

Each expanded version row shows: duration badge (e.g. `15 min`), format badge (`Narrator` / `Chat`), ready/generating status, play button.

```typescript
// Replace the old LibraryItem interface
interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  createdAt: string;
}

interface LibraryItem {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}
```

Add local expanded state:
```typescript
const [expandedId, setExpandedId] = useState<string | null>(null);
```

## Files to Modify

| File | Change |
|------|--------|
| `src/app/api/library/route.ts` | Return `versions[]` array instead of single flat fields |
| `src/components/LibraryScreen.tsx` | Update interfaces, add expand/collapse, render version rows |

## Tests

**File:** `src/app/api/library/route.test.ts` (update existing or create)

```typescript
import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

vi.mock("@/lib/db", () => ({
  prisma: {
    content: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "c1",
          title: "Test Article",
          sourceType: "url",
          createdAt: new Date("2026-03-01"),
          wordCount: 3000,
          scripts: [
            {
              id: "s1",
              format: "narrator",
              targetDuration: 5,
              createdAt: new Date("2026-03-01"),
              audio: [{ id: "a1", filePath: "/audio/a1.mp3", durationSecs: 310, createdAt: new Date() }],
            },
            {
              id: "s2",
              format: "conversation",
              targetDuration: 15,
              createdAt: new Date("2026-03-01"),
              audio: [{ id: "a2", filePath: "/audio/a2.mp3", durationSecs: 920, createdAt: new Date() }],
            },
          ],
        },
      ]),
    },
  },
}));

describe("GET /api/library", () => {
  it("returns versions array with one entry per audio", async () => {
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions).toHaveLength(2);
    expect(data[0].versions[0].targetDuration).toBe(5);  // sorted shortest first
    expect(data[0].versions[1].targetDuration).toBe(15);
  });

  it("returns status 'generating' for scripts with no audio", async () => {
    vi.mocked(prisma.content.findMany).mockResolvedValueOnce([
      { id: "c2", title: "Processing", sourceType: "pdf", createdAt: new Date(), wordCount: 1000,
        scripts: [{ id: "s3", format: "narrator", targetDuration: 10, createdAt: new Date(), audio: [] }] }
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].status).toBe("generating");
  });
});
```

## Success Criteria

```bash
npm run test    # library route tests pass; LibraryScreen renders without errors
npm run build   # no type errors
```

Manual verification:
- [ ] Process the same content twice (different durations) → library shows both versions under one title
- [ ] Tapping the card with multiple versions expands to show each version with its duration label
- [ ] Tapping a version's play button plays that specific audio

## Scope

API and LibraryScreen only. No changes to upload, processing, or audio generation flow. No schema changes — the data model already supports this. Existing single-version content displays identically to before (versions array with one entry = same visual as current).
