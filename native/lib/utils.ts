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
