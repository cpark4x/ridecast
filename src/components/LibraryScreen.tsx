"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDuration } from "@/lib/utils/duration";
import { gradients, sourceIcons, timeAgo } from "@/lib/ui/content-display";
import { usePlayer } from "./PlayerContext";

interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  completed: boolean;
  position: number;
  createdAt: string;
  summary?: string | null;
  contentType?: string | null;
  themes?: string[];
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

interface LibraryScreenProps {
  /** When true the screen is the active tab — triggers a data refresh. */
  visible?: boolean;
}

export function LibraryScreen({ visible }: LibraryScreenProps) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { play } = usePlayer();

  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
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

  function handlePlay(item: LibraryItem, version: AudioVersion) {
    if (version.status !== "ready" || !version.audioUrl || !version.audioId) return;
    play({
      id: version.audioId,
      title: item.title,
      duration: version.durationSecs ?? 0,
      format: version.format ?? "narrator",
      audioUrl: version.audioUrl,
      author: item.author ?? null,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl ?? null,
      targetDuration: version.targetDuration,
      wordCount: item.wordCount,
      summary: version.summary ?? null,
      contentType: version.contentType ?? null,
      themes: version.themes ?? [],
      compressionRatio: version.compressionRatio ?? null,
      voices: version.voices ?? [],
      ttsProvider: version.ttsProvider ?? null,
      createdAt: version.createdAt,
    });
  }

  /** Derived: the first ready version (or first version overall) for inline display */
  function primaryVersion(versions: AudioVersion[]): AudioVersion | undefined {
    return versions.find((v) => v.status === "ready") ?? versions[0];
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight">Library</h1>
        <span className="text-[13px] text-[var(--text-mid)]">{items.length} episode{items.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="text-center text-[var(--text-dim)] py-20">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-[var(--text-dim)] fill-none mx-auto mb-5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <h3 className="text-lg font-bold mb-1.5">No episodes yet</h3>
          <p className="text-sm text-[var(--text-mid)]">Upload content to create your first audio episode.</p>
        </div>
      ) : (
        <div>
          {items.map((item, i) => {
            const versions = item.versions ?? [];
            const pv = primaryVersion(versions);
            const hasMultiple = versions.length > 1;
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id} className="mb-2.5">
                {/* Main card row */}
                <div
                  data-testid="library-item"
                  onClick={() => {
                    if (hasMultiple) {
                      setExpandedId(isExpanded ? null : item.id);
                    } else if (pv) {
                      handlePlay(item, pv);
                    }
                  }}
                  className="flex items-center gap-3.5 p-4 rounded-[14px] bg-[var(--surface)] border border-black/[0.07] cursor-pointer transition-all hover:bg-[var(--surface-2)] active:scale-[0.98]"
                >
                  <div className={`w-[52px] h-[52px] rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center shrink-0`}>
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white opacity-85">
                      <path d={sourceIcons[item.sourceType] || sourceIcons.txt} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate mb-0.5">{item.title}</div>
                    <div className="text-xs text-[var(--text-mid)] flex items-center gap-2 flex-wrap">
                      {item.author && <><span>{item.author}</span><span>&middot;</span></>}
                      <span className="uppercase">{item.sourceType}</span>
                      <span>&middot;</span>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {versions.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--amber-dim)] text-[var(--amber)]">
                        Processing
                      </span>
                    ) : pv?.status === "ready" ? (
                      <>
                        {pv.durationSecs && (
                          <span className="text-[13px] font-semibold text-[var(--text-mid)]">{formatDuration(pv.durationSecs)}</span>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--green-dim)] text-[var(--green)]">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>
                          {hasMultiple ? `${versions.length} versions` : "Ready"}
                        </span>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--amber-dim)] text-[var(--amber)]">
                        Generating
                      </span>
                    )}
                    {/* Chevron for expandable */}
                    {hasMultiple && (
                      <svg
                        viewBox="0 0 24 24"
                        className={`w-4 h-4 stroke-[var(--text-dim)] fill-none transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Expanded version rows */}
                {isExpanded && (
                  <div className="mt-1 ml-4 border-l border-black/[0.07] pl-3">
                    {versions.map((version) => (
                      <div
                        key={version.scriptId}
                        onClick={() => handlePlay(item, version)}
                        className={`flex items-center gap-3 p-3 mb-1 rounded-[10px] transition-all ${
                          version.status === "ready"
                            ? "bg-[var(--surface)] hover:bg-[var(--surface-2)] cursor-pointer active:scale-[0.98]"
                            : "bg-[var(--surface-2)] cursor-default opacity-60"
                        }`}
                      >
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-semibold text-[var(--text)]">
                            {version.targetDuration} min
                          </span>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/[0.06] text-[var(--text-mid)]">
                            {version.format === "conversation" ? "Chat" : "Narrator"}
                          </span>
                          {version.durationSecs && (
                            <span className="text-[11px] text-[var(--text-dim)]">{formatDuration(version.durationSecs)}</span>
                          )}
                        </div>
                        <div className="shrink-0">
                          {version.status === "ready" ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--green-dim)] text-[var(--green)]">
                              <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>
                              Play
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--amber-dim)] text-[var(--amber)]">
                              Generating
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
