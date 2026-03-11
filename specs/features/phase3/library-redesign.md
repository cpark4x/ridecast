> **Design reference:** `docs/mockups/library-view.html`
> **Depends on:** `specs/features/phase3/home-screen-redesign.md` (tasks: home-screen-api, home-screen-nav-restructure, home-screen-content-display-utils)

# Library Screen Redesign — Dev-Machine Spec

## Motivation

The current Library screen is a functional but bare content list: cards with a title, source type badge, and a "Ready" / "Generating" status indicator. It does the job of displaying what's in the library, but it does nothing to help the user manage it. There's no way to find a specific article, no indication of what you've started listening to, no sense of which items are finished vs. unplayed. And uploading new content requires navigating to a separate Upload tab — friction that disappears if upload is just the "+" button.

The redesign turns the Library into a full content management experience that matches the approved mockup at `docs/mockups/library-view.html`:

- **Search bar** — filter your library by title or author instantly
- **Filter chips** — All / Unplayed / In Progress / Completed / Generating
- **Progress bars on cards** — see exactly how far you've listened into each item
- **Played state** — completed content is visually dimmed with a checkmark; it's still there but doesn't demand attention
- **Author display** — when the source has a byline, it shows
- **Process new version** — expand any card and tap "+ Process new version" to get a different duration cut without re-uploading
- **Upload as modal** — the FAB "+" opens a bottom sheet instead of a full tab switch; you can upload without losing your place in the library

This spec builds directly on the home-screen-redesign spec. Several tasks there are prerequisites:
- `home-screen-api` adds `completed`, `position`, `author`, `sourceUrl` to the library API response
- `home-screen-nav-restructure` restructures to 2 tabs + FAB and sets up `showUploadModal` state in AppShell
- `home-screen-content-display-utils` creates the shared `gradients`, `sourceIcons`, `timeAgo`, `getTitleFallback` utilities

This spec does NOT duplicate any of that work. It imports from those utilities and builds the Library-specific pieces on top.

---

## What We're Building

| Component | Files | Purpose |
|---|---|---|
| Filter hook | `src/hooks/useLibraryFilter.ts` (create) | Encapsulate search + filter state and derived filtered list |
| Progress utils | `src/lib/ui/library-progress.ts` (create) | Calculate per-card and per-version progress from PlaybackState |
| UploadModal | `src/components/UploadModal.tsx` (create) | Extract inline upload JSX from AppShell into a reusable component |
| Process new version | `src/components/ProcessNewVersionModal.tsx` (create) | Duration picker modal to regenerate a version |
| LibraryScreen rewrite | `src/components/LibraryScreen.tsx` (rewrite) | Assemble all pieces into the full redesigned screen |
| AppShell update | `src/components/AppShell.tsx` (modify) | Use `<UploadModal>` component instead of inline JSX |

---

## Files Summary

**Create:**

| File | Purpose |
|---|---|
| `src/hooks/useLibraryFilter.ts` | Search + filter hook |
| `src/hooks/__tests__/useLibraryFilter.test.ts` | Tests for filter hook |
| `src/lib/ui/library-progress.ts` | Progress calculation utilities |
| `src/lib/ui/__tests__/library-progress.test.ts` | Tests for progress utilities |
| `src/components/UploadModal.tsx` | Bottom sheet upload modal component |
| `src/components/UploadModal.test.tsx` | Tests for UploadModal |
| `src/components/ProcessNewVersionModal.tsx` | Duration picker for re-processing |
| `src/components/ProcessNewVersionModal.test.tsx` | Tests for ProcessNewVersionModal |

**Rewrite / Modify:**

| File | Purpose |
|---|---|
| `src/components/LibraryScreen.tsx` | Complete rewrite |
| `src/components/LibraryScreen.test.tsx` | Complete rewrite of tests |
| `src/components/AppShell.tsx` | Use `<UploadModal>` instead of inline upload JSX |

---

## Table of Contents

