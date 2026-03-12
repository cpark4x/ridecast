# Feature: Active Filter Default

> Change the library's default filter from "All" to "Active" — so the list always opens on unlistened and in-progress content, not everything including completed episodes.

## Motivation

The library currently defaults to "All", which buries new content under a sea of completed episodes over time. As a user's library grows, "All" becomes a cluttered archive. The meaningful default is **Active** — items with at least one version not yet completed. This matches how podcast apps work: you see what's left to listen to, not your full history.

---

## Changes

### 1. Modify: `native/lib/types.ts`

Add `"active"` as the first (default) value of the `LibraryFilter` union.

**Before:**
```typescript
export type LibraryFilter = "all" | "in_progress" | "completed" | "generating";
```

**After:**
```typescript
export type LibraryFilter = "active" | "all" | "in_progress" | "completed" | "generating";
```

`"active"` is listed first — conventional signal that it's the default. `"all"` stays available.

---

### 2. Modify: `native/lib/libraryHelpers.ts`

Add the `"active"` case to `filterEpisodes()`. The logic: include any item where **not all versions are completed** (i.e., at least one version remains to be heard or is still generating).

**Before** (full function):
```typescript
export function filterEpisodes(
  items: LibraryItem[],
  filter: LibraryFilter,
): LibraryItem[] {
  switch (filter) {
    case "all":
      return items;

    case "in_progress":
      return items.filter((item) =>
        item.versions.some((v) => v.position > 0 && !v.completed),
      );

    case "completed":
      return items.filter(
        (item) =>
          item.versions.length > 0 && item.versions.every((v) => v.completed),
      );

    case "generating":
      return items.filter((item) =>
        item.versions.some((v) => v.status === "generating"),
      );

    default:
      return items;
  }
}
```

**After:**
```typescript
export function filterEpisodes(
  items: LibraryItem[],
  filter: LibraryFilter,
): LibraryItem[] {
  switch (filter) {
    case "active":
      // Include items where NOT every version is completed.
      // Covers: unlistened (position === 0), in-progress (position > 0, !completed),
      //         still-generating versions, and items with no versions yet (queued).
      return items.filter(
        (item) =>
          item.versions.length === 0 ||
          !item.versions.every((v) => v.completed),
      );

    case "all":
      return items;

    case "in_progress":
      return items.filter((item) =>
        item.versions.some((v) => v.position > 0 && !v.completed),
      );

    case "completed":
      return items.filter(
        (item) =>
          item.versions.length > 0 && item.versions.every((v) => v.completed),
      );

    case "generating":
      return items.filter((item) =>
        item.versions.some((v) => v.status === "generating"),
      );

    default:
      return items;
  }
}
```

---

### 3. Modify: `native/app/(tabs)/library.tsx`

Two changes: add `"active"` chip to the `FILTERS` array (first position), and change the initial filter state to `"active"`.

**Before** (`FILTERS` array):
```typescript
const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "all",         label: "All"         },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "generating",  label: "Generating"  },
];
```

**After:**
```typescript
const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "active",      label: "Active"      },  // ← new default, leftmost chip
  { key: "all",         label: "All"         },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "generating",  label: "Generating"  },
];
```

**Before** (initial filter state):
```typescript
const [filter, setFilter] = useState<LibraryFilter>("all");
```

**After:**
```typescript
const [filter, setFilter] = useState<LibraryFilter>("active");
```

That's the only state change. The filter chip rendering loop and the `filterEpisodes()` call are already wired correctly — no other JSX changes needed.

---

## Filter Semantics — Reference Table

| Filter | Includes | Excludes |
|---|---|---|
| **Active** (default) | Unlistened + in-progress + generating + no-version items | Items where every version is `completed` |
| **All** | Everything | Nothing |
| **In Progress** | Started but not finished (`position > 0 && !completed`) | Unlistened, completed, generating |
| **Completed** | All versions marked `completed` | Everything else |
| **Generating** | At least one version with `status === "generating"` | Everything else |

"Active" is the **inbox view** — work remaining. "In Progress" is the **resume view** — already started.

---

## Files to Modify

| File | Change |
|------|--------|
| `native/lib/types.ts` | Add `"active"` to `LibraryFilter` union (first position) |
| `native/lib/libraryHelpers.ts` | Add `"active"` case to `filterEpisodes()` switch |
| `native/app/(tabs)/library.tsx` | Add Active chip to `FILTERS` array; change default state to `"active"` |

