import Dexie from "dexie";

interface CachedAudio {
  id: string;
  data: ArrayBuffer;
  cachedAt: number;
}

class AudioCacheDB extends Dexie {
  audioCache!: Dexie.Table<CachedAudio, string>;

  constructor() {
    super("RidecastAudioCache");
    this.version(1).stores({
      audioCache: "id",
    });
  }
}

const db = new AudioCacheDB();

export async function cacheAudio(audioId: string, data: ArrayBuffer): Promise<void> {
  await db.audioCache.put({ id: audioId, data, cachedAt: Date.now() });
}

export async function getCachedAudio(audioId: string): Promise<ArrayBuffer | undefined> {
  const entry = await db.audioCache.get(audioId);
  return entry?.data;
}

export async function removeCachedAudio(audioId: string): Promise<void> {
  await db.audioCache.delete(audioId);
}

export async function isAudioCached(audioId: string): Promise<boolean> {
  const entry = await db.audioCache.get(audioId);
  return !!entry;
}
