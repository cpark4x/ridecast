/**
 * Storage Module Types
 * Contract: web/docs/modules/storage-contract.md
 */

export interface ContentItem {
  id: string;
  title: string;
  author: string;
  type: 'book' | 'article' | 'pdf' | 'other';
  text: string;
  audioUrl?: string; // Blob URL for audio
  audioDuration?: number; // seconds
  voiceId: string;
  voiceConfig?: { voice: string; speed: number; pitch: number }; // Store voice settings for live playback
  coverImageUrl?: string;
  addedAt: Date;
  lastPlayedAt?: Date;
  isDownloaded: boolean;
  downloadProgress?: number; // 0-100
}

export interface PlaybackState {
  contentId: string;
  position: number; // seconds
  duration: number; // seconds
  lastUpdated: Date;
  completed: boolean;
}

export interface LibraryStats {
  totalItems: number;
  downloadedItems: number;
  totalStorageBytes: number;
  totalDurationSeconds: number;
}

export interface AudioRecord {
  contentId: string;
  audioBlob: Blob;
  storedAt: Date;
}

export interface Bookmark {
  id: string;
  contentId: string;
  position: number; // seconds
  label: string; // user-defined label
  createdAt: Date;
  note?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  contentIds: string[]; // ordered list of content IDs
  createdAt: Date;
  updatedAt: Date;
  coverImageUrl?: string;
  currentIndex: number; // track position in playlist
}