---

## Tests

**File:** `native/lib/libraryHelpers.test.ts` (create new)

```typescript
import { describe, it, expect } from "vitest";
import { filterEpisodes, getUnlistenedItems } from "./libraryHelpers";
import type { AudioVersion, LibraryItem } from "./types";

// ─── Test fixtures ──────────────────────────────────────────────────────────

const baseVersion: AudioVersion = {
  scriptId: "script-1",
  audioId: "audio-1",
  audioUrl: "file:///audio/1.mp3",
  durationSecs: 600,
  targetDuration: 10,
  format: "narrative",
  status: "ready",
  completed: false,
  position: 0,
  createdAt: "2024-01-01T00:00:00Z",
  summary: null,
  contentType: null,
  themes: [],
  compressionRatio: 1,
  actualWordCount: 1500,
  voices: ["alloy"],
  ttsProvider: "openai",
};

const baseItem: LibraryItem = {
  id: "content-1",
  title: "Test Article",
  author: null,
  sourceType: "url",
  sourceUrl: "https://example.com/article",
  createdAt: "2024-01-01T00:00:00Z",
  wordCount: 1500,
  versions: [baseVersion],
};

// Helpers to build specific item states
function makeItem(overrides: Partial<LibraryItem> = {}, versionOverrides: Partial<AudioVersion>[] = []): LibraryItem {
  const versions = versionOverrides.length > 0
    ? versionOverrides.map((v, i) => ({ ...baseVersion, scriptId: `script-${i}`, audioId: `audio-${i}`, ...v }))
    : [{ ...baseVersion }];
  return { ...baseItem, id: `content-${Math.random()}`, versions, ...overrides };
}

// ─── filterEpisodes — active ────────────────────────────────────────────────

describe("filterEpisodes — active", () => {
  it("excludes items where every version is completed", () => {
    const item = makeItem({}, [{ completed: true }]);
    expect(filterEpisodes([item], "active")).toHaveLength(0);
  });

  it("excludes items where all multiple versions are completed", () => {
    const item = makeItem({}, [
      { completed: true, scriptId: "s1", audioId: "a1" },
      { completed: true, scriptId: "s2", audioId: "a2" },
    ]);
    expect(filterEpisodes([item], "active")).toHaveLength(0);
  });

  it("includes unlistened items (position === 0, not completed)", () => {
    const item = makeItem({}, [{ completed: false, position: 0, status: "ready" }]);
    expect(filterEpisodes([item], "active")).toHaveLength(1);
  });

  it("includes in-progress items (position > 0, not completed)", () => {
    const item = makeItem({}, [{ completed: false, position: 120 }]);
    expect(filterEpisodes([item], "active")).toHaveLength(1);
  });

  it("includes generating items", () => {
    const item = makeItem({}, [{ status: "generating", completed: false }]);
    expect(filterEpisodes([item], "active")).toHaveLength(1);
  });

  it("includes items with no versions (queued for processing)", () => {
    const item = makeItem({}, []);
    item.versions = [];
    expect(filterEpisodes([item], "active")).toHaveLength(1);
  });

  it("includes item with mixed completed/incomplete versions", () => {
    const item = makeItem({}, [
      { completed: true,  scriptId: "s1", audioId: "a1" },
      { completed: false, scriptId: "s2", audioId: "a2", position: 0 },
    ]);
    expect(filterEpisodes([item], "active")).toHaveLength(1);
  });

  it("returns multiple matching items", () => {
    const active1 = makeItem({}, [{ completed: false }]);
    const active2 = makeItem({}, [{ status: "generating", completed: false }]);
    const done    = makeItem({}, [{ completed: true }]);
    expect(filterEpisodes([active1, active2, done], "active")).toHaveLength(2);
  });
});

// ─── filterEpisodes — all ───────────────────────────────────────────────────

describe("filterEpisodes — all", () => {
  it("returns all items regardless of state", () => {
    const items = [
      makeItem({}, [{ completed: true }]),
      makeItem({}, [{ completed: false }]),
      makeItem({}, [{ status: "generating" }]),
    ];
    expect(filterEpisodes(items, "all")).toHaveLength(3);
  });

  it("returns empty array for empty input", () => {
    expect(filterEpisodes([], "all")).toHaveLength(0);
  });
});

// ─── filterEpisodes — in_progress ──────────────────────────────────────────

describe("filterEpisodes — in_progress", () => {
  it("includes items with position > 0 and not completed", () => {
    const item = makeItem({}, [{ position: 120, completed: false }]);
    expect(filterEpisodes([item], "in_progress")).toHaveLength(1);
  });

  it("excludes unlistened items (position === 0)", () => {
    const item = makeItem({}, [{ position: 0, completed: false }]);
    expect(filterEpisodes([item], "in_progress")).toHaveLength(0);
  });

  it("excludes completed items", () => {
    const item = makeItem({}, [{ position: 300, completed: true }]);
    expect(filterEpisodes([item], "in_progress")).toHaveLength(0);
  });
});

// ─── filterEpisodes — completed ─────────────────────────────────────────────

describe("filterEpisodes — completed", () => {
  it("includes items where all versions are completed", () => {
    const item = makeItem({}, [{ completed: true }]);
    expect(filterEpisodes([item], "completed")).toHaveLength(1);
  });

  it("excludes items with no versions", () => {
    const item = makeItem({});
    item.versions = [];
    expect(filterEpisodes([item], "completed")).toHaveLength(0);
  });

  it("excludes items with any incomplete version", () => {
    const item = makeItem({}, [
      { completed: true,  scriptId: "s1", audioId: "a1" },
      { completed: false, scriptId: "s2", audioId: "a2" },
    ]);
    expect(filterEpisodes([item], "completed")).toHaveLength(0);
  });
});

// ─── filterEpisodes — generating ───────────────────────────────────────────

describe("filterEpisodes — generating", () => {
  it("includes items with at least one generating version", () => {
    const item = makeItem({}, [{ status: "generating" }]);
    expect(filterEpisodes([item], "generating")).toHaveLength(1);
  });

  it("excludes items with only ready versions", () => {
    const item = makeItem({}, [{ status: "ready" }]);
    expect(filterEpisodes([item], "generating")).toHaveLength(0);
  });
});

// ─── getUnlistenedItems ─────────────────────────────────────────────────────

describe("getUnlistenedItems", () => {
  it("includes items with a ready version at position 0", () => {
    const item = makeItem({}, [{ status: "ready", position: 0, completed: false }]);
    expect(getUnlistenedItems([item])).toHaveLength(1);
  });

  it("includes items with a ready version not yet completed", () => {
    const item = makeItem({}, [{ status: "ready", position: 120, completed: false }]);
    expect(getUnlistenedItems([item])).toHaveLength(1);
  });

  it("excludes items where all ready versions are completed", () => {
    const item = makeItem({}, [{ status: "ready", completed: true }]);
    expect(getUnlistenedItems([item])).toHaveLength(0);
  });
});
```

