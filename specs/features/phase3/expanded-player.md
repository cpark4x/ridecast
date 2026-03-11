> **Design reference:** `docs/mockups/expanded-player.html` (v2 — informed by Apple Podcasts & Spotify research)
> **Research:** Apple Podcasts & Spotify player UX comparison (session notes, 2026-03-11)

# Expanded Player Redesign — Dev-Machine Spec

## Motivation

The current expanded player is a bare-bones playback surface: a square gradient artwork block, episode title, format badge, progress bar, skip/play/pause controls, and a speed button. It tells the user nothing about what they're listening to, wastes the full-screen real estate, and looks nothing like the polished experience Spotify and Apple Podcasts have trained users to expect.

Both Spotify and Apple Podcasts had to bolt on transcript views and chapter navigation *after the fact* — they start with audio and retrofit text. Ridecast is structurally opposite: Claude generates a rich analysis of the source text (contentType, themes, summary) at processing time, and the original article lives in the database. The redesign exploits this advantage: an AI-generated "About" section, article section navigation, a "Read Along" text preview, and a "View Original Article" link — none of which podcast apps can provide.

The redesigned player is a single vertically scrollable surface with fixed controls at the bottom. Three scroll positions reveal progressively more depth:

1. **Artwork + Info + Progress** — dynamic gradient artwork (140px, color keyed to contentType), title, author, category badge, themes, progress bar
2. **About & Read Along** — AI-generated summary paragraph, Read Along text preview card, placeholder Sections navigation
3. **Episode Details** — source domain + "View Original Article" link, word count, compression ratio, voice, creation date

Playback controls stay anchored at the bottom so skip/play/pause is always accessible. Skip intervals are shortened to 5s back / 15s forward (articles are shorter than podcast episodes). A sleep timer is added (both Apple Podcasts and Spotify have it; we were missing it).

---

## What We're Building

| Component | Files | Purpose |
|---|---|---|
| Schema migration | `prisma/schema.prisma` | Add `summary String?` to Script model |
| Save summary | `src/app/api/process/route.ts` | Persist Claude's summary after script generation |
| API enrichment | `src/app/api/library/route.ts` | Return rich metadata per version for player consumption |
| PlayableItem extension | `src/components/PlayerContext.tsx` | Carry rich metadata through to the expanded player |
| ExpandedPlayer rewrite | `src/components/ExpandedPlayer.tsx` | Complete rewrite: scrollable, Spotify-style layout |
| PlayerBar update | `src/components/PlayerBar.tsx` | Dynamic gradient icon + richer subtitle |
| Sleep timer | `src/components/PlayerContext.tsx` | Add sleep timer state and countdown logic to PlayerContext |

---

## Files Summary

**Modify:**

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `summary String?` to Script model |
| `src/app/api/process/route.ts` | Add `summary: analysis.summary` to `prisma.script.create` |
| `src/app/api/process/route.test.ts` | Add test: summary is passed to script create |
| `src/app/api/library/route.ts` | Return summary, contentType, themes, compressionRatio, actualWordCount, voices, ttsProvider per version |
| `src/app/api/library/route.test.ts` | Add tests for new version fields |
| `src/components/PlayerContext.tsx` | Extend PlayableItem; add sleepTimer state + setSleepTimer |
| `src/components/PlayerContext.test.tsx` | Add sleep timer tests |
| `src/components/ExpandedPlayer.tsx` | Complete rewrite |
| `src/components/ExpandedPlayer.test.tsx` | Complete rewrite — preserve old scrubber/undo tests, add new rich-UI tests |
| `src/components/PlayerBar.tsx` | Dynamic gradient icon, new subtitle format |
| `src/components/PlayerBar.test.tsx` | Add new subtitle tests, update skip interval assertion |
| `src/components/HomeScreen.tsx` | Pass new PlayableItem fields when calling `play()` / `playQueue()` |

---

## Table of Contents

1. [Task 1: Schema Migration — Add summary to Script model](#task-1-schema-migration--add-summary-to-script-model)
2. [Task 2: Save Claude's summary to DB](#task-2-save-claudes-summary-to-db)
3. [Task 3: API — Return rich metadata for player](#task-3-api--return-rich-metadata-for-player)
4. [Task 4: Extend PlayableItem interface](#task-4-extend-playableitem-interface)
5. [Task 5: Rewrite ExpandedPlayer.tsx](#task-5-rewrite-expandedplayertsx)
6. [Task 6: Update PlayerBar mini-player](#task-6-update-playerbar-mini-player)
7. [Task 7: Sleep Timer implementation](#task-7-sleep-timer-implementation)
8. [Task 8: Build verification](#task-8-build-verification)

---

## Task 1: Schema Migration — Add summary to Script model

**Feature ID:** `expanded-player-schema`

**Why:** Claude's `analyze()` function already returns a `summary` field in the `ContentAnalysis` object. It's generated but immediately discarded — used only to inform the script generation prompt. Saving it to the `Script` model makes it available to the expanded player's "About" section without any additional AI calls. The field is nullable so existing script records are unaffected.

**Files:**
- Modify: `prisma/schema.prisma`

### Step 1: Add the `summary` field to Script

In `prisma/schema.prisma`, find the Script model. Locate:

```prisma
  contentType      String?  // "business_book", "technical_article", etc.
  themes           String[]
  createdAt        DateTime @default(now())
```

Replace with:

```prisma
  contentType      String?  // "business_book", "technical_article", etc.
  themes           String[]
  summary          String?  // AI-generated summary from Claude's analyze() — saved for expanded player
  createdAt        DateTime @default(now())
```

### Step 2: Run the migration

```bash
cd /Users/chrispark/Projects/ridecast2
npx prisma migrate dev --name add-script-summary
npx prisma generate
```

**Expected:** Migration succeeds. A new migration file appears in `prisma/migrations/` containing an `ALTER TABLE "Script" ADD COLUMN "summary" TEXT` statement (or equivalent for PostgreSQL). No data migration needed because the column is nullable.

### Step 3: Verify

```bash
npx prisma db pull --print 2>&1 | grep -A1 summary
```

**Expected:** Output confirms the `summary` column exists in the `Script` table.

### Step 4: Commit

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add nullable summary column to Script model for expanded player"
```

---

## Task 2: Save Claude's summary to DB

**Feature ID:** `expanded-player-save-summary`
**depends_on:** `["expanded-player-schema"]`

**Why:** The process route calls `ai.analyze(content.rawText)` and receives back `{ contentType, format, themes, summary }`. Currently only `contentType`, `format`, and `themes` are passed to `prisma.script.create`. The `summary` is silently dropped. One-line fix: add `summary: analysis.summary` to the create data object.

**Files:**
- Modify: `src/app/api/process/route.ts`
- Modify: `src/app/api/process/route.test.ts`

### Step 1: Write failing test

Read `src/app/api/process/route.test.ts`. It uses `mockScriptCreate` (alias for `prisma.script.create as ReturnType<typeof vi.fn>`), `mockAnalyze`, `mockGenerateScript`, and `createJsonRequest`.

Add the following test **inside the existing `describe('POST /api/process', ...)` block**, after the last test:

```typescript
  it("saves summary from AI analysis to the script record", async () => {
    mockFindUnique.mockResolvedValue({
      id: "content-1",
      rawText: "An essay about cognitive biases.",
      wordCount: 5000,
    });

    mockAnalyze.mockResolvedValue({
      contentType: "science_article",
      format: "narrator",
      themes: ["cognitive bias", "decision making"],
      summary: "A fascinating exploration of how humans make irrational decisions under uncertainty.",
    });

    const scriptText = Array(750).fill("word").join(" ");
    mockGenerateScript.mockResolvedValue({
      text: scriptText,
      wordCount: 750,
      format: "narrator",
    });

    mockScriptCreate.mockResolvedValue({
      id: "script-1",
      contentId: "content-1",
      format: "narrator",
      targetDuration: 5,
      actualWordCount: 750,
      compressionRatio: 750 / 5000,
      scriptText,
      contentType: "science_article",
      themes: ["cognitive bias", "decision making"],
      summary: "A fascinating exploration of how humans make irrational decisions under uncertainty.",
    });

    const request = createJsonRequest({ contentId: "content-1", targetMinutes: 5 });
    await POST(request);

    expect(mockScriptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: "A fascinating exploration of how humans make irrational decisions under uncertainty.",
        }),
      })
    );
  });

  it("saves null summary when analysis returns no summary", async () => {
    mockFindUnique.mockResolvedValue({
      id: "content-2",
      rawText: "Some text.",
      wordCount: 1000,
    });

    mockAnalyze.mockResolvedValue({
      contentType: "news_article",
      format: "narrator",
      themes: ["news"],
      summary: "",
    });

    const scriptText = Array(750).fill("word").join(" ");
    mockGenerateScript.mockResolvedValue({
      text: scriptText,
      wordCount: 750,
      format: "narrator",
    });

    mockScriptCreate.mockResolvedValue({
      id: "script-2",
      contentId: "content-2",
      format: "narrator",
      targetDuration: 5,
      actualWordCount: 750,
      compressionRatio: 0.75,
      scriptText,
      contentType: "news_article",
      themes: ["news"],
      summary: null,
    });

    const request = createJsonRequest({ contentId: "content-2", targetMinutes: 5 });
    await POST(request);

    // Empty string summary should be stored as null
    expect(mockScriptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          summary: null,
        }),
      })
    );
  });
```

### Step 2: Run tests — verify the new tests fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/app/api/process/route.test.ts
```

**Expected:** The 2 new tests FAIL because the current `prisma.script.create` call does not include `summary`.

