/**
 * Playlist Management
 * Create and manage playlists of content
 */

import { db } from './db';
import { Playlist } from './types';

/**
 * Create a new playlist
 */
export async function createPlaylist(
  name: string,
  description?: string,
  contentIds: string[] = []
): Promise<Playlist> {
  const playlist: Playlist = {
    id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    contentIds,
    createdAt: new Date(),
    updatedAt: new Date(),
    currentIndex: 0,
  };

  await db.playlists.add(playlist);
  return playlist;
}

/**
 * Get all playlists
 */
export async function getAllPlaylists(): Promise<Playlist[]> {
  return await db.playlists.orderBy('updatedAt').reverse().toArray();
}

/**
 * Get a specific playlist
 */
export async function getPlaylist(playlistId: string): Promise<Playlist | undefined> {
  return await db.playlists.get(playlistId);
}

/**
 * Update playlist
 */
export async function updatePlaylist(
  playlistId: string,
  updates: Partial<Pick<Playlist, 'name' | 'description' | 'coverImageUrl'>>
): Promise<void> {
  await db.playlists.update(playlistId, {
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * Add content to playlist
 */
export async function addToPlaylist(playlistId: string, contentId: string): Promise<void> {
  const playlist = await getPlaylist(playlistId);
  if (!playlist) throw new Error('Playlist not found');

  if (!playlist.contentIds.includes(contentId)) {
    await db.playlists.update(playlistId, {
      contentIds: [...playlist.contentIds, contentId],
      updatedAt: new Date(),
    });
  }
}

/**
 * Remove content from playlist
 */
export async function removeFromPlaylist(playlistId: string, contentId: string): Promise<void> {
  const playlist = await getPlaylist(playlistId);
  if (!playlist) throw new Error('Playlist not found');

  await db.playlists.update(playlistId, {
    contentIds: playlist.contentIds.filter((id) => id !== contentId),
    updatedAt: new Date(),
  });
}

/**
 * Reorder content in playlist
 */
export async function reorderPlaylist(playlistId: string, contentIds: string[]): Promise<void> {
  await db.playlists.update(playlistId, {
    contentIds,
    updatedAt: new Date(),
  });
}

/**
 * Set current position in playlist
 */
export async function setPlaylistIndex(playlistId: string, index: number): Promise<void> {
  await db.playlists.update(playlistId, {
    currentIndex: index,
    updatedAt: new Date(),
  });
}

/**
 * Get next content in playlist
 */
export async function getNextInPlaylist(playlistId: string): Promise<string | null> {
  const playlist = await getPlaylist(playlistId);
  if (!playlist) return null;

  const nextIndex = playlist.currentIndex + 1;
  if (nextIndex < playlist.contentIds.length) {
    await setPlaylistIndex(playlistId, nextIndex);
    return playlist.contentIds[nextIndex];
  }

  return null; // End of playlist
}

/**
 * Get previous content in playlist
 */
export async function getPreviousInPlaylist(playlistId: string): Promise<string | null> {
  const playlist = await getPlaylist(playlistId);
  if (!playlist) return null;

  const prevIndex = playlist.currentIndex - 1;
  if (prevIndex >= 0) {
    await setPlaylistIndex(playlistId, prevIndex);
    return playlist.contentIds[prevIndex];
  }

  return null; // Beginning of playlist
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(playlistId: string): Promise<void> {
  await db.playlists.delete(playlistId);
}

/**
 * Get playlists containing content
 */
export async function getPlaylistsForContent(contentId: string): Promise<Playlist[]> {
  const allPlaylists = await getAllPlaylists();
  return allPlaylists.filter((playlist) => playlist.contentIds.includes(contentId));
}
