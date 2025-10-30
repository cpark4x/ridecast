'use client';

import { useState, useEffect, useRef } from 'react';
import { getAvailableVoices, type Voice } from '@/lib/tts';
import { previewVoice } from '@/lib/api/audio';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  disabled?: boolean;
}

export function VoiceSelector({ selectedVoiceId, onVoiceChange, disabled }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const availableVoices = await getAvailableVoices();
      setVoices(availableVoices);
    } catch (error) {
      console.error('Failed to load voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (voiceId: string) => {
    try {
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // If clicking the same voice that's playing, just stop it
      if (playingVoiceId === voiceId) {
        setPlayingVoiceId(null);
        return;
      }

      setPreviewLoading(voiceId);
      const audioUrl = await previewVoice(voiceId);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        console.error('Failed to play audio');
        setPlayingVoiceId(null);
        audioRef.current = null;
      };

      await audio.play();
      setPlayingVoiceId(voiceId);
    } catch (error) {
      console.error('Failed to preview voice:', error);
    } finally {
      setPreviewLoading(null);
    }
  };

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId);

  // Show top 3 voices by default, or all if expanded
  const displayedVoices = showAll ? voices : voices.slice(0, 3);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Voice Selection
      </label>

      {/* Voice Grid */}
      <div className="grid grid-cols-1 gap-3">
        {displayedVoices.map((voice) => {
          const isSelected = voice.id === selectedVoiceId;

          return (
            <button
              key={voice.id}
              onClick={() => onVoiceChange(voice.id)}
              disabled={disabled}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {/* Voice Info */}
              <div className="pr-8">
                <div className="font-semibold text-gray-900 mb-1">{voice.name}</div>
                <div className="text-sm text-gray-600 mb-2">{voice.description}</div>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {voice.language}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      voice.gender === 'female'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {voice.gender}
                  </span>
                </div>
              </div>

              {/* Preview Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(voice.id);
                }}
                disabled={disabled || previewLoading === voice.id}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {previewLoading === voice.id ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Loading...
                  </>
                ) : playingVoiceId === voice.id ? (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Preview
                  </>
                )}
              </button>
            </button>
          );
        })}
      </div>

      {/* Show More/Less */}
      {voices.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          disabled={disabled}
          className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showAll ? 'Show less' : `Show ${voices.length - 3} more voices`}
        </button>
      )}

      {/* Currently Selected */}
      {selectedVoice && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Selected Voice</div>
          <div className="font-medium text-gray-900">{selectedVoice.name}</div>
        </div>
      )}
    </div>
  );
}
