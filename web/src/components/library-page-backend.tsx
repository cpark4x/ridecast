'use client';

import { useState, useEffect, useRef } from 'react';
import { listContent, deleteContent as deleteContentAPI } from '@/lib/api/content';
import { convertToAudio } from '@/lib/api/audio';
import { ContentItem } from '@/lib/api/types';

type ContentWithAudio = ContentItem & { audioUrl?: string; durationSeconds?: number };

export function LibraryPageBackend() {
  const [content, setContent] = useState<ContentWithAudio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [converting, setConverting] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handleConvert = async (contentId: string) => {
    try {
      setConverting(contentId);
      console.log('Converting content:', contentId);

      const audioUrl = await convertToAudio(contentId, 'en-US-JennyNeural', {
        speed: 1.0,
        pitch: 0,
      });

      console.log('Conversion result:', audioUrl);

      // Update content with audio URL
      if (audioUrl) {
        setContent((prev) =>
          prev.map((item) =>
            item.id === contentId
              ? { ...item, audioUrl }
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

  const handlePlay = (contentId: string, audioUrl: string) => {
    if (playingId === contentId && audioRef.current) {
      // Toggle play/pause
      if (audioRef.current.paused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    } else {
      // Play new audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;
      setPlayingId(contentId);

      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
      });

      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });

      audio.addEventListener('ended', () => {
        setPlayingId(null);
        setCurrentTime(0);
      });

      audio.play();
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingId(null);
      setCurrentTime(0);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            <p className="text-2xl font-bold text-blue-600">{playingId ? '1' : '0'}</p>
          </div>
        </div>
      </div>

      {/* Audio Player */}
      {playingId && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sticky top-4 z-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Now Playing</h3>
          <div className="space-y-4">
            {/* Current track info */}
            <div>
              <p className="font-medium text-gray-900">
                {content.find((item) => item.id === playingId)?.title}
              </p>
              <p className="text-sm text-gray-600">
                {content.find((item) => item.id === playingId)?.author || 'Unknown'}
              </p>
            </div>

            {/* Progress bar */}
            <div>
              <input
                type="range"
                min="0"
                max={duration}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => handlePlay(playingId, content.find((item) => item.id === playingId)?.audioUrl || '')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {audioRef.current?.paused ? 'Play' : 'Pause'}
              </button>
              <button
                onClick={handleStop}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Stop
              </button>

              {/* Speed control */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600">Speed:</span>
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      playbackSpeed === speed
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
        {filteredContent.map((item) => {
          const isConverted = !!item.audioUrl;
          const isPlaying = playingId === item.id;
          const isPaused = isPlaying && audioRef.current?.paused;

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
                <p className="text-xs text-gray-500 mt-1 capitalize">{item.type}</p>
                {item.durationSeconds && (
                  <p className="text-xs text-gray-500 mt-1">
                    Duration: {formatTime(item.durationSeconds)}
                  </p>
                )}
              </div>

              {/* Status Badge */}
              <div className="mb-4">
                {isConverted ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✓ Converted
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Ready to Convert
                  </span>
                )}
                {isPlaying && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {isPaused ? '⏸ Paused' : '▶ Playing'}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {isConverted ? (
                  <button
                    onClick={() => handlePlay(item.id, item.audioUrl!)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
                  >
                    {isPlaying && !isPaused ? '⏸ Pause' : '▶ Play'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleConvert(item.id)}
                    disabled={converting === item.id}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {converting === item.id ? 'Converting...' : 'Convert to Audio'}
                  </button>
                )}

                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={converting === item.id}
                  className="w-full px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
