"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";

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

  // Sync position as audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setPositionState(audio.currentTime);
    const onEnded = () => setIsPlaying(false);
    const onError = (e: Event) => console.error("Audio error:", (e.target as HTMLAudioElement).error);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  const play = useCallback((item: PlayableItem) => {
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
  }, [speed]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      const audio = audioRef.current;
      if (audio) {
        if (next) audio.play().catch(console.error);
        else audio.pause();
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