1. [Task 1: Search and filter hook](#task-1-search-and-filter-hook)
2. [Task 2: Progress calculation utilities](#task-2-progress-calculation-utilities)
3. [Task 3: Card enhancement — author display and rich play()](#task-3-card-enhancement--author-display-and-rich-play)
4. [Task 4: UploadModal component](#task-4-uploadmodal-component)
5. [Task 5: Process new version modal](#task-5-process-new-version-modal)
6. [Task 6: LibraryScreen rewrite](#task-6-libraryscreen-rewrite)
7. [Task 7: Build verification](#task-7-build-verification)

---

## Task 1: Search and filter hook

**Feature ID:** `library-search-filter`
**depends_on:** `["home-screen-api"]`

**Why:** Search and filtering logic is complex enough to warrant its own hook. It needs a 200ms debounce for search, AND-composition between search and chip filter, and correct filter semantics for each chip. Extracting this into `useLibraryFilter` keeps the LibraryScreen component focused on rendering and makes the logic independently testable.

**Files:**
- Create: `src/hooks/useLibraryFilter.ts`
- Create: `src/hooks/__tests__/useLibraryFilter.test.ts`

### Step 1: Write failing tests

Create `src/hooks/__tests__/useLibraryFilter.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLibraryFilter } from "../useLibraryFilter";

// Control timers for debounce testing
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// ---- Fixture data ----

const UNPLAYED = {
  id: "c1",
  title: "Psychology of Decision Making",
  author: "Daniel Kahneman",
  versions: [{ status: "ready", completed: false, position: 0 }],
};

const IN_PROGRESS = {
  id: "c2",
  title: "System 1 vs System 2",
  author: null,
  versions: [{ status: "ready", completed: false, position: 120 }],
};

const COMPLETED = {
  id: "c3",
  title: "Distributed Systems",
  author: "Martin Kleppmann",
  versions: [{ status: "ready", completed: true, position: 900 }],
};

const GENERATING = {
  id: "c4",
  title: "The Innovator's Dilemma",
  author: "Clayton Christensen",
  versions: [{ status: "generating", completed: false, position: 0 }],
};

const ALL_ITEMS = [UNPLAYED, IN_PROGRESS, COMPLETED, GENERATING];

// ---- Tests ----

describe("useLibraryFilter — initial state", () => {
  it("returns all items by default (filter='all', no search)", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    expect(result.current.filtered).toHaveLength(4);
  });

  it("defaults query to empty string", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    expect(result.current.query).toBe("");
  });

  it("defaults activeFilter to 'all'", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    expect(result.current.activeFilter).toBe("all");
  });
});

describe("useLibraryFilter — search by title", () => {
  it("filters by title substring (case-insensitive) after debounce", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));

    act(() => {
      result.current.setQuery("psychology");
    });

    // Before debounce fires, filtered is still all items
    expect(result.current.filtered).toHaveLength(4);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c1");
  });

  it("is case-insensitive", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => {
      result.current.setQuery("DISTRIBUTED");
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c3");
  });

  it("returns empty array when no titles match", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => {
      result.current.setQuery("zzznomatch");
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filtered).toHaveLength(0);
  });
});

describe("useLibraryFilter — search by author", () => {
  it("filters by author substring (case-insensitive)", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => {
      result.current.setQuery("kahneman");
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c1");
  });

  it("items with null author still match on title", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => {
      result.current.setQuery("system 1");
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c2");
  });
});

describe("useLibraryFilter — debounce", () => {
  it("does NOT filter before 200ms", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => {
      result.current.setQuery("psychology");
      vi.advanceTimersByTime(199);
    });
    expect(result.current.filtered).toHaveLength(4); // still all
  });

  it("filters at exactly 200ms", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => {
      result.current.setQuery("psychology");
      vi.advanceTimersByTime(200);
    });
    expect(result.current.filtered).toHaveLength(1);
  });
});

describe("useLibraryFilter — filter chips", () => {
  it("'unplayed' chip: shows items where all versions have position=0 and !completed", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => { result.current.setActiveFilter("unplayed"); });
    // UNPLAYED matches; GENERATING has status=generating but position=0 — UNPLAYED only
    // GENERATING has status=generating so it doesn't qualify for unplayed (no ready version)
    const ids = result.current.filtered.map((i) => i.id);
    expect(ids).toContain("c1");
    expect(ids).not.toContain("c2"); // in-progress
    expect(ids).not.toContain("c3"); // completed
  });

  it("'in-progress' chip: shows items with at least one version with position>0 and !completed", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => { result.current.setActiveFilter("in-progress"); });
    const ids = result.current.filtered.map((i) => i.id);
    expect(ids).toContain("c2");
    expect(ids).not.toContain("c1");
    expect(ids).not.toContain("c3");
    expect(ids).not.toContain("c4");
  });

  it("'completed' chip: shows items with at least one version with completed=true", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => { result.current.setActiveFilter("completed"); });
    const ids = result.current.filtered.map((i) => i.id);
    expect(ids).toContain("c3");
    expect(ids).not.toContain("c1");
    expect(ids).not.toContain("c2");
    expect(ids).not.toContain("c4");
  });

  it("'generating' chip: shows items with at least one version with status='generating'", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => { result.current.setActiveFilter("generating"); });
    const ids = result.current.filtered.map((i) => i.id);
    expect(ids).toContain("c4");
    expect(ids).not.toContain("c1");
    expect(ids).not.toContain("c2");
    expect(ids).not.toContain("c3");
  });

  it("'all' chip: shows everything", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => { result.current.setActiveFilter("completed"); });
    act(() => { result.current.setActiveFilter("all"); });
    expect(result.current.filtered).toHaveLength(4);
  });
});

describe("useLibraryFilter — composed search + filter (AND logic)", () => {
  it("applies search AND chip filter together", () => {
    // Add a second completed item
    const items = [
      ...ALL_ITEMS,
      {
        id: "c5",
        title: "The Phoenix Project",
        author: "Gene Kim",
        versions: [{ status: "ready", completed: true, position: 1200 }],
      },
    ];
    const { result } = renderHook(() => useLibraryFilter(items));

    act(() => {
      result.current.setActiveFilter("completed");
      result.current.setQuery("kleppmann");
      vi.advanceTimersByTime(200);
    });

    // Both c3 and c5 are "completed", but only c3 matches "kleppmann" (Kleppmann is author)
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c3");
  });
});
```

### Step 2: Run tests — verify they fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/hooks/__tests__/useLibraryFilter.test.ts
```

**Expected:** FAIL — `src/hooks/useLibraryFilter.ts` does not exist yet.

### Step 3: Implement — create the filter hook

Create `src/hooks/useLibraryFilter.ts`:

```typescript
import { useState, useEffect, useMemo } from "react";

export type FilterChip = "all" | "unplayed" | "in-progress" | "completed" | "generating";

interface FilterableVersion {
  status: string;
  completed: boolean;
  position: number;
}

interface FilterableItem {
  id: string;
  title: string;
  author?: string | null;
  versions: FilterableVersion[];
}

export function useLibraryFilter<T extends FilterableItem>(items: T[]) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");

  // Debounce search input by 200ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = useMemo(() => {
    let result: T[] = items;

    // 1. Apply search filter (debounced)
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.author?.toLowerCase().includes(q) ?? false)
      );
    }

    // 2. Apply chip filter (AND with search)
    if (activeFilter !== "all") {
      result = result.filter((item) => {
        const versions = item.versions ?? [];
        switch (activeFilter) {
          case "unplayed":
            // All ready versions have position=0 and are not completed
            return versions.every((v) => v.position === 0 && !v.completed);
          case "in-progress":
            // At least one version has started but not completed
            return versions.some((v) => v.position > 0 && !v.completed);
          case "completed":
            // At least one version is fully completed
            return versions.some((v) => v.completed);
          case "generating":
            // At least one version is still generating
            return versions.some((v) => v.status === "generating");
          default:
            return true;
        }
      });
    }

    return result;
  }, [items, debouncedQuery, activeFilter]);

  return {
    query,
    setQuery,
    activeFilter,
    setActiveFilter,
    filtered,
  };
}
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/hooks/__tests__/useLibraryFilter.test.ts
```

**Expected:** All tests pass.

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All existing tests pass, 0 failures.

### Step 6: Commit

```bash
git add src/hooks/useLibraryFilter.ts src/hooks/__tests__/useLibraryFilter.test.ts
git commit -m "feat(library): add useLibraryFilter hook — search (200ms debounce) + chip filter (All/Unplayed/InProgress/Completed/Generating)"
```

---

## Task 2: Progress calculation utilities

**Feature ID:** `library-progress-display`
**depends_on:** `["home-screen-api", "home-screen-content-display-utils"]`

**Why:** Calculating the "most listened" version (for the card-level progress bar) and per-version progress percentages is pure logic that should live in a utility module — not inside the component. The `home-screen-api` task adds `position`, `completed`, and `durationSecs` to the library API response, which these utilities consume.

**Files:**
- Create: `src/lib/ui/library-progress.ts`
- Create: `src/lib/ui/__tests__/library-progress.test.ts`

### Step 1: Write failing tests

Create `src/lib/ui/__tests__/library-progress.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  getCardProgress,
  getMostListenedVersion,
  getVersionProgress,
  isItemPlayed,
} from "../library-progress";

// ---- Fixture versions ----

const UNLISTENED = {
  audioId: "a1",
  durationSecs: 600,
  position: 0,
  completed: false,
  status: "ready" as const,
};

const PARTIAL = {
  audioId: "a2",
  durationSecs: 600,
  position: 300,
  completed: false,
  status: "ready" as const,
};

const COMPLETED_V = {
  audioId: "a3",
  durationSecs: 600,
  position: 600,
  completed: true,
  status: "ready" as const,
};

const NO_DURATION = {
  audioId: null,
  durationSecs: null,
  position: 0,
  completed: false,
  status: "generating" as const,
};

// ---- getMostListenedVersion ----

describe("getMostListenedVersion", () => {
  it("returns the version with the highest position/duration ratio", () => {
    const v1 = { ...UNLISTENED }; // ratio = 0
    const v2 = { ...PARTIAL };    // ratio = 0.5
    const v3 = { ...COMPLETED_V }; // ratio = 1.0
    const result = getMostListenedVersion([v1, v2, v3]);
    expect(result?.audioId).toBe("a3");
  });

  it("returns the only version when array has one item", () => {
    const result = getMostListenedVersion([PARTIAL]);
    expect(result?.audioId).toBe("a2");
  });

  it("returns null for empty array", () => {
    expect(getMostListenedVersion([])).toBeNull();
  });

  it("skips versions with null durationSecs (generating)", () => {
    const result = getMostListenedVersion([NO_DURATION, PARTIAL]);
    expect(result?.audioId).toBe("a2");
  });

  it("returns null when all versions have null duration", () => {
    expect(getMostListenedVersion([NO_DURATION])).toBeNull();
  });
});

// ---- getCardProgress ----

describe("getCardProgress", () => {
  it("returns 0 when all versions have position=0", () => {
    expect(getCardProgress([UNLISTENED])).toBe(0);
  });

  it("returns the progress ratio of the most-listened version", () => {
    expect(getCardProgress([UNLISTENED, PARTIAL])).toBeCloseTo(0.5);
  });

  it("returns 1.0 when a version is completed", () => {
    expect(getCardProgress([COMPLETED_V])).toBe(1.0);
  });

  it("returns 0 for empty versions array", () => {
    expect(getCardProgress([])).toBe(0);
  });

  it("returns 0 when only generating versions exist", () => {
    expect(getCardProgress([NO_DURATION])).toBe(0);
  });

  it("is capped at 1.0 even if position somehow exceeds duration", () => {
    const overShot = { ...PARTIAL, position: 700, durationSecs: 600 };
    expect(getCardProgress([overShot])).toBe(1.0);
  });
});

// ---- getVersionProgress ----

