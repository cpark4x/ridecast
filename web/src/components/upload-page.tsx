'use client';

import { useState } from 'react';
import {
  convertTextToAudio,
  extractText,
  validateFile,
  getDefaultVoice,
  type TTSConfig,
} from '@/lib/tts';
import { addContent, storeAudio } from '@/lib/storage';
import { VoiceSelector } from './voice-selector';

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState(getDefaultVoice().id);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

    setConverting(true);
    setError(null);
    setProgress(0);

    try {
      // Extract text from file
      const text = await extractText(file);

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the file');
      }

      // Configure TTS with selected voice
      const config: TTSConfig = {
        voice: selectedVoiceId,
        speed: 1.0,
        pitch: 0,
        outputFormat: 'mp3',
      };

      // Convert to audio
      const result = await convertTextToAudio(text, config, (p) => {
        setProgress(p);
      });

      // Fetch audio blob from URL
      const response = await fetch(result.audioUrl);
      const audioBlob = await response.blob();

      // Add to library
      const content = await addContent({
        title,
        author: author || 'Unknown',
        type: 'book',
        text,
        voiceId: config.voice,
        audioDuration: result.duration,
        isDownloaded: false,
      });

      // Store audio
      await storeAudio(content.id, audioBlob);

      setSuccess(true);
      setProgress(100);

      // Reset form
      setTimeout(() => {
        setFile(null);
        setTitle('');
        setAuthor('');
        setProgress(0);
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Conversion error:', err);
      setError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
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
              disabled={converting}
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
              disabled={converting}
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
              disabled={converting}
              placeholder="Enter author name (optional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Voice Selection */}
          <VoiceSelector
            selectedVoiceId={selectedVoiceId}
            onVoiceChange={setSelectedVoiceId}
            disabled={converting}
          />

          {/* Progress */}
          {converting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Converting to audio...</span>
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
              Successfully converted! Check your library.
            </div>
          )}

          {/* Convert Button */}
          <button
            onClick={handleConvert}
            disabled={!file || !title || converting}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {converting ? 'Converting...' : 'Convert to Audio'}
          </button>

          {/* Info */}
          <div className="text-sm text-gray-500 space-y-1">
            <p>• Supported formats: .txt, .epub (PDF coming soon)</p>
            <p>• Choose from 6 different voices</p>
            <p>• Maximum file size: 50MB</p>
            <p>• Audio will be saved to your library for offline playback</p>
          </div>
        </div>
      </div>
    </div>
  );
}
