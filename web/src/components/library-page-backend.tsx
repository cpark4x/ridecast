'use client';

import { useState, useEffect } from 'react';
import { listContent, deleteContent as deleteContentAPI } from '@/lib/api/content';
import { convertToAudio } from '@/lib/api/audio';
import { ContentItem } from '@/lib/api/types';
import { formatDuration } from '@/lib/storage';

export function LibraryPageBackend() {
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [converting, setConverting] = useState<string | null>(null);

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await listContent(1, 100); // Load first 100 items
      setContent(items);
    } catch (err) {
      console.error('Failed to load content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (contentId: string) => {
    try {
      setConverting(contentId);
      console.log('Converting content:', contentId);

      const result = await convertToAudio(contentId, 'en-US-JennyNeural', {
        speed: 1.0,
        pitch: 0,
      });

      console.log('Conversion result:', result);

      if (result.status === 'completed' && result.audioUrl) {
        // Open audio in new tab to try playing it
        window.open(result.audioUrl, '_blank');
        alert(`Audio conversion complete! Audio opened in new tab.`);
      } else if (result.audioUrl) {
        window.open(result.audioUrl, '_blank');
        alert(`Audio conversion complete! Audio opened in new tab.`);
      } else {
        alert(`Conversion started! Job ID: ${result.jobId}`);
      }

      await loadContent(); // Reload to show updated status
    } catch (err) {
      console.error('Failed to convert audio:', err);
      alert(err instanceof Error ? err.message : 'Failed to convert audio');
    } finally {
      setConverting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteContentAPI(id);
      await loadContent(); // Reload the list
    } catch (err) {
      console.error('Failed to delete content:', err);
      alert('Failed to delete content');
    }
  };

  // Filter content based on search
  const filteredContent = searchQuery.trim()
    ? content.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.author && item.author.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : content;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading library...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg inline-block">
          {error}
        </div>
        <button
          onClick={loadContent}
          className="mt-4 block mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Library Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Items</p>
            <p className="text-2xl font-bold text-gray-900">{content.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Books</p>
            <p className="text-2xl font-bold text-gray-900">
              {content.filter((item) => item.type === 'book').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Articles</p>
            <p className="text-2xl font-bold text-gray-900">
              {content.filter((item) => item.type === 'article').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Other</p>
            <p className="text-2xl font-bold text-gray-900">
              {content.filter((item) => !['book', 'article'].includes(item.type)).length}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <input
          type="text"
          placeholder="Search by title or author..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Showing {filteredContent.length} of {content.length} items
          </p>
        )}
      </div>

      {/* No Results Message */}
      {filteredContent.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-gray-600">No items match your search criteria.</p>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Content Info */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                {item.title}
              </h3>
              {item.author && (
                <p className="text-sm text-gray-600">{item.author}</p>
              )}
              <p className="text-xs text-gray-500 mt-1 capitalize">{item.type}</p>
            </div>

            {/* Status Badge */}
            <div className="mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Ready to Convert
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleConvert(item.id)}
                disabled={converting === item.id}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {converting === item.id ? 'Converting...' : 'Convert to Audio'}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={converting === item.id}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
