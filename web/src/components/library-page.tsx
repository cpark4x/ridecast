'use client';

import { useState, useEffect } from 'react';
import {
  getAllContent,
  deleteContent,
  getLibraryStats,
  formatBytes,
  formatDuration,
  type ContentItem,
  type LibraryStats,
} from '@/lib/storage';
import { PlayerInterface } from './player-interface';

export function LibraryPage() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {content.map((item) => (
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

            {/* Status Badge */}
            {item.isDownloaded && (
              <div className="mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Downloaded
                </span>
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
                onClick={() => handleDelete(item.id)}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

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
