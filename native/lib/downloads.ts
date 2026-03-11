import * as FileSystem from "expo-file-system";
import * as db from "./db";

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

  const result = await FileSystem.downloadAsync(remoteUrl, localPath);
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
  return remoteUrl;
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
