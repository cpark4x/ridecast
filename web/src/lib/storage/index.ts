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

// Types
export type { ContentItem, PlaybackState, LibraryStats, AudioRecord } from './types';