describe("getVersionProgress", () => {
  it("returns 0 for unlistened version", () => {
    expect(getVersionProgress(UNLISTENED)).toBe(0);
  });

  it("returns 0.5 for halfway-through version", () => {
    expect(getVersionProgress(PARTIAL)).toBeCloseTo(0.5);
  });

  it("returns 1.0 for completed version", () => {
    expect(getVersionProgress(COMPLETED_V)).toBe(1.0);
  });

  it("returns 0 when durationSecs is null", () => {
    expect(getVersionProgress(NO_DURATION)).toBe(0);
  });
});

// ---- isItemPlayed ----

describe("isItemPlayed", () => {
  it("returns true when at least one version is completed", () => {
    expect(isItemPlayed([UNLISTENED, COMPLETED_V])).toBe(true);
  });

  it("returns false when no versions are completed", () => {
    expect(isItemPlayed([UNLISTENED, PARTIAL])).toBe(false);
  });

  it("returns false for empty versions array", () => {
    expect(isItemPlayed([])).toBe(false);
  });
});
```

### Step 2: Run tests — verify they fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/lib/ui/__tests__/library-progress.test.ts
```

**Expected:** FAIL — `src/lib/ui/library-progress.ts` does not exist yet.

### Step 3: Implement — create the progress utilities

Create `src/lib/ui/library-progress.ts`:

```typescript
/**
 * Progress calculation utilities for the Library screen.
 * Consumes PlaybackState data from the /api/library response
 * (added by home-screen-api task).
 */

interface ProgressVersion {
  audioId: string | null;
  durationSecs: number | null;
  position: number;
  completed: boolean;
  status: string;
}

/**
 * Find the version the user has listened to the most (highest position/duration ratio).
 * Skips versions without a valid duration (e.g. still generating).
 */
export function getMostListenedVersion<T extends ProgressVersion>(
  versions: T[]
): T | null {
  let best: T | null = null;
  let bestRatio = -1;

  for (const v of versions) {
    if (!v.durationSecs || v.durationSecs <= 0) continue;
    const ratio = Math.min(1, v.position / v.durationSecs);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = v;
    }
  }

  return best;
}

/**
 * Get the card-level progress as a ratio 0–1.
 * Uses the most-listened version. Returns 0 if no progress or no valid versions.
 */
export function getCardProgress(versions: ProgressVersion[]): number {
  const v = getMostListenedVersion(versions);
  if (!v || !v.durationSecs || v.durationSecs <= 0) return 0;
  return Math.min(1, v.position / v.durationSecs);
}

/**
 * Get a single version's progress as a ratio 0–1.
 */
export function getVersionProgress(version: ProgressVersion): number {
  if (!version.durationSecs || version.durationSecs <= 0) return 0;
  return Math.min(1, version.position / version.durationSecs);
}

/**
 * Returns true if at least one version in the item is marked completed.
 */
export function isItemPlayed(versions: ProgressVersion[]): boolean {
  return versions.some((v) => v.completed);
}
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/lib/ui/__tests__/library-progress.test.ts
```

**Expected:** All 16 tests pass.

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 6: Commit

```bash
git add src/lib/ui/library-progress.ts src/lib/ui/__tests__/library-progress.test.ts
git commit -m "feat(library): add library-progress utilities — getMostListenedVersion, getCardProgress, getVersionProgress, isItemPlayed"
```

---

## Task 3: Card enhancement — author display and rich play()

**Feature ID:** `library-card-enhancement`
**depends_on:** `["home-screen-api", "home-screen-content-display-utils"]`

**Why:** The library API now returns `author`, `sourceUrl`, and PlaybackState data. The current `handlePlay` in `LibraryScreen` only passes `id`, `title`, `duration`, `format`, `audioUrl` — none of the rich fields that the expanded player needs (added by the `expanded-player-playable-item` task). This task updates the LibraryScreen's `handlePlay` to pass the full PlayableItem, and verifies the subtitle logic. The actual card UI is assembled in the full rewrite (Task 6); this task documents the interface contract and adds the subtitle test.

**Note:** This task is intentionally small — it defines the data contract for how LibraryScreen talks to `play()`. The full card UI is in Task 6.

**Files:**
- Modify: `src/components/LibraryScreen.tsx` (update interfaces + handlePlay)
- Modify: `src/components/LibraryScreen.test.tsx` (add subtitle and rich play() tests)

### Step 1: Read the current LibraryScreen test file

```bash
cat src/components/LibraryScreen.test.tsx
```

### Step 2: Write failing tests

In `src/components/LibraryScreen.test.tsx`, add the following tests at the **end** of the existing test suite:

```typescript
// --- NEW: author display ---

describe("LibraryScreen — author display and card subtitle", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => libraryWithAuthor });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const libraryWithAuthor = [
    {
      id: "c1",
      title: "Thinking Fast and Slow",
      author: "Daniel Kahneman",
      sourceType: "url",
      sourceUrl: "https://example.com/article",
      createdAt: new Date().toISOString(),
      wordCount: 8400,
      versions: [
        {
          scriptId: "s1",
          audioId: "a1",
          audioUrl: "/audio/a1.mp3",
          durationSecs: 900,
          targetDuration: 15,
          format: "narrator",
          status: "ready" as const,
          createdAt: new Date().toISOString(),
          completed: false,
          position: 0,
        },
      ],
    },
    {
      id: "c2",
      title: "A PDF Without Author",
      author: null,
      sourceType: "pdf",
      sourceUrl: null,
      createdAt: new Date().toISOString(),
      wordCount: 2000,
      versions: [
        {
          scriptId: "s2",
          audioId: "a2",
          audioUrl: "/audio/a2.mp3",
          durationSecs: 300,
          targetDuration: 5,
          format: "narrator",
          status: "ready" as const,
          createdAt: new Date().toISOString(),
          completed: false,
          position: 0,
        },
      ],
    },
  ];

  it("shows author name in card subtitle when author is present", async () => {
    render(
      <PlayerProvider>
        <LibraryScreen visible={true} />
      </PlayerProvider>
    );
    await waitFor(() => {
      expect(screen.getByText(/Daniel Kahneman/)).toBeInTheDocument();
    });
  });

  it("does not show 'By null' when author is absent", async () => {
    render(
      <PlayerProvider>
        <LibraryScreen visible={true} />
      </PlayerProvider>
    );
    await waitFor(() => {
      expect(screen.queryByText(/By null/)).not.toBeInTheDocument();
    });
  });
});
```

### Step 3: Run tests — verify the new tests fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/components/LibraryScreen.test.tsx
```

**Expected:** The 2 new tests FAIL because the current `LibraryScreen` does not display the author field.

### Step 4: Implement — update LibraryScreen interfaces and card subtitle

In `src/components/LibraryScreen.tsx`, make these changes:

**4a.** Add `author`, `sourceUrl` to the `LibraryItem` interface. Find:

```typescript
interface LibraryItem {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}
```

Replace with:

```typescript
interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}
```

**4b.** Add `completed` and `position` to the `AudioVersion` interface. Find:

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
}
```

Replace with:

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
}
```

**4c.** Update the card subtitle row to show author. Find:

```typescript
                    <div className="text-xs text-[var(--text-mid)] flex items-center gap-2">
                      <span className="uppercase">{item.sourceType}</span>
                      <span>&middot;</span>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
```

Replace with:

```typescript
                    <div className="text-xs text-[var(--text-mid)] flex items-center gap-2 flex-wrap">
                      {item.author && (
                        <>
                          <span>{item.author}</span>
                          <span>&middot;</span>
                        </>
                      )}
                      <span className="uppercase">{item.sourceType}</span>
                      <span>&middot;</span>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
```

**4d.** Update `handlePlay` to pass rich fields:

Find:

```typescript
  function handlePlay(item: LibraryItem, version: AudioVersion) {
    if (version.status !== "ready" || !version.audioUrl || !version.audioId) return;
    play({
      id: version.audioId,
      title: item.title,
      duration: version.durationSecs ?? 0,
      format: version.format ?? "narrator",
      audioUrl: version.audioUrl,
    });
  }
