"use client";

import { useEffect, useState } from "react";
import { useCommuteDuration } from "@/hooks/useCommuteDuration";
import { usePlayer } from "./PlayerContext";
import { formatDuration } from "@/lib/utils/duration";

interface ReadyEpisode {
  contentId: string;
  title: string;
  audioId: string;
  audioUrl: string;
  durationSecs: number;
  targetDuration: number;
  format: string;
}

interface HomeScreenProps {
  visible: boolean;
  onUpload: () => void;
}

export function HomeScreen({ visible, onUpload }: HomeScreenProps) {
  // null = not yet fetched (shows Loading...), [] = fetched but empty, [...] = has episodes
  const [queue, setQueue] = useState<ReadyEpisode[] | null>(null);
  const { commuteDuration } = useCommuteDuration();
  const { play } = usePlayer();

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    fetch("/api/library")
      .then((r) => r.json())
      .then((items) => {
        if (cancelled) return;
        // Flatten all ready versions into a queue
        const ready: ReadyEpisode[] = [];
        for (const item of items) {
          for (const v of item.versions ?? []) {
            if (v.status === "ready" && v.audioId && v.audioUrl) {
              ready.push({
                contentId: item.id,
                title: item.title,
                audioId: v.audioId,
                audioUrl: v.audioUrl,
                durationSecs: v.durationSecs ?? 0,
                targetDuration: v.targetDuration,
                format: v.format,
              });
            }
          }
        }
        setQueue(ready);
      })
      .catch(() => { if (!cancelled) setQueue([]); });

    return () => { cancelled = true; };
  }, [visible]);

  // null means the first fetch hasn't completed yet
  const loading = queue === null;
  const episodes = queue ?? [];

  const totalQueueSecs = episodes.reduce((s, ep) => s + ep.durationSecs, 0);
  const commuteSecs = commuteDuration * 60;
  const fitsCommute = episodes.filter((ep) => ep.durationSecs <= commuteSecs);

  function playAll() {
    if (fitsCommute.length > 0) {
      play({
        id: fitsCommute[0].audioId,
        title: fitsCommute[0].title,
        duration: fitsCommute[0].durationSecs,
        format: fitsCommute[0].format,
        audioUrl: fitsCommute[0].audioUrl,
      });
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-[var(--text-dim)] pt-16">Loading...</div>;
  }

  if (episodes.length === 0) {
    return (
      <div className="p-6 pt-12 flex flex-col items-center text-center gap-4">
        <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-[var(--text-dim)] fill-none" strokeWidth="1">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <h2 className="text-xl font-bold">Nothing queued</h2>
        <p className="text-sm text-[var(--text-mid)]">Upload an article or PDF to generate your first episode.</p>
        <button
          onClick={onUpload}
          className="mt-2 px-6 py-3 rounded-[12px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-sm font-semibold text-white"
        >
          Upload Content
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 pt-6">
      {/* Commute summary */}
      <div className="mb-5">
        <h1 className="text-[26px] font-extrabold tracking-tight mb-1">Your Queue</h1>
        <p className="text-sm text-[var(--text-mid)]">
          {episodes.length} episode{episodes.length !== 1 ? "s" : ""} · {formatDuration(totalQueueSecs)} total
          {" · "}Your commute: <span className="text-[#18181A] font-semibold">{commuteDuration} min</span>
        </p>
      </div>

      {/* Start Commute button */}
      {fitsCommute.length > 0 && (
        <button
          onClick={playAll}
          className="w-full py-4 rounded-[14px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-[15px] font-semibold text-white mb-6 shadow-[0_4px_20px_rgba(234,88,12,0.35)] flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><polygon points="8,5 19,12 8,19" /></svg>
          Start Commute
        </button>
      )}

      {/* Episode list */}
      <div className="flex flex-col gap-2.5">
        {episodes.map((ep) => (
          <div
            key={ep.audioId}
            onClick={() =>
              play({
                id: ep.audioId,
                title: ep.title,
                duration: ep.durationSecs,
                format: ep.format,
                audioUrl: ep.audioUrl,
              })
            }
            className="flex items-center gap-3.5 p-4 rounded-[14px] bg-white border border-black/[0.07] cursor-pointer hover:bg-[var(--surface-2)] active:scale-[0.98] transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#EA580C]/20 to-[#F97316]/15 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#EA580C]/70"><polygon points="8,5 19,12 8,19" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{ep.title}</div>
              <div className="text-xs text-[var(--text-mid)] mt-0.5">{ep.format} · {ep.targetDuration} min target</div>
            </div>
            <span className="text-[13px] font-semibold text-[var(--text-mid)] shrink-0">{formatDuration(ep.durationSecs)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
