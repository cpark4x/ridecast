import * as api from "./api";
import * as db from "./db";
import { downloadEpisodeAudio } from "./downloads";
import { deriveSourceIdentity } from "./sourceUtils";
import { Haptics } from "./haptics";
import type { LibraryItem } from "./types";

export async function syncLibrary(): Promise<LibraryItem[]> {
  // Read existing local state before overwriting — used to detect transitions
  const localItems = await db.getAllEpisodes();
  const localById = new Map(localItems.map((i) => [i.id, i]));

  const serverItems = await api.fetchLibrary();

  // Enrich each item with client-derived identity fields.
  // Server-provided fields (non-null) always win; we only fill gaps.
  const enriched: LibraryItem[] = serverItems.map((item) => {
    const derived = deriveSourceIdentity(item);

    let thumbnailUrl: string | null = null;
    if (item.sourceUrl) {
      try {
        thumbnailUrl = `https://www.google.com/s2/favicons?domain=${new URL(item.sourceUrl).hostname}&sz=128`;
      } catch {
        // malformed URL — leave as null
      }
    }

    return {
      ...item,
      thumbnailUrl:     item.thumbnailUrl     ?? thumbnailUrl,
      sourceIcon:       item.sourceIcon       ?? derived.sourceIcon,
      sourceName:       item.sourceName       ?? derived.sourceName,
      sourceDomain:     item.sourceDomain     ?? derived.sourceDomain,
      sourceBrandColor: item.sourceBrandColor ?? derived.sourceBrandColor,
    };
  });

  // Detect generating → ready transitions and fire success haptic
  let anyNewlyReady = false;
  for (const serverItem of enriched) {
    const localItem = localById.get(serverItem.id);
    if (!localItem) continue;
    const localWasGenerating = localItem.versions.some((v) => v.status === "generating");
    const serverNowReady = serverItem.versions.some((v) => v.status === "ready");
    if (localWasGenerating && serverNowReady) {
      anyNewlyReady = true;
      break;
    }
  }
  if (anyNewlyReady) {
    void Haptics.success();
  }

  await db.upsertEpisodes(enriched);

  // Seed the local playback table with the completed/position values returned
  // by the server.  Uses INSERT OR IGNORE so we never overwrite more-recent
  // local progress — rows are only inserted when none exist yet (e.g. fresh
  // install or cleared database).  This ensures getLocalPlayback() and
  // playQueue() see the correct completed state even before syncPlayback() has
  // had a chance to push local states up.
  for (const item of enriched) {
    for (const version of item.versions) {
      if (version.audioId) {
        await db.seedLocalPlayback({
          audioId:   version.audioId,
          position:  version.position,
          completed: version.completed,
        });
      }
    }
  }

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

  // Nothing to sync — skip the network call entirely.
  if (localStates.length === 0) return;

  try {
    // Single batch call instead of one GET + one POST per episode (N+1 → 1).
    // Server-wins-if-newer logic is applied on the backend: states where the
    // server already has a more recent record are silently skipped.
    await api.batchSyncPlayback(localStates);
  } catch {
    // Silently skip — will retry next sync cycle
  }
}