Run tests:
```bash
cd native && npx jest libraryHelpers.test.ts --no-coverage
# → All tests pass (28+ assertions)
```

---

## Success Criteria

```bash
# TypeScript — no type errors from the new LibraryFilter value
cd native && npx tsc --noEmit
# → 0 errors

# Unit tests pass
cd native && npx jest libraryHelpers.test.ts --no-coverage
# → All tests pass

# App builds
cd native && npx expo run:ios
# → Build succeeded
```

Manual verification:
- [ ] Library opens with "Active" chip selected (highlighted in `bg-brand`) by default
- [ ] Completed episodes are hidden in the Active view
- [ ] Tapping "All" shows everything including completed episodes
- [ ] Tapping "Active" again restores the filtered view
- [ ] "Active" chip is the leftmost chip in the horizontal scroll
- [ ] Generating items appear in both "Active" and "Generating" filters
- [ ] Items with no audio versions yet appear in "Active" (not buried in "All")

---

## Scope

- **No** persistence of the selected filter across app sessions — `"active"` is always the default on launch
- **No** badge count on filter chips — that's a future enhancement
- **No** changes to the Home screen — it already uses `getUnlistenedItems()`, which is semantically equivalent to "active" for the home feed
- **No** API or backend changes — this is purely client-side filter logic
- **No** changes to search — search operates across all episodes regardless of filter state
