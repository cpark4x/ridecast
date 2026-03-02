"use client";

import { useState, useCallback } from "react";
import { BottomNav } from "./BottomNav";
import { UploadScreen } from "./UploadScreen";
import { ProcessingScreen } from "./ProcessingScreen";
import { LibraryScreen } from "./LibraryScreen";
import { PlayerBar } from "./PlayerBar";
import { ExpandedPlayer } from "./ExpandedPlayer";
import { CarMode } from "./CarMode";
import { usePlayer } from "./PlayerContext";

export function AppShell() {
  const [activeTab, setActiveTab] = useState("upload");
  const [processing, setProcessing] = useState<{ contentId: string; targetMinutes: number } | null>(null);
  const [showExpandedPlayer, setShowExpandedPlayer] = useState(false);
  const [showCarMode, setShowCarMode] = useState(false);
  const { currentItem } = usePlayer();

  const handleProcess = useCallback((contentId: string, targetMinutes: number) => {
    setProcessing({ contentId, targetMinutes });
    setActiveTab("processing");
  }, []);

  const handleProcessComplete = useCallback(() => {
    setProcessing(null);
    setActiveTab("library");
  }, []);

  const hasPlayerBar = !!currentItem && !showExpandedPlayer && !showCarMode;

  return (
    <div className="max-w-[430px] w-full mx-auto h-[100dvh] relative overflow-hidden bg-[#0a0a0f] border-l border-r border-white/[0.08]">
      {/* Upload Screen */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "upload" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: hasPlayerBar ? "130px" : "64px" }}>
        <UploadScreen onProcess={handleProcess} />
      </div>

      {/* Processing Screen */}
      <div className={`absolute inset-0 overflow-hidden transition-all duration-300 ${activeTab === "processing" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: "64px" }}>
        {processing && (
          <ProcessingScreen
            contentId={processing.contentId}
            targetMinutes={processing.targetMinutes}
            onComplete={handleProcessComplete}
          />
        )}
      </div>

      {/* Library Screen */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "library" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: hasPlayerBar ? "130px" : "64px" }}>
        <LibraryScreen />
      </div>

      {/* Player Tab (empty state) */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "player" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: hasPlayerBar ? "130px" : "64px" }}>
        {currentItem ? (
          <div className="p-6 text-center pt-8">
            <p className="text-white/55">Tap the player bar to expand</p>
          </div>
        ) : (
          <div className="p-6 text-center pt-16">
            <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-white/30 fill-none mx-auto mb-5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
            <h3 className="text-lg font-bold mb-1.5">Nothing playing</h3>
            <p className="text-sm text-white/55">Pick something from your library<br />and it&apos;ll appear here.</p>
          </div>
        )}
      </div>

      {/* Player Bar */}
      {hasPlayerBar && (
        <PlayerBar onExpand={() => setShowExpandedPlayer(true)} />
      )}

      {/* Bottom Nav */}
      {!showExpandedPlayer && !showCarMode && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Expanded Player Overlay */}
      {showExpandedPlayer && (
        <ExpandedPlayer
          onClose={() => setShowExpandedPlayer(false)}
          onCarMode={() => { setShowExpandedPlayer(false); setShowCarMode(true); }}
        />
      )}

      {/* Car Mode Overlay */}
      {showCarMode && (
        <CarMode onExit={() => { setShowCarMode(false); setShowExpandedPlayer(true); }} />
      )}
    </div>
  );
}
