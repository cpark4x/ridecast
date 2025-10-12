'use client';

import { useState, useEffect } from 'react';
import {
  getAllContent,
  deleteContent,
  getLibraryStats,
  getPlaybackProgress,
  formatBytes,
  formatDuration,
  getAllPlaylists,
  addToPlaylist,
  type ContentItem,
  type LibraryStats,
  type Playlist,
} from '@/lib/storage';
import { PlayerInterface } from './player-interface';

type FilterType = 'all' | 'completed' | 'in-progress' | 'downloaded';
type SortType = 'recent' | 'alphabetical' | 'duration';

export function LibraryPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [filteredContent, setFilteredContent] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recent');
  const [progressMap, setProgressMap] = useState<Map<string, number>>(new Map());
  const [showPlaylistDialog, setShowPlaylistDialog] = useState(false);
  const [selectedForPlaylist, setSelectedForPlaylist] = useState<ContentItem | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const [items, libraryStats] = await Promise.all([
        getAllContent(),
        getLibraryStats(),
      ]);
      setContent(items);
      setStats(libraryStats);

      // Load progress for each item
      const progressData = new Map<string, number>();
      await Promise.all(
        items.map(async (item) => {
          const progress = await getPlaybackProgress(item.id);
          progressData.set(item.id, progress);
        })
      );
      setProgressMap(progressData);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort content
  useEffect(() => {
    let filtered = [...content];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.author.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType === 'completed') {
      filtered = filtered.filter((item) => (progressMap.get(item.id) || 0) >= 95);
    } else if (filterType === 'in-progress') {
      filtered = filtered.filter((item) => {
        const progress = progressMap.get(item.id) || 0;
        return progress > 0 && progress < 95;
      });
    } else if (filterType === 'downloaded') {
      filtered = filtered.filter((item) => item.isDownloaded);
    }

    // Apply sort
    if (sortType === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortType === 'duration') {
      filtered.sort((a, b) => (b.audioDuration || 0) - (a.audioDuration || 0));
    } else {
      // recent (default)
      filtered.sort(
        (a, b) => (b.lastPlayedAt?.getTime() || b.addedAt.getTime()) - (a.lastPlayedAt?.getTime() || a.addedAt.getTime())
      );
    }

    setFilteredContent(filtered);
  }, [content, searchQuery, filterType, sortType, progressMap]);

  const handleAddToPlaylist = async (item: ContentItem) => {
    const lists = await getAllPlaylists();
    setPlaylists(lists);
    setSelectedForPlaylist(item);
    setShowPlaylistDialog(true);
  };

  const handleSelectPlaylist = async (playlistId: string) => {
    if (selectedForPlaylist) {
      await addToPlaylist(playlistId, selectedForPlaylist.id);
      setShowPlaylistDialog(false);
      setSelectedForPlaylist(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteContent(id);
      await loadLibrary();
      if (selectedContent?.id === id) {
        setSelectedContent(null);
      }
    } catch (error) {
      console.error('Failed to delete content:', error);
    }
  };

  const handlePlay = (item: ContentItem) => {
    setSelectedContent(item);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading library...</p>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Your library is empty
        </h3>
        <p className="text-gray-600">
          Upload some content to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Library Stats */}
      {stats && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Library Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Downloaded</p>
              <p className="text-2xl font-bold text-gray-900">{stats.downloadedItems}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatBytes(stats.totalStorageBytes)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(stats.totalDurationSeconds)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({content.length})
          </button>
          <button
            onClick={() => setFilterType('in-progress')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'in-progress'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilterType('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilterType('downloaded')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterType === 'downloaded'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Downloaded ({stats?.downloadedItems || 0})
          </button>
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <button
            onClick={() => setSortType('recent')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              sortType === 'recent'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => setSortType('alphabetical')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              sortType === 'alphabetical'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            A-Z
          </button>
          <button
            onClick={() => setSortType('duration')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              sortType === 'duration'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Duration
          </button>
        </div>

        {/* Results count */}
        {(searchQuery || filterType !== 'all') && (
          <p className="mt-4 text-sm text-gray-600">
            Showing {filteredContent.length} of {content.length} items
          </p>
        )}
      </div>

      {/* No Results Message */}
      {filteredContent.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No items match your search or filter criteria.</p>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => {
          const progress = progressMap.get(item.id) || 0;
          const isCompleted = progress >= 95;
          const isInProgress = progress > 0 && progress < 95;

          return (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Content Info */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600">{item.author}</p>
              {item.audioDuration && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatDuration(item.audioDuration)}
                </p>
              )}
            </div>

            {/* Status Badges */}
            <div className="mb-4 flex flex-wrap gap-2">
              {item.isDownloaded && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Downloaded
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  ✓ Completed
                </span>
              )}
              {isInProgress && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {Math.round(progress)}% complete
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {progress > 0 && (
              <div className="mb-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-blue-600' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handlePlay(item)}
                disabled={!item.isDownloaded}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Play
              </button>
              <button
                onClick={() => handleAddToPlaylist(item)}
                className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-1"
                title="Add to Playlist"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Playlist Selection Dialog */}
      {showPlaylistDialog && selectedForPlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Add to Playlist
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a playlist for &ldquo;{selectedForPlaylist.title}&rdquo;
            </p>
            {playlists.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No playlists yet. Create one first!</p>
                <button
                  onClick={() => setShowPlaylistDialog(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleSelectPlaylist(playlist.id)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{playlist.name}</p>
                    {playlist.description && (
                      <p className="text-sm text-gray-600">{playlist.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {playlist.contentIds.length} items
                    </p>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setShowPlaylistDialog(false);
                setSelectedForPlaylist(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Player Interface */}
      {selectedContent && (
        <PlayerInterface
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  );
}
