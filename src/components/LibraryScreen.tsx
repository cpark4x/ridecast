"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDuration } from "@/lib/utils/duration";
import { usePlayer } from "./PlayerContext";
import {
  getGradient,
  sourceIcons,
  timeAgo,
  getTitleFallback,
} from "@/lib/ui/content-display";
import {
  getCardProgress,
  getVersionProgress,
  isItemPlayed,
} from "@/lib/ui/library-progress";
import { useLibraryFilter, type FilterChip } from "@/hooks/useLibraryFilter";
import { ProcessNewVersionModal } from "./ProcessNewVersionModal";

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

const CHIPS: { id: FilterChip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unplayed", label: "Unplayed" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "generating", label: "Generating" },
];

const FILTER_EMPTY: Record<FilterChip, string> = {
  all: "Your library is empty",
  unplayed: "No unplayed content",
  "in-progress": "Nothing in progress",
  completed: "No completed content",
  generating: "Nothing generating",
};

export function LibraryScreen({ visible }: LibraryScreenProps) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processModalContentId, setProcessModalContentId] = useState<
    string | null
  >(null);
  const [processModalTitle, setProcessModalTitle] = useState("");
  const { play } = usePlayer();

  // Coerce null/undefined versions to [] for each item (defensive against API)
  const safeItems = (items ?? []).map((item) => ({
    ...item,
    versions: Array.isArray(item.versions) ? item.versions : [],
  }));

  const { query, setQuery, activeFilter, setActiveFilter, filtered } =
    useLibraryFilter(safeItems);

  const loadLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/library");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (visible) loadLibrary();
  }, [visible, loadLibrary]);

  // Loading state — all hooks have been called above
  if (items === null) {
    return (
      <div className="p-6 pt-16 text-center text-[var(--text-dim)]">
        Loading...
      </div>
    );
  }

  const isEmpty = filtered.length === 0;
  const emptyMsg = query.trim()
    ? `No results for "${query}"`
    : FILTER_EMPTY[activeFilter];

  function handlePlay(item: LibraryItem, version: AudioVersion) {
    if (version.status !== "ready" || !version.audioUrl || !version.audioId)
      return;
    play({
      id: version.audioId,
      title: getTitleFallback(
        item.title,
        item.sourceUrl,
        item.sourceType,
        item.createdAt,
      ),
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

  function handleCardTap(item: (typeof safeItems)[number]) {
    const versions = item.versions;
    const hasMultiple = versions.length > 1;
    if (hasMultiple) {
      setExpandedId(expandedId === item.id ? null : item.id);
    } else {
      const pv =
        versions.find((v) => v.status === "ready") ?? versions[0];
      if (pv) handlePlay(item, pv);
    }
  }

  return (
    <div className="p-5 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[26px] font-extrabold tracking-tight">Library</h1>
        <span className="text-[13px] text-[var(--text-mid)]">
          {safeItems.length} item{safeItems.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <svg
          viewBox="0 0 24 24"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 stroke-[var(--text-dim)] fill-none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Search by title or author\u2026"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface)] border border-black/[0.07] text-sm placeholder:text-[var(--text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => setActiveFilter(chip.id)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${
              activeFilter === chip.id
                ? "bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white shadow-[0_2px_8px_rgba(234,88,12,0.2)]"
                : "bg-[var(--surface)] text-[var(--text-mid)] border border-black/[0.07]"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isEmpty ? (
        <div className="text-center py-16">
          <svg
            viewBox="0 0 24 24"
            className="w-16 h-16 stroke-[var(--text-dim)] fill-none mx-auto mb-5"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <p className="text-base font-semibold mb-1.5">{emptyMsg}</p>
          {activeFilter === "all" && !query.trim() && (
            <p className="text-sm text-[var(--text-mid)]">
              Tap the <strong>+</strong> button to add content.
            </p>
          )}
        </div>
      ) : (
        <div>
          {filtered.map((item, i) => {
            const versions = item.versions;
            const isExpanded = expandedId === item.id;
            const played = isItemPlayed(versions);
            const cardProgress = getCardProgress(versions);
            const gradient = getGradient(i);
            const displayTitle = getTitleFallback(
              item.title,
              item.sourceUrl,
              item.sourceType,
              item.createdAt,
            );
            const primaryVersion =
              versions.find((v) => v.status === "ready") ?? versions[0];

            return (
              <div key={item.id} className="mb-2.5">
                {/* Main card */}
                <div
                  data-testid="library-item"
                  onClick={() => handleCardTap(item)}
                  className={`flex items-center gap-3.5 p-4 rounded-[14px] bg-[var(--surface)] border border-black/[0.07] cursor-pointer active:scale-[0.98] transition-all ${played ? "opacity-70" : ""} relative overflow-hidden`}
                >
                  {/* Gradient thumbnail */}
                  <div
                    className={`w-[52px] h-[52px] rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-6 h-6 fill-white opacity-85"
                    >
                      <path
                        d={sourceIcons[item.sourceType] ?? sourceIcons.txt}
                      />
                    </svg>
                  </div>

                  {/* Content info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate mb-0.5">
                      {displayTitle}
                    </div>
                    <div className="text-xs text-[var(--text-mid)] flex items-center gap-1.5 flex-wrap">
                      {item.author && (
                        <>
                          <span>{item.author}</span>
                          <span>&middot;</span>
                        </>
                      )}
                      <span className="uppercase">{item.sourceType}</span>
                      <span>&middot;</span>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {played ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--green-dim)] text-[var(--green)]">
                        &#10003; Played
                      </span>
                    ) : primaryVersion?.status === "generating" ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--amber-dim)] text-[var(--amber)]">
                        Generating
                      </span>
                    ) : versions.length === 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--amber-dim)] text-[var(--amber)]">
                        Processing
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--green-dim)] text-[var(--green)]">
                        {versions.length > 1
                          ? `${versions.length} versions`
                          : "Ready"}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5">
                      {versions.length > 1 && (
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
                      {/* Process new version — available on every card */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setProcessModalContentId(item.id);
                          setProcessModalTitle(displayTitle);
                        }}
                        aria-label="Process new version"
                        title="Process new version"
                        className="w-5 h-5 flex items-center justify-center rounded-full text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-3.5 h-3.5 stroke-current fill-none"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Card-level progress bar */}
                  {cardProgress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/[0.05] rounded-b-[14px]">
                      <div
                        className="h-full rounded-b-[14px] bg-gradient-to-r from-[var(--accent)] to-[#F97316]"
                        style={{
                          width: `${Math.round(cardProgress * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Expanded version rows */}
                {isExpanded && (
                  <div className="mt-1 ml-4 border-l-2 border-[var(--accent)]/20 pl-3">
                    {versions.map((version) => {
                      const vPct = Math.round(
                        getVersionProgress(version) * 100,
                      );
                      return (
                        <div
                          key={version.scriptId}
                          className={`flex items-center gap-3 p-3 mb-1 rounded-[10px] ${
                            version.status === "ready"
                              ? "bg-[var(--surface)] cursor-pointer active:scale-[0.98]"
                              : "bg-[var(--surface-2)] opacity-60"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[12px] font-semibold">
                                {version.targetDuration} min
                              </span>
                              {version.durationSecs != null &&
                                version.durationSecs > 0 && (
                                  <span className="text-[11px] text-[var(--text-dim)]">
                                    {formatDuration(version.durationSecs)}
                                  </span>
                                )}
                              {version.completed && (
                                <span className="text-[10px] font-semibold text-[var(--green)]">
                                  &#10003; Done
                                </span>
                              )}
                            </div>
                            {vPct > 0 && (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-black/[0.08] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--accent)] rounded-full"
                                    style={{ width: `${vPct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] tabular-nums">
                                  {vPct}%
                                </span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlay(item, version);
                            }}
                            aria-label="Play"
                            disabled={version.status !== "ready"}
                            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[var(--green-dim)] text-[var(--green)] disabled:opacity-40"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              className="w-4 h-4 fill-current"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                    <button
                      onClick={() => {
                        setProcessModalContentId(item.id);
                        setProcessModalTitle(displayTitle);
                      }}
                      className="w-full text-left px-3 py-2.5 text-[12px] font-semibold text-[var(--accent-text)]"
                    >
                      + Process new version
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Process New Version Modal */}
      {processModalContentId && (
        <ProcessNewVersionModal
          isOpen={true}
          contentId={processModalContentId}
          contentTitle={processModalTitle}
          onClose={() => setProcessModalContentId(null)}
          onVersionCreated={() => {
            setProcessModalContentId(null);
            loadLibrary();
          }}
        />
      )}
    </div>
  );
}
