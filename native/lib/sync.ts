import * as api from "./api";
import * as db from "./db";
import { downloadEpisodeAudio } from "./downloads";
import { deriveSourceIdentity } from "./sourceUtils";
import type { LibraryItem } from "./types";

export async function syncLibrary(): Promise<LibraryItem[]> {
  const serverItems = await api.fetchLibrary();

  // Enrich each item with client-derived identity fields.
  // Server-provided fields (non-null) always win; we only fill gaps.
  const enriched: LibraryItem[] = serverItems.map((item) => {
    const derived = deriveSourceIdentity(item);
    return {
      ...item,
      sourceIcon:       item.sourceIcon       ?? derived.sourceIcon,
      sourceName:       item.sourceName       ?? derived.sourceName,
      sourceDomain:     item.sourceDomain     ?? derived.sourceDomain,
      sourceBrandColor: item.sourceBrandColor ?? derived.sourceBrandColor,
    };
  });

  await db.upsertEpisodes(enriched);

  for (const item of enriched) {
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

  return enriched;
}

export async function syncPlayback(): Promise<void> {
  const localStates = await db.getAllLocalPlayback();

  for (const local of localStates) {
    try {
      const server = await api.getPlaybackState(local.audioId);

      if (server.updatedAt && local.updatedAt) {
        const serverTime = new Date(server.updatedAt).getTime();
        const localTime  = new Date(local.updatedAt).getTime();
        if (serverTime > localTime) {
          await db.saveLocalPlayback({
            audioId:   local.audioId,
            position:  server.position,
            speed:     server.speed,
            completed: server.completed,
          });
          continue;
        }
      }

      await api.savePlaybackState({
        audioId:   local.audioId,
        position:  local.position,
        speed:     local.speed,
        completed: local.completed,
      });
    } catch {
      // Silently skip — will retry next sync cycle
    }
  }
}