```

Replace with:

```typescript
  function handlePlay(item: LibraryItem, version: AudioVersion) {
    if (version.status !== "ready" || !version.audioUrl || !version.audioId) return;
    play({
      id: version.audioId,
      title: item.title || (item.sourceUrl ? new URL(item.sourceUrl).hostname.replace(/^www\./, "") : item.sourceType.toUpperCase()),
      duration: version.durationSecs ?? 0,
      format: version.format ?? "narrator",
      audioUrl: version.audioUrl,
      author: item.author ?? null,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl ?? null,
      targetDuration: version.targetDuration,
      wordCount: item.wordCount,
    });
  }
```

### Step 5: Run tests — verify all pass

```bash
npx vitest run src/components/LibraryScreen.test.tsx
```

**Expected:** All tests pass (existing + 2 new).

### Step 6: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass, 0 failures.

### Step 7: Commit

```bash
git add src/components/LibraryScreen.tsx src/components/LibraryScreen.test.tsx
git commit -m "feat(library): add author display to cards, extend handlePlay with rich PlayableItem fields"
```

---

## Task 4: UploadModal component

**Feature ID:** `library-upload-modal`
**depends_on:** `["home-screen-nav-restructure"]`

**Why:** The `home-screen-nav-restructure` task adds an inline upload modal to `AppShell` (an `{showUploadModal && (...)}` block with the overlay JSX inlined). This task extracts that inline block into a proper `UploadModal` component, which makes it reusable and independently testable. The FAB wiring and `showUploadModal` state remain in AppShell — this task just extracts the presentation layer.

**Files:**
- Create: `src/components/UploadModal.tsx`
- Create: `src/components/UploadModal.test.tsx`
- Modify: `src/components/AppShell.tsx` (use `<UploadModal>` instead of inline JSX)

### Step 1: Write failing tests

Create `src/components/UploadModal.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlayerProvider } from "./PlayerContext";
import { UploadModal } from "./UploadModal";

