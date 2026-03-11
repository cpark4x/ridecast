"use client";

import { useState, useRef, useEffect } from "react";
import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];

interface ExpandedPlayerProps {
  onClose: () => void;
  onCarMode: () => void;
}

export function ExpandedPlayer({ onClose, onCarMode }: ExpandedPlayerProps) {
  const { currentItem, isPlaying, position, speed, togglePlay, setSpeed, setPosition, skipForward, skipBack } = usePlayer();
  const [undoPosition, setUndoPosition] = useState<number | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  if (!currentItem) return null;

  const duration = currentItem.duration;
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const remaining = duration - position;

  function cycleSpeed() {
    const idx = SPEEDS.indexOf(speed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    setSpeed(next);
  }

  function seekProgress(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const newPos = Math.max(0, Math.min(duration, pct * duration));

    // Save current position for undo
    setUndoPosition(position);

    // Clear any existing undo timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    // Auto-dismiss undo after 4 seconds
    undoTimerRef.current = setTimeout(() => {
      setUndoPosition(null);
      undoTimerRef.current = null;
    }, 4000);

    setPosition(newPos);
  }

  function handleUndo() {
    if (undoPosition !== null) {
      setPosition(undoPosition);
      setUndoPosition(null);
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = null;
      }
    }
  }

  return (
    <div className="absolute inset-0 z-[100] bg-[var(--bg)] flex flex-col transition-transform duration-400">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full transition-all hover:bg-black/[0.06]">
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-[var(--text-mid)] fill-none" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        <span className="text-xs font-semibold text-[var(--text-mid)] uppercase tracking-widest">Now Playing</span>
        <div className="w-9" />
      </div>

      {/* Artwork */}
      <div className="mx-auto mb-8 mt-2 rounded-3xl flex items-center justify-center"
        style={{
          width: "calc(100% - 80px)", maxWidth: "300px", aspectRatio: "1",
          background: "linear-gradient(135deg, #EA580C, #F97316, #FCD34D)", backgroundSize: "200% 200%",
          animation: "gradientShift 6s ease infinite", boxShadow: "0 16px 64px rgba(234,88,12,0.25)"
        }}>
        <svg viewBox="0 0 24 24" className="w-[60px] h-[60px] fill-white opacity-85">
          <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" opacity="0.7" /><circle cx="18" cy="16" r="3" opacity="0.7" />
        </svg>
      </div>

      {/* Info */}
      <div className="text-center px-6 mb-6">
        <h2 className="text-xl font-bold mb-1.5 tracking-tight">{currentItem.title}</h2>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--accent-light)] text-[var(--accent-text)]">
          {currentItem.format}
        </span>
      </div>

      {/* Progress */}
      <div className="px-6 mb-6">
        <div
          data-testid="progress-bar"
          onClick={seekProgress}
          className="w-full h-5 flex items-center cursor-pointer group relative"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={Math.floor(position)}
        >
          {/* Track */}
          <div className="absolute w-full h-1 bg-black/10 rounded-full">
            {/* Fill */}
            <div
              className="absolute h-full rounded-full"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #EA580C, #F97316)" }}
            />
            {/* Thumb */}
            <div
              className="absolute w-3 h-3 bg-white rounded-full shadow-md -translate-y-1/2 -translate-x-1/2 top-1/2 transition-transform group-active:scale-125"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        {/* Undo Seek button — appears for 4s after any seek */}
        {undoPosition !== null && (
          <div className="flex justify-center mt-2">
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-black/10 text-[var(--text-mid)] transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round">
                <path d="M3 10h11a5 5 0 0 1 0 10H3" /><polyline points="7 6 3 10 7 14" />
              </svg>
              Go Back
            </button>
          </div>
        )}

        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-[var(--text-mid)] font-medium tabular-nums">{formatDuration(Math.floor(position))}</span>
          <span className="text-[11px] text-[var(--text-mid)] font-medium tabular-nums">-{formatDuration(Math.floor(remaining))}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-7 px-6 mb-8">
        <button onClick={() => skipBack(15)} className="w-12 h-12 flex flex-col items-center justify-center rounded-full active:scale-[0.88] relative">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#18181A]"><path d="M12.5 8.5C12.5 8.5 7 12 7 12l5.5 3.5V8.5z" /><path d="M18 8.5C18 8.5 12.5 12 12.5 12L18 15.5V8.5z" /><rect x="4" y="7" width="2" height="10" rx="0.5" /></svg>
          <span className="absolute -bottom-3.5 text-[9px] font-semibold text-[var(--text-dim)]">15s</span>
        </button>
        <button onClick={togglePlay} className="w-[68px] h-[68px] bg-[var(--text)] rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-[0.92] shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white ml-0.5"><polygon points="8,5 19,12 8,19" /></svg>
          )}
        </button>
        <button onClick={() => skipForward(30)} className="w-12 h-12 flex flex-col items-center justify-center rounded-full active:scale-[0.88] relative">
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#18181A]"><path d="M11.5 15.5V8.5L17 12l-5.5 3.5z" /><rect x="18" y="7" width="2" height="10" rx="0.5" /></svg>
          <span className="absolute -bottom-3.5 text-[9px] font-semibold text-[var(--text-dim)]">30s</span>
        </button>
      </div>

      {/* Extras */}
      <div className="flex items-center justify-around px-10 mb-5">
        <button onClick={cycleSpeed} className="flex flex-col items-center gap-1 p-2 rounded-lg active:scale-90">
          <span className="bg-[var(--surface-2)] border border-black/[0.07] rounded-full px-3 py-1 text-[13px] font-bold">{speed}x</span>
          <span className="text-[10px] font-semibold text-[var(--text-mid)]">Speed</span>
        </button>
        <button onClick={onCarMode} className="flex flex-col items-center gap-1 p-2 rounded-lg active:scale-90">
          <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] stroke-[var(--text-mid)] fill-none" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          </svg>
          <span className="text-[10px] font-semibold text-[var(--text-mid)]">Car Mode</span>
        </button>
      </div>
    </div>
  );
}
