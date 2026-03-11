/**
 * Shared display utilities for content items.
 * Used by HomeScreen, LibraryScreen, and any future content UI.
 */

/** Gradient class strings for Tailwind — cycle with getGradient(index). */
export const gradients = [
  "from-[#EA580C] to-[#F97316]",
  "from-pink-500 to-rose-500",
  "from-teal-500 to-cyan-500",
  "from-amber-500 to-red-500",
];

/** Get a gradient by index, cycling through the array. */
export function getGradient(index: number): string {
  return gradients[index % gradients.length];
}

/** SVG path data for source-type icons. Use inside a <path d={...} /> element. */
export const sourceIcons: Record<string, string> = {
  pdf: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
  epub: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  url: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  txt: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
};

/** Relative time string: "Just now", "5m ago", "3h ago", "2d ago", "1w ago". */
export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

/**
 * Generate a display title with fallback logic:
 * 1. Use title if non-empty
 * 2. Extract domain from sourceUrl (strip www.)
 * 3. Fall back to "SOURCETYPE · Mon D, YYYY"
 */
export function getTitleFallback(
  title: string,
  sourceUrl: string | null,
  sourceType: string,
  createdAt: string,
): string {
  if (title.trim()) return title;

  if (sourceUrl) {
    try {
      const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
      if (hostname) return hostname;
    } catch {
      // invalid URL — fall through
    }
  }

  const date = new Date(createdAt);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${sourceType.toUpperCase()} · ${formatted}`;
}