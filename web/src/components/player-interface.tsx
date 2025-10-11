'use client';

import { useState, useEffect, useRef } from 'react';
import { AudioPlayer, type PlayerState } from '@/lib/audio';
import {
  getAudioUrl,
  updatePlaybackPosition,
  getPlaybackState,
  type ContentItem,
} from '@/lib/storage';
import { formatDuration } from '@/lib/storage';

interface PlayerInterfaceProps {
  content: ContentItem;
  onClose: () => void;
}

export function PlayerInterface({ content, onClose }: PlayerInterfaceProps) {
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const playerRef = useRef<AudioPlayer | null>(null);

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
      },
      onError: (error) => {
        console.error('Playback error:', error);
        alert('Playback error: ' + error.message);
      },
    });

    playerRef.current = player;

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
          {/* Skip Backward */}
          <button
            onClick={() => playerRef.current?.skipBackward(15)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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

          {/* Skip Forward */}
          <button
            onClick={() => playerRef.current?.skipForward(15)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>

        {/* Playback Speed */}
        <div className="flex justify-center gap-2">
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
      </div>
    </div>
  );
}
