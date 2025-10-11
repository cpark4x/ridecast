/**
 * Audio Player
 * Web Audio API-based player with playback controls
 */

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface PlayerCallbacks {
  onStateChange?: (state: PlayerState) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
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
   * Cleanup and release resources
   */
  destroy(): void {
    this.audio.pause();
    this.audio.src = '';
    this.audio.load();
  }
}
