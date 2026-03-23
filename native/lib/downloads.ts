import * as FileSystem from "expo-file-system/legacy";
import * as db from "./db";
import { API_URL } from "./constants";

/**
 * Resolve an audio URL for streaming/download.
 * Routes through the API's /api/audio endpoint which generates time-limited
 * SAS URLs, bypassing Azure Blob Storage public access restrictions.
 */
function toAbsoluteUrl(url: string, audioId?: string): string {
  // If we have an audioId, use the API endpoint (generates SAS URLs)
  if (audioId) return `${API_URL}/api/audio/${audioId}`;
  // Fallback: relative paths get API_URL prefix, absolute URLs pass through
  if (url.startsWith("http")) return url;
  return `${API_URL}/${url}`;
}

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}episodes/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
}

export async function downloadEpisodeAudio(
  audioId: string,
  remoteUrl: string,
): Promise<string> {
  const existing = await db.getDownloadPath(audioId);
  if (existing) {
    const info = await FileSystem.getInfoAsync(existing);
    if (info.exists) return existing;
  }

  await ensureDir();
  const localPath = `${DOWNLOADS_DIR}${audioId}.mp3`;

  const result = await FileSystem.downloadAsync(toAbsoluteUrl(remoteUrl, audioId), localPath);
  if (result.status !== 200) {
    throw new Error(`Download failed with status ${result.status}`);
  }

  const info = await FileSystem.getInfoAsync(localPath);
  const sizeBytes = info.exists && "size" in info ? info.size ?? 0 : 0;

  await db.recordDownload(audioId, localPath, sizeBytes);
  return localPath;
}

export async function resolveAudioUrl(
  audioId: string,
  remoteUrl: string,
): Promise<string> {
  const localPath = await db.getDownloadPath(audioId);
  if (localPath) {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) return localPath;
  }
  return toAbsoluteUrl(remoteUrl, audioId);
}

export async function deleteDownload(audioId: string): Promise<void> {
  const localPath = await db.getDownloadPath(audioId);
  if (localPath) {
    try {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    } catch {
      // File already gone
    }
  }
  await db.deleteDownloadRecord(audioId);
}