// Minimal mock for UploadScreen so we don't need all its dependencies
vi.mock("./UploadScreen", () => ({
  UploadScreen: ({ onProcess }: { onProcess: (id: string, mins: number) => void }) => (
    <div>
      <span>Upload Form Content</span>
      <button onClick={() => onProcess("content-123", 5)}>Generate Audio</button>
    </div>
  ),
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderModal(props: Partial<React.ComponentProps<typeof UploadModal>> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onProcess: vi.fn(),
    onImportPocket: vi.fn(),
  };
  return render(
    <PlayerProvider>
      <UploadModal {...defaults} {...props} />
    </PlayerProvider>
  );
}

describe("UploadModal", () => {
  it("renders nothing when isOpen=false", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it("renders 'Add Content' heading when isOpen=true", () => {
    renderModal({ isOpen: true });
    expect(screen.getByText("Add Content")).toBeInTheDocument();
  });

  it("renders the UploadScreen form content inside the modal", () => {
    renderModal({ isOpen: true });
    expect(screen.getByText("Upload Form Content")).toBeInTheDocument();
  });

  it("calls onClose when the X button is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop overlay is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const backdrop = screen.getByTestId("upload-modal-backdrop");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onProcess with contentId and targetMinutes when form submits", async () => {
    const onProcess = vi.fn();
    renderModal({ onProcess });
    fireEvent.click(screen.getByText("Generate Audio"));
    await waitFor(() => {
      expect(onProcess).toHaveBeenCalledWith("content-123", 5);
    });
  });

  it("has a drag handle at the top", () => {
    const { container } = renderModal({ isOpen: true });
    const dragHandle = container.querySelector("[data-testid='drag-handle']");
    expect(dragHandle).not.toBeNull();
  });
});
```

### Step 2: Run tests — verify they fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/components/UploadModal.test.tsx
```

**Expected:** FAIL — `src/components/UploadModal.tsx` does not exist yet.

### Step 3: Create UploadModal component

Create `src/components/UploadModal.tsx`:

```tsx
"use client";

import { UploadScreen } from "./UploadScreen";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcess: (contentId: string, targetMinutes: number) => void;
  onImportPocket: () => void;
}

export function UploadModal({ isOpen, onClose, onProcess, onImportPocket }: UploadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] flex flex-col">
      {/* Backdrop — clicking it closes the modal */}
      <div
        data-testid="upload-modal-backdrop"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Bottom sheet panel */}
      <div className="relative mt-auto bg-[var(--bg)] rounded-t-[20px] max-h-[90%] overflow-y-auto">
        {/* Drag handle */}
        <div
          data-testid="drag-handle"
          className="w-10 h-1 bg-black/20 rounded-full mx-auto mt-3 mb-1"
        />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-bold">Add Content</h2>
          <button
            onClick={onClose}
            aria-label="Close upload modal"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] hover:bg-black/10 transition-colors active:scale-90"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 stroke-[var(--text-mid)] fill-none"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Upload form */}
        <UploadScreen
          onProcess={onProcess}
          onImportPocket={onImportPocket}
        />
      </div>
    </div>
  );
}
```

### Step 4: Update AppShell to use the UploadModal component

**Note:** This step assumes the `home-screen-nav-restructure` task has already run and AppShell has the inline upload modal JSX. Read AppShell first:

```bash
cat src/components/AppShell.tsx
```

Then make these changes to `src/components/AppShell.tsx`:

**4a.** Add the `UploadModal` import. Find the existing imports block and add:

```typescript
import { UploadModal } from "./UploadModal";
```

**4b.** Replace the inline Upload Modal Overlay section. Find:

```typescript
      {/* Upload Modal Overlay */}
      {showUploadModal && (
        <div className="absolute inset-0 z-[60] flex flex-col">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowUploadModal(false)} />
          <div className="relative mt-auto bg-[var(--bg)] rounded-t-[20px] max-h-[90%] overflow-y-auto animate-[slideUp_0.3s_ease]">
            <div className="flex items-center justify-between p-4 pb-0">
              <h2 className="text-lg font-bold">Add Content</h2>
              <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)]">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--text-mid)] fill-none" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <UploadScreen onProcess={handleProcess} onImportPocket={() => { setShowUploadModal(false); setActiveTab("pocket-import"); }} />
          </div>
        </div>
      )}
```

Replace with:

```typescript
      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onProcess={handleProcess}
        onImportPocket={() => { setShowUploadModal(false); setActiveTab("pocket-import"); }}
      />
```

### Step 5: Run AppShell tests

```bash
npx vitest run src/components/AppShell.test.tsx src/components/UploadModal.test.tsx
```

**Expected:** All AppShell tests pass (the modal behavior is preserved). All UploadModal tests pass.

### Step 6: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass.

### Step 7: Commit

```bash
git add src/components/UploadModal.tsx src/components/UploadModal.test.tsx src/components/AppShell.tsx
git commit -m "feat(library): extract UploadModal component from AppShell inline JSX — bottom sheet, drag handle, backdrop dismiss"
```

---

## Task 5: Process new version modal

**Feature ID:** `library-process-new-version`
**depends_on:** `["library-upload-modal"]`

**Why:** When a user has read an article but wants a different cut (e.g. they listened to the 5-minute version and now want the 15-minute deep dive), they shouldn't have to re-upload the content. The "Process new version" action reuses the existing `Content` record — it just calls `/api/process` with a new `targetMinutes`. This task adds the UI for that action: a compact modal with a duration preset picker.

**Files:**
- Create: `src/components/ProcessNewVersionModal.tsx`
- Create: `src/components/ProcessNewVersionModal.test.tsx`

### Step 1: Write failing tests

Create `src/components/ProcessNewVersionModal.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProcessNewVersionModal } from "./ProcessNewVersionModal";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scriptId: "new-script-1" }),
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const DEFAULT_PROPS = {
  isOpen: true,
  contentId: "content-abc",
  contentTitle: "Psychology of Decision Making",
  onClose: vi.fn(),
  onVersionCreated: vi.fn(),
};

function renderModal(props = {}) {
  return render(<ProcessNewVersionModal {...DEFAULT_PROPS} {...props} />);
}

describe("ProcessNewVersionModal", () => {
  it("renders nothing when isOpen=false", () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it("shows the content title (read-only)", () => {
    renderModal();
    expect(screen.getByText("Psychology of Decision Making")).toBeInTheDocument();
  });

  it("shows duration preset buttons: 2, 3, 5, 15, 30 min", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /2 min/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3 min/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5 min/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /15 min/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /30 min/i })).toBeInTheDocument();
  });

  it("shows a Generate button", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /generate/i })).toBeInTheDocument();
  });

  it("has 5 min selected by default", () => {
    renderModal();
    const fiveMin = screen.getByRole("button", { name: /5 min/i });
    // The selected preset should have the accent class
    expect(fiveMin.className).toMatch(/accent/i);
  });

  it("changes selected preset when a different preset is clicked", () => {
    renderModal();
    const fifteenMin = screen.getByRole("button", { name: /15 min/i });
    fireEvent.click(fifteenMin);
    expect(fifteenMin.className).toMatch(/accent/i);
  });

  it("calls /api/process with contentId and selected targetMinutes on Generate", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scriptId: "new-script-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    renderModal();

    // Select 15 min
    fireEvent.click(screen.getByRole("button", { name: /15 min/i }));
    // Click Generate
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/process",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("content-abc"),
        })
      );
    });

    await waitFor(() => {
      const body = JSON.parse(
        fetchMock.mock.calls.find((c) => c[0] === "/api/process")?.[1]?.body ?? "{}"
      );
      expect(body.contentId).toBe("content-abc");
      expect(body.targetMinutes).toBe(15);
    });
  });

  it("calls onVersionCreated after successful API call", async () => {
    const onVersionCreated = vi.fn();
    renderModal({ onVersionCreated });

    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(onVersionCreated).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onClose when the X button is clicked", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows loading state while generating", async () => {
    let resolvePromise!: (v: unknown) => void;
    const pending = new Promise((r) => { resolvePromise = r; });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(pending));

    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /generate/i }));

    await waitFor(() => {
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });

    resolvePromise({ ok: true, json: async () => ({}) });
  });
});
```

### Step 2: Run tests — verify they fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/components/ProcessNewVersionModal.test.tsx
```

**Expected:** FAIL — `src/components/ProcessNewVersionModal.tsx` does not exist yet.

### Step 3: Create ProcessNewVersionModal

Create `src/components/ProcessNewVersionModal.tsx`:

```tsx
"use client";

import { useState } from "react";

interface ProcessNewVersionModalProps {
  isOpen: boolean;
  contentId: string;
  contentTitle: string;
  onClose: () => void;
  onVersionCreated: () => void;
}

const PRESETS = [
  { minutes: 2, label: "Quick Take" },
  { minutes: 3, label: "Brief" },
  { minutes: 5, label: "Summary" },
  { minutes: 15, label: "Main Points" },
  { minutes: 30, label: "Deep Dive" },
];

export function ProcessNewVersionModal({
  isOpen,
  contentId,
  contentTitle,
  onClose,
  onVersionCreated,
}: ProcessNewVersionModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId,
          targetMinutes: selectedMinutes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to start processing");
      }
      onVersionCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="absolute inset-0 z-[70] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative mt-auto bg-[var(--bg)] rounded-t-[20px] pb-8">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-base font-bold">New Version</h2>
          <button
            onClick={onClose}
            aria-label="Close process new version modal"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] active:scale-90"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 stroke-[var(--text-mid)] fill-none"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content title (read-only) */}
        <div className="px-5 mb-4">
          <p className="text-xs font-medium text-[var(--text-dim)] uppercase tracking-wide mb-1">Content</p>
          <p className="text-sm font-semibold text-[var(--text)] truncate">{contentTitle}</p>
        </div>

        {/* Duration presets */}
        <div className="px-5 mb-5">
          <p className="text-xs font-medium text-[var(--text-dim)] uppercase tracking-wide mb-3">Duration</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.minutes}
                onClick={() => setSelectedMinutes(preset.minutes)}
                aria-label={`${preset.minutes} min`}
                className={`flex-1 min-w-[52px] py-2 px-2 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                  selectedMinutes === preset.minutes
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "bg-[var(--surface-2)] border-black/[0.07] text-[var(--text-mid)]"
                }`}
              >
                <div className="text-sm font-bold">{preset.minutes}</div>
                <div className="text-[10px] opacity-80">min</div>
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="px-5 mb-3 text-xs text-red-500">{error}</p>
        )}

        {/* Generate button */}
        <div className="px-5">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3.5 rounded-[14px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {isGenerating ? "Generating…" : `Generate ${selectedMinutes}-min Version`}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/components/ProcessNewVersionModal.test.tsx
```

**Expected:** All 10 tests pass.

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All tests pass.

### Step 6: Commit

```bash
git add src/components/ProcessNewVersionModal.tsx src/components/ProcessNewVersionModal.test.tsx
git commit -m "feat(library): add ProcessNewVersionModal — duration preset picker, calls /api/process, onVersionCreated callback"
```

---

## Task 6: LibraryScreen rewrite

**Feature ID:** `library-screen-rewrite`
**depends_on:** `["library-search-filter", "library-progress-display", "library-card-enhancement", "library-upload-modal", "library-process-new-version"]`

**Why:** The current LibraryScreen is missing every feature from the approved mockup. This task is the full assembly: search bar, filter chips, per-card progress bars, played/dimmed state, expanded version list with per-version progress, "Process new version" action, empty states, and the overall layout polish from `docs/mockups/library-view.html`.

**Files:**
- Rewrite: `src/components/LibraryScreen.tsx`
- Rewrite: `src/components/LibraryScreen.test.tsx`

### Step 1: Write the new LibraryScreen test suite

Replace the **entire** contents of `src/components/LibraryScreen.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { PlayerProvider } from "./PlayerContext";
import { LibraryScreen } from "./LibraryScreen";

// Mock shared utils — the library uses them but we don't need real implementations
vi.mock("@/lib/ui/content-display", () => ({
  gradients: ["from-orange-500 to-orange-400"],
  getGradient: () => "from-orange-500 to-orange-400",
  sourceIcons: { url: "M12 2a10", pdf: "M14 2H6", epub: "M4 19.5", txt: "M14 2H6" },
  timeAgo: () => "2d ago",
  getTitleFallback: (title: string) => title || "fallback.com",
}));

// Mock UploadModal and ProcessNewVersionModal
vi.mock("./UploadModal", () => ({
  UploadModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="upload-modal"><button onClick={onClose}>Close Upload</button></div> : null,
}));

vi.mock("./ProcessNewVersionModal", () => ({
  ProcessNewVersionModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div data-testid="process-modal"><button onClick={onClose}>Close Process</button></div> : null,
}));

const mockPlay = vi.fn();
vi.mock("./PlayerContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./PlayerContext")>();
  return {
    ...actual,
    usePlayer: () => ({
      play: mockPlay,
      currentItem: null,
      isPlaying: false,
      position: 0,
      queue: [],
      queueIndex: 0,
      togglePlay: vi.fn(),
    }),
  };
});

// ---- Fixtures ----

const UNPLAYED_ITEM = {
  id: "c1",
  title: "Psychology of Decision Making",
  author: "Daniel Kahneman",
  sourceType: "url",
  sourceUrl: "https://example.com",
  createdAt: new Date().toISOString(),
  wordCount: 8400,
  versions: [
    {
      scriptId: "s1",
      audioId: "a1",
      audioUrl: "/audio/a1.mp3",
      durationSecs: 900,
      targetDuration: 15,
      format: "narrator",
      status: "ready" as const,
      createdAt: new Date().toISOString(),
      completed: false,
      position: 0,
    },
  ],
};

const IN_PROGRESS_ITEM = {
  id: "c2",
  title: "System 1 vs System 2",
  author: null,
  sourceType: "pdf",
  sourceUrl: null,
  createdAt: new Date().toISOString(),
  wordCount: 3000,
  versions: [
    {
      scriptId: "s2",
      audioId: "a2",
      audioUrl: "/audio/a2.mp3",
      durationSecs: 600,
      targetDuration: 10,
      format: "narrator",
      status: "ready" as const,
      createdAt: new Date().toISOString(),
      completed: false,
      position: 300, // 50% through
    },
  ],
};

