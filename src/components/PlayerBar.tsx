"use client";

import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";

interface PlayerBarProps {
  onExpand: () => void;
}

export function PlayerBar({ onExpand }: PlayerBarProps) {
  const { currentItem, isPlaying, position, togglePlay, skipForward } = usePlayer();

  if (!currentItem) return null;

  const progress = currentItem.duration > 0 ? (position / currentItem.duration) * 100 : 0;

  return (
    <div
      onClick={onExpand}
      data-testid="player-bar"
      className="absolute bottom-16 left-2 right-2 h-[58px] flex items-center gap-3 px-3 z-[60] cursor-pointer rounded-[14px] border border-[#EA580C]/20 transition-all"
      style={{ background: "linear-gradient(135deg, rgba(234,88,12,0.15), rgba(249,115,22,0.1))", backdropFilter: "blur(24px)" }}
    >
      <div className="w-[38px] h-[38px] rounded-lg bg-gradient-to-br from-[#EA580C] to-[#F97316] flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white">
          <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" opacity="0.7" /><circle cx="18" cy="16" r="3" opacity="0.7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{currentItem.title}</div>
        <div className="text-[11px] text-[var(--text-mid)] mt-px">{currentItem.format} &middot; {formatDuration(currentItem.duration)}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shrink-0 transition-all active:scale-[0.88]"
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#18181A]"><rect x="7" y="6" width="3.5" height="12" rx="1" /><rect x="13.5" y="6" width="3.5" height="12" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#18181A]"><polygon points="9,6 18,12 9,18" /></svg>
        )}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); skipForward(30); }}
        aria-label="Skip forward 30 seconds"
        className="w-[34px] h-[34px] flex flex-col items-center justify-center shrink-0 transition-all active:scale-[0.88] relative"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[var(--text-mid)]">
          <path d="M11.5 15.5V8.5L17 12l-5.5 3.5z"/>
          <rect x="18" y="7" width="2" height="10" rx="0.5"/>
        </svg>
        <span className="absolute -bottom-3 text-[8px] font-semibold text-[var(--text-dim)]">30s</span>
      </button>
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-black/10 rounded-sm overflow-hidden">
        <div className="h-full rounded-sm transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #EA580C, #F97316)" }} />
      </div>
    </div>
  );
}
