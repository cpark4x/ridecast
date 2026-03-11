interface ProgressVersion {
  audioId: string | null;
  durationSecs: number | null;
  position: number;
  completed: boolean;
  status: string;
}

export function getMostListenedVersion<T extends ProgressVersion>(
  versions: T[],
): T | null {
  let best: T | null = null;
  let bestRatio = -1;
  for (const v of versions) {
    if (!v.durationSecs || v.durationSecs <= 0) continue;
    const ratio = v.completed ? 1 : Math.min(1, v.position / v.durationSecs);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = v;
    }
  }
  return best;
}

export function getCardProgress(versions: ProgressVersion[]): number {
  const v = getMostListenedVersion(versions);
  if (!v) return 0;
  if (v.completed) return 1;
  if (!v.durationSecs || v.durationSecs <= 0) return 0;
  return Math.min(1, v.position / v.durationSecs);
}

export function getVersionProgress(v: ProgressVersion): number {
  if (v.completed) return 1;
  if (!v.durationSecs || v.durationSecs <= 0) return 0;
  return Math.min(1, v.position / v.durationSecs);
}

export function isItemPlayed(versions: ProgressVersion[]): boolean {
  return versions.some((v) => v.completed);
}
