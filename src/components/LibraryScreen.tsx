"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDuration } from "@/lib/utils/duration";
import { usePlayer } from "./PlayerContext";

interface LibraryItem {
  id: string;
  title: string;
  sourceType: string;
  createdAt: string;
  status: string;
  format: string | null;
  durationSecs: number | null;
  audioId: string | null;
  audioUrl: string | null;
}

const gradients = [
  "from-indigo-500 to-violet-500",
  "from-pink-500 to-rose-500",
  "from-teal-500 to-cyan-500",
  "from-amber-500 to-red-500",
];

const sourceIcons: Record<string, string> = {
  pdf: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
  epub: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  url: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
  txt: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z",
};

interface LibraryScreenProps {
  /** When true the screen is the active tab — triggers a data refresh. */
  visible?: boolean;
}

export function LibraryScreen({ visible }: LibraryScreenProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { play } = usePlayer();

  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      setItems(data);
    } catch {
      console.error("Failed to load library");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and re-fetch whenever the tab becomes visible.
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary, visible]);

  function handlePlay(item: LibraryItem) {
    if (item.status !== "ready" || !item.audioUrl || !item.audioId) return;
    play({
      id: item.audioId,
      title: item.title,
      duration: item.durationSecs ?? 0,
      format: item.format ?? "narrator",
      audioUrl: item.audioUrl,
    });
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight">Library</h1>
        <span className="text-[13px] text-white/55">{items.length} episode{items.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="text-center text-white/30 py-20">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-white/30 fill-none mx-auto mb-5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <h3 className="text-lg font-bold mb-1.5">No episodes yet</h3>
          <p className="text-sm text-white/55">Upload content to create your first audio episode.</p>
        </div>
      ) : (
        <div>
          {items.map((item, i) => (
            <div
              key={item.id}
              data-testid="library-item"
              onClick={() => handlePlay(item)}
              className="flex items-center gap-3.5 p-4 mb-2.5 rounded-[14px] bg-white/[0.06] border border-white/[0.08] cursor-pointer transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <div className={`w-[52px] h-[52px] rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center shrink-0`}>
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white opacity-85">
                  <path d={sourceIcons[item.sourceType] || sourceIcons.txt} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate mb-0.5">{item.title}</div>
                <div className="text-xs text-white/55 flex items-center gap-2">
                  <span className="uppercase">{item.sourceType}</span>
                  <span>&middot;</span>
                  <span>{timeAgo(item.createdAt)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {item.durationSecs && (
                  <span className="text-[13px] font-semibold text-white/55">{formatDuration(item.durationSecs)}</span>
                )}
                {item.status === "ready" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-green-500/15 text-green-500">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500">
                    Processing
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
