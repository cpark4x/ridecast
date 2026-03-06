"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";

export const SMART_RESUME_REWIND_SECS = 3;
export const SMART_RESUME_THRESHOLD_MS = 10_000;

export interface PlayableItem {
  id: string;
  title: string;
  duration: number; // seconds
  format: string;
  audioUrl: string;
}

interface PlayerState {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  position: number;
  speed: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (item: PlayableItem) => void;
  togglePlay: () => void;
  setSpeed: (speed: number) => void;
  setPosition: (position: number) => void;
  skipForward: (seconds: number) => void;
  skipBack: (seconds: number) => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentItem, setCurrentItem] = useState<PlayableItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPositionState] = useState(0);
  const [speed, setSpeedState] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pausedAtRef = useRef<number | null>(null);

  // --- Playback state persistence ---

  // Refs so savePosition never needs to close over state — stays fully stable
  const currentItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentItemIdRef.current = currentItem?.id ?? null;
  }, [currentItem?.id]);

  // savePosition is stable (reads from refs only — zero deps)
  const savePosition = useCallback(async (completed = false) => {
    if (!currentItemIdRef.current || !audioRef.current) return;
    await fetch("/api/playback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "default-user",
        audioId: currentItemIdRef.current,
        position: audioRef.current.currentTime,
        speed: audioRef.current.playbackRate,
        completed,
      }),
    }).catch(() => {}); // silent — don't interrupt playback for save failures
  }, []);

  // Restore position and speed from the API when a new audio item becomes active
  useEffect(() => {
    if (!currentItem?.id) return;

    fetch(`/api/playback?userId=default-user&audioId=${currentItem.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((state) => {
        if (state?.position && audioRef.current) {
          audioRef.current.currentTime = state.position;
        }
        if (state?.speed && audioRef.current) {
          audioRef.current.playbackRate = state.speed;
          setSpeedState(state.speed);
        }
      })
      .catch(() => {}); // silent — position loss is acceptable on network failure
  }, [currentItem?.id]);

  // Sync position as audio plays; wire save-position events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setPositionState(audio.currentTime);
    const onEnded = () => {
      setIsPlaying(false);
      savePosition(true); // completed = true
    };
    const onPause = () => savePosition();
    const onSeeked = () => savePosition();
    const onError = (e: Event) => console.error("Audio error:", (e.target as HTMLAudioElement).error);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("seeked", onSeeked);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("seeked", onSeeked);
      audio.removeEventListener("error", onError);
    };
  }, [savePosition]);

  // Save position every 5 seconds during active playback (handles force-quits/crashes)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => savePosition(), 5000);
    return () => clearInterval(interval);
  }, [isPlaying, savePosition]);

  // Save position on page unload
  useEffect(() => {
    const handleUnload = () => savePosition();
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [savePosition]);

  // --- Playback controls ---

  const play = useCallback(
    (item: PlayableItem) => {
      setCurrentItem(item);
      setIsPlaying(true);
      setPositionState(0);
      const audio = audioRef.current;
      if (audio) {
        audio.src = item.audioUrl;
        audio.playbackRate = speed;
        audio.currentTime = 0;
        audio.play().catch(console.error);
      }
    },
    [speed],
  );

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      const audio = audioRef.current;
      if (audio) {
        if (next) {
          // Smart Resume: rewind if paused for > SMART_RESUME_THRESHOLD_MS
          if (
            pausedAtRef.current !== null &&
            Date.now() - pausedAtRef.current > SMART_RESUME_THRESHOLD_MS
          ) {
            audio.currentTime = Math.max(0, audio.currentTime - SMART_RESUME_REWIND_SECS);
          }
          pausedAtRef.current = null;
          audio.play().catch(console.error);
        } else {
          pausedAtRef.current = Date.now();
          audio.pause();
        }
      }
      return next;
    });
  }, []);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  }, []);

  const setPosition = useCallback((pos: number) => {
    setPositionState(pos);
    if (audioRef.current) {
      audioRef.current.currentTime = pos;
    }
  }, []);

  const skipForward = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + seconds);
      setPositionState(audio.currentTime);
    }
  }, []);

  const skipBack = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - seconds);
      setPositionState(audio.currentTime);
    }
  }, []);

  return (
    <PlayerContext.Provider
      value={{ currentItem, isPlaying, position, speed, audioRef, play, togglePlay, setSpeed, setPosition, skipForward, skipBack }}
    >
      {children}
      <audio ref={audioRef} preload="auto" />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
