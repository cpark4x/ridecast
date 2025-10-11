/**
 * IndexedDB Database Configuration
 * Using Dexie.js for IndexedDB access
 * Contract: web/docs/modules/storage-contract.md
 */

import Dexie, { Table } from 'dexie';
import { ContentItem, PlaybackState, AudioRecord } from './types';

export class RidecastDatabase extends Dexie {
  content!: Table<ContentItem, string>;
  playbackState!: Table<PlaybackState, string>;
  audio!: Table<AudioRecord, string>;

  constructor() {
    super('RidecastDB');

    // Define schema
    this.version(1).stores({
      content: 'id, title, author, type, addedAt, lastPlayedAt, isDownloaded',
      playbackState: 'contentId, lastUpdated',
      audio: 'contentId, storedAt',
    });
  }
}

// Create singleton instance
export const db = new RidecastDatabase();

/**
 * Initialize database and request persistent storage
 */
export async function initDatabase(): Promise<void> {
  try {
    // Request persistent storage if available
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage: ${isPersisted ? 'granted' : 'denied'}`);
    }

    // Open database
    await db.open();
    console.log('RidecastDB initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Get storage quota information
 */
export async function getStorageInfo(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, percentUsed };
  }

  // Fallback if API not available
  return { usage: 0, quota: 0, percentUsed: 0 };
}
