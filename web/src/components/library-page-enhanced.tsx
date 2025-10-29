'use client';

import { useState, useEffect } from 'react';
import { listContent, deleteContent as deleteContentAPI } from '@/lib/api/content';
import { convertToAudio } from '@/lib/api/audio';
import { ContentItem } from '@/lib/api/types';
import { AudioPlayerPro } from './audio-player-pro';
import { CompressionPanel } from './compression-panel';

type ContentWithAudio = ContentItem & { audioUrl?: string; durationSeconds?: number; voiceUsed?: string };

const AVAILABLE_VOICES = [
  { id: 'en-US-JennyNeural', name: 'Jenny', description: 'Female, US', flag: '🇺🇸' },
  { id: 'en-US-GuyNeural', name: 'Guy', description: 'Male, US', flag: '🇺🇸' },
  { id: 'en-US-AriaNeural', name: 'Aria', description: 'Female, US', flag: '🇺🇸' },
  { id: 'en-US-DavisNeural', name: 'Davis', description: 'Male, US', flag: '🇺🇸' },
  { id: 'en-GB-SoniaNeural', name: 'Sonia', description: 'Female, UK', flag: '🇬🇧' },
  { id: 'en-GB-RyanNeural', name: 'Ryan', description: 'Male, UK', flag: '🇬🇧' },
];