const COMPLETED_ITEM = {
  id: "c3",
  title: "Distributed Systems Concepts",
  author: "Martin Kleppmann",
  sourceType: "epub",
  sourceUrl: null,
  createdAt: new Date().toISOString(),
  wordCount: 12000,
  versions: [
    {
      scriptId: "s3",
      audioId: "a3",
      audioUrl: "/audio/a3.mp3",
      durationSecs: 1800,
      targetDuration: 30,
      format: "narrator",
      status: "ready" as const,
      createdAt: new Date().toISOString(),
      completed: true,
      position: 1800,
    },
  ],
};

const GENERATING_ITEM = {
  id: "c4",
  title: "The Innovator's Dilemma",
  author: "Clayton Christensen",
  sourceType: "url",
  sourceUrl: "https://hbr.org/innovators-dilemma",
  createdAt: new Date().toISOString(),
  wordCount: 5000,
  versions: [
    {
      scriptId: "s4",
      audioId: null,
      audioUrl: null,
      durationSecs: null,
      targetDuration: 15,
      format: "narrator",
      status: "generating" as const,
      createdAt: new Date().toISOString(),
      completed: false,
      position: 0,
    },
  ],
};

const MULTI_VERSION_ITEM = {
  id: "c5",
  title: "Sapiens",
  author: "Yuval Noah Harari",
  sourceType: "epub",
  sourceUrl: null,
  createdAt: new Date().toISOString(),
  wordCount: 15000,
  versions: [
    {
      scriptId: "s5a",
      audioId: "a5a",
      audioUrl: "/audio/a5a.mp3",
      durationSecs: 300,
      targetDuration: 5,
      format: "narrator",
      status: "ready" as const,
      createdAt: new Date().toISOString(),
      completed: false,
      position: 0,
    },
    {
      scriptId: "s5b",
      audioId: "a5b",
      audioUrl: "/audio/a5b.mp3",
      durationSecs: 900,
      targetDuration: 15,
      format: "narrator",
      status: "ready" as const,
      createdAt: new Date().toISOString(),
      completed: false,
      position: 0,
    },
  ],
};

const ALL_ITEMS = [UNPLAYED_ITEM, IN_PROGRESS_ITEM, COMPLETED_ITEM, GENERATING_ITEM, MULTI_VERSION_ITEM];

function mockFetch(items = ALL_ITEMS) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => items })
  );
}

beforeEach(() => {
  mockFetch();
  mockPlay.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderLibrary(props: { visible?: boolean } = { visible: true }) {
  return render(
    <PlayerProvider>
      <LibraryScreen {...props} />
    </PlayerProvider>
  );
}

// ---- Tests ----

describe("LibraryScreen — loading state", () => {
  it("shows loading spinner before fetch resolves", () => {
    let resolve!: (v: unknown) => void;
    const deferred = new Promise((r) => { resolve = r; });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(deferred));

    renderLibrary();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolve({ ok: true, json: async () => [] });
  });
});

describe("LibraryScreen — item rendering", () => {
  it("shows all item titles after loading", async () => {
    renderLibrary();
    await waitFor(() => {
      expect(screen.getByText("Psychology of Decision Making")).toBeInTheDocument();
      expect(screen.getByText("System 1 vs System 2")).toBeInTheDocument();
      expect(screen.getByText("Distributed Systems Concepts")).toBeInTheDocument();
    });
  });

  it("shows author name in card subtitle when present", async () => {
    renderLibrary();
    await waitFor(() => {
      expect(screen.getByText(/Daniel Kahneman/)).toBeInTheDocument();
    });
  });

  it("does not show author label when author is null", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("System 1 vs System 2"));
    // System 1 vs System 2 has no author — should not have "By null" or similar
    expect(screen.queryByText(/By null/i)).not.toBeInTheDocument();
  });

  it("shows 'Generating' badge for items still being processed", async () => {
    renderLibrary();
    await waitFor(() => {
      expect(screen.getByText(/The Innovator's Dilemma/)).toBeInTheDocument();
    });
    // Generating badge should be visible for c4
    const badges = screen.getAllByText(/generating/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("shows version count badge for multi-version items", async () => {
    renderLibrary();
    await waitFor(() => {
      expect(screen.getByText(/Sapiens/)).toBeInTheDocument();
    });
    expect(screen.getByText(/2 versions/i)).toBeInTheDocument();
  });
});

describe("LibraryScreen — played state", () => {
  it("shows 'Played' badge for completed items", async () => {
    renderLibrary();
    await waitFor(() => {
      expect(screen.getByText(/Distributed Systems Concepts/)).toBeInTheDocument();
    });
    expect(screen.getByText(/played/i)).toBeInTheDocument();
  });
});

describe("LibraryScreen — search", () => {
  it("renders a search bar input", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Psychology of Decision Making"));
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it("filters items by title when search is typed (after debounce)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderLibrary();
    await waitFor(() => screen.getByText("Psychology of Decision Making"));

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "sapiens" },
    });

    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.queryByText("Psychology of Decision Making")).not.toBeInTheDocument();
      expect(screen.getByText("Sapiens")).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("shows empty state when search has no matches", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderLibrary();
    await waitFor(() => screen.getByText("Psychology of Decision Making"));

    fireEvent.change(screen.getByPlaceholderText(/search/i), {
      target: { value: "zzznomatch" },
    });
    vi.advanceTimersByTime(200);

    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });
});

describe("LibraryScreen — filter chips", () => {
  it("renders all 5 filter chips", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Psychology of Decision Making"));

    expect(screen.getByRole("button", { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unplayed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /in progress/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /completed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generating/i })).toBeInTheDocument();
  });

  it("'All' chip is selected by default", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Psychology of Decision Making"));
    const allChip = screen.getByRole("button", { name: /^all$/i });
    expect(allChip.className).toMatch(/accent/i);
  });

  it("clicking 'Completed' chip filters to completed items only", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Psychology of Decision Making"));

    fireEvent.click(screen.getByRole("button", { name: /completed/i }));

    await waitFor(() => {
      expect(screen.getByText("Distributed Systems Concepts")).toBeInTheDocument();
      expect(screen.queryByText("Psychology of Decision Making")).not.toBeInTheDocument();
      expect(screen.queryByText("System 1 vs System 2")).not.toBeInTheDocument();
    });
  });

  it("clicking 'Generating' chip filters to generating items only", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("The Innovator's Dilemma"));

    fireEvent.click(screen.getByRole("button", { name: /generating/i }));

    await waitFor(() => {
      expect(screen.getByText("The Innovator's Dilemma")).toBeInTheDocument();
      expect(screen.queryByText("Psychology of Decision Making")).not.toBeInTheDocument();
    });
  });

  it("shows 'No completed content' empty state when filter matches nothing", async () => {
    mockFetch([UNPLAYED_ITEM]); // no completed items
    renderLibrary();
    await waitFor(() => screen.getByText("Psychology of Decision Making"));

    fireEvent.click(screen.getByRole("button", { name: /completed/i }));

    await waitFor(() => {
      expect(screen.getByText(/no completed/i)).toBeInTheDocument();
    });
  });
});

