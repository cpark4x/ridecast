/**
 * Bookmark Management
 * Save and manage bookmarks for content
 */

import { db } from './db';
import { Bookmark } from './types';

/**
 * Create a new bookmark
 */
export async function createBookmark(
  contentId: string,
  position: number,
  label: string,
  note?: string
): Promise<Bookmark> {
  const bookmark: Bookmark = {
    id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    contentId,
    position,
    label,
    note,
    createdAt: new Date(),
  };

  await db.bookmarks.add(bookmark);
  return bookmark;
}

/**
 * Get all bookmarks for a content item
 */
export async function getBookmarks(contentId: string): Promise<Bookmark[]> {
  return await db.bookmarks
    .where('contentId')
    .equals(contentId)
    .sortBy('position');
}

/**
 * Get a specific bookmark
 */
export async function getBookmark(bookmarkId: string): Promise<Bookmark | undefined> {
  return await db.bookmarks.get(bookmarkId);
}

/**
 * Update a bookmark
 */
export async function updateBookmark(
  bookmarkId: string,
  updates: Partial<Pick<Bookmark, 'label' | 'note' | 'position'>>
): Promise<void> {
  await db.bookmarks.update(bookmarkId, updates);
}

/**
 * Delete a bookmark
 */
export async function deleteBookmark(bookmarkId: string): Promise<void> {
  await db.bookmarks.delete(bookmarkId);
}

/**
 * Delete all bookmarks for a content item
 */
export async function deleteBookmarksForContent(contentId: string): Promise<void> {
  await db.bookmarks.where('contentId').equals(contentId).delete();
}

/**
 * Get bookmark count for content
 */
export async function getBookmarkCount(contentId: string): Promise<number> {
  return await db.bookmarks.where('contentId').equals(contentId).count();
}
