'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { AuthPage } from '@/components/auth-page';
import { UploadPageBackend } from '@/components/upload-page-backend';
import { LibraryPageEnhanced } from '@/components/library-page-enhanced';
import { PlaylistsPage } from '@/components/playlists-page';
import { initDatabase } from '@/lib/storage';
import { useNetworkStatus } from '@/lib/sync';

export default function Home() {
  const { isAuthenticated, user, logout } = useAuth();
  const [view, setView] = useState<'upload' | 'library' | 'playlists'>('upload');
  const [dbReady, setDbReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const networkStatus = useNetworkStatus();

  useEffect(() => {
    setMounted(true);
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

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

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
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Ridecast</h1>
            {/* Network Status Indicator */}
            <span className={`text-xs px-2 py-1 rounded-full ${
              networkStatus === 'online'
                ? 'bg-green-100 text-green-800'
                : 'bg-orange-100 text-orange-800'
            }`}>
              {networkStatus === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Navigation Buttons */}
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
            <button
              onClick={() => setView('playlists')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'playlists'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Playlists
            </button>

            {/* User Menu */}
            <div className="flex items-center gap-2 pl-4 border-l border-gray-300">
              <span className="text-sm text-gray-600">
                {user?.email || 'User'}
              </span>
              <button
                onClick={() => logout()}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'upload' && <UploadPageBackend />}
        {view === 'library' && <LibraryPageEnhanced />}
        {view === 'playlists' && <PlaylistsPage />}
      </main>
    </div>
  );
}
