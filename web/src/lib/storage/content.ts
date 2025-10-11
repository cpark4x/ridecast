/**
 * Content Management
 * CRUD operations for content items
 * Contract: web/docs/modules/storage-contract.md
 */

import { db } from './db';
import { ContentItem } from './types';
import { nanoid } from 'nanoid';

/**
 * Add new content to library
 */
export async function addContent(
  content: Omit<ContentItem, 'id' | 'addedAt'>
): Promise<ContentItem> {
  const newContent: ContentItem = {
    ...content,
    id: nanoid(),
    addedAt: new Date(),
    isDownloaded: false,
  };

  await db.content.add(newContent);
  return newContent;
}

/**
 * Get content by ID
 */
export async function getContent(id: string): Promise<ContentItem | null> {
  const content = await db.content.get(id);
  return content || null;
}

/**
 * Get all content items
 */
export async function getAllContent(): Promise<ContentItem[]> {
  return db.content.toArray();
}

/**
 * Get recently played content
 */
export async function getRecentContent(limit: number = 10): Promise<ContentItem[]> {
  return db.content
    .orderBy('lastPlayedAt')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Get downloaded content (available offline)
 */
export async function getDownloadedContent(): Promise<ContentItem[]> {
  return db.content.where('isDownloaded').equals(1).toArray();
}

/**
 * Update content
 */
export async function updateContent(
  id: string,
  updates: Partial<ContentItem>
): Promise<void> {
  await db.content.update(id, updates);
}

/**
 * Mark content as played
 */
export async function markAsPlayed(id: string): Promise<void> {
  await db.content.update(id, {
    lastPlayedAt: new Date(),
  });
}

/**
 * Delete content
 */
export async function deleteContent(id: string): Promise<void> {
  // Delete content metadata
  await db.content.delete(id);

  // Delete associated audio
  await db.audio.delete(id);

  // Delete playback state
  await db.playbackState.delete(id);
}

/**
 * Search content by title or author
 */
export async function searchContent(query: string): Promise<ContentItem[]> {
  const lowerQuery = query.toLowerCase();

  return db.content
    .filter((item) => {
      return (
        item.title.toLowerCase().includes(lowerQuery) ||
        item.author.toLowerCase().includes(lowerQuery)
      );
    })
    .toArray();
}
