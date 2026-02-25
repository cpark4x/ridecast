const WORDS_PER_MINUTE = 150;

export function minutesToWords(minutes: number): number {
  return minutes * WORDS_PER_MINUTE;
}

export function wordsToMinutes(words: number): number {
  return Math.round(words / WORDS_PER_MINUTE);
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
