'use client';

import { useState, useEffect, useRef } from 'react';
import { AudioPlayer, type PlayerState, downloadAudio } from '@/lib/audio';
import {
  getAudioUrl,
  updatePlaybackPosition,
  getPlaybackState,
  type ContentItem,
  type Bookmark,
  getBookmarks,
  createBookmark,
  deleteBookmark,
  getAudio,
} from '@/lib/storage';
import { formatDuration } from '@/lib/storage';

interface PlayerInterfaceProps {
  content: ContentItem;
  onClose: () => void;
  playlistId?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export function PlayerInterface({
  content,
  onClose,
  playlistId,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false
}: PlayerInterfaceProps) {
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);

  // Load bookmarks
  useEffect(() => {
    loadBookmarks();
  }, [content.id]);

  const loadBookmarks = async () => {
    const marks = await getBookmarks(content.id);
    setBookmarks(marks);
  };

  useEffect(() => {
    // Initialize player
    const player = new AudioPlayer({
      onStateChange: setPlayerState,
      onTimeUpdate: (time, dur) => {
        setCurrentTime(time);
        setDuration(dur);

        // Save playback position every 5 seconds
        if (Math.floor(time) % 5 === 0) {
          updatePlaybackPosition(content.id, time, dur);
        }
      },
      onEnded: () => {
        updatePlaybackPosition(content.id, 0, duration);
        // Auto-advance to next track in playlist
        if (hasNext && onNext) {
          onNext();
        }
      },
      onError: (error) => {
        console.error('Playback error:', error);
        alert('Playback error: ' + error.message);
      },
      onNext: onNext,
      onPrevious: onPrevious,
    });

    playerRef.current = player;

    // Set media metadata for system integration
    player.setMediaMetadata({
      title: content.title,
      artist: content.author,
      album: 'Ridecast',
    });

    // Load audio and restore position
    loadAudio(player);

    return () => {
      // Save final position before cleanup
      if (currentTime > 0) {
        updatePlaybackPosition(content.id, currentTime, duration);
      }
      player.destroy();
    };
  }, [content.id]);

  const loadAudio = async (player: AudioPlayer) => {
    try {
      // Get audio URL from storage
      const audioUrl = await getAudioUrl(content.id);
      if (!audioUrl) {
        throw new Error('Audio not found');
      }

      await player.load(audioUrl);

      // Restore playback position
      const state = await getPlaybackState(content.id);
      if (state && state.position > 0) {
        player.seek(state.position);
      }
    } catch (error) {
      console.error('Failed to load audio:', error);
      alert('Failed to load audio: ' + (error as Error).message);
    }
  };

  const togglePlayPause = () => {
    const player = playerRef.current;
    if (!player) return;

    if (player.isPlaying()) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    playerRef.current?.seek(time);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    playerRef.current?.setPlaybackRate(speed);
  };

  const handleAddBookmark = async () => {
    const label = prompt('Bookmark name:');
    if (label) {
      await createBookmark(content.id, currentTime, label);
      await loadBookmarks();
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (confirm('Delete this bookmark?')) {
      await deleteBookmark(bookmarkId);
      await loadBookmarks();
    }
  };

  const handleJumpToBookmark = (position: number) => {
    playerRef.current?.seek(position);
    setShowBookmarks(false);
  };

  const handleExport = async () => {
    try {
      const audioBlob = await getAudio(content.id);
      if (audioBlob) {
        await downloadAudio(audioBlob, content.title, content.author);
      } else {
        alert('Audio file not found');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export audio');
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-6 z-50">
      <div className="max-w-7xl mx-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content Info */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 text-lg">{content.title}</h3>
          <p className="text-sm text-gray-600">{content.author}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>{formatDuration(Math.floor(currentTime))}</span>
            <span>{formatDuration(Math.floor(duration))}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-4">
          {/* Previous Track (if in playlist) */}
          {playlistId && hasPrevious && onPrevious && (
            <button
              onClick={onPrevious}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Previous Track"
            >
              <svg className="w-8 h-8 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
              </svg>
            </button>
          )}

          {/* Skip Backward 15s */}
          <button
            onClick={() => playerRef.current?.skipBackward(15)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Rewind 15 seconds"
          >
            <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
            disabled={playerState === 'loading'}
          >
            {playerState === 'playing' ? (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip Forward 15s */}
          <button
            onClick={() => playerRef.current?.skipForward(15)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Forward 15 seconds"
          >
            <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>

          {/* Next Track (if in playlist) */}
          {playlistId && hasNext && onNext && (
            <button
              onClick={onNext}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Next Track"
            >
              <svg className="w-8 h-8 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Playback Speed */}
        <div className="flex justify-center gap-2 mb-4">
          {[0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                playbackRate === speed
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>

        {/* Additional Controls */}
        <div className="flex justify-center gap-3 pt-4 border-t border-gray-200">
          {/* Bookmark Button */}
          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-sm font-medium">Bookmarks ({bookmarks.length})</span>
          </button>

          {/* Add Bookmark */}
          <button
            onClick={handleAddBookmark}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">Add Bookmark</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-sm font-medium">Download</span>
          </button>
        </div>

        {/* Bookmarks Panel */}
        {showBookmarks && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
            <h4 className="font-medium text-gray-900 mb-3">Bookmarks</h4>
            {bookmarks.length === 0 ? (
              <p className="text-sm text-gray-500">No bookmarks yet. Add one to save your position!</p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex items-center justify-between p-2 bg-white rounded hover:bg-gray-100"
                  >
                    <button
                      onClick={() => handleJumpToBookmark(bookmark.position)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">{bookmark.label}</p>
                      <p className="text-xs text-gray-500">{formatDuration(Math.floor(bookmark.position))}</p>
                    </button>
                    <button
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
