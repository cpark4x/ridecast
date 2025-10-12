'use client';

import { useState, useEffect } from 'react';
import {
  getAllPlaylists,
  createPlaylist,
  deletePlaylist,
  getContent,
  setPlaylistIndex,
  type Playlist,
  type ContentItem,
} from '@/lib/storage';
import { PlayerInterface } from './player-interface';

export function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistContent, setPlaylistContent] = useState<ContentItem[]>([]);
  const [playingPlaylist, setPlayingPlaylist] = useState<Playlist | null>(null);
  const [currentTrack, setCurrentTrack] = useState<ContentItem | null>(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (selectedPlaylist) {
      loadPlaylistContent(selectedPlaylist);
    }
  }, [selectedPlaylist]);

  const loadPlaylists = async () => {
    const lists = await getAllPlaylists();
    setPlaylists(lists);
  };

  const loadPlaylistContent = async (playlist: Playlist) => {
    const content = await Promise.all(
      playlist.contentIds.map(async (id) => {
        const item = await getContent(id);
        return item;
      })
    );
    setPlaylistContent(content.filter((item): item is ContentItem => item !== undefined));
  };

  const handleCreatePlaylist = async (name: string, description: string) => {
    await createPlaylist(name, description);
    await loadPlaylists();
    setShowCreateDialog(false);
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (confirm('Delete this playlist? Content will not be deleted.')) {
      await deletePlaylist(playlistId);
      await loadPlaylists();
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
      }
    }
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    if (playlist.contentIds.length === 0) {
      alert('This playlist is empty');
      return;
    }

    // Reset to beginning of playlist
    await setPlaylistIndex(playlist.id, 0);

    // Load first track
    const firstTrack = await getContent(playlist.contentIds[0]);
    if (firstTrack) {
      setPlayingPlaylist(playlist);
      setCurrentTrack(firstTrack);
    }
  };

  const handleNext = async () => {
    if (!playingPlaylist) return;

    const currentIndex = playingPlaylist.currentIndex;
    const nextIndex = currentIndex + 1;

    if (nextIndex < playingPlaylist.contentIds.length) {
      await setPlaylistIndex(playingPlaylist.id, nextIndex);
      const nextTrack = await getContent(playingPlaylist.contentIds[nextIndex]);

      if (nextTrack) {
        // Update playlist state
        const updatedPlaylist = { ...playingPlaylist, currentIndex: nextIndex };
        setPlayingPlaylist(updatedPlaylist);
        setCurrentTrack(nextTrack);
      }
    }
  };

  const handlePrevious = async () => {
    if (!playingPlaylist) return;

    const currentIndex = playingPlaylist.currentIndex;
    const prevIndex = currentIndex - 1;

    if (prevIndex >= 0) {
      await setPlaylistIndex(playingPlaylist.id, prevIndex);
      const prevTrack = await getContent(playingPlaylist.contentIds[prevIndex]);

      if (prevTrack) {
        // Update playlist state
        const updatedPlaylist = { ...playingPlaylist, currentIndex: prevIndex };
        setPlayingPlaylist(updatedPlaylist);
        setCurrentTrack(prevTrack);
      }
    }
  };

  const hasNext = playingPlaylist ? playingPlaylist.currentIndex < playingPlaylist.contentIds.length - 1 : false;
  const hasPrevious = playingPlaylist ? playingPlaylist.currentIndex > 0 : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Playlists</h2>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Playlist
        </button>
      </div>

      {/* Create Playlist Dialog */}
      {showCreateDialog && (
        <CreatePlaylistDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreatePlaylist}
        />
      )}

      {playlists.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="w-24 h-24 mx-auto text-gray-300 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No playlists yet</h3>
          <p className="text-gray-600 mb-6">Create a playlist to queue multiple books for listening</p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Playlist List */}
          <div className="lg:col-span-1 space-y-3">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                onClick={() => setSelectedPlaylist(playlist)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPlaylist?.id === playlist.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{playlist.name}</h3>
                    {playlist.description && (
                      <p className="text-sm text-gray-600 mt-1">{playlist.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {playlist.contentIds.length} {playlist.contentIds.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylist(playlist.id);
                    }}
                    className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Playlist Content */}
          <div className="lg:col-span-2">
            {selectedPlaylist ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedPlaylist.name}
                  </h3>
                  {playlistContent.length > 0 && (
                    <button
                      onClick={() => handlePlayPlaylist(selectedPlaylist)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play Playlist
                    </button>
                  )}
                </div>
                {playlistContent.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      This playlist is empty. Add items from your library.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {playlistContent.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm font-medium text-gray-500 w-8">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.title}</h4>
                          <p className="text-sm text-gray-600">{item.author}</p>
                        </div>
                        {item.audioDuration && (
                          <span className="text-sm text-gray-500">
                            {Math.floor(item.audioDuration / 60)} min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <p className="text-gray-600">Select a playlist to view its contents</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player Interface */}
      {currentTrack && playingPlaylist && (
        <PlayerInterface
          content={currentTrack}
          onClose={() => {
            setCurrentTrack(null);
            setPlayingPlaylist(null);
          }}
          playlistId={playingPlaylist.id}
          onNext={handleNext}
          onPrevious={handlePrevious}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
        />
      )}
    </div>
  );
}

function CreatePlaylistDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), description.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Playlist</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Playlist Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Commute Playlist"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Books to listen to during my daily commute"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
