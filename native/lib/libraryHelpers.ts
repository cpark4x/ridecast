import type { LibraryItem, LibraryFilter, PlayableItem } from "./types";

// ──────────────────────────────────────────────────────────────────────────────
// Home screen helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Filter to episodes that are "unlistened":
 * has at least one ready version where position === 0 OR not completed.
 */
export function getUnlistenedItems(items: LibraryItem[]): LibraryItem[] {
  return items.filter((item) =>
    item.versions.some(
      (v) => v.status === "ready" && (v.position === 0 || !v.completed),
    ),
  );
}

/**
 * Build a PlayableItem from a LibraryItem using its first ready version.
 * Returns null if no ready version with audioId + audioUrl exists.
 */
export function libraryItemToPlayable(item: LibraryItem): PlayableItem | null {
  const version = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!version || !version.audioId || !version.audioUrl) return null;

  return {
    id: version.audioId,
    title: item.title,
    duration: version.durationSecs ?? version.targetDuration * 60,
    format: version.format,
    audioUrl: version.audioUrl,
    author: item.author,
    sourceType: item.sourceType,
    contentType: version.contentType,
    themes: version.themes,
    summary: version.summary,
    targetDuration: version.targetDuration,
    createdAt: item.createdAt,
  };
}

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
