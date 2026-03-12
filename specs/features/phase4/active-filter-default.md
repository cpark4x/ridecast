# Feature: Active Filter Default

> Change the library's default filter from "All" to "Active" — so the list always opens on unlistened and in-progress content, not everything including completed episodes.

## Motivation

The library currently defaults to "All", which buries new content under a sea of completed episodes over time. As a user's library grows, "All" becomes a cluttered archive. The meaningful default is **Active** — items with at least one version not yet completed. This matches how podcast apps work: you see what's left to listen to, not your full history.

## Changes

### 1. Add `"active"` to `LibraryFilter` type (`native/lib/types.ts`)

```typescript
// Before:
export type LibraryFilter = "all" | "in_progress" | "completed" | "generating";

// After:
export type LibraryFilter = "active" | "all" | "in_progress" | "completed" | "generating";
```

`"active"` is the new first entry (also the new default). `"all"` stays available.

### 2. Add `filterActive` logic in `native/lib/libraryHelpers.ts`

Add a new case to `filterEpisodes()`:

```typescript
case "active":
  // Show items where NOT all versions are completed
  // Includes: unlistened (position === 0), in-progress (position > 0 && !completed),
  //           and still-generating versions
  return items.filter(
    (item) =>
      item.versions.length === 0 ||
      !item.versions.every((v) => v.completed)
  );
```

Explanation:
- An item with no versions at all is considered "active" (it's queued/processing)
- An item where *every* version is `completed` is excluded
- An item where at least one version is `ready` and not yet completed is included
- An item where a version is still `generating` is included

### 3. Update `FILTERS` array in `native/app/(tabs)/library.tsx`

```typescript
// Before:
const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "all",         label: "All"         },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "generating",  label: "Generating"  },
];

// After:
const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "active",      label: "Active"      },  // ← new default, first chip
  { key: "all",         label: "All"         },  // ← still available
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "generating",  label: "Generating"  },
];
```

### 4. Change initial filter state in `native/app/(tabs)/library.tsx`

```typescript
// Before:
const [filter, setFilter] = useState<LibraryFilter>("all");

// After:
const [filter, setFilter] = useState<LibraryFilter>("active");
```

That's the only state change needed. The filter chip rendering and `filterEpisodes()` call are already wired up correctly.

### 5. Update `filterEpisodes` switch statement to handle new case

The full updated switch in `libraryHelpers.ts`:

```typescript
export function filterEpisodes(items: LibraryItem[], filter: LibraryFilter): LibraryItem[] {
  switch (filter) {
    case "active":
      return items.filter(
        (item) =>
          item.versions.length === 0 ||
          !item.versions.every((v) => v.completed)
      );

    case "all":
      return items;

    case "in_progress":
      return items.filter((item) =>
        item.versions.some((v) => v.position > 0 && !v.completed)
      );

    case "completed":
      return items.filter(
        (item) =>
          item.versions.length > 0 && item.versions.every((v) => v.completed)
      );

    case "generating":
      return items.filter((item) =>
        item.versions.some((v) => v.status === "generating")
      );

    default:
      return items;
  }
}
```

### 6. Difference between "Active" and "In Progress"

These are distinct:

| Filter | Shows |
|---|---|
| **Active** | All unlistened + in-progress + generating (i.e., not yet fully done) |
| **In Progress** | Only started-but-not-finished (position > 0, not completed) |
| **Completed** | All versions marked completed |

"Active" is the inbox view. "In Progress" is the resume view.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/lib/types.ts` | Add `"active"` to `LibraryFilter` union type |
| `native/lib/libraryHelpers.ts` | Add `"active"` case to `filterEpisodes()` |
| `native/app/(tabs)/library.tsx` | Change default filter state to `"active"`, add Active chip to `FILTERS` |

## Tests

**`native/lib/libraryHelpers.test.ts`** — add to existing test file or create new:

```typescript
describe("filterEpisodes — active", () => {
  const completedItem: LibraryItem = {
    ...baseItem,
    versions: [{ ...baseVersion, completed: true }],
  };
  const inProgressItem: LibraryItem = {
    ...baseItem,
    versions: [{ ...baseVersion, completed: false, position: 120 }],
  };
  const unlistenedItem: LibraryItem = {
    ...baseItem,
    versions: [{ ...baseVersion, completed: false, position: 0, status: "ready" }],
  };
  const generatingItem: LibraryItem = {
    ...baseItem,
    versions: [{ ...baseVersion, status: "generating" }],
  };

  it("excludes fully completed items", () => {
    const result = filterEpisodes([completedItem], "active");
    expect(result).toHaveLength(0);
  });

  it("includes in-progress items", () => {
    const result = filterEpisodes([inProgressItem], "active");
    expect(result).toHaveLength(1);
  });

  it("includes unlistened items", () => {
    const result = filterEpisodes([unlistenedItem], "active");
    expect(result).toHaveLength(1);
  });

  it("includes generating items", () => {
    const result = filterEpisodes([generatingItem], "active");
    expect(result).toHaveLength(1);
  });

  it("includes item with mixed completed/incomplete versions", () => {
    const mixed: LibraryItem = {
      ...baseItem,
      versions: [
        { ...baseVersion, completed: true },
        { ...baseVersion, completed: false, position: 0 },
      ],
    };
    const result = filterEpisodes([mixed], "active");
    expect(result).toHaveLength(1);
  });
});
```

## Success Criteria

```bash
cd native && npx tsc --noEmit   # no type errors from the new LibraryFilter value
```

Manual verification:
- [ ] Library opens with "Active" chip selected by default
- [ ] Completed episodes are hidden in the Active view
- [ ] Tapping "All" shows everything including completed
- [ ] Tapping "Active" again restores the filtered view
- [ ] "Active" chip is the leftmost chip in the horizontal scroll
- [ ] Filter count badge (if implemented in a future spec) reflects active count correctly

## Scope

- **No** persistence of the selected filter between app sessions — `"active"` is always the default on launch
- **No** badge count on filter chips — that's a future enhancement
- **No** changes to the Home screen — it already uses `getUnlistenedItems()` which is semantically equivalent to "active"
- **No** API or backend changes — this is purely client-side filter logic
