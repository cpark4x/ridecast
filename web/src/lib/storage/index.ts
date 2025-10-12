/**
 * Storage Module - Public API
 * Contract: web/docs/modules/storage-contract.md
 */

// Database initialization
export { initDatabase, getStorageInfo } from './db';

// Content management
export {
  addContent,
  getContent,
  getAllContent,
  getRecentContent,
  getDownloadedContent,
  updateContent,
  deleteContent,
  searchContent,
  markAsPlayed,
} from './content';

// Audio storage
export {
  storeAudio,
  getAudio,
  getAudioUrl,
  deleteAudio,
  getAudioStorageSize,
  hasAudio,
} from './audio';

// Playback state
export {
  savePlaybackState,
  getPlaybackState,
  updatePlaybackPosition,
  markAsCompleted,
  resetPlayback,
  getCompletedContent,
  getPlaybackProgress,
  deletePlaybackState,
} from './playback';

// Statistics
export {
  getLibraryStats,
  getDetailedStorageInfo,
  clearAllData,
  formatBytes,
  formatDuration,
} from './stats';

// Bookmarks
export {
  createBookmark,
  getBookmarks,
  getBookmark,
  updateBookmark,
  deleteBookmark,
  deleteBookmarksForContent,
  getBookmarkCount,
} from './bookmarks';

// Playlists
export {
  createPlaylist,
  getAllPlaylists,
  getPlaylist,
  updatePlaylist,
  addToPlaylist,
  removeFromPlaylist,
  reorderPlaylist,
  setPlaylistIndex,
  getNextInPlaylist,
  getPreviousInPlaylist,
  deletePlaylist,
  getPlaylistsForContent,
} from './playlists';

// Types
export type { ContentItem, PlaybackState, LibraryStats, AudioRecord, Bookmark, Playlist } from './types';
