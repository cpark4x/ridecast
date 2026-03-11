import * as api from "./api";
import * as db from "./db";
import { downloadEpisodeAudio } from "./downloads";
import type { LibraryItem } from "./types";

export async function syncLibrary(): Promise<LibraryItem[]> {
  const serverItems = await api.fetchLibrary();
  await db.upsertEpisodes(serverItems);

  for (const item of serverItems) {
    for (const version of item.versions) {
      if (version.status === "ready" && version.audioId && version.audioUrl) {
        const existing = await db.getDownloadPath(version.audioId);
        if (!existing) {
          downloadEpisodeAudio(version.audioId, version.audioUrl).catch(
            (err) => console.warn("[sync] download failed:", version.audioId, err),
          );
        }
      }
    }
  }

  return serverItems;
}

export async function syncPlayback(): Promise<void> {
  const localStates = await db.getAllLocalPlayback();

  for (const local of localStates) {
    try {
      const server = await api.getPlaybackState(local.audioId);

      if (server.updatedAt && local.updatedAt) {
        const serverTime = new Date(server.updatedAt).getTime();
        const localTime = new Date(local.updatedAt).getTime();
        if (serverTime > localTime) {
          await db.saveLocalPlayback({
            audioId: local.audioId,
            position: server.position,
            speed: server.speed,
            completed: server.completed,
          });
          continue;
        }
      }

      await api.savePlaybackState({
        audioId: local.audioId,
        position: local.position,
        speed: local.speed,
        completed: local.completed,
      });
    } catch {
      // Silently skip — will retry next sync cycle
    }
  }
}
