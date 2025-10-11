/**
 * Audio Storage
 * Store and retrieve audio blobs in IndexedDB
 * Contract: web/docs/modules/storage-contract.md - Conformance Criteria #2, #4
 */

import { db } from './db';
import { AudioRecord } from './types';
import { updateContent } from './content';

/**
 * Store audio blob for content
 * @param contentId - Content ID
 * @param audioBlob - Audio file blob
 * @returns Blob URL for playback
 */
export async function storeAudio(contentId: string, audioBlob: Blob): Promise<string> {
  // Validate blob
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Invalid audio blob');
  }

  // Check storage quota before storing large files
  if (audioBlob.size > 100 * 1024 * 1024) { // > 100MB
    const storageInfo = await getStorageEstimate();
    const requiredSpace = audioBlob.size * 1.2; // Add 20% buffer

    if (storageInfo.quota - storageInfo.usage < requiredSpace) {
      throw new Error('Insufficient storage space');
    }
  }

  // Store audio record
  const audioRecord: AudioRecord = {
    contentId,
    audioBlob,
    storedAt: new Date(),
  };

  await db.audio.put(audioRecord);

  // Create blob URL
  const blobUrl = URL.createObjectURL(audioBlob);

  // Update content item to mark as downloaded
  await updateContent(contentId, {
    audioUrl: blobUrl,
    isDownloaded: true,
    downloadProgress: 100,
  });

  return blobUrl;
}

/**
 * Get audio blob for content
 */
export async function getAudio(contentId: string): Promise<Blob | null> {
  const audioRecord = await db.audio.get(contentId);
  return audioRecord?.audioBlob || null;
}

/**
 * Get audio blob URL for playback
 */
export async function getAudioUrl(contentId: string): Promise<string | null> {
  const blob = await getAudio(contentId);
  if (!blob) return null;

  return URL.createObjectURL(blob);
}

/**
 * Delete audio for content
 */
export async function deleteAudio(contentId: string): Promise<void> {
  await db.audio.delete(contentId);

  // Update content item
  await updateContent(contentId, {
    audioUrl: undefined,
    isDownloaded: false,
    downloadProgress: 0,
  });
}

/**
 * Get total audio storage size
 */
export async function getAudioStorageSize(): Promise<number> {
  const audioRecords = await db.audio.toArray();
  return audioRecords.reduce((total, record) => total + record.audioBlob.size, 0);
}

/**
 * Check if audio is stored
 */
export async function hasAudio(contentId: string): Promise<boolean> {
  const count = await db.audio.where('contentId').equals(contentId).count();
  return count > 0;
}

/**
 * Get storage estimate
 */
async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return { usage: 0, quota: 0 };
}
