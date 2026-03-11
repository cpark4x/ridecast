import { useState, useEffect, useMemo } from "react";

export type FilterChip = "all" | "unplayed" | "in-progress" | "completed" | "generating";

interface FilterableItem {
  id: string;
  title: string;
  author?: string | null;
  versions: { status: string; completed: boolean; position: number }[];
}

export function useLibraryFilter<T extends FilterableItem>(items: T[]) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterChip>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    let result = items;

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.author?.toLowerCase().includes(q) ?? false),
      );
    }

    if (activeFilter !== "all") {
      result = result.filter((item) => {
        const vs = item.versions ?? [];
        switch (activeFilter) {
          case "unplayed":
            return vs.every((v) => v.position === 0 && !v.completed);
          case "in-progress":
            return vs.some((v) => v.position > 0 && !v.completed);
          case "completed":
            return vs.some((v) => v.completed);
          case "generating":
            return vs.some((v) => v.status === "generating");
          default:
            return true;
        }
      });
    }

    return result;
  }, [items, debouncedQuery, activeFilter]);

  return { query, setQuery, activeFilter, setActiveFilter, filtered };
}
