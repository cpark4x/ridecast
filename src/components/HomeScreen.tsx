"use client";

import { useEffect, useState } from "react";
import { usePlayer, PlayableItem } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";
import { getGradient, sourceIcons, timeAgo, getTitleFallback } from "@/lib/ui/content-display";

interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  createdAt: string;
  completed: boolean;
  position: number;
  // Extended fields (optional — populated when API returns them)
  contentType?: string | null;
  themes?: string[];
  summary?: string | null;
  compressionRatio?: number | null;
  actualWordCount?: number | null;
  voices?: string[];
  ttsProvider?: string | null;
}

interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}

interface HomeScreenProps {
  visible: boolean;
  onUpload: () => void;
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function HomeScreen({ visible, onUpload }: HomeScreenProps) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const { play, playQueue, currentItem, isPlaying, position, togglePlay } = usePlayer();

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    fetch("/api/library")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  // Build unlistened list: filter to items with at least one non-completed ready version
  // Pick first non-completed ready version per item
  const unlistened = (items ?? [])
    .map((item) => {
      const readyVersions = item.versions.filter(
        (v) => v.status === "ready" && v.audioId && v.audioUrl,
      );
      if (readyVersions.length > 0 && readyVersions.every((v) => v.completed)) return null;
      const version = readyVersions.find((v) => !v.completed) ?? readyVersions[0];
      return version ? { ...item, version } : null;
    })
    .filter(Boolean) as (LibraryItem & { version: AudioVersion })[];

  const totalMins = Math.round(
    unlistened.reduce((s, ep) => s + (ep.version.durationSecs ?? 0), 0) / 60,
  );

  function toPlayableItem(ep: LibraryItem & { version: AudioVersion }): PlayableItem {
    const displayTitle = getTitleFallback(ep.title, ep.sourceUrl, ep.sourceType, ep.createdAt);
    return {
      id: ep.version.audioId!,
      title: displayTitle,
      duration: ep.version.durationSecs ?? 0,
      format: ep.version.format,
      audioUrl: ep.version.audioUrl!,
      author: ep.author ?? null,
      sourceType: ep.sourceType,
      sourceUrl: ep.sourceUrl ?? null,
      contentType: ep.version.contentType ?? null,
      themes: ep.version.themes ?? [],
      summary: ep.version.summary ?? null,
      targetDuration: ep.version.targetDuration,
      wordCount: ep.wordCount,
      compressionRatio: ep.version.compressionRatio ?? null,
      voices: ep.version.voices ?? [],
      ttsProvider: ep.version.ttsProvider ?? null,
      createdAt: ep.version.createdAt,
    };
  }

  function handlePlayAll() {
    playQueue(unlistened.map(toPlayableItem));
  }

  if (items === null) return <div className="p-6 text-center pt-16">Loading...</div>;

  if (unlistened.length === 0)
    return (
      <div className="p-6 pt-12 flex flex-col items-center text-center gap-4">
        <svg
          viewBox="0 0 24 24"
          className="w-16 h-16 stroke-[var(--text-dim)] fill-none"
          strokeWidth="1"
        >
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        <h2 className="text-xl font-bold">Nothing queued</h2>
        <p className="text-sm text-[var(--text-mid)]">
          Upload an article or PDF to generate your first episode.
        </p>
        <button
          onClick={onUpload}
          className="mt-2 px-6 py-3 rounded-[12px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-sm font-semibold text-white"
        >
          Upload Content
        </button>
      </div>
    );

  return (
    <div className="pb-6">
      {/* HEADER */}
      <div className="px-5 pt-6 pb-1 flex items-start justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight">{getGreeting()}</h1>
          <p className="text-sm text-[var(--text-mid)] mt-1">
            {totalMins} min &middot; {unlistened.length} episode
            {unlistened.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* PLAY ALL */}
      <div className="px-5 pt-4 pb-1">
        <button
          onClick={handlePlayAll}
          className="w-full py-4 rounded-[16px] bg-[var(--accent)] text-[17px] font-semibold text-white flex items-center justify-center gap-2.5 shadow-[0_4px_16px_rgba(234,88,12,0.28)] active:scale-[0.98] transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <polygon points="8,5 19,12 8,19" />
          </svg>
          Play All
        </button>
      </div>

      {/* NOW PLAYING — shown when currentItem is active */}
      {currentItem && (
        <div className="mx-5 mt-5 bg-[var(--surface)] rounded-[var(--radius)] p-3.5 border border-black/[0.06] relative">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="text-[11px] font-semibold text-[var(--accent)]">Playing</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EA580C] to-[#F97316] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white opacity-85">
                <path d={sourceIcons[currentItem.sourceType ?? "txt"] || sourceIcons.txt} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-snug line-clamp-1">
                {currentItem.title}
              </div>
              <div className="text-[11px] text-[var(--text-mid)] mt-0.5">
                {currentItem.duration > 0 && formatDuration(currentItem.duration)}
              </div>
            </div>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0"
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <rect x="7" y="6" width="3.5" height="12" rx="1" />
                  <rect x="13.5" y="6" width="3.5" height="12" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <polygon points="9,6 18,12 9,18" />
                </svg>
              )}
            </button>
          </div>
          {currentItem.duration > 0 && (
            <div className="mt-2.5 w-full h-[2px] bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--accent)] to-[#FB923C]"
                style={{
                  width: `${Math.min(100, (position / currentItem.duration) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* UP NEXT */}
      <div className="px-5 pt-5 pb-2.5 flex items-center gap-2">
        <h2 className="text-base font-bold">Up Next</h2>
        <span className="text-[11px] font-semibold bg-[var(--surface-2)] rounded-full px-2 py-0.5">
          Recent
        </span>
      </div>

      <div className="px-5 flex flex-col gap-2">
        {unlistened.map((ep, i) => {
          const v = ep.version;
          const displayTitle = getTitleFallback(
            ep.title,
            ep.sourceUrl,
            ep.sourceType,
            ep.createdAt,
          );
          const progressPct =
            v.durationSecs && v.position > 0
              ? Math.min(100, (v.position / v.durationSecs) * 100)
              : 0;
          return (
            <div
              key={ep.id}
              onClick={() => play(toPlayableItem(ep))}
              className="flex items-center gap-3 p-3 rounded-[var(--radius)] bg-[var(--surface)] border border-black/[0.05] cursor-pointer active:scale-[0.98]"
            >
              <div
                className={`w-11 h-11 rounded-[9px] bg-gradient-to-br ${getGradient(i)} flex items-center justify-center shrink-0`}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white opacity-85">
                  <path d={sourceIcons[ep.sourceType] || sourceIcons.txt} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold leading-snug line-clamp-2">
                  {displayTitle}
                </div>
                <div className="text-[11px] text-[var(--text-mid)] mt-0.5">
                  <span className="font-semibold">{ep.sourceType.toUpperCase()}</span>
                  <span className="mx-1.5">&middot;</span>
                  <span>{timeAgo(ep.createdAt)}</span>
                </div>
                {progressPct > 0 && (
                  <div className="mt-1.5 w-full h-[2px] bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--accent)] to-[#FB923C]"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-[var(--text-mid)] bg-[var(--surface-2)] rounded-[7px] px-2 py-1 shrink-0">
                {formatDuration(v.durationSecs ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