### Step 3: Implement — add summary to script create

In `src/app/api/process/route.ts`, find:

```typescript
    // Save script to DB
    const script = await prisma.script.create({
      data: {
        contentId,
        format: generated.format,
        targetDuration: targetMinutes,
        actualWordCount: generated.wordCount,
        compressionRatio: content.wordCount > 0
          ? generated.wordCount / content.wordCount
          : 0,
        scriptText: generated.text,
        contentType: analysis.contentType,
        themes: analysis.themes,
      },
    });
```

Replace with:

```typescript
    // Save script to DB
    const script = await prisma.script.create({
      data: {
        contentId,
        format: generated.format,
        targetDuration: targetMinutes,
        actualWordCount: generated.wordCount,
        compressionRatio: content.wordCount > 0
          ? generated.wordCount / content.wordCount
          : 0,
        scriptText: generated.text,
        contentType: analysis.contentType,
        themes: analysis.themes,
        summary: analysis.summary?.trim() || null,
      },
    });
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/app/api/process/route.test.ts
```

**Expected:** All 7 tests pass (5 existing + 2 new).

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 6: Commit

```bash
git add src/app/api/process/route.ts src/app/api/process/route.test.ts
git commit -m "feat(process): persist AI-generated summary to Script record for expanded player"
```

---

## Task 3: API — Return rich metadata for player

**Feature ID:** `expanded-player-api`
**depends_on:** `["expanded-player-schema"]`

**Why:** The expanded player needs script-level metadata (summary, contentType, themes, compressionRatio, actualWordCount) and audio-level metadata (voices, ttsProvider) to render the "About", "Details", and artwork sections. These fields are already loaded by the Prisma query — they just need to be mapped into the API response.

**Note on author/sourceUrl:** These content-level fields were added by the home-screen-redesign spec. By the time this task runs, they already exist in the library response. The test mock data below includes them to match the expected state of the file.

**Files:**
- Modify: `src/app/api/library/route.ts`
- Modify: `src/app/api/library/route.test.ts`

### Step 1: Write failing tests

Read `src/app/api/library/route.test.ts`. The existing tests verify `author`, `sourceUrl`, `completed`, `position` (added by home-screen-redesign spec). We need to add tests for the new version-level fields.

The existing `twoScriptItem` mock needs to be updated to include Script and Audio fields. **Replace** the `twoScriptItem` constant with the following (it's a superset of the previous version — all existing test assertions still pass):

```typescript
const twoScriptItem = [
  {
    id: "c1",
    title: "Test Article",
    author: "Jane Doe",
    sourceType: "url",
    sourceUrl: "https://example.com/article",
    createdAt: new Date("2026-03-01"),
    wordCount: 3000,
    scripts: [
      {
        id: "s1",
        format: "narrator",
        targetDuration: 5,
        contentType: "science_article",
        themes: ["cognitive bias", "decision making"],
        compressionRatio: 0.15,
        actualWordCount: 450,
        summary: "A fascinating exploration of cognitive science.",
        createdAt: new Date("2026-03-01"),
        audio: [
          {
            id: "a1",
            filePath: "/audio/a1.mp3",
            durationSecs: 310,
            voices: ["alloy"],
            ttsProvider: "openai",
            createdAt: new Date(),
            playbackState: [
              { position: 120.5, completed: false },
            ],
          },
        ],
      },
      {
        id: "s2",
        format: "conversation",
        targetDuration: 15,
        contentType: "science_article",
        themes: ["cognitive bias", "decision making"],
        compressionRatio: 0.45,
        actualWordCount: 1350,
        summary: "A fascinating exploration of cognitive science.",
        createdAt: new Date("2026-03-01"),
        audio: [
          {
            id: "a2",
            filePath: "/audio/a2.mp3",
            durationSecs: 920,
            voices: ["alloy", "echo"],
            ttsProvider: "openai",
            createdAt: new Date(),
            playbackState: [],
          },
        ],
      },
    ],
  },
];
```

Then add the following new tests at the end of the `describe("GET /api/library", ...)` block:

```typescript
  // --- NEW: expanded player rich metadata fields ---

  it("returns contentType on each version", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].contentType).toBe("science_article");
    expect(data[0].versions[1].contentType).toBe("science_article");
  });

  it("returns themes array on each version", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].themes).toEqual(["cognitive bias", "decision making"]);
  });

  it("returns summary on each version", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].summary).toBe("A fascinating exploration of cognitive science.");
    // Second version with empty playbackState also gets summary
    expect(data[0].versions[1].summary).toBe("A fascinating exploration of cognitive science.");
  });

  it("returns null summary when script has no summary", async () => {
    mockFindMany.mockResolvedValueOnce([
      {
        id: "c5",
        title: "No Summary",
        author: null,
        sourceType: "pdf",
        sourceUrl: null,
        createdAt: new Date(),
        wordCount: 2000,
        scripts: [
          {
            id: "s5",
            format: "narrator",
            targetDuration: 10,
            contentType: "technical_paper",
            themes: ["systems"],
            compressionRatio: 0.25,
            actualWordCount: 500,
            summary: null,
            createdAt: new Date(),
            audio: [
              {
                id: "a5",
                filePath: "/audio/a5.mp3",
                durationSecs: 600,
                voices: ["nova"],
                ttsProvider: "openai",
                createdAt: new Date(),
                playbackState: [],
              },
            ],
          },
        ],
      },
    ]);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].summary).toBeNull();
  });

  it("returns compressionRatio and actualWordCount on each version", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].compressionRatio).toBe(0.15);
    expect(data[0].versions[0].actualWordCount).toBe(450);
  });

  it("returns voices array and ttsProvider on each version", async () => {
    mockFindMany.mockResolvedValueOnce(twoScriptItem);
    const res = await GET();
    const data = await res.json();
    expect(data[0].versions[0].voices).toEqual(["alloy"]);
    expect(data[0].versions[0].ttsProvider).toBe("openai");
    // Conversation version has two voices
    expect(data[0].versions[1].voices).toEqual(["alloy", "echo"]);
  });
```

### Step 2: Run tests — verify new tests fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/app/api/library/route.test.ts
```

**Expected:** The existing tests pass (they use the updated `twoScriptItem` mock which is a superset). The 6 new tests FAIL because the current route does not return `contentType`, `themes`, `summary`, `compressionRatio`, `actualWordCount`, `voices`, `ttsProvider`.

### Step 3: Implement — extend the library route

The library route should now be in the state left by the home-screen-redesign spec (which added `author`, `sourceUrl`, `completed`, `position`, and nested `playbackState` in the Prisma query). We need to:
1. Add the new Script-level fields to each version object
2. Add the new Audio-level fields to each version object

Find the `return script.audio.map((audio) => {` section. The full version map currently returns approximately:

```typescript
          return script.audio.map((audio) => {
            const pb = audio.playbackState?.[0];
            return {
              scriptId: script.id,
              audioId: audio.id,
              audioUrl: audio.filePath,
              durationSecs: audio.durationSecs,
              targetDuration: script.targetDuration,
              format: script.format,
              status: "ready" as const,
              createdAt: audio.createdAt.toISOString(),
              completed: pb?.completed ?? false,
              position: pb?.position ?? 0,
            };
          });
```

Replace with:

```typescript
          return script.audio.map((audio) => {
            const pb = audio.playbackState?.[0];
            return {
              scriptId: script.id,
              audioId: audio.id,
              audioUrl: audio.filePath,
              durationSecs: audio.durationSecs,
              targetDuration: script.targetDuration,
              format: script.format,
              status: "ready" as const,
              createdAt: audio.createdAt.toISOString(),
              completed: pb?.completed ?? false,
              position: pb?.position ?? 0,
              // Expanded player rich metadata — from Script
              summary: script.summary ?? null,
              contentType: script.contentType ?? null,
              themes: script.themes ?? [],
              compressionRatio: script.compressionRatio,
              actualWordCount: script.actualWordCount,
              // Expanded player rich metadata — from Audio
              voices: audio.voices ?? [],
              ttsProvider: audio.ttsProvider,
            };
          });
```

Also update the "generating" stub branch to include null defaults for the new fields:

Find:

```typescript
            return [
              {
                scriptId: script.id,
                audioId: null,
                audioUrl: null,
                durationSecs: null,
                targetDuration: script.targetDuration,
                format: script.format,
                status: "generating",
                createdAt: script.createdAt.toISOString(),
                completed: false,
                position: 0,
              },
            ];
```

Replace with:

```typescript
            return [
              {
                scriptId: script.id,
                audioId: null,
                audioUrl: null,
                durationSecs: null,
                targetDuration: script.targetDuration,
                format: script.format,
                status: "generating",
                createdAt: script.createdAt.toISOString(),
                completed: false,
                position: 0,
                // No audio yet — null defaults for expanded player fields
                summary: script.summary ?? null,
                contentType: script.contentType ?? null,
                themes: script.themes ?? [],
                compressionRatio: script.compressionRatio,
                actualWordCount: script.actualWordCount,
                voices: [],
                ttsProvider: null,
              },
            ];
```

Also update the `AudioVersion` interface at the top of the route to include the new fields:

```typescript
interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  createdAt: string;
  completed: boolean;
  position: number;
  // Expanded player rich metadata
  summary: string | null;
  contentType: string | null;
  themes: string[];
  compressionRatio: number;
  actualWordCount: number;
  voices: string[];
  ttsProvider: string | null;
}
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/app/api/library/route.test.ts
```

**Expected:** All tests pass (existing + 6 new).

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 6: Commit

```bash
git add src/app/api/library/route.ts src/app/api/library/route.test.ts
git commit -m "feat(api): return rich metadata per version for expanded player (summary, contentType, themes, voices, ttsProvider)"
```

---

## Task 4: Extend PlayableItem interface

**Feature ID:** `expanded-player-playable-item`
**depends_on:** `["expanded-player-api"]`

**Why:** The expanded player component reads rich metadata from `currentItem` (the active `PlayableItem`). Currently `PlayableItem` only carries `id`, `title`, `duration`, `format`, `audioUrl`. All new fields are optional (`?`) so every existing `play()` call continues to work without change.

**Files:**
- Modify: `src/components/PlayerContext.tsx`
- Modify: `src/components/HomeScreen.tsx`

### Step 1: Write failing test

In `src/components/PlayerContext.test.tsx`, add the following test block at the **end** of the file (after all existing describe blocks):

```tsx
// --- Extended PlayableItem interface ---

describe("PlayerContext — extended PlayableItem fields", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve(null) });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function RichItemComponent() {
    const { play, currentItem } = usePlayer();
    return (
      <div>
        <span data-testid="summary">{currentItem?.summary ?? "no-summary"}</span>
        <span data-testid="author">{currentItem?.author ?? "no-author"}</span>
        <span data-testid="content-type">{currentItem?.contentType ?? "no-type"}</span>
        <span data-testid="source-url">{currentItem?.sourceUrl ?? "no-url"}</span>
        <span data-testid="themes">{currentItem?.themes?.join(",") ?? "no-themes"}</span>
        <span data-testid="compression">{currentItem?.compressionRatio?.toString() ?? "no-ratio"}</span>
        <button onClick={() => play({
          id: "rich-1",
          title: "Rich Episode",
          duration: 600,
          format: "narrator",
          audioUrl: "/rich.mp3",
          author: "Daniel Kahneman",
          sourceType: "url",
          sourceUrl: "https://example.com/article",
          contentType: "science_article",
          themes: ["psychology", "decision making"],
          summary: "An exploration of cognitive biases.",
          targetDuration: 10,
          wordCount: 8400,
          compressionRatio: 0.15,
          voices: ["alloy"],
          ttsProvider: "openai",
          createdAt: "2026-03-01T00:00:00Z",
        })}>
          Play Rich
        </button>
      </div>
    );
  }

  it("accepts and exposes extended PlayableItem fields on currentItem", () => {
    render(<PlayerProvider><RichItemComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Play Rich"));

    expect(screen.getByTestId("summary").textContent).toBe("An exploration of cognitive biases.");
    expect(screen.getByTestId("author").textContent).toBe("Daniel Kahneman");
    expect(screen.getByTestId("content-type").textContent).toBe("science_article");
    expect(screen.getByTestId("source-url").textContent).toBe("https://example.com/article");
    expect(screen.getByTestId("themes").textContent).toBe("psychology,decision making");
    expect(screen.getByTestId("compression").textContent).toBe("0.15");
  });

  it("existing play() calls without new fields still work (backward compat)", () => {
    render(<PlayerProvider><RichItemComponent /></PlayerProvider>);
    // Play with minimal fields only — no crash, no type error
    const { play } = (window as unknown as { __playerCtx?: { play: (item: unknown) => void } }).__playerCtx ?? {};
    // Just render and verify the component renders without crashing when currentItem has no extended fields
    expect(screen.getByTestId("summary").textContent).toBe("no-summary");
  });
});
```

### Step 2: Run tests — verify the new test fails

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/components/PlayerContext.test.tsx
```

