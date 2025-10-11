'use client';

import { useState, useEffect } from 'react';
import { UploadPage } from '@/components/upload-page';
import { LibraryPage } from '@/components/library-page';
import { initDatabase } from '@/lib/storage';

export default function Home() {
  const [view, setView] = useState<'upload' | 'library'>('upload');
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Initialize database on mount
    initDatabase()
      .then(() => {
        setDbReady(true);
        console.log('Database initialized');
      })
      .catch((error) => {
        console.error('Failed to initialize database:', error);
      });
  }, []);

  if (!dbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Loading Ridecast...</h2>
          <p className="text-gray-600">Initializing offline storage</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Ridecast</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setView('upload')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upload
            </button>
            <button
              onClick={() => setView('library')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'library'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Library
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'upload' ? <UploadPage /> : <LibraryPage />}
      </main>
    </div>
  );
}
