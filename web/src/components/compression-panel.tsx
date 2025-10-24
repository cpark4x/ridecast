'use client';

import { useState, useEffect } from 'react';
import {
  compressContent,
  listCompressedVersions,
  deleteCompressedVersion,
  CompressedVersion,
  CompressionResult,
} from '@/lib/api/compression';

interface CompressionPanelProps {
  contentId: string;
  contentTitle: string;
  originalWordCount: number;
  onCompressionComplete?: (compressedId: string) => void;
  onPlayCompressed?: (compressedId: string, title: string) => void;
}

const COMPRESSION_RATIOS = [
  {
    ratio: 0.2,
    label: 'Light',
    percentage: '20%',
    description: 'Minimal compression, preserves most details',
    color: 'bg-green-600 hover:bg-green-700',
    badge: 'bg-green-100 text-green-800',
  },
  {
    ratio: 0.4,
    label: 'Medium',
    percentage: '40%',
    description: 'Balanced compression, good for most content',
    color: 'bg-blue-600 hover:bg-blue-700',
    badge: 'bg-blue-100 text-blue-800',
  },
  {
    ratio: 0.6,
    label: 'Heavy',
    percentage: '60%',
    description: 'Maximum compression, key points only',
    color: 'bg-purple-600 hover:bg-purple-700',
    badge: 'bg-purple-100 text-purple-800',
  },
];

export function CompressionPanel({
  contentId,
  contentTitle,
  originalWordCount,
  onCompressionComplete,
  onPlayCompressed,
}: CompressionPanelProps) {
  const [versions, setVersions] = useState<CompressedVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [compressing, setCompressing] = useState(false);
  const [compressionResult, setCompressionResult] = useState<CompressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [contentId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listCompressedVersions(contentId);
      setVersions(data);
    } catch (err) {
      console.error('Failed to load compressed versions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const handleCompress = async (ratio: number) => {
    // Check if this ratio already exists
    const existingVersion = versions.find(
      (v) => Math.abs(v.compression_ratio - ratio) < 0.01
    );

    if (existingVersion) {
      if (!confirm(`A ${Math.round(ratio * 100)}% compressed version already exists. Create another?`)) {
        return;
      }
    }

    try {
      setCompressing(true);
      setError(null);
      setCompressionResult(null);

      const result = await compressContent({
        contentId,
        ratio,
      });

      setCompressionResult(result);
      await loadVersions();

      if (onCompressionComplete) {
        onCompressionComplete(result.compressedContentId);
      }
    } catch (err) {
      console.error('Failed to compress content:', err);
      setError(err instanceof Error ? err.message : 'Failed to compress content');
    } finally {
      setCompressing(false);
    }
  };

  const handleDelete = async (versionId: string) => {
    if (!confirm('Are you sure you want to delete this compressed version?')) {
      return;
    }

    try {
      setDeletingId(versionId);
      await deleteCompressedVersion(versionId);
      await loadVersions();
    } catch (err) {
      console.error('Failed to delete version:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setDeletingId(null);
    }
  };

  const calculateSavings = (compressedWords: number) => {
    const saved = originalWordCount - compressedWords;
    const percentage = ((saved / originalWordCount) * 100).toFixed(1);
    return { saved, percentage };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRatioBadgeColor = (ratio: number) => {
    const config = COMPRESSION_RATIOS.find((r) => Math.abs(r.ratio - ratio) < 0.01);
    return config?.badge || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Content Compression
        </h3>
        <p className="text-sm text-gray-600">
          Create shortened versions of "{contentTitle}" to save listening time
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-xl">ℹ️</div>
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-medium mb-1">
              How Compression Works
            </p>
            <p className="text-sm text-blue-800">
              Our AI analyzes your content and creates a condensed version that preserves
              the most important information. Choose your compression level based on how
              much detail you want to keep.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Original: {originalWordCount.toLocaleString()} words
            </p>
          </div>
        </div>
      </div>

      {/* Compression Result */}
      {compressionResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-green-600 text-xl">✓</div>
            <div className="flex-1">
              <p className="text-sm text-green-900 font-medium mb-1">
                Compression Complete!
              </p>
              <div className="text-sm text-green-800 space-y-1">
                <p>
                  Reduced from {compressionResult.originalWordCount.toLocaleString()} to{' '}
                  {compressionResult.compressedWordCount.toLocaleString()} words
                </p>
                <p>
                  Saved {calculateSavings(compressionResult.compressedWordCount).percentage}% of
                  reading time
                </p>
                <p className="text-xs text-green-700">
                  Processed in {(compressionResult.processingTimeMs / 1000).toFixed(2)}s
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-red-600 text-xl">⚠️</div>
            <div className="flex-1">
              <p className="text-sm text-red-900 font-medium mb-1">Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Compression Buttons */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Create New Compressed Version</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COMPRESSION_RATIOS.map((config) => (
            <button
              key={config.ratio}
              onClick={() => handleCompress(config.ratio)}
              disabled={compressing}
              className={`${config.color} text-white p-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left`}
            >
              <div className="font-semibold text-lg mb-1">
                {config.label} ({config.percentage})
              </div>
              <div className="text-xs opacity-90">{config.description}</div>
              <div className="text-xs opacity-75 mt-2">
                ~{Math.round(originalWordCount * (1 - config.ratio)).toLocaleString()} words
              </div>
            </button>
          ))}
        </div>
        {compressing && (
          <div className="mt-3 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
              <span>Compressing content...</span>
            </div>
          </div>
        )}
      </div>

      {/* Existing Versions */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Existing Compressed Versions ({versions.length})
        </h4>

        {loading ? (
          <div className="text-center py-6">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
              <span>Loading versions...</span>
            </div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-6 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600">No compressed versions yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Create your first compressed version using the buttons above
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => {
              const savings = calculateSavings(version.compressed_word_count);
              const ratioPercent = Math.round(version.compression_ratio * 100);

              return (
                <div
                  key={version.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRatioBadgeColor(
                            version.compression_ratio
                          )}`}
                        >
                          {ratioPercent}% Compression
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(version.created_at)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <p>
                          {version.compressed_word_count.toLocaleString()} words
                          <span className="text-gray-500 ml-2">
                            (Saved {savings.saved.toLocaleString()} words, {savings.percentage}%)
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onPlayCompressed && (
                        <button
                          onClick={() => onPlayCompressed(version.id, `${contentTitle} (${ratioPercent}%)`)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        >
                          ▶ Play
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(version.id)}
                        disabled={deletingId === version.id}
                        className="px-3 py-1.5 border border-red-300 text-red-700 text-sm rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {deletingId === version.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
