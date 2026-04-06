"use client";

import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";
import { timeAgo } from "@/lib/ui/content-display";

// Content-type-specific gradients for the mini-player icon
const CONTENT_GRADIENTS: Record<string, [string, string]> = {
  science_article: ["#0D9488", "#14B8A6"],
  business_book: ["#EA580C", "#F97316"],
  technical_paper: ["#2563EB", "#3B82F6"],
  news_article: ["#DB2777", "#EC4899"],
  fiction: ["#7C3AED", "#8B5CF6"],
  biography: ["#065F46", "#059669"],
  self_help: ["#B45309", "#D97706"],
  educational: ["#1D4ED8", "#2563EB"],
};
const DEFAULT_GRADIENT: [string, string] = ["#EA580C", "#F97316"];

function getIconGradient(contentType?: string | null): [string, string] {
  if (!contentType) return DEFAULT_GRADIENT;
  return CONTENT_GRADIENTS[contentType] ?? DEFAULT_GRADIENT;
}

export function PlayerBar({ onExpand }: { onExpand: () => void }) {
  const { currentItem, isPlaying, position, togglePlay, skipForward } = usePlayer();
  if (!currentItem) return null;

  const progress = currentItem.duration > 0 ? (position / currentItem.duration) * 100 : 0;
  const [gradFrom, gradTo] = getIconGradient(currentItem.contentType);

  // Subtitle: sourceType·timeAgo preferred; falls back to format·duration.
  // Guard against rendering a raw duration number when duration is 0/unknown.
  const subtitle =
    currentItem.sourceType && currentItem.createdAt
      ? `${currentItem.sourceType} · ${timeAgo(currentItem.createdAt)}`
      : currentItem.duration > 0
        ? `${currentItem.format} · ${formatDuration(currentItem.duration)}`
        : currentItem.format ?? "";

  return (
    <div
      onClick={onExpand}
      data-testid="player-bar"
      className="relative mx-2 h-[58px] flex items-center gap-3 px-3 z-[60] cursor-pointer rounded-[14px] border border-[#EA580C]/20"
      style={{
        background: `linear-gradient(135deg, ${gradFrom}26, ${gradTo}1a)`,
        backdropFilter: "blur(24px)",
      }}
    >
      <div
        className="w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
      >
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white">
          <path
            d="M9 18V5l12-2v13"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="18" r="3" opacity="0.7" />
          <circle cx="18" cy="16" r="3" opacity="0.7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">{currentItem.title}</div>
        <div className="text-[11px] text-[var(--text-mid)] mt-px">{subtitle}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        className="w-[34px] h-[34px] rounded-full bg-white flex items-center justify-center shrink-0 transition-transform active:scale-[0.88]"
      >
        {isPlaying ? (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#18181A]">
            <rect x="7" y="6" width="3.5" height="12" rx="1" />
            <rect x="13.5" y="6" width="3.5" height="12" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#18181A]">
            <polygon points="9,6 18,12 9,18" />
          </svg>
        )}
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          skipForward(30);
        }}
        aria-label="Skip forward 30 seconds"
        className="w-[34px] h-[34px] flex flex-col items-center justify-center shrink-0 transition-transform active:scale-[0.88] relative"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[var(--text-mid)]">
          <path d="M11.5 15.5V8.5L17 12l-5.5 3.5z" />
          <rect x="18" y="7" width="2" height="10" rx="0.5" />
        </svg>
        <span className="absolute -bottom-3 text-[8px] font-semibold text-[var(--text-dim)]">
          30s
        </span>
      </button>
      <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-black/10 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm transition-[width] duration-300"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
          }}
        />
      </div>
    </div>
  );
}