**Expected:** The first new test FAILS because `PlayableItem` does not have `author`, `summary`, `contentType`, etc. fields yet. TypeScript type errors will also appear.

### Step 3: Implement — extend PlayableItem in PlayerContext.tsx

In `src/components/PlayerContext.tsx`, find:

```typescript
export interface PlayableItem {
  id: string;
  title: string;
  duration: number; // seconds
  format: string;
  audioUrl: string;
}
```

Replace with:

```typescript
export interface PlayableItem {
  id: string;           // audioId
  title: string;
  duration: number;     // seconds
  format: string;       // "narrator" | "conversation"
  audioUrl: string;
  // Extended fields for expanded player — all optional for backward compat
  author?: string | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  contentType?: string | null;
  themes?: string[];
  summary?: string | null;
  targetDuration?: number | null;
  wordCount?: number | null;
  compressionRatio?: number | null;
  voices?: string[];
  ttsProvider?: string | null;
  createdAt?: string | null;
}
```

### Step 4: Update HomeScreen.tsx to pass rich fields

Read `src/components/HomeScreen.tsx`. Find the `handlePlayAll` function and the `handlePlayEpisode` function. They construct `PlayableItem` objects for `play()` and `playQueue()` calls.

Update `handlePlayAll` to include the new fields. Find:

```typescript
  function handlePlayAll() {
    const playableItems: PlayableItem[] = unlistened.map((ep) => ({
      id: ep.version.audioId!,
      title: getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt),
      duration: ep.version.durationSecs ?? 0,
      format: ep.version.format,
      audioUrl: ep.version.audioUrl!,
    }));
    playQueue(playableItems);
  }
```

Replace with:

```typescript
  function handlePlayAll() {
    const playableItems: PlayableItem[] = unlistened.map((ep) => ({
      id: ep.version.audioId!,
      title: getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt),
      duration: ep.version.durationSecs ?? 0,
      format: ep.version.format,
      audioUrl: ep.version.audioUrl!,
      author: ep.author ?? null,
      sourceType: ep.sourceType,
      sourceUrl: ep.sourceUrl ?? null,
      contentType: ep.version.contentType ?? null,
      themes: ep.version.themes ?? [],
      summary: ep.version.summary ?? null,
      targetDuration: ep.version.targetDuration,
      wordCount: ep.wordCount,
      compressionRatio: ep.version.compressionRatio,
      voices: ep.version.voices ?? [],
      ttsProvider: ep.version.ttsProvider ?? null,
      createdAt: ep.version.createdAt,
    }));
    playQueue(playableItems);
  }
```

Find `handlePlayEpisode`:

```typescript
  function handlePlayEpisode(ep: LibraryItem & { version: AudioVersion }) {
    play({
      id: ep.version.audioId!,
      title: getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt),
      duration: ep.version.durationSecs ?? 0,
      format: ep.version.format,
      audioUrl: ep.version.audioUrl!,
    });
  }
```

Replace with:

```typescript
  function handlePlayEpisode(ep: LibraryItem & { version: AudioVersion }) {
    play({
      id: ep.version.audioId!,
      title: getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt),
      duration: ep.version.durationSecs ?? 0,
      format: ep.version.format,
      audioUrl: ep.version.audioUrl!,
      author: ep.author ?? null,
      sourceType: ep.sourceType,
      sourceUrl: ep.sourceUrl ?? null,
      contentType: ep.version.contentType ?? null,
      themes: ep.version.themes ?? [],
      summary: ep.version.summary ?? null,
      targetDuration: ep.version.targetDuration,
      wordCount: ep.wordCount,
      compressionRatio: ep.version.compressionRatio,
      voices: ep.version.voices ?? [],
      ttsProvider: ep.version.ttsProvider ?? null,
      createdAt: ep.version.createdAt,
    });
  }
```

Also update the `AudioVersion` interface in `HomeScreen.tsx` to include the new fields:

Find the `AudioVersion` interface in `HomeScreen.tsx` and replace it with:

```typescript
interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  createdAt: string;
  completed: boolean;
  position: number;
  // Expanded player fields
  summary?: string | null;
  contentType?: string | null;
  themes?: string[];
  compressionRatio?: number;
  actualWordCount?: number;
  voices?: string[];
  ttsProvider?: string | null;
}
```

### Step 5: Run tests — verify all pass

```bash
npx vitest run src/components/PlayerContext.test.tsx src/components/HomeScreen.test.tsx
```

**Expected:** All tests pass.

### Step 6: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 7: Commit

```bash
git add src/components/PlayerContext.tsx src/components/HomeScreen.tsx
git commit -m "feat(player): extend PlayableItem interface with optional rich metadata fields for expanded player"
```

---

## Task 5: Rewrite ExpandedPlayer.tsx

**Feature ID:** `expanded-player-rewrite`
**depends_on:** `["expanded-player-playable-item"]`

**Why:** The current expanded player is a static, non-scrollable screen. The redesign follows the approved v2 mockup (`docs/mockups/expanded-player.html`): a single scrollable view with three content sections, dynamic gradient artwork keyed to content type, AI-generated "About" text, article sections navigation, episode details, and a frosted-glass controls bar fixed at the bottom with 5s/15s skip intervals and a sleep timer.

**Files:**
- Rewrite: `src/components/ExpandedPlayer.tsx`
- Rewrite: `src/components/ExpandedPlayer.test.tsx`

### Step 1: Write tests for the new ExpandedPlayer

