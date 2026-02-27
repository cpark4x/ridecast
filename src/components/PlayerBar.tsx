"use client";

import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";

interface PlayerBarProps {
  onExpand: () => void;
}

export function PlayerBar({ onExpand }: PlayerBarProps) {
  const { currentItem, isPlaying, position, togglePlay } = usePlayer();

  if (!currentItem) return null;

  const progress = currentItem.duration > 0 ? (position / currentItem.duration) * 100 : 0;

  return (
    <div
      onClick={onExpand}
      className="absolute bottom-16 left-2 right-2 h-[58px] flex items-center gap-3 px-3 z-[60] cursor-pointer rounded-[14px] border border-indigo-500/20 transition-all"
      style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))", backdropFilter: "blur(24px)" }}
    >
      <div className="w-[38px] h-[38px] rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white">
          <path d="M9 18V5l12-2v13" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="18" r="3" opacity="0.7" /><circle cx="18" cy="16" r="3" opacity="0.7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{currentItem.title}</div>
        <div className="text-[11px] text-white/55 mt-px">{currentItem.format} &middot; {formatDuration(currentItem.duration)}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shrink-0 transition-all active:scale-[0.88]"
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#0a0a0f]"><rect x="7" y="6" width="3.5" height="12" rx="1" /><rect x="13.5" y="6" width="3.5" height="12" rx="1" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#0a0a0f]"><polygon points="9,6 18,12 9,18" /></svg>
        )}
      </button>
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-white/10 rounded-sm overflow-hidden">
        <div className="h-full rounded-sm transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
      </div>
    </div>
  );
}
