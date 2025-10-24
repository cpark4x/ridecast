'use client';

/**
 * Professional Audio Player Component
 * Inspired by Amazon Audible's UX
 * Built with Amplifier quality principles
 */

import { useState, useEffect, useRef } from 'react';

interface AudioPlayerProProps {
  contentId: string;
  title: string;
  author: string;
  audioUrl: string;
  initialPosition?: number;
  onPositionUpdate?: (position: number, duration: number) => void;
  onClose: () => void;
}

export function AudioPlayerPro({
  contentId,
  title,
  author,
  audioUrl,
  initialPosition = 0,
  onPositionUpdate,
  onClose,
}: AudioPlayerProProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const positionSaveInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.currentTime = initialPosition;
    audio.playbackRate = playbackSpeed;
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    // Auto-save position every 5 seconds
    positionSaveInterval.current = setInterval(() => {
      if (audio.currentTime > 0 && onPositionUpdate) {
        onPositionUpdate(audio.currentTime, audio.duration);
      }
    }, 5000);

    return () => {
      audio.pause();
      audio.src = '';
      if (positionSaveInterval.current) {
        clearInterval(positionSaveInterval.current);
      }
      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current);
      }
    };
  }, [audioUrl, initialPosition]);

  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle speed change
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  // Handle seek
  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Skip forward/backward (Audible-style)
  const skipForward = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.min(audioRef.current.currentTime + seconds, duration);
      handleSeek(newTime);
    }
  };

  const skipBackward = (seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      handleSeek(newTime);
    }
  };

  // Sleep timer
  const setSleepTimerMinutes = (minutes: number | null) => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

    if (minutes === null) {
      setSleepTimer(null);
      setSleepTimerRemaining(null);
      return;
    }

    const endTime = Date.now() + minutes * 60 * 1000;
    setSleepTimer(minutes);
    setSleepTimerRemaining(minutes * 60);

    sleepTimerRef.current = setInterval(() => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000);

      if (remaining <= 0) {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
        setSleepTimer(null);
        setSleepTimerRemaining(null);
        if (sleepTimerRef.current) {
          clearInterval(sleepTimerRef.current);
          sleepTimerRef.current = null;
        }
      } else {
        setSleepTimerRemaining(remaining);
      }
    }, 1000);
  };

  // Format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{title}</h2>
              <p className="text-gray-600">{author}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Main Player */}
        <div className="p-8">
          {/* Progress Bar */}
          <div className="mb-6">
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
              style={{
                background: `linear-gradient(to right, #2563eb ${progress}%, #e5e7eb ${progress}%)`,
              }}
            />
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {/* Skip Back 15s */}
            <button
              onClick={() => skipBackward(15)}
              className="p-4 rounded-full hover:bg-gray-100 transition-colors"
              title="Skip back 15 seconds"
            >
              <svg className="w-8 h-8 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                <text x="7" y="16" fontSize="8" fontWeight="bold" fill="currentColor">15</text>
              </svg>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlayPause}
              className="p-6 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg"
            >
              {isPlaying ? (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
              ) : (
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Skip Forward 30s */}
            <button
              onClick={() => skipForward(30)}
              className="p-4 rounded-full hover:bg-gray-100 transition-colors"
              title="Skip forward 30 seconds"
            >
              <svg className="w-8 h-8 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
                <text x="10" y="16" fontSize="8" fontWeight="bold" fill="currentColor">30</text>
              </svg>
            </button>
          </div>

          {/* Playback Speed */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3 font-medium">Playback Speed</p>
            <div className="flex flex-wrap gap-2">
              {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 3.5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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

          {/* Sleep Timer */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-600 font-medium">Sleep Timer</p>
              {sleepTimerRemaining !== null && (
                <span className="text-sm text-blue-600 font-medium">
                  {Math.floor(sleepTimerRemaining / 60)}:{(sleepTimerRemaining % 60).toString().padStart(2, '0')} remaining
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 30, 45, 60].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => setSleepTimerMinutes(minutes)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sleepTimer === minutes
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {minutes}m
                </button>
              ))}
              {sleepTimer !== null && (
                <button
                  onClick={() => setSleepTimerMinutes(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
