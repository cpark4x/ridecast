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

      const result = await convertToAudio(contentId, voiceId, {
        speed: 1.0,
        pitch: 0,
      });

      console.log('Conversion result:', result);

      if (result.audioUrl) {
        setContent((prev) =>
          prev.map((item) =>
            item.id === contentId
              ? { ...item, audioUrl: result.audioUrl, durationSeconds: result.durationSeconds, voiceUsed: voiceId }
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
      const result = await convertToAudio(compressedId, 'en-US-JennyNeural', {
        speed: 1.0,
        pitch: 0,
      });

      if (result.audioUrl) {
        // Create a temporary content item for playback
        const tempContent = {
          id: compressedId,
          title: title,
          author: compressed.author || 'Compressed',
          audioUrl: result.audioUrl,
          durationSeconds: result.durationSeconds,
        };

        setPlayingContent(tempContent as any);
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => {
          const isConverted = !!item.audioUrl;
          const isPlaying = playingContent?.id === item.id;
          const selectedVoice = selectedVoices[item.id] || 'en-US-JennyNeural';

          return (
            <div
              key={item.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-md transition-all ${
                isPlaying ? 'border-blue-500' : 'border-gray-200'
              }`}
            >
              {/* Content Info */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                  {item.title}
                </h3>
                {item.author && (
                  <p className="text-sm text-gray-600">{item.author}</p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span className="capitalize">{item.type}</span>
                  {item.wordCount && (
                    <>
                      <span>•</span>
                      <span>{item.wordCount} words</span>
                      <span>•</span>
                      <span>~{estimateReadingTime(item.wordCount)} min read</span>
                    </>
                  )}
                </div>
                {item.durationSeconds && (
                  <p className="text-xs text-gray-500 mt-1">
                    Audio: {formatTime(item.durationSeconds)}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="mb-4 flex flex-wrap gap-2">
                {isConverted ? (
                  <>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Converted
                    </span>
                    {item.voiceUsed && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {AVAILABLE_VOICES.find(v => v.id === item.voiceUsed)?.name || 'Voice'}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Ready to Convert
                  </span>
                )}
                {isPlaying && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ▶ Playing
                  </span>
                )}
              </div>

              {/* Voice Selector Modal */}
              {showVoiceSelector === item.id && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-medium text-gray-900 mb-3">Choose a voice:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_VOICES.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => {
                          setSelectedVoices({ ...selectedVoices, [item.id]: voice.id });
                          handleConvert(item.id, voice.id);
                        }}
                        className="p-2 text-left text-xs bg-white hover:bg-blue-50 border border-gray-200 rounded hover:border-blue-500 transition-colors"
                      >
                        <div className="font-medium">{voice.flag} {voice.name}</div>
                        <div className="text-gray-600">{voice.description}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowVoiceSelector(null)}
                    className="mt-2 w-full text-xs text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {isConverted ? (
                  <>
                    <button
                      onClick={() => handlePlay(item)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      ▶ Play
                    </button>
                    <button
                      onClick={() => handleDownload(item.audioUrl!, item.title)}
                      className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                    >
                      ⬇ Download MP3
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowVoiceSelector(item.id)}
                    disabled={converting === item.id}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {converting === item.id ? 'Converting...' : '🎙️ Convert to Audio'}
                  </button>
                )}

                <button
                  onClick={() => handleToggleCompressionPanel(item.id)}
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                >
                  {expandedCompressionPanel === item.id ? '▲ Hide Compression' : '▼ Compress'}
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={converting === item.id}
                  className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Delete
                </button>
              </div>

              {/* Compression Panel - Expandable */}
              {expandedCompressionPanel === item.id && item.wordCount && (
                <div className="mt-4 pt-4 border-t border-gray-200">
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
