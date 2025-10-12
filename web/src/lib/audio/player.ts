/**
 * Audio Player
 * Web Audio API-based player with playback controls and Media Session support
 */

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface PlayerCallbacks {
  onStateChange?: (state: PlayerState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export interface MediaMetadata {
  title: string;
  artist?: string;
  album?: string;
  artwork?: Array<{ src: string; sizes: string; type: string }>;
}

export class AudioPlayer {
  private audio: HTMLAudioElement;
  private state: PlayerState = 'idle';
  private callbacks: PlayerCallbacks = {};

  constructor(callbacks?: PlayerCallbacks) {
    this.audio = new Audio();
    this.callbacks = callbacks || {};
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.audio.addEventListener('loadstart', () => {
      this.setState('loading');
    });

    this.audio.addEventListener('canplay', () => {
      if (this.state === 'loading') {
        this.setState('paused');
      }
    });

    this.audio.addEventListener('play', () => {
      this.setState('playing');
    });

    this.audio.addEventListener('pause', () => {
      if (this.state !== 'ended') {
        this.setState('paused');
      }
    });

    this.audio.addEventListener('ended', () => {
      this.setState('ended');
      this.callbacks.onEnded?.();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.callbacks.onTimeUpdate?.(this.audio.currentTime, this.audio.duration);
    });

    this.audio.addEventListener('error', (e) => {
      this.setState('error');
      const error = new Error(this.audio.error?.message || 'Audio playback error');
      this.callbacks.onError?.(error);
    });
  }

  private setState(newState: PlayerState): void {
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  /**
   * Load audio from URL
   */
  async load(audioUrl: string): Promise<void> {
    this.audio.src = audioUrl;
    this.audio.load();
    this.setState('loading');
  }

  /**
   * Play audio
   */
  async play(): Promise<void> {
    try {
      await this.audio.play();
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  /**
   * Pause audio
   */
  pause(): void {
    this.audio.pause();
  }

  /**
   * Stop audio (pause and reset to beginning)
   */
  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.setState('idle');
  }

  /**
   * Seek to position (in seconds)
   */
  seek(time: number): void {
    this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0));
  }

  /**
   * Skip forward by seconds
   */
  skipForward(seconds: number = 15): void {
    this.seek(this.audio.currentTime + seconds);
  }

  /**
   * Skip backward by seconds
   */
  skipBackward(seconds: number = 15): void {
    this.seek(this.audio.currentTime - seconds);
  }

  /**
   * Set playback speed (0.5 to 2.0)
   */
  setPlaybackRate(rate: number): void {
    this.audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current playback position
   */
  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  /**
   * Get total duration
   */
  getDuration(): number {
    return this.audio.duration || 0;
  }

  /**
   * Get current state
   */
  getState(): PlayerState {
    return this.state;
  }

  /**
   * Check if playing
   */
  isPlaying(): boolean {
    return this.state === 'playing';
  }

  /**
   * Set media metadata for system integration (lock screen, notifications)
   */
  setMediaMetadata(metadata: MediaMetadata): void {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: metadata.title,
        artist: metadata.artist || 'Unknown Author',
        album: metadata.album || 'Ridecast',
        artwork: metadata.artwork || [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      // Setup action handlers for system controls
      navigator.mediaSession.setActionHandler('play', () => {
        this.play().catch(console.error);
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });

      navigator.mediaSession.setActionHandler('seekbackward', () => {
        this.skipBackward();
      });

      navigator.mediaSession.setActionHandler('seekforward', () => {
        this.skipForward();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.callbacks.onPrevious?.();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.callbacks.onNext?.();
      });

      // Update position state
      this.audio.addEventListener('loadedmetadata', () => {
        if ('setPositionState' in navigator.mediaSession) {
          navigator.mediaSession.setPositionState({
            duration: this.audio.duration,
            playbackRate: this.audio.playbackRate,
            position: this.audio.currentTime,
          });
        }
      });
    }
  }

  /**
   * Update media session position state
   */
  private updatePositionState(): void {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration,
          playbackRate: this.audio.playbackRate,
          position: this.audio.currentTime,
        });
      } catch (error) {
        // Position state may fail if duration is not available
        console.debug('Could not update position state:', error);
      }
    }
  }

  /**
   * Cleanup and release resources
   */
  destroy(): void {
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();

    // Clear media session
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    }
  }
}