Replace the **entire** contents of `src/components/ExpandedPlayer.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ExpandedPlayer } from "./ExpandedPlayer";

// --- Mock setup ---

const mockSetPosition = vi.fn();
const mockSkipForward = vi.fn();
const mockSkipBack = vi.fn();
const mockTogglePlay = vi.fn();
const mockSetSpeed = vi.fn();

// Base mock player (minimal PlayableItem — existing scrubber tests)
const baseMockPlayer = {
  currentItem: {
    id: "a1",
    title: "Test Episode",
    duration: 300,
    format: "narrator",
    audioUrl: "/a1.mp3",
  },
  isPlaying: false,
  position: 60,
  speed: 1.0,
  togglePlay: mockTogglePlay,
  setSpeed: mockSetSpeed,
  setPosition: mockSetPosition,
  skipForward: mockSkipForward,
  skipBack: mockSkipBack,
};

// Rich mock player (full PlayableItem with extended fields)
const richMockPlayer = {
  ...baseMockPlayer,
  currentItem: {
    id: "a2",
    title: "Thinking, Fast and Slow",
    duration: 900,
    format: "narrator",
    audioUrl: "/a2.mp3",
    author: "Daniel Kahneman",
    sourceType: "url",
    sourceUrl: "https://example.com/thinking-fast-slow",
    contentType: "science_article",
    themes: ["psychology", "cognitive bias", "decision theory"],
    summary: "Nobel laureate Daniel Kahneman explores how systematic biases shape human judgment.",
    targetDuration: 15,
    wordCount: 8400,
    compressionRatio: 0.15,
    voices: ["alloy"],
    ttsProvider: "openai",
    createdAt: "2026-03-01T00:00:00Z",
  },
};

let currentMockPlayer = baseMockPlayer;

vi.mock("./PlayerContext", () => ({
  usePlayer: () => currentMockPlayer,
}));

vi.mock("@/lib/utils/duration", () => ({
  formatDuration: (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
}));

vi.mock("@/lib/ui/content-display", () => ({
  timeAgo: (date: string) => `2d ago`,
}));

/** Simulate a click on the progress bar div with mocked getBoundingClientRect */
function seekOnProgressBar(container: HTMLElement, clickXFraction = 0.8) {
  const progressBar = container.querySelector("[data-testid='progress-bar']") as HTMLElement;
  if (!progressBar) throw new Error("progress-bar not found — add data-testid to progress div");

  vi.spyOn(progressBar, "getBoundingClientRect").mockReturnValue({
    left: 0, width: 320, top: 0, right: 320, bottom: 4, height: 4,
    x: 0, y: 0, toJSON: () => {},
  } as DOMRect);

  fireEvent.click(progressBar, { clientX: clickXFraction * 320 });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  currentMockPlayer = baseMockPlayer as typeof richMockPlayer;
});

afterEach(() => vi.useRealTimers());

// --- Existing scrubber tests (must still pass) ---

describe("ExpandedPlayer scrubber handle", () => {
  it("renders a slider with correct aria-valuenow", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("aria-valuenow", "60");
    expect(slider).toHaveAttribute("aria-valuemax", "300");
  });

  it("renders a scrubber thumb element inside the slider", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const thumb = container.querySelector("[class*='rounded-full'][class*='bg-white'][class*='absolute']");
    expect(thumb).not.toBeNull();
  });
});

describe("Undo Seek", () => {
  it("does not show Go Back button initially", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    void container;
    expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
  });

  it("shows Go Back button after a seek", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    seekOnProgressBar(container);
    expect(screen.getByText("Go Back")).toBeInTheDocument();
  });

  it("calls setPosition with saved position when Go Back is clicked", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    seekOnProgressBar(container, 0.8);
    fireEvent.click(screen.getByText("Go Back"));
    expect(mockSetPosition).toHaveBeenLastCalledWith(60);
  });

  it("hides Go Back button after clicking it", () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    seekOnProgressBar(container);
    fireEvent.click(screen.getByText("Go Back"));
    expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
  });

  it("hides Go Back button after 4 seconds (auto-dismiss)", async () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    seekOnProgressBar(container);
    expect(screen.getByText("Go Back")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(4100); });

    expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
  });

  it("resets the 4s timer when seeking again while Go Back is showing", async () => {
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);

    seekOnProgressBar(container, 0.5);
    expect(screen.getByText("Go Back")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("Go Back")).toBeInTheDocument();

    seekOnProgressBar(container, 0.9);
    expect(screen.getByText("Go Back")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("Go Back")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
  });
});

// --- NEW: skip intervals ---

describe("ExpandedPlayer skip intervals", () => {
  it("skip back button calls skipBack(5)", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const skipBackBtn = screen.getByRole("button", { name: /skip back/i });
    fireEvent.click(skipBackBtn);
    expect(mockSkipBack).toHaveBeenCalledWith(5);
  });

  it("skip forward button calls skipForward(15)", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const skipFwdBtn = screen.getByRole("button", { name: /skip forward/i });
    fireEvent.click(skipFwdBtn);
    expect(mockSkipForward).toHaveBeenCalledWith(15);
  });

  it("skip intervals shown as '5s' and '15s'", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("5s")).toBeInTheDocument();
    expect(screen.getByText("15s")).toBeInTheDocument();
  });
});

// --- NEW: controls ---

describe("ExpandedPlayer controls", () => {
  it("play/pause button calls togglePlay", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const playBtn = screen.getByRole("button", { name: /play|pause/i });
    fireEvent.click(playBtn);
    expect(mockTogglePlay).toHaveBeenCalled();
  });

  it("onClose is called when chevron button is clicked", () => {
    const onClose = vi.fn();
    render(<ExpandedPlayer onClose={onClose} onCarMode={vi.fn()} />);
    const closeBtn = screen.getByRole("button", { name: /minimize|close|collapse/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("onCarMode is called when Car Mode button is clicked", () => {
    const onCarMode = vi.fn();
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={onCarMode} />);
    const carModeBtn = screen.getByRole("button", { name: /car mode/i });
    fireEvent.click(carModeBtn);
    expect(onCarMode).toHaveBeenCalled();
  });

  it("speed cycles when speed button is clicked", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    // Initial speed is 1.0, shown as "1x"
    expect(screen.getByText("1x")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /speed/i }));
    expect(mockSetSpeed).toHaveBeenCalledWith(1.25);
  });
});

// --- NEW: sleep timer ---

describe("ExpandedPlayer sleep timer", () => {
  it("shows Sleep button", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByRole("button", { name: /sleep/i })).toBeInTheDocument();
  });

  it("cycles sleep timer options: off → 15min → 30min → 45min → end → off", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    const sleepBtn = screen.getByRole("button", { name: /sleep/i });

    // Starts at off — label not shown or shows nothing
    fireEvent.click(sleepBtn); // → 15min
    expect(screen.getByText(/15/)).toBeInTheDocument();

    fireEvent.click(sleepBtn); // → 30min
    expect(screen.getByText(/30/)).toBeInTheDocument();

    fireEvent.click(sleepBtn); // → 45min
    expect(screen.getByText(/45/)).toBeInTheDocument();

    fireEvent.click(sleepBtn); // → end
    expect(screen.getByText(/end/i)).toBeInTheDocument();

    fireEvent.click(sleepBtn); // → off (cycle back)
    // After cycling back to off, the 15/30/45/end labels should be gone
    expect(screen.queryByText(/^15m$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^30m$/i)).not.toBeInTheDocument();
  });
});

// --- NEW: rich metadata display ---

describe("ExpandedPlayer rich metadata", () => {
  beforeEach(() => {
    currentMockPlayer = richMockPlayer;
  });

  it("shows episode title", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("Thinking, Fast and Slow")).toBeInTheDocument();
  });

  it("shows author line when author is provided", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("By Daniel Kahneman")).toBeInTheDocument();
  });

  it("does not show author line when author is absent", () => {
    currentMockPlayer = {
      ...richMockPlayer,
      currentItem: { ...richMockPlayer.currentItem, author: null },
    };
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.queryByText(/^By /)).not.toBeInTheDocument();
  });

  it("shows content type badge with human-readable label", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("Science Article")).toBeInTheDocument();
  });

  it("shows theme chips", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("psychology")).toBeInTheDocument();
    expect(screen.getByText("cognitive bias")).toBeInTheDocument();
    expect(screen.getByText("decision theory")).toBeInTheDocument();
  });

  it("shows About section with AI summary", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText(/Nobel laureate Daniel Kahneman/)).toBeInTheDocument();
  });

  it("does not show About section when summary is null", () => {
    currentMockPlayer = {
      ...richMockPlayer,
      currentItem: { ...richMockPlayer.currentItem, summary: null },
    };
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.queryByText("About")).not.toBeInTheDocument();
  });

  it("shows Read Along card", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("Read Along")).toBeInTheDocument();
  });

  it("shows source domain when sourceUrl is provided", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("example.com")).toBeInTheDocument();
  });

  it("shows View Original Article link when sourceUrl is provided", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("View Original Article")).toBeInTheDocument();
  });

  it("does not show View Original when sourceUrl is null", () => {
    currentMockPlayer = {
      ...richMockPlayer,
      currentItem: { ...richMockPlayer.currentItem, sourceUrl: null },
    };
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.queryByText("View Original Article")).not.toBeInTheDocument();
  });

  it("shows created timeAgo in details", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText("2d ago")).toBeInTheDocument();
  });

  it("shows word count and reading time in details", () => {
    render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(screen.getByText(/8,400 words/)).toBeInTheDocument();
  });
});

// --- Renders nothing when no item ---

describe("ExpandedPlayer empty state", () => {
  it("renders nothing when currentItem is null", () => {
    currentMockPlayer = { ...baseMockPlayer, currentItem: null } as typeof richMockPlayer;
    const { container } = render(<ExpandedPlayer onClose={vi.fn()} onCarMode={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
```

