"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

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

  const play = useCallback((item: PlayableItem) => {
    setCurrentItem(item);
    setIsPlaying(true);
    setPositionState(0);
    if (audioRef.current) {
      audioRef.current.src = item.audioUrl;
      audioRef.current.playbackRate = speed;
      audioRef.current.play().catch(() => {});
    }
  }, [speed]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (audioRef.current) {
        if (next) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
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
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
      setPositionState(audioRef.current.currentTime);
    }
  }, []);

  const skipBack = useCallback((seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
      setPositionState(audioRef.current.currentTime);
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