describe("LibraryScreen — expand/collapse versions", () => {
  it("clicking a multi-version card expands to show version rows", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Sapiens"));

    // Tap the Sapiens card
    fireEvent.click(screen.getByText("Sapiens").closest("[data-testid='library-item']")!);

    await waitFor(() => {
      expect(screen.getByText("5 min")).toBeInTheDocument();
      expect(screen.getByText("15 min")).toBeInTheDocument();
    });
  });

  it("clicking an expanded card collapses it", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Sapiens"));

    const card = screen.getByText("Sapiens").closest("[data-testid='library-item']")!;
    fireEvent.click(card); // expand
    fireEvent.click(card); // collapse

    await waitFor(() => {
      expect(screen.queryByText("5 min")).not.toBeInTheDocument();
    });
  });

  it("shows '+ Process new version' link in expanded view", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Sapiens"));

    fireEvent.click(screen.getByText("Sapiens").closest("[data-testid='library-item']")!);

    await waitFor(() => {
      expect(screen.getByText(/process new version/i)).toBeInTheDocument();
    });
  });

  it("clicking '+ Process new version' opens ProcessNewVersionModal", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Sapiens"));

    fireEvent.click(screen.getByText("Sapiens").closest("[data-testid='library-item']")!);

    await waitFor(() => screen.getByText(/process new version/i));
    fireEvent.click(screen.getByText(/process new version/i));

    await waitFor(() => {
      expect(screen.getByTestId("process-modal")).toBeInTheDocument();
    });
  });
});

describe("LibraryScreen — play behavior", () => {
  it("clicking a single-version ready card calls play()", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Psychology of Decision Making"));

    fireEvent.click(
      screen.getByText("Psychology of Decision Making").closest("[data-testid='library-item']")!
    );

    expect(mockPlay).toHaveBeenCalledTimes(1);
    expect(mockPlay).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1" })
    );
  });

  it("clicking a version row's play button calls play() with that version", async () => {
    renderLibrary();
    await waitFor(() => screen.getByText("Sapiens"));

    // Expand
    fireEvent.click(screen.getByText("Sapiens").closest("[data-testid='library-item']")!);

    await waitFor(() => screen.getAllByRole("button", { name: /^play$/i }));
    const playButtons = screen.getAllByRole("button", { name: /^play$/i });
    fireEvent.click(playButtons[0]);

    expect(mockPlay).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a5a" })
    );
  });
});