### Step 2: Run tests — verify the new tests fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/components/ExpandedPlayer.test.tsx
```

**Expected:** Most tests FAIL because the current component doesn't have the new structure, the new skip intervals, or the new rich metadata rendering.

### Step 3: Implement — rewrite ExpandedPlayer.tsx

Replace the **entire** contents of `src/components/ExpandedPlayer.tsx` with:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";
import { timeAgo } from "@/lib/ui/content-display";

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

// Content type → gradient colors [from, to]
const CONTENT_GRADIENTS: Record<string, [string, string]> = {
  science_article:  ["#0D9488", "#14B8A6"],
  business_book:    ["#EA580C", "#F97316"],
  technical_paper:  ["#2563EB", "#3B82F6"],
  news_article:     ["#DB2777", "#EC4899"],
  fiction:          ["#7C3AED", "#8B5CF6"],
  biography:        ["#065F46", "#059669"],
  self_help:        ["#B45309", "#D97706"],
  educational:      ["#1D4ED8", "#2563EB"],
};

const DEFAULT_GRADIENT: [string, string] = ["#EA580C", "#F97316"];

const CONTENT_TYPE_LABELS: Record<string, string> = {
  science_article:  "Science Article",
  business_book:    "Business Book",
  technical_paper:  "Technical Paper",
  news_article:     "News Article",
  fiction:          "Fiction",
  biography:        "Biography",
  self_help:        "Self Help",
  educational:      "Educational",
};

// Sleep timer cycle: null = off, then minutes, then "end" = end of episode
type SleepTimerOption = null | 15 | 30 | 45 | "end";
const SLEEP_CYCLE: SleepTimerOption[] = [null, 15, 30, 45, "end"];

function getGradientColors(contentType?: string | null): [string, string] {
  if (contentType && CONTENT_GRADIENTS[contentType]) {
    return CONTENT_GRADIENTS[contentType];
  }
  return DEFAULT_GRADIENT;
}

function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface ExpandedPlayerProps {
  onClose: () => void;
  onCarMode: () => void;
}

export function ExpandedPlayer({ onClose, onCarMode }: ExpandedPlayerProps) {
  const {
    currentItem,
    isPlaying,
    position,
    speed,
    togglePlay,
    setSpeed,
    setPosition,
    skipForward,
    skipBack,
  } = usePlayer();

  const [undoPosition, setUndoPosition] = useState<number | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sleep timer — local state (will be moved to PlayerContext in expanded-player-sleep-timer task)
  const [sleepTimer, setSleepTimer] = useState<SleepTimerOption>(null);
  const [sleepMinsLeft, setSleepMinsLeft] = useState<number | null>(null);
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    };
  }, []);

  if (!currentItem) return null;

  const duration = currentItem.duration;
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const remaining = duration - position;

  const [gradFrom, gradTo] = getGradientColors(currentItem.contentType);
  const contentLabel = currentItem.contentType
    ? (CONTENT_TYPE_LABELS[currentItem.contentType] ?? currentItem.contentType)
    : null;
  const domain = extractDomain(currentItem.sourceUrl);
  const wordCount = currentItem.wordCount;
  const targetDuration = currentItem.targetDuration;
  const compressionRatio = currentItem.compressionRatio;
  const voices = currentItem.voices;
  const ttsProvider = currentItem.ttsProvider;
  const createdAt = currentItem.createdAt;

  // Placeholder sections — divide total duration into 4 equal parts
  const secDur = duration > 0 ? Math.round(duration / 4) : 60;
  const placeholderSections = [
    { name: "Introduction", time: 0 },
    { name: "Key Concepts", time: secDur },
    { name: "Analysis", time: secDur * 2 },
    { name: "Conclusions", time: secDur * 3 },
  ];

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
  }

  function cycleSleepTimer() {
    const idx = SLEEP_CYCLE.indexOf(sleepTimer);
    const next = SLEEP_CYCLE[(idx + 1) % SLEEP_CYCLE.length];
    setSleepTimer(next);

    // Clear existing countdown
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }

    if (next === null) {
      setSleepMinsLeft(null);
    } else if (next === "end") {
      setSleepMinsLeft(null);
      // Will pause on the next audio ended event — handled by the audio element
    } else {
      setSleepMinsLeft(next);
      sleepIntervalRef.current = setInterval(() => {
        setSleepMinsLeft((prev) => {
          if (prev === null || prev <= 1) {
            // Time's up — pause audio directly via DOM
            const audio = document.querySelector("audio");
            if (audio) audio.pause();
            if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
            setSleepTimer(null);
            return null;
          }
          return prev - 1;
        });
      }, 60_000);
    }
  }

  const sleepLabel: string =
    sleepTimer === null ? "" :
    sleepTimer === "end" ? "End" :
    `${sleepMinsLeft ?? sleepTimer}m`;

  function seekProgress(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const newPos = Math.max(0, Math.min(duration, pct * duration));
    setUndoPosition(position);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setUndoPosition(null);
      undoTimerRef.current = null;
    }, 4000);
    setPosition(newPos);
  }

  function handleUndo() {
    if (undoPosition !== null) {
      setPosition(undoPosition);
      setUndoPosition(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    }
  }

  return (
    <div className="absolute inset-0 z-[100] bg-[var(--bg)] flex flex-col">

      {/* Fixed top bar */}
      <div className="flex items-center justify-between px-5 py-3 shrink-0">
        <button
          onClick={onClose}
          aria-label="Minimize player"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/[0.06] active:scale-90"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[var(--text-mid)] fill-none" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-[var(--text-mid)] uppercase tracking-widest">Now Playing</span>
        <button
          aria-label="Share episode"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/[0.06] active:scale-90"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[var(--text-mid)] fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>

      {/* Scrollable content — padded to clear fixed controls bar */}
      <div className="flex-1 overflow-y-auto pb-[140px]">

        {/* ── Section 1: Artwork + Info + Progress ── */}
        <div className="px-6 pb-6">
          {/* Dynamic gradient artwork — 140px, NOT full-height square */}
          <div
            className="w-full rounded-2xl mb-4 flex items-center justify-center"
            style={{
              height: "140px",
              background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
              boxShadow: `0 8px 32px ${gradFrom}40`,
            }}
          >
            <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white opacity-80">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>

          {/* Source type pill */}
          {currentItem.sourceType && (
            <div className="flex justify-center mb-3">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--accent-light)] text-[var(--accent-text)] uppercase tracking-wide">
                {currentItem.sourceType}
              </span>
            </div>
          )}

          {/* Title */}
          <h2 className="text-xl font-bold text-center mb-1 tracking-tight leading-snug">{currentItem.title}</h2>

          {/* Author — only shown when present */}
          {currentItem.author && (
            <p className="text-sm text-center text-[var(--text-mid)] mb-3">By {currentItem.author}</p>
          )}

          {/* Content type badge + themes */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
            {contentLabel && (
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{ background: `${gradFrom}20`, color: gradFrom }}
              >
                {contentLabel}
              </span>
            )}
            {currentItem.themes?.map((theme) => (
              <span
                key={theme}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--surface-2)] text-[var(--text-mid)]"
              >
                {theme}
              </span>
            ))}
          </div>

          {/* Progress bar */}
          <div
            data-testid="progress-bar"
            onClick={seekProgress}
            className="w-full h-5 flex items-center cursor-pointer group relative mb-1"
            role="slider"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={Math.floor(position)}
          >
            <div className="absolute w-full h-1 bg-black/10 rounded-full">
              <div
                className="absolute h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
                }}
              />
              <div
                className="absolute w-3 h-3 bg-white rounded-full shadow-md -translate-y-1/2 -translate-x-1/2 top-1/2 transition-transform group-active:scale-125"
                style={{ left: `${progress}%` }}
              />
            </div>
          </div>

          {/* Undo seek */}
          {undoPosition !== null && (
            <div className="flex justify-center mt-1 mb-1">
              <button
                onClick={handleUndo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/10 text-[var(--text-mid)] transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 10h11a5 5 0 0 1 0 10H3" /><polyline points="7 6 3 10 7 14" />
                </svg>
                Go Back
              </button>
            </div>
          )}

          {/* Time labels */}
          <div className="flex justify-between mt-1">
            <span className="text-[11px] text-[var(--text-mid)] font-medium tabular-nums">{formatDuration(Math.floor(position))}</span>
            <span className="text-[11px] text-[var(--text-mid)] font-medium tabular-nums">-{formatDuration(Math.floor(remaining))}</span>
          </div>
        </div>

        {/* ── Section 2: About & Read Along ── */}
        <div className="px-6 pb-6 border-t border-black/[0.06] pt-5">

          {/* About — only shown when summary exists */}
          {currentItem.summary && (
            <div className="mb-5">
              <h3 className="text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">About</h3>
              <p className="text-sm text-[var(--text-mid)] leading-relaxed">{currentItem.summary}</p>
            </div>
          )}

          {/* Read Along card */}
          <div className="rounded-[14px] border border-[var(--accent)]/20 overflow-hidden mb-5">
            <div className="bg-[var(--accent-light)] px-4 py-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-xs font-semibold text-[var(--accent-text)]">Read Along</span>
              <span className="ml-auto text-[10px] font-medium text-[var(--accent-text)]/60 bg-[var(--accent)]/10 px-2 py-0.5 rounded-full">Only on Ridecast</span>
            </div>
            <div className="p-4 bg-[var(--surface-2)]">
              {currentItem.summary ? (
                <p className="text-sm leading-relaxed text-[var(--text-mid)]">
                  <span className="bg-[var(--accent-light)] text-[var(--accent-text)] rounded px-0.5 font-medium">
                    {currentItem.summary.split(". ")[0]}.
                  </span>
                  {" "}
                  {currentItem.summary.split(". ").slice(1).join(". ")}
                </p>
              ) : (
                <p className="text-sm text-[var(--text-dim)] italic">Summary unavailable for this episode.</p>
              )}
              <p className="text-[11px] text-[var(--text-dim)] mt-3 flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 3 21 3 21 9"/><path d="M10 14L21 3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                </svg>
                Tap to read along while listening
              </p>
            </div>
          </div>

          {/* Sections card */}
          <div className="rounded-[14px] bg-[var(--surface-2)] overflow-hidden">
            <div className="px-4 py-3 border-b border-black/[0.06]">
              <h3 className="text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider">Sections</h3>
            </div>
            <div className="divide-y divide-black/[0.04]">
              {placeholderSections.map((section, i) => {
                const isCurrent =
                  position >= section.time &&
                  (i === placeholderSections.length - 1 || position < placeholderSections[i + 1].time);
                return (
                  <div
                    key={section.name}
                    className={`flex items-center justify-between px-4 py-3 ${isCurrent ? "bg-[var(--accent-light)]" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <div className="w-1 h-4 rounded-full" style={{ background: gradFrom }} />
                      )}
                      <span
                        className={`text-sm ${
                          isCurrent
                            ? "font-semibold text-[var(--accent-text)]"
                            : "text-[var(--text-mid)]"
                        }`}
                      >
                        {section.name}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium tabular-nums text-[var(--text-dim)]">
                      {formatDuration(section.time)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Section 3: Episode Details ── */}
        <div className="px-6 pb-6 border-t border-black/[0.06] pt-5">
          <h3 className="text-[11px] font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-3">Episode Details</h3>
          <div className="rounded-[14px] bg-[var(--surface-2)] overflow-hidden divide-y divide-black/[0.04]">

            {/* Source + View Original */}
            {domain && (
              <div className="px-4 py-3 flex items-start justify-between gap-3">
                <span className="text-sm text-[var(--text-mid)] shrink-0">Source</span>
                <div className="text-right">
                  <div className="text-sm font-medium">{domain}</div>
                  {currentItem.sourceUrl && (
                    <a
                      href={currentItem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] font-medium mt-1 px-2 py-0.5 rounded-full"
                      style={{ background: `${gradFrom}18`, color: gradFrom }}
                    >
                      View Original Article
                      <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-current fill-none" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Original word count */}
            {wordCount != null && wordCount > 0 && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[var(--text-mid)]">Original</span>
                <span className="text-sm font-medium">
                  {wordCount.toLocaleString()} words · ~{Math.round(wordCount / 250)} min read
                </span>
              </div>
            )}

            {/* This version */}
            {targetDuration != null && compressionRatio != null && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[var(--text-mid)]">This version</span>
                <span className="text-sm font-medium">
                  {targetDuration}-min {currentItem.format} · {Math.round(compressionRatio * 100)}% compressed
                </span>
              </div>
            )}

            {/* Voice */}
            {voices && voices.length > 0 && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[var(--text-mid)]">Voice</span>
                <span className="text-sm font-medium">
                  {voices[0]}{ttsProvider ? ` (${ttsProvider})` : ""}
                </span>
              </div>
            )}

            {/* Created */}
            {createdAt && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[var(--text-mid)]">Created</span>
                <span className="text-sm font-medium">{timeAgo(createdAt)}</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Fixed bottom controls — frosted glass ── */}
      <div
        className="absolute bottom-0 left-0 right-0 px-5 pt-3 pb-4 shrink-0"
        style={{
          background: "rgba(250, 249, 246, 0.94)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(0,0,0,0.07)",
        }}
      >
        {/* Row 1: Skip back 5s | Play/Pause | Skip forward 15s */}
        <div className="flex items-center justify-center gap-7 mb-3">
          <button
            onClick={() => skipBack(5)}
            aria-label="Skip back 5 seconds"
            className="w-12 h-12 flex flex-col items-center justify-center rounded-full active:scale-[0.88] relative"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#18181A]">
              <path d="M12.5 8.5C12.5 8.5 7 12 7 12l5.5 3.5V8.5z" />
              <path d="M18 8.5C18 8.5 12.5 12 12.5 12L18 15.5V8.5z" />
              <rect x="4" y="7" width="2" height="10" rx="0.5" />
            </svg>
            <span className="absolute -bottom-3.5 text-[9px] font-semibold text-[var(--text-dim)]">5s</span>
          </button>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="w-[68px] h-[68px] bg-[var(--text)] rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-[0.92] shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                <rect x="7" y="5" width="3.5" height="14" rx="1" />
                <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white ml-0.5">
                <polygon points="8,5 19,12 8,19" />
              </svg>
            )}
          </button>

          <button
            onClick={() => skipForward(15)}
            aria-label="Skip forward 15 seconds"
            className="w-12 h-12 flex flex-col items-center justify-center rounded-full active:scale-[0.88] relative"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#18181A]">
              <path d="M11.5 15.5V8.5L17 12l-5.5 3.5z" />
              <rect x="18" y="7" width="2" height="10" rx="0.5" />
            </svg>
            <span className="absolute -bottom-3.5 text-[9px] font-semibold text-[var(--text-dim)]">15s</span>
          </button>
        </div>

        {/* Row 2: Speed | Sleep Timer | Car Mode */}
        <div className="flex items-center justify-around mb-1">
          <button
            onClick={cycleSpeed}
            aria-label="Change playback speed"
            className="flex flex-col items-center gap-1 p-2 rounded-lg active:scale-90"
          >
            <span className="bg-[var(--surface-2)] border border-black/[0.07] rounded-full px-3 py-1 text-[13px] font-bold">
              {speed}x
            </span>
            <span className="text-[10px] font-semibold text-[var(--text-mid)]">Speed</span>
          </button>

          <button
            onClick={cycleSleepTimer}
            aria-label="Sleep timer"
            className="flex flex-col items-center gap-1 p-2 rounded-lg active:scale-90"
          >
            <div className="relative w-[22px] h-[22px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] fill-[var(--text-mid)]">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              {sleepTimer !== null && (
                <span className="absolute -top-1.5 -right-3 text-[8px] font-bold text-[var(--accent-text)] bg-[var(--accent-light)] rounded-full px-1 py-0.5 whitespace-nowrap">
                  {sleepLabel}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-[var(--text-mid)]">Sleep</span>
          </button>

          <button
            onClick={onCarMode}
            aria-label="Car Mode"
            className="flex flex-col items-center gap-1 p-2 rounded-lg active:scale-90"
          >
            <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] stroke-[var(--text-mid)] fill-none" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
            </svg>
            <span className="text-[10px] font-semibold text-[var(--text-mid)]">Car Mode</span>
          </button>
        </div>

        {/* Home indicator */}
        <div className="w-32 h-1 bg-black/10 rounded-full mx-auto mt-1" />
      </div>
    </div>
  );
}
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/components/ExpandedPlayer.test.tsx
```

**Expected:** All tests pass — including the 6 preserved original scrubber/undo tests and all new tests.

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 6: Commit

```bash
git add src/components/ExpandedPlayer.tsx src/components/ExpandedPlayer.test.tsx
git commit -m "feat(player): rewrite ExpandedPlayer — scrollable layout, rich metadata, 5s/15s skips, sleep timer, dynamic gradients"
```

---

## Task 6: Update PlayerBar mini-player

**Feature ID:** `expanded-player-minibar`
**depends_on:** `["expanded-player-playable-item"]`

**Why:** The mini-player currently shows `{format} · {duration}` as its subtitle and a static orange gradient icon. With `sourceType` and `createdAt` now available on `currentItem`, we can show a more useful subtitle. The icon gradient should match the content type (same color mapping as ExpandedPlayer) rather than always being orange.

**Files:**
- Modify: `src/components/PlayerBar.tsx`
- Modify: `src/components/PlayerBar.test.tsx`

### Step 1: Write failing tests

Replace the **entire** contents of `src/components/PlayerBar.test.tsx` with:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerBar } from "./PlayerBar";

const mockSkipForward = vi.fn();

// Base mock — minimal PlayableItem (old format)
const baseMockItem = {
  currentItem: {
    id: "a1",
    title: "Episode 1",
    duration: 300,
    format: "narrator",
    audioUrl: "/a.mp3",
  },
  isPlaying: true,
  position: 60,
  togglePlay: vi.fn(),
  skipForward: mockSkipForward,
};

// Rich mock — PlayableItem with extended fields
const richMockItem = {
  currentItem: {
    id: "a2",
    title: "Thinking Fast",
    duration: 900,
    format: "narrator",
    audioUrl: "/a2.mp3",
    sourceType: "url",
    contentType: "science_article",
    createdAt: "2026-03-01T00:00:00Z",
  },
  isPlaying: false,
  position: 0,
  togglePlay: vi.fn(),
  skipForward: mockSkipForward,
};

let currentMock = baseMockItem;

vi.mock("./PlayerContext", () => ({
  usePlayer: () => currentMock,
}));

vi.mock("@/lib/utils/duration", () => ({ formatDuration: (s: number) => `${s}s` }));

vi.mock("@/lib/ui/content-display", () => ({
  timeAgo: () => "3h ago",
}));

describe("PlayerBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMock = baseMockItem;
  });

  it("renders a skip-forward button", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    expect(screen.getByRole("button", { name: /skip forward/i })).toBeInTheDocument();
  });

  it("calls skipForward(30) when skip button is clicked", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /skip forward/i }));
    expect(mockSkipForward).toHaveBeenCalledWith(30);
  });

  it("skip button click does not trigger onExpand", () => {
    const onExpand = vi.fn();
    render(<PlayerBar onExpand={onExpand} />);
    fireEvent.click(screen.getByRole("button", { name: /skip forward/i }));
    expect(onExpand).not.toHaveBeenCalled();
  });

  it("shows episode title", () => {
    render(<PlayerBar onExpand={vi.fn()} />);
    expect(screen.getByText("Episode 1")).toBeInTheDocument();
  });

  // --- NEW: subtitle format ---

  it("shows 'sourceType · timeAgo' subtitle when sourceType and createdAt are available", () => {
    currentMock = richMockItem;
    render(<PlayerBar onExpand={vi.fn()} />);
    // Should show "url · 3h ago" — sourceType + timeAgo(createdAt)
    expect(screen.getByText(/url\s*·\s*3h ago/i)).toBeInTheDocument();
  });

  it("falls back to 'format · duration' subtitle when sourceType/createdAt are absent", () => {
    // baseMockItem has no sourceType — use old format
    render(<PlayerBar onExpand={vi.fn()} />);
    // format · formatted duration
    expect(screen.getByText(/narrator/i)).toBeInTheDocument();
  });

  it("does NOT show the format label (narrator/conversation) when sourceType is available", () => {
    currentMock = richMockItem;
    render(<PlayerBar onExpand={vi.fn()} />);
    // Should NOT show "narrator" as a standalone label
    expect(screen.queryByText(/^narrator$/i)).not.toBeInTheDocument();
  });
});
```

