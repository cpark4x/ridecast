'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { validateFile } from '@/lib/tts';
import { VoiceSelector } from './voice-selector';
import * as contentApi from '@/lib/api/content';
import * as audioApi from '@/lib/api/audio';
import { storeAudio, addContent as addLocalContent } from '@/lib/storage';
import { isOnline } from '@/lib/sync';

export function UploadPageBackend() {
  const { isAuthenticated } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState('en-US-AriaNeural');
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(false);

    // Auto-populate title from filename
    if (!title) {
      const filename = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(filename);
    }
  };

  const handleConvert = async () => {
    if (!file || !title) {
      setError('Please select a file and enter a title');
      return;
    }

    if (!isAuthenticated) {
      setError('Please log in to upload content');
      return;
    }

    if (!isOnline()) {
      setError('Backend upload requires internet connection');
      return;
    }

    setConverting(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: Upload file to backend for text extraction
      setCurrentStep('Uploading file...');
      setProgress(10);
      console.log('[Upload] Uploading file to backend:', file.name);

      const content = await contentApi.uploadContent(file, title, author || undefined);
      console.log('[Upload] Content uploaded with ID:', content.id);

      // Step 2: Start TTS conversion
      setCurrentStep('Converting to audio...');
      setProgress(20);
      console.log('[Upload] Starting TTS conversion with voice:', selectedVoiceId);

      const audioUrl = await audioApi.convertToAudio(
        content.id,
        selectedVoiceId,
        { speed: 1.0, pitch: 0 },
        (p) => {
          // Map 0-100 progress to 20-90%
          const mappedProgress = 20 + (p * 0.7);
          setProgress(Math.floor(mappedProgress));
        }
      );

      console.log('[Upload] Conversion complete, audio URL:', audioUrl);

      // Step 3: Download audio file
      setCurrentStep('Downloading audio...');
      setProgress(90);
      console.log('[Upload] Downloading audio file...');

      const audioBlob = await audioApi.downloadAudio(audioUrl);
      console.log('[Upload] Audio downloaded:', audioBlob.size, 'bytes');

      // Get duration from audio blob
      const duration = await getAudioDuration(audioBlob);
      console.log('[Upload] Audio duration:', duration, 'seconds');

      // Step 4: Store locally for offline playback
      setCurrentStep('Saving for offline playback...');
      setProgress(95);
      console.log('[Upload] Storing audio locally...');

      // Add to local storage
      const localContent = await addLocalContent({
        title: content.title,
        author: content.author || 'Unknown',
        type: 'book',
        text: content.textContent,
        voiceId: selectedVoiceId,
        audioDuration: duration,
        isDownloaded: true,
      });

      // Store audio blob
      await storeAudio(localContent.id, audioBlob);

      console.log('[Upload] Successfully stored locally with ID:', localContent.id);

      setSuccess(true);
      setProgress(100);
      setCurrentStep('Complete!');

      // Reset form
      setTimeout(() => {
        setFile(null);
        setTitle('');
        setAuthor('');
        setProgress(0);
        setSuccess(false);
        setCurrentStep('');
      }, 3000);
    } catch (err) {
      console.error('[Upload] Error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {!isAuthenticated && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          Please log in to upload and convert content using the backend API.
        </div>
      )}

      {!isOnline() && (
        <div className="mb-6 bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg">
          You are offline. Backend upload requires an internet connection.
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Convert Text to Audio
        </h2>

        <div className="space-y-6">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File
            </label>
            <input
              type="file"
              accept=".txt,.epub,.pdf"
              onChange={handleFileChange}
              disabled={converting || !isAuthenticated}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={converting || !isAuthenticated}
              placeholder="Enter book or article title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Author
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              disabled={converting || !isAuthenticated}
              placeholder="Enter author name (optional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Voice Selection */}
          <VoiceSelector
            selectedVoiceId={selectedVoiceId}
            onVoiceChange={setSelectedVoiceId}
            disabled={converting || !isAuthenticated}
          />

          {/* Progress */}
          {converting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              Successfully converted! Audio is now available offline in your library.
            </div>
          )}

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={!file || !title || converting || !isAuthenticated || !isOnline()}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {converting ? 'Converting...' : 'Convert to Audio'}
          </button>

          {/* Info */}
          <div className="text-sm text-gray-500 space-y-1">
            <p>• Supported formats: .txt, .epub, .pdf</p>
            <p>• High-quality Azure TTS voices</p>
            <p>• Maximum file size: 50MB</p>
            <p>• Audio will be saved for offline playback</p>
            <p>• Backend conversion requires internet connection</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Get audio duration from blob
 */
async function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio metadata'));
    };

    audio.src = url;
  });
}
