"use client";

import { usePlayer } from "./PlayerContext";

interface CarModeProps {
  onExit: () => void;
}

export function CarMode({ onExit }: CarModeProps) {
  const { currentItem, isPlaying, togglePlay, skipForward, skipBack } = usePlayer();

  if (!currentItem) return null;

  return (
    <div className="absolute inset-0 z-[200] bg-[#18181A] flex flex-col items-center justify-center">
      {/* Close */}
      <button onClick={onExit} className="absolute top-5 right-5 w-11 h-11 flex items-center justify-center rounded-full bg-white/[0.08] active:scale-[0.88] active:bg-white/[0.15]">
        <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-white/55 fill-none" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>

      {/* Title */}
      <div className="absolute top-[12%] left-6 right-6 text-center text-[22px] font-extrabold tracking-tight leading-snug text-white">
        {currentItem.title}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-10">
        <button onClick={() => skipBack(30)} className="w-20 h-20 rounded-full bg-white/[0.08] flex flex-col items-center justify-center border border-white/[0.10] active:scale-[0.88] active:bg-white/[0.15]">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white"><path d="M12.5 8.5C12.5 8.5 7 12 7 12l5.5 3.5V8.5z" /><path d="M18 8.5C18 8.5 12.5 12 12.5 12L18 15.5V8.5z" /><rect x="4" y="7" width="2" height="10" rx="0.5" /></svg>
          <span className="text-[10px] font-bold text-white/55 mt-0.5">30s</span>
        </button>

        <button
          onClick={togglePlay}
          className="w-[140px] h-[140px] rounded-full bg-gradient-to-br from-[#EA580C] to-[#F97316] flex items-center justify-center active:scale-90"
          style={{ boxShadow: "0 0 60px rgba(234,88,12,0.3)" }}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" className="w-14 h-14 fill-white"><rect x="6" y="5" width="4" height="14" rx="1.5" /><rect x="14" y="5" width="4" height="14" rx="1.5" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-14 h-14 fill-white ml-1.5"><polygon points="8,5 19,12 8,19" /></svg>
          )}
        </button>

        <button onClick={() => skipForward(30)} className="w-20 h-20 rounded-full bg-white/[0.08] flex flex-col items-center justify-center border border-white/[0.10] active:scale-[0.88] active:bg-white/[0.15]">
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white"><path d="M11.5 15.5V8.5L17 12l-5.5 3.5z" /><rect x="18" y="7" width="2" height="10" rx="0.5" /></svg>
          <span className="text-[10px] font-bold text-white/55 mt-0.5">30s</span>
        </button>
      </div>
    </div>
  );
}