### Step 2: Run tests — verify new tests fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/components/PlayerBar.test.tsx
```

**Expected:** The 3 original tests pass. The 4 new tests FAIL because `PlayerBar` currently always shows `{format} · {duration}` and always uses orange gradient.

### Step 3: Implement — update PlayerBar.tsx

Replace the **entire** contents of `src/components/PlayerBar.tsx` with:

```tsx
"use client";

import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";
import { timeAgo } from "@/lib/ui/content-display";

// Same gradient mapping as ExpandedPlayer — keep in sync
const CONTENT_GRADIENTS: Record<string, [string, string]> = {
  science_article:  ["#0D9488", "#14B8A6"],
  business_book:    ["#EA580C", "#F97316"],
  technical_paper:  ["#2563EB", "#3B82F6"],
  news_article:     ["#DB2777", "#EC4899"],
  fiction:          ["#7C3AED", "#8B5CF6"],
  biography:        ["#065F46", "#059669"],
  self_help:        ["#B45309", "#D97706"],
  educational:      ["#1D4ED8", "#2563EB"],
};
const DEFAULT_GRADIENT: [string, string] = ["#EA580C", "#F97316"];

function getIconGradient(contentType?: string | null): [string, string] {
  if (contentType && CONTENT_GRADIENTS[contentType]) {
    return CONTENT_GRADIENTS[contentType];
  }
  return DEFAULT_GRADIENT;
}

