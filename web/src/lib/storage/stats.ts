/**
 * Library Statistics
 * Calculate stats about stored content
 * Contract: web/docs/modules/storage-contract.md
 */

import { db, getStorageInfo } from './db';
import { LibraryStats } from './types';
import { getAudioStorageSize } from './audio';

/**
 * Get library statistics
 */
export async function getLibraryStats(): Promise<LibraryStats> {
  const allContent = await db.content.toArray();
  const downloadedContent = allContent.filter((item) => item.isDownloaded);

  const totalDurationSeconds = allContent.reduce((sum, item) => {
    return sum + (item.audioDuration || 0);
  }, 0);

  const totalStorageBytes = await getAudioStorageSize();

  return {
    totalItems: allContent.length,
    downloadedItems: downloadedContent.length,
    totalStorageBytes,
    totalDurationSeconds,
  };
}

/**
 * Get detailed storage information
 */
export async function getDetailedStorageInfo(): Promise<{
  stats: LibraryStats;
  storageQuota: { usage: number; quota: number; percentUsed: number };
  largestItems: Array<{ id: string; title: string; size: number }>;
}> {
  const stats = await getLibraryStats();
  const storageQuota = await getStorageInfo();

  // Get audio sizes
  const audioRecords = await db.audio.toArray();
  const audioSizes = new Map(
    audioRecords.map((record) => [record.contentId, record.audioBlob.size])
  );

  // Get largest items
  const allContent = await db.content.toArray();
  const itemsWithSizes = allContent
    .map((item) => ({
      id: item.id,
      title: item.title,
      size: audioSizes.get(item.id) || 0,
    }))
    .filter((item) => item.size > 0)
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  return {
    stats,
    storageQuota,
    largestItems: itemsWithSizes,
  };
}

/**
 * Clear all data (for testing or factory reset)
 */
export async function clearAllData(): Promise<void> {
  await db.content.clear();
  await db.audio.clear();
  await db.playbackState.clear();
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