describe("LibraryScreen — empty states", () => {
  it("shows empty library state when no items", async () => {
    mockFetch([]);
    renderLibrary();
    await waitFor(() => {
      expect(screen.getByText(/your library is empty/i)).toBeInTheDocument();
    });
  });

  it("does not fetch when visible=false", () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    renderLibrary({ visible: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
```

### Step 2: Run tests — verify the new tests fail

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run src/components/LibraryScreen.test.tsx
```

**Expected:** Many tests FAIL because the current LibraryScreen is missing search, filter chips, played state, progress bars, and the "Process new version" action.

### Step 3: Rewrite LibraryScreen.tsx

Replace the **entire** contents of `src/components/LibraryScreen.tsx` with:

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDuration } from "@/lib/utils/duration";
import { usePlayer } from "./PlayerContext";
import { getGradient, sourceIcons, timeAgo, getTitleFallback } from "@/lib/ui/content-display";
import { getCardProgress, getVersionProgress, isItemPlayed } from "@/lib/ui/library-progress";
import { useLibraryFilter, FilterChip } from "@/hooks/useLibraryFilter";
import { ProcessNewVersionModal } from "./ProcessNewVersionModal";

// ---- Types ----

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
  // Expanded player fields (from expanded-player-api task — optional until that spec runs)
  summary?: string | null;
  contentType?: string | null;
  themes?: string[];
  compressionRatio?: number;
  actualWordCount?: number;
  voices?: string[];
  ttsProvider?: string | null;
}

interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}

interface LibraryScreenProps {
  /** When true, the screen is the active tab — triggers a data refresh. */
  visible?: boolean;
}

// ---- Filter chip labels ----

const CHIPS: { id: FilterChip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unplayed", label: "Unplayed" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "generating", label: "Generating" },
];

// ---- Empty-state messages by filter ----

const FILTER_EMPTY_MESSAGES: Record<FilterChip, string> = {
  all: "Your library is empty",
  unplayed: "No unplayed content",
  "in-progress": "Nothing in progress",
  completed: "No completed content",
  generating: "Nothing generating",
};

// ---- Main component ----

export function LibraryScreen({ visible }: LibraryScreenProps) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processModalContentId, setProcessModalContentId] = useState<string | null>(null);
  const [processModalTitle, setProcessModalTitle] = useState("");

  const { play } = usePlayer();
  const { query, setQuery, activeFilter, setActiveFilter, filtered } =
    useLibraryFilter(items ?? []);

  const loading = items === null;

  // ---- Data fetching ----

  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    loadLibrary();
  }, [visible, loadLibrary]);

  // ---- Playback ----

  function handlePlay(item: LibraryItem, version: AudioVersion) {
    if (version.status !== "ready" || !version.audioUrl || !version.audioId) return;
    play({
      id: version.audioId,
      title: getTitleFallback(item.title, item.sourceUrl, item.sourceType, item.createdAt),
      duration: version.durationSecs ?? 0,
      format: version.format ?? "narrator",
      audioUrl: version.audioUrl,
      author: item.author ?? null,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl ?? null,
      targetDuration: version.targetDuration,
      wordCount: item.wordCount,
      summary: version.summary ?? null,
      contentType: version.contentType ?? null,
      themes: version.themes ?? [],
      compressionRatio: version.compressionRatio,
      voices: version.voices ?? [],
      ttsProvider: version.ttsProvider ?? null,
      createdAt: version.createdAt,
    });
  }

  function handleCardTap(item: LibraryItem) {
    const versions = item.versions ?? [];
    const hasMultiple = versions.length > 1;
    const isExpanded = expandedId === item.id;

    if (hasMultiple) {
      setExpandedId(isExpanded ? null : item.id);
    } else {
      const pv = versions.find((v) => v.status === "ready") ?? versions[0];
      if (pv) handlePlay(item, pv);
    }
  }

  // ---- Render ----

  if (loading) {
    return (
      <div className="p-6 pt-16 text-center text-[var(--text-dim)]">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading...
      </div>
    );
  }

  const isEmpty = filtered.length === 0;
  const emptyMessage = query.trim()
    ? `No results for "${query}"`
    : FILTER_EMPTY_MESSAGES[activeFilter];

  return (
    <div className="p-5 pb-32">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <h1 className="text-[26px] font-extrabold tracking-tight">Library</h1>
        <span className="text-[13px] text-[var(--text-mid)]">
          {(items ?? []).length} item{(items ?? []).length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Search bar ── */}
      <div className="relative mb-3">
        <svg
          viewBox="0 0 24 24"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 stroke-[var(--text-dim)] fill-none pointer-events-none"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search by title or author…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-[12px] bg-[var(--surface-2)] text-sm text-[var(--text)] placeholder-[var(--text-dim)] border border-black/[0.06] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      </div>

      {/* ── Filter chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            aria-label={chip.label}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              activeFilter === chip.id
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--surface-2)] text-[var(--text-mid)] border border-black/[0.06]"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Empty state ── */}
      {isEmpty ? (
        <div className="text-center py-16">
          <svg
            viewBox="0 0 24 24"
            className="w-14 h-14 stroke-[var(--text-dim)] fill-none mx-auto mb-4"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <p className="text-base font-semibold text-[var(--text)] mb-1">{emptyMessage}</p>
          {activeFilter === "all" && !query && (
            <p className="text-sm text-[var(--text-mid)]">
              Tap the <span className="font-bold">+</span> button to add content.
            </p>
          )}
        </div>
      ) : (

        /* ── Content list ── */
        <div>
          {filtered.map((item, i) => {
            const versions = item.versions ?? [];
            const hasMultiple = versions.length > 1;
            const isExpanded = expandedId === item.id;
            const played = isItemPlayed(versions);
            const cardProgress = getCardProgress(versions);
            const gradient = getGradient(i);
            const displayTitle = getTitleFallback(item.title, item.sourceUrl, item.sourceType, item.createdAt);
            const readyVersions = versions.filter((v) => v.status === "ready");
            const primaryVersion = readyVersions[0] ?? versions[0];

            return (
              <div key={item.id} className="mb-2.5">

                {/* ── Main card ── */}
                <div
                  data-testid="library-item"
                  onClick={() => handleCardTap(item)}
                  className={`flex items-center gap-3.5 p-4 rounded-[14px] bg-[var(--surface)] border border-black/[0.07] cursor-pointer transition-all hover:bg-[var(--surface-2)] active:scale-[0.98] ${played ? "opacity-70" : ""} relative overflow-hidden`}
                >
                  {/* Gradient thumbnail */}
                  <div
                    className={`w-[52px] h-[52px] rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}
                  >
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white opacity-85">
                      <path d={sourceIcons[item.sourceType] ?? sourceIcons.txt} />
                    </svg>
                  </div>

                  {/* Content info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate mb-0.5">{displayTitle}</div>
                    <div className="text-xs text-[var(--text-mid)] flex items-center gap-1.5 flex-wrap">
                      {item.author && (
                        <>
                          <span>{item.author}</span>
                          <span className="text-[var(--text-dim)]">&middot;</span>
                        </>
                      )}
                      <span className="uppercase">{item.sourceType}</span>
                      <span className="text-[var(--text-dim)]">&middot;</span>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Status badge + chevron */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {versions.length === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--amber-dim)] text-[var(--amber)]">
                        Processing
                      </span>
                    ) : played ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--green-dim)] text-[var(--green)]">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Played
                      </span>
                    ) : primaryVersion?.status === "generating" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--amber-dim)] text-[var(--amber)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        Generating
                      </span>
                    ) : (
                      <>
                        {primaryVersion?.durationSecs && (
                          <span className="text-[13px] font-semibold text-[var(--text-mid)]">
                            {formatDuration(primaryVersion.durationSecs)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--green-dim)] text-[var(--green)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {hasMultiple ? `${versions.length} versions` : "Ready"}
                        </span>
                      </>
                    )}
                    {hasMultiple && (
                      <svg
                        viewBox="0 0 24 24"
                        className={`w-4 h-4 stroke-[var(--text-dim)] fill-none transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </div>

                  {/* Card-level progress bar (bottom edge) */}
                  {cardProgress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/[0.05] rounded-b-[14px]">
                      <div
                        className="h-full rounded-b-[14px] bg-gradient-to-r from-[var(--accent)] to-[#F97316]"
                        style={{ width: `${cardProgress * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* ── Expanded version rows ── */}
                {isExpanded && (
                  <div className="mt-1 ml-4 border-l-2 border-[var(--accent)]/20 pl-3">
                    {versions.map((version) => {
                      const vProgress = getVersionProgress(version);
                      const vPct = Math.round(vProgress * 100);

                      return (
                        <div
                          key={version.scriptId}
                          className={`flex items-center gap-3 p-3 mb-1 rounded-[10px] transition-all ${
                            version.status === "ready"
                              ? "bg-[var(--surface)] hover:bg-[var(--surface-2)] cursor-pointer active:scale-[0.98]"
                              : "bg-[var(--surface-2)] cursor-default opacity-60"
                          }`}
                        >
                          {/* Version info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-[12px] font-semibold">{version.targetDuration} min</span>
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/[0.06] text-[var(--text-mid)]">
                                {version.format === "conversation" ? "Chat" : "Narrator"}
                              </span>
                              {version.durationSecs && (
                                <span className="text-[11px] text-[var(--text-dim)]">
                                  {formatDuration(version.durationSecs)}
                                </span>
                              )}
                              {version.completed && (
                                <span className="text-[10px] font-semibold text-[var(--green)]">✓ Done</span>
                              )}
                            </div>
                            {/* Per-version progress bar */}
                            {vProgress > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-black/[0.08] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--accent)] rounded-full"
                                    style={{ width: `${vPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium text-[var(--text-dim)] tabular-nums shrink-0">
                                  {vPct}%
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Play button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlay(item, version);
                            }}
                            aria-label="Play"
                            disabled={version.status !== "ready"}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--green-dim)] text-[var(--green)] active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current ml-0.5">
                              <polygon points="8,5 19,12 8,19" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}

                    {/* Process new version link */}
                    <button
                      onClick={() => {
                        setProcessModalContentId(item.id);
                        setProcessModalTitle(displayTitle);
                      }}
                      className="w-full text-left px-3 py-2.5 text-[12px] font-semibold text-[var(--accent-text)] flex items-center gap-1.5 hover:bg-[var(--accent-light)] rounded-[10px] transition-colors"
                    >
                      <span className="text-base leading-none">+</span>
                      Process new version
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Process New Version Modal ── */}
      {processModalContentId && (
        <ProcessNewVersionModal
          isOpen={true}
          contentId={processModalContentId}
          contentTitle={processModalTitle}
          onClose={() => setProcessModalContentId(null)}
          onVersionCreated={() => {
            setProcessModalContentId(null);
            loadLibrary(); // refresh to show new "Generating" version
          }}
        />
      )}
    </div>
  );
}
```

### Step 4: Run tests — verify all pass

```bash
npx vitest run src/components/LibraryScreen.test.tsx
```

**Expected:** All tests pass.

### Step 5: Run full suite

```bash
npx vitest run
```

**Expected:** All existing tests + new tests pass, 0 failures.

### Step 6: Commit

```bash
git add src/components/LibraryScreen.tsx src/components/LibraryScreen.test.tsx
git commit -m "feat(library): rewrite LibraryScreen — search, filter chips, progress bars, played state, process new version, empty states"
```

---

## Task 7: Build verification

**Feature ID:** N/A (verification only)

**Why:** Confirms the full spec integrates cleanly with the build system, all TypeScript types resolve, and no regressions were introduced across the codebase.

### Step 1: Run full test suite

```bash
cd /Users/chrispark/Projects/ridecast2
npx vitest run
```

**Expected:** All tests pass. Count should be higher than baseline by the new tests added in this spec (~40+ new tests). Zero failures.

### Step 2: TypeScript build check

```bash
npm run build
```

**Expected:** Build succeeds. Any pre-existing `tsc --noEmit` warnings (noted in STATE.yaml `known_issues`) are acceptable; no new errors.

### Step 3: Lint check

```bash
npm run lint
```

**Expected:** No new errors. Existing no-unused-vars warnings are pre-existing and non-blocking.

### Step 4: Final commit

```bash
git add .
git commit -m "chore(library): build verification — all tests pass, no regressions"
```

---

## Success Criteria

- [ ] Search bar filters content by title and author (case-insensitive, 200ms debounce)
- [ ] All 5 filter chips work correctly: All / Unplayed / In Progress / Completed / Generating
- [ ] Search and filter compose together (AND logic — both apply simultaneously)
- [ ] Content cards show thin progress bar at the bottom from PlaybackState
- [ ] Completed items show dimmed card with "Played" checkmark badge
- [ ] Author name shows in card subtitle when present; absent gracefully
- [ ] Expanded version view shows per-version progress bar + percentage label
- [ ] "Process new version" link appears at the bottom of expanded version list
- [ ] Tapping "Process new version" opens ProcessNewVersionModal with duration presets
- [ ] ProcessNewVersionModal posts to `/api/process` with correct `contentId` + `targetMinutes`
- [ ] After new version created, library refreshes to show "Generating" status
- [ ] FAB "+" opens UploadModal (wired by home-screen-nav-restructure; this spec provides the component)
- [ ] UploadModal has drag handle, backdrop dismiss, "Add Content" heading, X button
- [ ] Upload modal presets: 2 / 3 / 5 / 15 / 30 min (handled by home-screen-upload-presets)
- [ ] Empty library state: "Your library is empty" with "+" hint
- [ ] No-results state: `No results for "{query}"`
- [ ] No-filter-match state: "No {filter} content"
- [ ] All existing tests pass
- [ ] `npm run build` succeeds

---

## Out of Scope

| What | Why |
|---|---|
| Server-side search | Client-side filtering is sufficient for personal libraries |
| Drag-to-reorder content | No use case identified |
| Bulk actions (delete multiple, batch process) | Future feature |
| Content deletion | Future feature — needs confirmation UX |
| Tags / folders | Future feature |
| Sort controls (A-Z, by duration) | Newest-first is sufficient for now |
| Swipe-to-delete gesture | Future feature |
| Offline caching | Out of scope for this release |