export function LibraryPageEnhanced() {
  const [content, setContent] = useState<ContentWithAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [converting, setConverting] = useState<string | null>(null);
  const [playingContent, setPlayingContent] = useState<ContentWithAudio | null>(null);
  const [showVoiceSelector, setShowVoiceSelector] = useState<string | null>(null);
  const [selectedVoices, setSelectedVoices] = useState<{ [key: string]: string }>({});
  const [expandedCompressionPanel, setExpandedCompressionPanel] = useState<string | null>(null);

  // Playback positions stored in localStorage
  const getPlaybackPosition = (contentId: string): number => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(`playback-${contentId}`);
    return stored ? parseFloat(stored) : 0;
  };

  const savePlaybackPosition = (contentId: string, position: number, duration: number) => {
    if (typeof window === 'undefined') return;
    // Only save if not at the very beginning or very end
    if (position > 5 && position < duration - 5) {
      localStorage.setItem(`playback-${contentId}`, position.toString());
    } else if (position >= duration - 5) {
      // Clear position if finished
      localStorage.removeItem(`playback-${contentId}`);
    }
  };

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await listContent(1, 100);
      setContent(items);
    } catch (err) {
      console.error('Failed to load content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (contentId: string, voiceId: string) => {
    try {
      setConverting(contentId);
      setShowVoiceSelector(null);
      console.log('Converting content:', contentId, 'with voice:', voiceId);

      const audioUrl = await convertToAudio(contentId, voiceId, {
        speed: 1.0,
        pitch: 0,
      });

      console.log('Conversion result:', audioUrl);

      if (audioUrl) {
        setContent((prev) =>
          prev.map((item) =>
            item.id === contentId
              ? { ...item, audioUrl, voiceUsed: voiceId }
              : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to convert audio:', err);
      alert(err instanceof Error ? err.message : 'Failed to convert audio');
    } finally {
      setConverting(null);
    }
  };

  const handleDownload = async (audioUrl: string, title: string) => {
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download audio:', err);
      alert('Failed to download audio');
    }
  };

  const handlePlay = (item: ContentWithAudio) => {
    setPlayingContent(item);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteContentAPI(id);
      await loadContent();
    } catch (err) {
      console.error('Failed to delete content:', err);
      alert('Failed to delete content');
    }
  };

  const handleToggleCompressionPanel = (contentId: string) => {
    if (expandedCompressionPanel === contentId) {
      setExpandedCompressionPanel(null);
    } else {
      setExpandedCompressionPanel(contentId);
    }
  };

  const handlePlayCompressed = async (compressedId: string, title: string) => {
    try {
      // Fetch the compressed content details
      const { getCompressedContent } = await import('@/lib/api/compression');
      const { convertToAudio } = await import('@/lib/api/audio');

      console.log('Fetching compressed content:', compressedId);
      const compressed = await getCompressedContent(compressedId);

      if (!compressed || !compressed.compressed_text) {
        alert('Failed to load compressed content');
        return;
      }

      // Show converting message
      if (!confirm(`Convert compressed version "${title}" to audio? This will use TTS credits.`)) {
        return;
      }

      // Convert the compressed text to audio
      console.log('Converting compressed content to audio...');
      const audioUrl = await convertToAudio(compressedId, 'en-US-JennyNeural', {
        speed: 1.0,
        pitch: 0,
      });

      if (audioUrl) {
        // Create a temporary content item for playback
        const tempContent: ContentWithAudio = {
          id: compressedId,
          title: title,
          author: compressed.author || 'Compressed',
          type: 'other',
          textContent: compressed.compressedText,
          textHash: compressed.textHash,
          createdAt: compressed.createdAt || new Date().toISOString(),
          audioUrl: audioUrl,
        };

        setPlayingContent(tempContent);
      } else {
        alert('Audio conversion failed');
      }
    } catch (err) {
      console.error('Failed to play compressed version:', err);
      alert(err instanceof Error ? err.message : 'Failed to play compressed version');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const estimateReadingTime = (wordCount: number) => {
    const wordsPerMinute = 150;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return minutes;
  };

  const filteredContent = searchQuery.trim()
    ? content.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.author && item.author.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : content;

  const convertedCount = content.filter((item) => item.audioUrl).length;

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
            <p className="text-sm text-gray-600">Converted</p>
            <p className="text-2xl font-bold text-green-600">{convertedCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Not Converted</p>
            <p className="text-2xl font-bold text-gray-900">{content.length - convertedCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Playing</p>
            <p className="text-2xl font-bold text-blue-600">{playingContent ? '1' : '0'}</p>
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

      {/* Content Table - Spotify Style */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5">Title</div>
          <div className="col-span-2">Author</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Duration</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-100">
          {filteredContent.map((item, index) => {
            const isConverted = !!item.audioUrl;
            const isPlaying = playingContent?.id === item.id;
            const selectedVoice = selectedVoices[item.id] || 'en-US-JennyNeural';

            return (
              <div key={item.id}>
                <div
                  className={`grid grid-cols-12 gap-4 px-4 py-3 group hover:bg-gray-50 transition-colors ${
                    isPlaying ? 'bg-green-50' : ''
                  }`}
                >
                  {/* Number */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-sm text-gray-500 group-hover:hidden">
                      {index + 1}
                    </span>
                    {/* Show play button on hover for converted items */}
                    {isConverted && (
                      <button
                        onClick={() => handlePlay(item)}
                        className="hidden group-hover:flex w-8 h-8 items-center justify-center rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors"
                        title="Play"
                      >
                        <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Title */}
                  <div className="col-span-5 flex items-center min-w-0">
                    <div className="truncate">
                      <p className="font-medium text-gray-900 truncate">{item.title}</p>
                      {item.wordCount && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.wordCount.toLocaleString()} words • {estimateReadingTime(item.wordCount)} min
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Author */}
                  <div className="col-span-2 flex items-center">
                    <p className="text-sm text-gray-600 truncate">
                      {item.author || '-'}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex items-center">
                    {isConverted ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✓ Ready
                      </span>
                    ) : converting === item.id ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Converting...
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Not converted
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    {item.durationSeconds ? (
                      <span className="text-sm text-gray-600">
                        {formatTime(item.durationSeconds)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}

                    {/* Action Buttons - Show on hover */}
                    <div className="hidden group-hover:flex items-center gap-1 ml-2">
                      {!isConverted && (
                        <button
                          onClick={() => setShowVoiceSelector(item.id)}
                          disabled={converting === item.id}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-50"
                          title="Convert to Audio"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                      )}
                      {isConverted && (
                        <button
                          onClick={() => handleDownload(item.audioUrl!, item.title)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                          title="Download"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleCompressionPanel(item.id)}
                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                        title="Compress"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={converting === item.id}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                  </div>
                </div>

                {/* Voice Selector - Below row */}
                {showVoiceSelector === item.id && (
                  <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-900 mb-3">Choose a voice:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                      {AVAILABLE_VOICES.map((voice) => (
                        <button
                          key={voice.id}
                          onClick={() => {
                            setSelectedVoices({ ...selectedVoices, [item.id]: voice.id });
                            handleConvert(item.id, voice.id);
                          }}
                          className="p-2 text-left text-xs bg-white hover:bg-green-50 border border-gray-200 rounded hover:border-green-500 transition-colors"
                        >
                          <div className="font-medium">{voice.flag} {voice.name}</div>
                          <div className="text-gray-600">{voice.description}</div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowVoiceSelector(null)}
                      className="mt-3 text-sm text-gray-600 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Compression Panel - Below row */}
                {expandedCompressionPanel === item.id && item.wordCount && (
                  <div className="px-4 py-4 bg-gray-50 border-t border-gray-200">
                    <CompressionPanel
                      contentId={item.id}
                      contentTitle={item.title}
                      originalWordCount={item.wordCount}
                      onCompressionComplete={(compressedId) => {
                        console.log('Compression completed:', compressedId);
                      }}
                      onPlayCompressed={handlePlayCompressed}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Professional Audio Player Modal */}
      {playingContent && playingContent.audioUrl && (
        <AudioPlayerPro
          contentId={playingContent.id}
          title={playingContent.title}
          author={playingContent.author || 'Unknown'}
          audioUrl={playingContent.audioUrl}
          initialPosition={getPlaybackPosition(playingContent.id)}
          onPositionUpdate={(position, duration) => savePlaybackPosition(playingContent.id, position, duration)}
          onClose={() => setPlayingContent(null)}
        />
      )}
    </div>
  );
}
