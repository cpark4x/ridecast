// ──────────────────────────────────────────────────────────────────────────────
// Playback helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Cycle to the next speed in the list. Wraps around after the last value.
 * If current is not found in the list, returns the first speed.
 */
export function nextSpeed(current: number, speeds: number[]): number {
  const idx = speeds.indexOf(current);
  if (idx === -1 || idx === speeds.length - 1) return speeds[0];
  return speeds[idx + 1];
}

// ──────────────────────────────────────────────────────────────────────────────
// Duration formatters
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Format seconds as "M:SS" (< 1 hr) or "H:MM:SS" (>= 1 hr).
 * e.g. formatDuration(323) → "5:23"
 *      formatDuration(3723) → "1:02:03"
 */
export function formatDuration(secs: number): string {
  const total = Math.floor(secs);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const ss = String(s).padStart(2, "0");
  if (h > 0) {
    const mm = String(m).padStart(2, "0");
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

/**
 * Format seconds in human-readable minutes/hours.
 * e.g. formatDurationMinutes(323) → "5 min"
 *      formatDurationMinutes(3900) → "1 hr 5 min"
 *      formatDurationMinutes(3600) → "1 hr"
 */
// ─────────────────────────────────────────────────────────────────────────────
// Upload helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate reading time in minutes (ceiling) at 250 WPM.
 * Returns at least 1 minute.
 */
export function estimateReadingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 250));
}

/**
 * Format a byte count as a human-readable storage size string.
 * Values < 1 MB → "X KB"
 * Values ≥ 1 MB → "X.Y MB"
 */
export function formatStorageSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = Math.floor(bytes / 1024);
  return `${kb} KB`;
}

export function formatDurationMinutes(secs: number): string {
  const totalMinutes = Math.floor(secs / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  return `${m} min`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Relative time
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Return a human-readable relative time string.
 * e.g. "just now", "5 minutes ago", "2 hours ago", "3 days ago"
 */
export function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffSeconds < 60) return "just now";
  if (diffMinutes === 1) return "1 minute ago";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Player bar helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable source name from a PlayableItem.
 * Priority: extracted domain from sourceUrl > author > sourceType label
 */
export function sourceName(
  sourceType: string | null | undefined,
  sourceUrl: string | null | undefined,
  author: string | null | undefined,
): string {
  const type = (sourceType ?? "").toLowerCase();
  if (type === "url" && sourceUrl) {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      // fall through to label
    }
  }
  if ((type === "pdf" || type === "epub") && author) return author;
  const LABELS: Record<string, string> = {
    pdf:    "PDF",
    epub:   "EPUB",
    txt:    "Text",
    pocket: "Pocket",
    url:    "Article",
  };
  return LABELS[type] ?? type.toUpperCase();
}

/**
 * Returns "X min left" (when ≥ 60 s remaining) or "X sec left" (< 60 s).
 * Clamps to 0 — never returns negative values.
 */
export function timeRemaining(positionSecs: number, durationSecs: number): string {
  const remaining = Math.max(0, durationSecs - positionSecs);
  if (remaining >= 60) {
    return `${Math.ceil(remaining / 60)} min left`;
  }
  return `${Math.ceil(remaining)} sec left`;
}