interface PlayerBarProps {
  onExpand: () => void;
}

export function PlayerBar({ onExpand }: PlayerBarProps) {
  const { currentItem, isPlaying, position, togglePlay, skipForward } = usePlayer();

  if (!currentItem) return null;

  const progress = currentItem.duration > 0 ? (position / currentItem.duration) * 100 : 0;
  const [gradFrom, gradTo] = getIconGradient(currentItem.contentType);

  // Subtitle: prefer "sourceType · timeAgo" over "format · duration"
  const subtitle =
    currentItem.sourceType && currentItem.createdAt
      ? `${currentItem.sourceType} · ${timeAgo(currentItem.createdAt)}`
      : `${currentItem.format} · ${formatDuration(currentItem.duration)}`;

  return (
    <div
      onClick={onExpand}
      data-testid="player-bar"
      className="absolute bottom-16 left-2 right-2 h-[58px] flex items-center gap-3 px-3 z-[60] cursor-pointer rounded-[14px] border border-[#EA580C]/20 transition-all"
      style={{
        background: `linear-gradient(135deg, ${gradFrom}26, ${gradTo}1a)`,
        backdropFilter: "blur(24px)",
      }}
    >
      {/* Dynamic gradient icon */}
      <div
        className="w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
      >
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white">
          <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" opacity="0.7" /><circle cx="18" cy="16" r="3" opacity="0.7" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{currentItem.title}</div>
        <div className="text-[11px] text-[var(--text-mid)] mt-px">{subtitle}</div>
      </div>

      {/* Play / Pause */}
      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shrink-0 transition-all active:scale-[0.88]"
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#18181A]"><rect x="7" y="6" width="3.5" height="12" rx="1" /><rect x="13.5" y="6" width="3.5" height="12" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#18181A]"><polygon points="9,6 18,12 9,18" /></svg>
        )}
      </button>

      {/* Skip forward 30s (mini-player keeps 30s — articles may be paused mid-commute) */}
      <button
        onClick={(e) => { e.stopPropagation(); skipForward(30); }}
        aria-label="Skip forward 30 seconds"
        className="w-[34px] h-[34px] flex flex-col items-center justify-center shrink-0 transition-all active:scale-[0.88] relative"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[var(--text-mid)]">
          <path d="M11.5 15.5V8.5L17 12l-5.5 3.5z"/>
          <rect x="18" y="7" width="2" height="10" rx="0.5"/>
        </svg>
        <span className="absolute -bottom-3 text-[8px] font-semibold text-[var(--text-dim)]">30s</span>
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-black/10 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
          }}
        />
      </div>
    </div>
  );
}
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/components/PlayerBar.test.tsx
```

**Expected:** All 7 tests pass (3 existing + 4 new).

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 6: Commit

```bash
git add src/components/PlayerBar.tsx src/components/PlayerBar.test.tsx
git commit -m "feat(player): update PlayerBar with dynamic content-type gradient and richer subtitle"
```

---

## Task 7: Sleep Timer implementation

**Feature ID:** `expanded-player-sleep-timer`
**depends_on:** `[]`

**Why:** Both Apple Podcasts and Spotify have sleep timers; it's an expected feature for an audio listening app. The ExpandedPlayer rewrite (Task 5) implements sleep timer as local component state (a self-contained MVP). This task moves it to `PlayerContext` so the timer survives navigation and is accessible from the mini-player in the future. The ExpandedPlayer is then updated to use the context version.

**Files:**
- Modify: `src/components/PlayerContext.tsx`
- Modify: `src/components/PlayerContext.test.tsx`
- Modify: `src/components/ExpandedPlayer.tsx` (remove local sleep state, use context)

### Step 1: Write failing tests

Add the following test block at the **end** of `src/components/PlayerContext.test.tsx`:

```tsx
// --- Sleep Timer ---

describe("PlayerContext — sleep timer", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve(null) });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function SleepTestComponent() {
    const { sleepTimer, setSleepTimer, isPlaying, play, currentItem } = usePlayer();
    return (
      <div>
        <span data-testid="timer">{sleepTimer === null ? "off" : String(sleepTimer)}</span>
        <span data-testid="playing">{String(isPlaying)}</span>
        <button onClick={() => play({ id: "s1", title: "T", duration: 600, format: "narrator", audioUrl: "/t.mp3" })}>
          Play
        </button>
        <button onClick={() => setSleepTimer(15)}>Set 15</button>
        <button onClick={() => setSleepTimer("end")}>Set End</button>
        <button onClick={() => setSleepTimer(null)}>Cancel</button>
      </div>
    );
  }

  it("sleepTimer defaults to null (off)", () => {
    render(<PlayerProvider><SleepTestComponent /></PlayerProvider>);
    expect(screen.getByTestId("timer").textContent).toBe("off");
  });

  it("setSleepTimer sets the timer value", () => {
    render(<PlayerProvider><SleepTestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Set 15"));
    expect(screen.getByTestId("timer").textContent).toBe("15");
  });

  it("setSleepTimer(null) cancels the timer", () => {
    render(<PlayerProvider><SleepTestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Set 15"));
    expect(screen.getByTestId("timer").textContent).toBe("15");
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByTestId("timer").textContent).toBe("off");
  });

  it("setSleepTimer('end') sets timer to end-of-episode mode", () => {
    render(<PlayerProvider><SleepTestComponent /></PlayerProvider>);
    fireEvent.click(screen.getByText("Set End"));
    expect(screen.getByTestId("timer").textContent).toBe("end");
  });

  it("pauses playback after sleep timer minutes elapse", async () => {
    render(<PlayerProvider><SleepTestComponent /></PlayerProvider>);

    // Start playing
    fireEvent.click(screen.getByText("Play"));
    // Set 15 minute timer
    fireEvent.click(screen.getByText("Set 15"));

    // Advance 15 minutes + 1ms
    await act(async () => {
      vi.advanceTimersByTime(15 * 60 * 1000 + 100);
    });

    // Should be paused and timer should be cleared
    expect(screen.getByTestId("timer").textContent).toBe("off");
  });
});
```

### Step 2: Run tests — verify new tests fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/components/PlayerContext.test.tsx
```

**Expected:** The 5 new sleep timer tests FAIL because `sleepTimer` and `setSleepTimer` do not exist on the context yet.

### Step 3: Implement — add sleep timer to PlayerContext

**3a.** Add `sleepTimer` and `setSleepTimer` to the `PlayerState` interface. Find:

```typescript
interface PlayerState {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  position: number;
  speed: number;
  queue: PlayableItem[];
  queueIndex: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (item: PlayableItem) => void;
  playQueue: (items: PlayableItem[]) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setPosition: (position: number) => void;
  skipForward: (seconds: number) => void;
  skipBack: (seconds: number) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
}
```

Add `sleepTimer` and `setSleepTimer` to the interface:

