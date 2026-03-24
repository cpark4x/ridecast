import type { LibraryItem, LibraryFilter, PlayableItem } from "./types";
import { sourceName } from "./utils";

export type SortOrder =
  | "date_desc"
  | "date_asc"
  | "title_asc"
  | "duration_asc"
  | "source_asc";

// ─────────────────────────────────────────────────────────────────────────────
// Home screen helpers
// ─────────────────────────────────────────────────────────────────────────────

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
    id:               version.audioId,
    title:            smartTitle(item.title, item.sourceType, item.sourceDomain),
    duration:         version.durationSecs ?? version.targetDuration * 60,
    format:           version.format,
    audioUrl:         version.audioUrl,
    author:           item.author,
    sourceType:       item.sourceType,
    sourceUrl:        item.sourceUrl,
    sourceDomain:     item.sourceDomain,   // for smartTitle
    sourceName:       item.sourceName,     // for player bar subtitle
    sourceBrandColor: item.sourceBrandColor, // for SourceIcon
    contentType:      version.contentType,
    themes:           version.themes,
    summary:          version.summary,
    targetDuration:   version.targetDuration,
    createdAt:        item.createdAt,
    thumbnailUrl:     item.thumbnailUrl, // for lock screen artwork
  };
}

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

/**
 * Group a flat list of LibraryItems into Today / This Week / Earlier sections.
 * Sections with no items are omitted.
 */
export function groupByTimePeriod(
  items: LibraryItem[],
): Array<{ title: string; data: LibraryItem[] }> {
  const today: LibraryItem[] = [];
  const thisWeek: LibraryItem[] = [];
  const earlier: LibraryItem[] = [];

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  // "This Week" = last 6 full days before today
  const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

  for (const item of items) {
    const t = new Date(item.createdAt).getTime();
    if (t >= startOfToday) {
      today.push(item);
    } else if (t >= sevenDaysAgo) {
      thisWeek.push(item);
    } else {
      earlier.push(item);
    }
  }

  const sections: Array<{ title: string; data: LibraryItem[] }> = [];
  if (today.length > 0) sections.push({ title: "Today", data: today });
  if (thisWeek.length > 0) sections.push({ title: "This Week", data: thisWeek });
  if (earlier.length > 0) sections.push({ title: "Earlier", data: earlier });
  return sections;
}

/**
 * Sort a list of LibraryItems by the given order.
 * Returns a new array (does not mutate input).
 */
