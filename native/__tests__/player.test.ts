jest.mock("react-native-track-player", () => ({
  __esModule: true,
  default: {
    getActiveTrack: jest.fn(),
    setupPlayer: jest.fn(),
    updateOptions: jest.fn(),
    setRepeatMode: jest.fn(),
    addEventListener: jest.fn(),
    pause: jest.fn(),
    play: jest.fn(),
    skipToNext: jest.fn(),
    skipToPrevious: jest.fn(),
    seekTo: jest.fn(),
    getPosition: jest.fn(),
  },
  AppKilledPlaybackBehavior: { StopPlaybackAndRemoveNotification: 0 },
  Capability: {
    Play: "play",
    Pause: "pause",
    SkipToNext: "skip-to-next",
    SkipToPrevious: "skip-to-previous",
    SeekTo: "seek-to",
    JumpForward: "jump-forward",
    JumpBackward: "jump-backward",
  },
  Event: {
    RemotePause: "remote-pause",
    RemotePlay: "remote-play",
    RemoteNext: "remote-next",
    RemotePrevious: "remote-previous",
    RemoteSeek: "remote-seek",
    RemoteJumpForward: "remote-jump-forward",
    RemoteJumpBackward: "remote-jump-backward",
    PlaybackQueueEnded: "playback-queue-ended",
  },
  RepeatMode: { Off: 0 },
  State: { Playing: "playing", Paused: "paused", None: "none" },
}));

import { setupPlayer, PlaybackService } from "../lib/player";

// Get references to the mocked default namespace after imports
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tp = jest.requireMock("react-native-track-player").default as Record<
  string,
  jest.Mock
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("setupPlayer", () => {
  it("returns true when player already initialized (getActiveTrack resolves)", async () => {
    tp.getActiveTrack.mockResolvedValueOnce({ id: "existing-track" });

    const result = await setupPlayer();

    expect(result).toBe(true);
    expect(tp.setupPlayer).not.toHaveBeenCalled();
  });

  it("calls TrackPlayer.setupPlayer when not yet initialized (getActiveTrack throws)", async () => {
    tp.getActiveTrack.mockRejectedValueOnce(new Error("Player not set up"));
    tp.setupPlayer.mockResolvedValueOnce(undefined);
    tp.updateOptions.mockResolvedValueOnce(undefined);
    tp.setRepeatMode.mockResolvedValueOnce(undefined);

    const result = await setupPlayer();

    expect(result).toBe(true);
    expect(tp.setupPlayer).toHaveBeenCalledTimes(1);
    expect(tp.updateOptions).toHaveBeenCalledTimes(1);
    expect(tp.setRepeatMode).toHaveBeenCalledTimes(1);
  });

  it("configures forward and backward jump intervals", async () => {
    tp.getActiveTrack.mockRejectedValueOnce(new Error("not set up"));
    tp.setupPlayer.mockResolvedValueOnce(undefined);
    tp.updateOptions.mockResolvedValueOnce(undefined);
    tp.setRepeatMode.mockResolvedValueOnce(undefined);

    await setupPlayer();

    const [opts] = tp.updateOptions.mock.calls[0];
    expect(opts.forwardJumpInterval).toBe(15);
    expect(opts.backwardJumpInterval).toBe(5);
  });
});

describe("PlaybackService", () => {
  it("registers expected playback event listeners", async () => {
    await PlaybackService();

    const registeredEvents = tp.addEventListener.mock.calls.map(
      (call: unknown[]) => call[0],
    );
    expect(registeredEvents).toContain("remote-pause");
    expect(registeredEvents).toContain("remote-play");
    expect(registeredEvents).toContain("remote-next");
    expect(registeredEvents).toContain("remote-previous");
    expect(registeredEvents).toContain("remote-seek");
    expect(registeredEvents).toContain("remote-jump-forward");
    expect(registeredEvents).toContain("remote-jump-backward");
    expect(registeredEvents).toContain("playback-queue-ended");
  });

  it("RemotePause listener calls TrackPlayer.pause", async () => {
    await PlaybackService();

    const pauseCall = tp.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === "remote-pause",
    );
    expect(pauseCall).toBeDefined();
    const handler = pauseCall![1] as () => void;
    handler();
    expect(tp.pause).toHaveBeenCalledTimes(1);
  });

  it("RemoteJumpForward listener seeks forward by interval", async () => {
    await PlaybackService();
    tp.getPosition.mockResolvedValueOnce(100);

    const fwdCall = tp.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === "remote-jump-forward",
    );
    expect(fwdCall).toBeDefined();
    const handler = fwdCall![1] as (e: { interval: number }) => Promise<void>;
    await handler({ interval: 15 });
    expect(tp.seekTo).toHaveBeenCalledWith(115);
  });

  it("PlaybackQueueEnded handler pauses and seeks to start", async () => {
    await PlaybackService();
    const queueEndedCall = tp.addEventListener.mock.calls.find(
      (c: unknown[]) => c[0] === "playback-queue-ended",
    );
    expect(queueEndedCall).toBeDefined();
    const handler = queueEndedCall![1] as () => Promise<void>;
    await handler();
    expect(tp.pause).toHaveBeenCalledTimes(1);
    expect(tp.seekTo).toHaveBeenCalledWith(0);
  });
});
