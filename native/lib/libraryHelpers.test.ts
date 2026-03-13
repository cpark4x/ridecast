import {
  groupByTimePeriod,
  sortEpisodes,
  filterEpisodes,
} from "./libraryHelpers";
import type { LibraryItem } from "./types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<LibraryItem> & { id: string }): LibraryItem {
  return {
    id: overrides.id,
    title: overrides.title ?? `Episode ${overrides.id}`,
    author: overrides.author ?? null,
    sourceType: overrides.sourceType ?? "url",
    sourceUrl: overrides.sourceUrl ?? null,
    wordCount: overrides.wordCount ?? 500,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    versions: overrides.versions ?? [],
  };
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ─── groupByTimePeriod ───────────────────────────────────────────────────────

describe("groupByTimePeriod", () => {
  it("puts today's items in Today section", () => {
    const item = makeItem({ id: "1", createdAt: new Date().toISOString() });
    const sections = groupByTimePeriod([item]);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.title).toBe("Today");
    expect(sections[0]!.data).toHaveLength(1);
  });

  it("puts 3-day-old items in This Week section", () => {
    const item = makeItem({ id: "2", createdAt: daysAgo(3) });
    const sections = groupByTimePeriod([item]);
    expect(sections[0]!.title).toBe("This Week");
  });

  it("puts 8-day-old items in Earlier section", () => {
    const item = makeItem({ id: "3", createdAt: daysAgo(8) });
    const sections = groupByTimePeriod([item]);
    expect(sections[0]!.title).toBe("Earlier");
  });

  it("omits empty sections", () => {
    const item = makeItem({ id: "4", createdAt: daysAgo(10) });
    const sections = groupByTimePeriod([item]);
    expect(sections.every((s) => s.data.length > 0)).toBe(true);
    expect(sections.find((s) => s.title === "Today")).toBeUndefined();
    expect(sections.find((s) => s.title === "This Week")).toBeUndefined();
  });

  it("returns empty array for empty input", () => {
    expect(groupByTimePeriod([])).toEqual([]);
  });

  it("places items in correct sections when all three are populated", () => {
    const todayItem = makeItem({ id: "a", createdAt: new Date().toISOString() });
    const weekItem = makeItem({ id: "b", createdAt: daysAgo(2) });
    const oldItem = makeItem({ id: "c", createdAt: daysAgo(14) });
    const sections = groupByTimePeriod([todayItem, weekItem, oldItem]);
    expect(sections).toHaveLength(3);
    expect(sections.map((s) => s.title)).toEqual(["Today", "This Week", "Earlier"]);
  });
});

// ─── sortEpisodes ────────────────────────────────────────────────────────────

describe("sortEpisodes", () => {
  const items: LibraryItem[] = [
    makeItem({ id: "1", title: "Zebra", createdAt: "2024-01-01T00:00:00Z" }),
    makeItem({ id: "2", title: "Apple", createdAt: "2024-03-01T00:00:00Z" }),
    makeItem({ id: "3", title: "Mango", createdAt: "2024-02-01T00:00:00Z" }),
  ];

  it("sorts date_desc: newest first", () => {
    const sorted = sortEpisodes(items, "date_desc");
    expect(sorted.map((i) => i.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts date_asc: oldest first", () => {
    const sorted = sortEpisodes(items, "date_asc");
    expect(sorted.map((i) => i.id)).toEqual(["1", "3", "2"]);
  });

  it("sorts title_asc alphabetically", () => {
    const sorted = sortEpisodes(items, "title_asc");
    expect(sorted.map((i) => i.title)).toEqual(["Apple", "Mango", "Zebra"]);
  });

  it("does not mutate the input array", () => {
    const original = [...items];
    sortEpisodes(items, "title_asc");
    expect(items).toEqual(original);
  });
});

// ─── filterEpisodes (active case) ────────────────────────────────────────────
// NOTE: The active case uses the broader definition from active-filter-default:
// includes items with no versions OR where not every version is completed.
// Generating items ARE included (they're incomplete).

describe("filterEpisodes — active", () => {
  it("includes items with at least one ready, incomplete version", () => {
    const item = makeItem({
      id: "1",
      versions: [{ status: "ready", completed: false } as never],
    });
    expect(filterEpisodes([item], "active")).toHaveLength(1);
  });

  it("excludes items where all versions are completed", () => {
    const item = makeItem({
      id: "2",
      versions: [{ status: "ready", completed: true } as never],
    });
    expect(filterEpisodes([item], "active")).toHaveLength(0);
  });

  it("includes items with generating (incomplete) versions", () => {
    // Current impl: items where not every version is completed are "active"
    const item = makeItem({
      id: "3",
      versions: [{ status: "generating", completed: false } as never],
    });
    expect(filterEpisodes([item], "active")).toHaveLength(1);
  });

  it("includes items with no versions (queued/initializing)", () => {
    const item = makeItem({ id: "4", versions: [] });
    expect(filterEpisodes([item], "active")).toHaveLength(1);
  });
});
