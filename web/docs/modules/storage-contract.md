# Contract: Offline Storage Module

**Version**: 1.0.0
**Module**: `lib/storage`
**Owner**: Ridecast Core Team
**Related User Story**: [US 3.2.1 - Save and Play Offline](../../2-product/userstories/epic-3-library-playback/feature-3.2/us-3.2.1-save-and-play-offline.md)

---

## Purpose

Provides offline-first storage for audio files, content metadata, and playback state using IndexedDB. Enables users to download content on WiFi and listen without connectivity.

## Public Interface

### Types

```typescript
interface ContentItem {
  id: string;
  title: string;
  author: string;
  type: 'book' | 'article' | 'pdf' | 'other';
  text: string;
  audioUrl?: string;           // Blob URL for audio
  audioDuration?: number;      // seconds
  voiceId: string;
  coverImageUrl?: string;
  addedAt: Date;
  lastPlayedAt?: Date;
  isDownloaded: boolean;
  downloadProgress?: number;   // 0-100
}

interface PlaybackState {
  contentId: string;
  position: number;            // seconds
  duration: number;            // seconds
  lastUpdated: Date;
  completed: boolean;
}

interface LibraryStats {
  totalItems: number;
  downloadedItems: number;
  totalStorageBytes: number;
  totalDurationSeconds: number;
}
```

### Core Functions

```typescript
// Content Management
async function addContent(content: Omit<ContentItem, 'id' | 'addedAt'>): Promise<ContentItem>;
async function getContent(id: string): Promise<ContentItem | null>;
async function getAllContent(): Promise<ContentItem[]>;
async function updateContent(id: string, updates: Partial<ContentItem>): Promise<void>;
async function deleteContent(id: string): Promise<void>;

// Audio Storage
async function storeAudio(contentId: string, audioBlob: Blob): Promise<string>;
async function getAudio(contentId: string): Promise<Blob | null>;
async function deleteAudio(contentId: string): Promise<void>;

// Playback State
async function savePlaybackState(state: PlaybackState): Promise<void>;
async function getPlaybackState(contentId: string): Promise<PlaybackState | null>;

// Library Stats
async function getLibraryStats(): Promise<LibraryStats>;
async function clearAllData(): Promise<void>;
```

## Conformance Criteria

1. **Offline Storage**: Must work completely offline using IndexedDB
2. **Large Files**: Must handle audio files up to 500MB per item
3. **Quick Access**: Retrieve content metadata in <100ms
4. **Audio Retrieval**: Retrieve audio blob in <500ms for typical files
5. **Atomic Updates**: Content updates must be atomic (all or nothing)
6. **Storage Limits**: Track and report storage quota usage
7. **Data Integrity**: Validate data on retrieval; handle corruption gracefully

## Dependencies

- **Dexie.js** - IndexedDB wrapper
- **LocalForage** - Fallback storage (optional)

## Constraints

- Must work in all modern browsers (Chrome, Firefox, Safari, Edge)
- Storage quota: Request persistent storage when available
- Maximum individual audio file: 500MB
- Total storage limit: Browser-dependent (typically 10GB+)

## Security

- No sensitive data in storage (audio files only)
- Content validation before storage (prevent XSS)
- Sanitize user-provided metadata
- No external network calls from this module

## Performance

- Database initialization: <200ms
- Add content (metadata only): <50ms
- Store audio (100MB file): <5 seconds
- Retrieve audio (100MB file): <2 seconds
- Query all content: <200ms for 1000 items

## Testing Requirements

- Unit tests for all CRUD operations
- Test storage quota handling
- Test concurrent read/write operations
- Test data migration scenarios
- Test browser compatibility (Chrome, Firefox, Safari)

---

## Non-Goals

- Cloud sync (v1.0 is local-only)
- Encryption (v1.0 stores unencrypted)
- Multi-device sync
- Background sync workers