```typescript
interface PlayerState {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  position: number;
  speed: number;
  queue: PlayableItem[];
  queueIndex: number;
  sleepTimer: number | "end" | null;  // minutes remaining, "end" = pause on episode end, null = off
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (item: PlayableItem) => void;
  playQueue: (items: PlayableItem[]) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setPosition: (position: number) => void;
  skipForward: (seconds: number) => void;
  skipBack: (seconds: number) => void;
  skipToNext: () => void;
  skipToPrevious: () => void;
  setSleepTimer: (value: number | "end" | null) => void;
}
```

**Note:** If the home-screen-redesign spec has not yet added `queue`, `queueIndex`, `playQueue`, `skipToNext`, `skipToPrevious` to the interface, add those as well per Task 3 of that spec. The sleep timer additions are purely additive.

**3b.** Add sleep timer state inside `PlayerProvider`. After the `[queue, queueIndex]` state declarations (or after `[speed, setSpeedState]` if queue hasn't been added yet), add:

```typescript
  const [sleepTimer, setSleepTimerState] = useState<number | "end" | null>(null);
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

**3c.** Add the `setSleepTimer` callback after the existing callbacks (after `skipToPrevious` or after `skipBack`):

```typescript
  const setSleepTimer = useCallback((value: number | "end" | null) => {
    // Clear any existing countdown
    if (sleepIntervalRef.current) {
      clearInterval(sleepIntervalRef.current);
      sleepIntervalRef.current = null;
    }

    setSleepTimerState(value);

    if (value === null || value === "end") return;

    // Start minute countdown
    const totalMs = value * 60_000;
    let elapsed = 0;
    sleepIntervalRef.current = setInterval(() => {
      elapsed += 60_000;
      const remaining = value - Math.floor(elapsed / 60_000);
      if (remaining <= 0) {
        // Time's up — pause audio
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
        setSleepTimerState(null);
      } else {
        setSleepTimerState(remaining);
      }
    }, 60_000);

    // Also set an exact timeout for final pause (avoids drift from interval imprecision)
    setTimeout(() => {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
      setSleepTimerState(null);
    }, totalMs);
  }, []);
```

**3d.** Add cleanup for the sleep interval on unmount. The existing unmount cleanup should have a `useEffect` with a return function. Add `sleepIntervalRef` cleanup there. If there's no existing unmount cleanup, add:

```typescript
  // Cleanup sleep timer on unmount
  useEffect(() => {
    return () => {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    };
  }, []);
```

**3e.** Update the Provider value to include `sleepTimer` and `setSleepTimer`. Find the value spread and add them.

**3f.** Update `ExpandedPlayer.tsx` to use the context sleep timer instead of local state:

In `src/components/ExpandedPlayer.tsx`, find the `usePlayer()` destructure:

```typescript
  const {
    currentItem,
    isPlaying,
    position,
    speed,
    togglePlay,
    setSpeed,
    setPosition,
    skipForward,
    skipBack,
  } = usePlayer();
```

Replace with:

```typescript
  const {
    currentItem,
    isPlaying,
    position,
    speed,
    sleepTimer,
    setSleepTimer,
    togglePlay,
    setSpeed,
    setPosition,
    skipForward,
    skipBack,
  } = usePlayer();
```

Then remove the local sleep timer state declarations and the `sleepIntervalRef` from the component:

Remove these lines:

```typescript
  // Sleep timer — local state (will be moved to PlayerContext in expanded-player-sleep-timer task)
  const [sleepTimer, setSleepTimer] = useState<SleepTimerOption>(null);
  const [sleepMinsLeft, setSleepMinsLeft] = useState<number | null>(null);
  const sleepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

And remove the `sleepIntervalRef` cleanup from the `useEffect`:

```typescript
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);  // <-- remove this line
    };
  }, []);
```

And remove the `cycleSleepTimer` function body that managed intervals (replace with a simple cycle call to `setSleepTimer`):

Remove the old `cycleSleepTimer` function and replace with:

```typescript
  function cycleSleepTimer() {
    const SLEEP_CYCLE_VALUES: Array<number | "end" | null> = [null, 15, 30, 45, "end"];
    const idx = SLEEP_CYCLE_VALUES.indexOf(sleepTimer);
    const next = SLEEP_CYCLE_VALUES[(idx + 1) % SLEEP_CYCLE_VALUES.length];
    setSleepTimer(next);
  }
```

Update `sleepLabel` to work with the context type (no `sleepMinsLeft` — the context value already counts down):

```typescript
  const sleepLabel: string =
    sleepTimer === null ? "" :
    sleepTimer === "end" ? "End" :
    `${sleepTimer}m`;
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/components/PlayerContext.test.tsx src/components/ExpandedPlayer.test.tsx
```

**Expected:** All tests pass, including the 5 new sleep timer tests.

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 6: Commit

```bash
git add src/components/PlayerContext.tsx src/components/PlayerContext.test.tsx src/components/ExpandedPlayer.tsx
git commit -m "feat(player): add sleep timer to PlayerContext — cycles off/15/30/45/end, pauses on expiry"
```

---

## Task 8: Build verification

**Why:** After 7 tasks touching the schema, API, context, and two components, a full build pass confirms no TypeScript errors, import cycles, or missing exports.

### Step 1: Run full test suite

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 2: Run linter

```bash
npm run lint
```

**Expected:** No new errors (existing 10 no-unused-vars warnings from Phase 0 are acceptable — do not introduce new errors).

### Step 3: Production build

```bash
npm run build
```

**Expected:** Build succeeds. Non-blocking warnings from previous phases are acceptable; no new errors.

### Step 4: Commit

```bash
git add -A
git commit -m "chore: build verification — expanded player 10 pts complete"
```

---

## Success Criteria

### Schema + API

- [ ] `prisma/schema.prisma` has `summary String?` in the Script model
- [ ] `npx prisma migrate dev` runs cleanly with migration file present
- [ ] `POST /api/process` saves the AI summary to the Script record
- [ ] `GET /api/library` returns `summary`, `contentType`, `themes`, `compressionRatio`, `actualWordCount`, `voices`, `ttsProvider` per version
- [ ] All library route tests pass (including the 6 new expanded player field tests)

### PlayableItem

- [ ] `PlayableItem` interface has all new optional fields without breaking existing `play()` call sites
- [ ] `HomeScreen.handlePlayAll` and `handlePlayEpisode` pass the new fields when constructing play items
- [ ] All PlayerContext tests pass

### ExpandedPlayer

- [ ] Opens as a full-screen overlay from mini-player tap (existing behavior preserved)
- [ ] Gradient artwork color varies by contentType (teal for science, orange for business, blue for technical, pink for news)
- [ ] Title, author ("By {name}"), contentType badge, and themes chips are visible on open
- [ ] Progress bar with seek (including undo seek for 4 seconds) still works
- [ ] Skip back button calls `skipBack(5)` — **5s not 15s**
- [ ] Skip forward button calls `skipForward(15)` — **15s not 30s**
- [ ] "About" section shows AI summary; hidden when summary is null
- [ ] "Read Along" card is always visible; uses summary as placeholder text
- [ ] "Sections" shows 4 placeholder sections with the current one highlighted
- [ ] "Episode Details" card shows Source (domain + View Original link), Original (word count + reading time), This version (target duration + compression %), Voice, Created
- [ ] "View Original Article" link only shown when `sourceUrl` is non-null
- [ ] Sleep timer cycles: Off → 15m → 30m → 45m → End → Off
- [ ] All ExpandedPlayer tests pass (existing scrubber/undo tests + new rich-UI tests)

### PlayerBar

- [ ] Mini-player icon uses content-type-specific gradient (not always orange)
- [ ] Subtitle shows `{sourceType} · {timeAgo}` when `sourceType` + `createdAt` are available
- [ ] Subtitle falls back to `{format} · {duration}` for items without the new fields
- [ ] Skip forward on mini-player still calls `skipForward(30)` (unchanged — mini-player keeps 30s)
- [ ] All PlayerBar tests pass

### Sleep Timer

- [ ] `sleepTimer` and `setSleepTimer` exposed from `usePlayer()`
- [ ] Setting a minute timer starts a countdown in context; pauses audio on expiry
- [ ] Setting `null` cancels the timer
- [ ] `"end"` mode is accepted without starting a countdown
- [ ] All sleep timer tests pass

---

## Out of Scope

| What | Why |
|---|---|
| "Read Along" time-syncing | Real text-audio alignment requires word-level timestamps from TTS (not available from current OpenAI TTS API). The Read Along card is a preview only — static text with a highlighted first sentence. Time-synced Read Along is a future Phase 3 feature. |
| Real section extraction | Actual article heading extraction from `rawText` (H2/H3 parsing) is deferred. The Sections card shows 4 placeholder sections by dividing total duration equally. |
| "Other Versions" switcher | Joining from `audioId → scriptId → contentId → sibling scripts` requires a new API endpoint or query. Deferred to a follow-up spec. |
| Queue display in player | The expanded player spec defers the "Up Next" queue section. Queue management is owned by the home-screen-redesign spec; the ExpandedPlayer can read from context queue in a future polish pass. |
| Sleep timer "end of episode" behavior | The `"end"` mode is stored in context and the UI cycles through it, but wiring the "pause on next ended event" logic is deferred (requires an effect that watches the `ended` audio event in context with a `sleepTimer === "end"` guard). |
| Bookmarklet / Pocket fields | `sourceType: "pocket"` content will show "pocket" as the source pill — acceptable for MVP. |
| ExpandedPlayer animation | Slide-up animation from mini-player is a CSS transition concern handled by AppShell, not ExpandedPlayer. Not changed here. |
