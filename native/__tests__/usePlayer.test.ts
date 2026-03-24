// Mutable module-level variables control what the RNTP hooks return on each render.
// Changing them before a rerender() lets tests simulate playback state transitions
// without touching React state directly.
let mockPlaybackStateValue = "none";
let mockProgressPosition = 0;
let mockProgressDuration = 0;

jest.mock("react-native-track-player", () => ({
  __esModule: true,
  default: {
    reset: jest.fn().mockResolvedValue(undefined),
    add: jest.fn().mockResolvedValue(undefined),
    seekTo: jest.fn().mockResolvedValue(undefined),
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    setRate: jest.fn().mockResolvedValue(undefined),
    getActiveTrack: jest.fn().mockResolvedValue(null),
    skipToNext: jest.fn().mockResolvedValue(undefined),
    skipToPrevious: jest.fn().mockResolvedValue(undefined),
    getPosition: jest.fn().mockResolvedValue(0),
    addEventListener: jest.fn(),
    updateOptions: jest.fn().mockResolvedValue(undefined),
    setRepeatMode: jest.fn().mockResolvedValue(undefined),
  },
  // Each render reads the current module-level value, enabling state-transition tests.
  usePlaybackState: jest.fn(() => ({ state: mockPlaybackStateValue })),
  useProgress: jest.fn(() => ({
    position: mockProgressPosition,
    duration: mockProgressDuration,
    buffered: 0,
  })),
  useActiveTrack: jest.fn(() => null),
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
  State: {
    Playing: "playing",
    Stopped: "stopped",
    Paused: "paused",
    Buffering: "buffering",
    None: "none",
  },
}));

jest.mock("../lib/db", () => ({
  saveLocalPlayback: jest.fn().mockResolvedValue(undefined),
  getLocalPlayback: jest.fn().mockResolvedValue(null),
}));

jest.mock("../lib/api", () => ({
  savePlaybackState: jest.fn().mockResolvedValue(undefined),
  fetchLibrary: jest.fn().mockResolvedValue([]),
}));

jest.mock("../lib/downloads", () => ({
  resolveAudioUrl: jest.fn().mockImplementation((_id: string, url: string) =>
    Promise.resolve(url)
  ),
}));

import React from "react";
import { renderHook, act } from "@testing-library/react-native";
import { PlayerProvider, usePlayer } from "../lib/usePlayer";
import * as db from "../lib/db";
import * as api from "../lib/api";
import type { PlayableItem } from "../lib/types";

const mockDb = db as jest.Mocked<typeof db>;
const mockApi = api as jest.Mocked<typeof api>;

const MOCK_ITEM: PlayableItem = {
  id: "ep-1",
  title: "Test Episode",
  duration: 300,
  format: "narrator",
  audioUrl: "http://example.com/audio.mp3",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPlaybackStateValue = "none";
  mockProgressPosition = 0;
  mockProgressDuration = 0;
});

// Wrapper factory — separate function so React sees a stable component type
// across rerenders, preserving PlayerProvider's internal state.
function makeWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(PlayerProvider, null, children);
  };
}

describe("PlayerProvider – completion detection useEffect", () => {
  it("saves completed:true to local DB and server when playback stops at end of track", async () => {
    // Position near end of a 300-second track
    mockProgressPosition = 299;
    mockProgressDuration = 300;

    const wrapper = makeWrapper();
    const { result, rerender } = renderHook(() => usePlayer(), { wrapper });

    // Set currentItem by calling play()
    await act(async () => {
      await result.current.play(MOCK_ITEM);
    });

    // Clear any save calls triggered by play() itself
    jest.clearAllMocks();

    // Step 1: track starts playing
    mockPlaybackStateValue = "playing";
    await act(async () => {
      rerender();
    });

    // Step 2: track ends – RNTP transitions to a non-playing state
    mockPlaybackStateValue = "none";
    await act(async () => {
      rerender();
    });

    // Both persistence layers must record the completed flag
    expect(mockDb.saveLocalPlayback).toHaveBeenCalledWith(
      expect.objectContaining({ audioId: "ep-1", completed: true })
    );
    expect(mockApi.savePlaybackState).toHaveBeenCalledWith(
      expect.objectContaining({ audioId: "ep-1", completed: true })
    );
  });

  it("does NOT save completed when playback stops before end of track", async () => {
    // Position well before the end
    mockProgressPosition = 100;
    mockProgressDuration = 300;

    const wrapper = makeWrapper();
    const { result, rerender } = renderHook(() => usePlayer(), { wrapper });

    await act(async () => {
      await result.current.play(MOCK_ITEM);
    });

    jest.clearAllMocks();

    // Simulate a mid-track pause (not a natural end)
    mockPlaybackStateValue = "playing";
    await act(async () => {
      rerender();
    });

    mockPlaybackStateValue = "paused";
    await act(async () => {
      rerender();
    });

    // completed:true must NOT appear — position was far from the end
    expect(mockDb.saveLocalPlayback).not.toHaveBeenCalledWith(
      expect.objectContaining({ completed: true })
    );
    expect(mockApi.savePlaybackState).not.toHaveBeenCalledWith(
      expect.objectContaining({ completed: true })
    );
  });
});
