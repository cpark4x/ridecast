/**
 * Jest manual mock for react-native-track-player.
 *
 * The real package calls `new NativeEventEmitter()` at module load time which
 * requires native modules that don't exist in a Jest (Node.js) environment.
 * This stub lets any test file that transitively imports react-native-track-player
 * load without crashing, while keeping all methods as no-ops / jest.fn().
 *
 * Tests that exercise player behaviour directly (player.test.ts, usePlayer.test.ts)
 * supply their own inline jest.mock() factory which overrides this file.
 */

const TrackPlayer = {
  setupPlayer: jest.fn().mockResolvedValue(undefined),
  registerPlaybackService: jest.fn(),
  updateOptions: jest.fn().mockResolvedValue(undefined),
  setRepeatMode: jest.fn().mockResolvedValue(undefined),
  add: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  seekTo: jest.fn().mockResolvedValue(undefined),
  setRate: jest.fn().mockResolvedValue(undefined),
  skipToNext: jest.fn().mockResolvedValue(undefined),
  skipToPrevious: jest.fn().mockResolvedValue(undefined),
  getActiveTrack: jest.fn().mockResolvedValue(null),
  getPosition: jest.fn().mockResolvedValue(0),
  getProgress: jest.fn().mockResolvedValue({ position: 0, duration: 0, buffered: 0 }),
  addEventListener: jest.fn(),
};

module.exports = {
  __esModule: true,
  default: TrackPlayer,

  // Hooks
  usePlaybackState: jest.fn(() => ({ state: 'none' })),
  useProgress: jest.fn(() => ({ position: 0, duration: 0, buffered: 0 })),
  useActiveTrack: jest.fn(() => null),
  useTrackPlayerEvents: jest.fn(),

  // Enums / constants
  AppKilledPlaybackBehavior: {
    StopPlaybackAndRemoveNotification: 0,
    PausePlayback: 1,
  },
  Capability: {
    Play: 'play',
    Pause: 'pause',
    Stop: 'stop',
    SeekTo: 'seek-to',
    SkipToNext: 'skip-to-next',
    SkipToPrevious: 'skip-to-previous',
    JumpForward: 'jump-forward',
    JumpBackward: 'jump-backward',
  },
  Event: {
    PlaybackState: 'playback-state',
    PlaybackError: 'playback-error',
    PlaybackQueueEnded: 'playback-queue-ended',
    PlaybackTrackChanged: 'playback-track-changed',
    RemotePlay: 'remote-play',
    RemotePause: 'remote-pause',
    RemoteStop: 'remote-stop',
    RemoteNext: 'remote-next',
    RemotePrevious: 'remote-previous',
    RemoteSeek: 'remote-seek',
    RemoteJumpForward: 'remote-jump-forward',
    RemoteJumpBackward: 'remote-jump-backward',
  },
  RepeatMode: {
    Off: 0,
    Track: 1,
    Queue: 2,
  },
  State: {
    None: 'none',
    Ready: 'ready',
    Playing: 'playing',
    Paused: 'paused',
    Stopped: 'stopped',
    Buffering: 'buffering',
    Connecting: 'connecting',
    Loading: 'loading',
    Error: 'error',
  },
};
