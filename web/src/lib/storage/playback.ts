/**
 * Playback State Management
 * Track playback position for each content item
 * Contract: web/docs/modules/storage-contract.md
 */

import { db } from './db';
import { PlaybackState } from './types';

/**
 * Save playback state
 */
export async function savePlaybackState(state: PlaybackState): Promise<void> {
  await db.playbackState.put({
    ...state,
    lastUpdated: new Date(),
  });
}

/**
 * Get playback state for content
 */
export async function getPlaybackState(contentId: string): Promise<PlaybackState | null> {
  const state = await db.playbackState.get(contentId);
  return state || null;
}

/**
 * Update playback position
 */
export async function updatePlaybackPosition(
  contentId: string,
  position: number,
  duration: number
): Promise<void> {
  const completed = position >= duration * 0.95; // 95% completion = completed

  await db.playbackState.put({
    contentId,
    position,
    duration,
    completed,
    lastUpdated: new Date(),
  });
}

/**
 * Mark content as completed
 */
export async function markAsCompleted(contentId: string): Promise<void> {
  const state = await getPlaybackState(contentId);
  if (state) {
    await db.playbackState.update(contentId, {
      completed: true,
      lastUpdated: new Date(),
    });
  }
}

/**
 * Reset playback position
 */
export async function resetPlayback(contentId: string): Promise<void> {
  await db.playbackState.put({
    contentId,
    position: 0,
    duration: 0,
    completed: false,
    lastUpdated: new Date(),
  });
}

/**
 * Get all completed content
 */
export async function getCompletedContent(): Promise<string[]> {
  const completed = await db.playbackState.where('completed').equals(1).toArray();
  return completed.map((state) => state.contentId);
}

/**
 * Get playback progress percentage
 */
export async function getPlaybackProgress(contentId: string): Promise<number> {
  const state = await getPlaybackState(contentId);
  if (!state || state.duration === 0) return 0;

  return Math.min(100, (state.position / state.duration) * 100);
}

/**
 * Delete playback state
 */
export async function deletePlaybackState(contentId: string): Promise<void> {
  await db.playbackState.delete(contentId);
}
