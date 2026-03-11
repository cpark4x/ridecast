import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLibraryFilter } from "../useLibraryFilter";

// Fixtures
const UNPLAYED = {
  id: "c1",
  title: "The Psychology of Decision Making",
  author: "Daniel Kahneman",
  versions: [{ status: "ready", completed: false, position: 0 }],
};
const IN_PROGRESS = {
  id: "c2",
  title: "Designing Data-Intensive Applications",
  author: "Martin Kleppmann",
  versions: [{ status: "ready", completed: false, position: 120 }],
};
const COMPLETED = {
  id: "c3",
  title: "Sapiens: A Brief History",
  author: "Yuval Noah Harari",
  versions: [{ status: "ready", completed: true, position: 600 }],
};
const GENERATING = {
  id: "c4",
  title: "Thinking in Systems",
  author: null,
  versions: [{ status: "generating", completed: false, position: 0 }],
};

const ALL_ITEMS = [UNPLAYED, IN_PROGRESS, COMPLETED, GENERATING];

describe("useLibraryFilter — initial state", () => {
  it("returns all 4 items by default", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    expect(result.current.filtered).toHaveLength(4);
  });

  it("defaults query to ''", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    expect(result.current.query).toBe("");
  });

  it("defaults activeFilter to 'all'", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    expect(result.current.activeFilter).toBe("all");
  });
});

describe("useLibraryFilter — search", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("filters by title substring after 200ms debounce", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setQuery("psychology"));
    // Before debounce: still 4
    expect(result.current.filtered).toHaveLength(4);
    // After debounce
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c1");
  });

  it("is case-insensitive", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setQuery("PSYCHOLOGY"));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c1");
  });

  it("returns [] when no match", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setQuery("nonexistent"));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.filtered).toHaveLength(0);
  });

  it("filters by author substring", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setQuery("kleppmann"));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c2");
  });

  it("items with null author still match on title", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setQuery("systems"));
    act(() => vi.advanceTimersByTime(200));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c4");
  });

  it("does NOT filter before 200ms", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setQuery("psychology"));
    act(() => vi.advanceTimersByTime(100));
    expect(result.current.filtered).toHaveLength(4);
  });
});

describe("useLibraryFilter — filter chips", () => {
  it("'unplayed': items where all versions have position=0 and !completed", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setActiveFilter("unplayed"));
    // UNPLAYED (pos:0, !completed) and GENERATING (pos:0, !completed) both match
    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.map((i) => i.id)).toContain("c1");
    expect(result.current.filtered.map((i) => i.id)).toContain("c4");
  });

  it("'in-progress': at least one version with position>0 and !completed", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setActiveFilter("in-progress"));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c2");
  });

  it("'completed': at least one version with completed=true", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setActiveFilter("completed"));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c3");
  });

  it("'generating': at least one version with status='generating'", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setActiveFilter("generating"));
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c4");
  });

  it("'all': shows everything", () => {
    const { result } = renderHook(() => useLibraryFilter(ALL_ITEMS));
    act(() => result.current.setActiveFilter("completed"));
    expect(result.current.filtered).toHaveLength(1);
    act(() => result.current.setActiveFilter("all"));
    expect(result.current.filtered).toHaveLength(4);
  });
});

describe("useLibraryFilter — composed AND logic", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("applies search AND chip filter together", () => {
    // Add a second completed item for the test
    const COMPLETED2 = {
      id: "c5",
      title: "Kleppmann Advanced Topics",
      author: "Martin Kleppmann",
      versions: [{ status: "ready", completed: true, position: 500 }],
    };
    const items = [...ALL_ITEMS, COMPLETED2];
    const { result } = renderHook(() => useLibraryFilter(items));

    act(() => result.current.setActiveFilter("completed"));
    // Two completed: c3 and c5
    expect(result.current.filtered).toHaveLength(2);

    act(() => result.current.setQuery("kleppmann"));
    act(() => vi.advanceTimersByTime(200));
    // Only c5 is completed AND matches "kleppmann"
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe("c5");
  });
});
