import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import TrackPlayer, {
  usePlaybackState,
  useProgress,
  useActiveTrack,
  State,
} from "react-native-track-player";
import { resolveAudioUrl } from "./downloads";
import { saveLocalPlayback, getLocalPlayback } from "./db";
import { savePlaybackState as saveServerPlayback } from "./api";
import {
  SMART_RESUME_REWIND_SECS,
  SMART_RESUME_THRESHOLD_MS,
  POSITION_SAVE_INTERVAL_MS,
} from "./constants";
import type { PlayableItem } from "./types";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface PlayerContextType {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  speed: number;
  queue: PlayableItem[];
  play: (item: PlayableItem) => Promise<void>;
  playQueue: (items: PlayableItem[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBack: (seconds?: number) => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  sleepTimer: number | "end" | null;
  setSleepTimer: (value: number | "end" | null) => void;
  expandedPlayerVisible: boolean;
  setExpandedPlayerVisible: (visible: boolean) => void;
  carModeVisible: boolean;
  setCarModeVisible: (visible: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function itemToTrack(item: PlayableItem) {
  return {
    id: item.id,
    url: item.audioUrl,
    title: item.title,
    artist: item.author ?? undefined,
    duration: item.duration,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentItem, setCurrentItem] = useState<PlayableItem | null>(null);
  const [queue, setQueue] = useState<PlayableItem[]>([]);
  const [speed, setSpeedState] = useState(1.0);
  const [sleepTimer, setSleepTimerState] = useState<number | "end" | null>(
    null,
  );
  const [expandedPlayerVisible, setExpandedPlayerVisible] = useState(false);
  const [carModeVisible, setCarModeVisible] = useState(false);

  const playbackState = usePlaybackState();
  const progress = useProgress(500);
  const activeTrack = useActiveTrack();

  // Timestamps for smart resume
  const pausedAtRef = useRef<number | null>(null);

  // Sleep timer handle
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPlaying =
    playbackState.state === State.Playing ||
    playbackState.state === State.Buffering;

  // Keep pausedAt timestamp updated
  useEffect(() => {
    if (!isPlaying) {
      if (pausedAtRef.current === null) {
        pausedAtRef.current = Date.now();
      }
    } else {
      pausedAtRef.current = null;
    }
  }, [isPlaying]);

  // -------------------------------------------------------------------------
  // Position persistence: save every POSITION_SAVE_INTERVAL_MS during playback
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying || !currentItem) return;

    const interval = setInterval(async () => {
      const pos = progress.position;
      const dur = progress.duration;
      const completed = dur > 0 && pos >= dur - 1;
      await saveLocalPlayback({
        audioId: currentItem.id,
        position: pos,
        speed,
        completed,
      });
      saveServerPlayback({
        audioId: currentItem.id,
        position: pos,
        speed,
        completed,
      }).catch(() => {
        /* fire and forget */
      });
    }, POSITION_SAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPlaying, currentItem, progress.position, progress.duration, speed]);

  // -------------------------------------------------------------------------
  // Sleep timer implementation
  // -------------------------------------------------------------------------
  const setSleepTimer = useCallback(
    (value: number | "end" | null) => {
      if (sleepTimeoutRef.current) {
        clearTimeout(sleepTimeoutRef.current);
        sleepTimeoutRef.current = null;
      }
      setSleepTimerState(value);

      if (typeof value === "number") {
        sleepTimeoutRef.current = setTimeout(
          () => {
            TrackPlayer.pause();
            setSleepTimerState(null);
          },
          value * 60 * 1000,
        );
      }
      // "end" mode: handled by watching track-end events (see below)
    },
    [],
  );

  // "end" sleep timer: pause when a track finishes
  useEffect(() => {
    if (sleepTimer !== "end") return;
    if (!isPlaying) return;

    const dur = progress.duration;
    const pos = progress.position;
    if (dur > 0 && pos >= dur - 1) {
      TrackPlayer.pause();
      setSleepTimerState(null);
    }
  }, [sleepTimer, isPlaying, progress]);

  // -------------------------------------------------------------------------
  // Core playback actions
  // -------------------------------------------------------------------------

  const play = useCallback(async (item: PlayableItem) => {
    const url = await resolveAudioUrl(item.id, item.audioUrl);
    const resolved: PlayableItem = { ...item, audioUrl: url };

    await TrackPlayer.reset();
    await TrackPlayer.add(itemToTrack(resolved));

    // Restore saved position
    const saved = await getLocalPlayback(item.id);
    const resumePos =
      saved && saved.position > 0 && !saved.completed ? saved.position : 0;

    if (resumePos > 0) {
      await TrackPlayer.seekTo(resumePos);
    }
    if (saved?.speed && saved.speed !== 1.0) {
      await TrackPlayer.setRate(saved.speed);
      setSpeedState(saved.speed);
    }

    await TrackPlayer.play();
    setCurrentItem(resolved);
    setQueue([resolved]);
  }, []);

  const playQueue = useCallback(async (items: PlayableItem[]) => {
    if (items.length === 0) return;

    const resolved = await Promise.all(
      items.map(async (item) => {
        const url = await resolveAudioUrl(item.id, item.audioUrl);
        return { ...item, audioUrl: url };
      }),
    );

    await TrackPlayer.reset();
    await TrackPlayer.add(resolved.map(itemToTrack));

    // Jump to first unfinished track
    let startIndex = 0;
    for (let i = 0; i < resolved.length; i++) {
      const saved = await getLocalPlayback(resolved[i].id);
      if (!saved?.completed) {
        startIndex = i;
        break;
      }
    }

    await TrackPlayer.skip(startIndex);
    const saved = await getLocalPlayback(resolved[startIndex].id);
    if (saved?.position && saved.position > 0) {
      await TrackPlayer.seekTo(saved.position);
    }

    await TrackPlayer.play();
    setCurrentItem(resolved[startIndex]);
    setQueue(resolved);
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      // Save position on pause
      if (currentItem) {
        await saveLocalPlayback({
          audioId: currentItem.id,
          position: progress.position,
          speed,
        });
        saveServerPlayback({
          audioId: currentItem.id,
          position: progress.position,
          speed,
        }).catch(() => {});
      }
      await TrackPlayer.pause();
    } else {
      // Smart Resume: if paused for longer than threshold, rewind a few seconds
      if (pausedAtRef.current !== null) {
        const pausedDurationMs = Date.now() - pausedAtRef.current;
        if (pausedDurationMs > SMART_RESUME_THRESHOLD_MS) {
          const rewindTo = Math.max(
            0,
            progress.position - SMART_RESUME_REWIND_SECS,
          );
          await TrackPlayer.seekTo(rewindTo);
        }
      }
      await TrackPlayer.play();
    }
  }, [isPlaying, currentItem, progress.position, speed]);

  const seekTo = useCallback(
    async (position: number) => {
      await TrackPlayer.seekTo(position);
      if (currentItem) {
        await saveLocalPlayback({
          audioId: currentItem.id,
          position,
          speed,
        });
      }
    },
    [currentItem, speed],
  );

  const skipForward = useCallback(async (seconds = 15) => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(pos + seconds);
  }, []);

  const skipBack = useCallback(async (seconds = 5) => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, pos - seconds));
  }, []);

  const skipToNext = useCallback(async () => {
    await TrackPlayer.skipToNext();
    const track = await TrackPlayer.getActiveTrack();
    if (track) {
      const match = queue.find((q) => q.id === track.id);
      if (match) setCurrentItem(match);
    }
  }, [queue]);

  const skipToPrevious = useCallback(async () => {
    await TrackPlayer.skipToPrevious();
    const track = await TrackPlayer.getActiveTrack();
    if (track) {
      const match = queue.find((q) => q.id === track.id);
      if (match) setCurrentItem(match);
    }
  }, [queue]);

  const setSpeed = useCallback(async (newSpeed: number) => {
    await TrackPlayer.setRate(newSpeed);
    setSpeedState(newSpeed);
  }, []);

  // Keep currentItem in sync with active track (e.g., after skipToNext)
  useEffect(() => {
    if (!activeTrack) return;
    const match = queue.find((q) => q.id === activeTrack.id);
    if (match && match.id !== currentItem?.id) {
      setCurrentItem(match);
    }
  }, [activeTrack, queue, currentItem?.id]);

  const value: PlayerContextType = {
    currentItem,
    isPlaying,
    position: progress.position,
    duration: progress.duration,
    speed,
    queue,
    play,
    playQueue,
    togglePlay,
    seekTo,
    skipForward,
    skipBack,
    skipToNext,
    skipToPrevious,
    setSpeed,
    sleepTimer,
    setSleepTimer,
    expandedPlayerVisible,
    setExpandedPlayerVisible,
    carModeVisible,
    setCarModeVisible,
  };

  return React.createElement(PlayerContext.Provider, { value }, children);
}