export function sortEpisodes(
  items: LibraryItem[],
  order: SortOrder,
): LibraryItem[] {
  const sorted = [...items];
  switch (order) {
    case "date_desc":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "date_asc":
      return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "title_asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "source_asc":
      return sorted.sort((a, b) =>
        a.sourceType.localeCompare(b.sourceType),
      );
    case "duration_asc":
      return sorted.sort((a, b) => {
        const aDur = a.versions[0]?.targetDuration ?? Infinity;
        const bDur = b.versions[0]?.targetDuration ?? Infinity;
        return aDur - bDur;
      });
    default:
      return sorted;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart title (feature: smart-titles)
// ─────────────────────────────────────────────────────────────────────────────

const MINOR_WORDS = new Set([
  "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at",
  "to", "by", "in", "of", "up", "as",
]);

function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i === 0 || !MINOR_WORDS.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(" ");
}

/**
 * Clean a filename-style title:
 *   "2024_Q3_strategy_report.pdf"  →  "2024 Q3 Strategy Report"
 *   "my-article-draft-FINAL_v2"    →  "My Article Draft"
 */
function cleanFilenameTitle(title: string): string {
  // Strip common file extensions
  let t = title.replace(/\.(pdf|epub|txt|docx|doc|md)$/i, "");

  // Strip trailing version/draft noise: _v2, _FINAL, _draft, _copy, _rev1
  t = t.replace(/[_\s-]+(v\d[\d.]*|final|draft|copy|rev\d*|revision\d*)$/gi, "");

  // Replace separators (underscores, hyphens between words) with spaces
  t = t.replace(/[_-]/g, " ");

  // Title-case
  t = titleCase(t);

  return t.trim();
}

/**
 * Strip publisher name from suffix/prefix patterns.
 * Conservative: only strips when the segment after the separator is ≤ 40 chars.
 */
function stripPublisherSuffix(title: string, sourceDomain: string | null): string {
  // Strong separators: |, «, › — these almost always indicate a publisher tag
  const STRONG_SEPARATOR = /\s*[|«›]\s*/;

  const strongParts = title.split(STRONG_SEPARATOR);
  if (strongParts.length >= 2) {
    const suffix = strongParts[strongParts.length - 1].trim();
    const prefix = strongParts.slice(0, -1).join(" | ").trim();

    if (suffix.length <= 40 && prefix.length > 0) {
      return prefix;
    }

    // Also try stripping as prefix if first segment matches sourceDomain
    const firstSegment = strongParts[0].trim();
    const rest = strongParts.slice(1).join(" | ").trim();
    if (
      firstSegment.length <= 40 &&
      rest.length > 0 &&
      sourceDomain &&
      firstSegment.toLowerCase().includes(sourceDomain.split(".")[0])
    ) {
      return rest;
    }
  }

  // Weaker separator: " - "
  // Only strip if the right side is ≤ 3 words and ≤ 30 chars
  const dashParts = title.split(" - ");
  if (dashParts.length >= 2) {
    const lastPart = dashParts[dashParts.length - 1].trim();
    const bodyParts = dashParts.slice(0, -1).join(" - ").trim();
    const wordCount = lastPart.split(/\s+/).length;
    if (wordCount <= 3 && lastPart.length <= 30 && bodyParts.length > 0) {
      return bodyParts;
    }
  }

  return title;
}

/**
 * Cleans a raw title for display.
 *
 * Rules applied in order:
 *   1. PDF/file filenames: strip extension, replace separators, title-case
 *   2. All titles: strip common site-name suffixes/prefixes
 *   3. All titles: collapse multiple whitespace runs
 *   4. All titles: truncate to maxLength with ellipsis at last word boundary
 *
 * @param rawTitle    The raw title string from the API
 * @param sourceType  LibraryItem.sourceType (used to apply PDF-specific rules)
 * @param sourceDomain Used to strip domain-specific boilerplate (optional)
 * @param maxLength   Maximum character length before truncation (default: 80)
 */
export function smartTitle(
  rawTitle: string,
  sourceType: string,
  sourceDomain?: string | null,
  maxLength = 80,
): string {
  const trimmed = rawTitle.trim();

  // Preserve original behavior for genuinely empty strings
  if (!trimmed) return rawTitle;

  // Fall back for anonymous/placeholder titles — use domain or source label
  if (trimmed === "(anonymous)") {
    if (sourceDomain) return sourceDomain;
    return sourceName(sourceType, null, null);
  }

  let title = trimmed;

  // Rule 1: PDF / file-based sources — clean up filename-style titles
  if (sourceType === "pdf" || sourceType === "txt" || sourceType === "epub") {
    title = cleanFilenameTitle(title);
  }

  // Rule 2: Strip site-name suffix patterns
  title = stripPublisherSuffix(title, sourceDomain ?? null);

  // Rule 3: Collapse whitespace
  title = title.replace(/\s+/g, " ").trim();

  // Rule 4: Truncate to maxLength with ellipsis at last word boundary
  if (title.length > maxLength) {
    const truncated = title.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    title = (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + "…";
  }

  return title || rawTitle; // never return empty string
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty-state context detection
// ─────────────────────────────────────────────────────────────────────────────

export type LibraryContext =
  | "new_user"      // no episodes at all (ever)
  | "all_caught_up" // every episode's every version is completed
  | "stale"         // has active episodes but newest createdAt > 7 days ago
  | "normal";       // active content, nothing special

/**
 * Classify the user's library into one of four contexts.
 * Used to pick the correct empty state or nudge card.
 */
export function getLibraryContext(items: LibraryItem[]): LibraryContext {
  if (items.length === 0) return "new_user";

  const allCompleted = items.every(
    (item) => item.versions.length > 0 && item.versions.every((v) => v.completed),
  );
  if (allCompleted) return "all_caught_up";

  const newestMs = items
    .map((i) => new Date(i.createdAt).getTime())
    .reduce((a, b) => Math.max(a, b), 0);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (newestMs < sevenDaysAgo) return "stale";

  return "normal";
}

/**
 * Return the most-frequently-occurring source domain in the library.
 * Used by StaleLibraryNudge to suggest a source the user already knows.
 * Returns null if no items have a sourceUrl.
 */
export function getTopSourceDomain(items: LibraryItem[]): string | null {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!item.sourceUrl) continue;
    try {
      const domain = new URL(item.sourceUrl).hostname.replace(/^www\./, "");
      counts[domain] = (counts[domain] ?? 0) + 1;
    } catch {
      // skip malformed URLs
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? null;
}
