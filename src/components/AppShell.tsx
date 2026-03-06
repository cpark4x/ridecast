"use client";

import { useState, useCallback } from "react";
import { BottomNav } from "./BottomNav";
import { HomeScreen } from "./HomeScreen";
import { UploadScreen } from "./UploadScreen";
import { ProcessingScreen } from "./ProcessingScreen";
import { LibraryScreen } from "./LibraryScreen";
import { PlayerBar } from "./PlayerBar";
import { ExpandedPlayer } from "./ExpandedPlayer";
import { CarMode } from "./CarMode";
import { SettingsScreen } from "./SettingsScreen";
import { usePlayer } from "./PlayerContext";

export function AppShell() {
  const [activeTab, setActiveTab] = useState("home");
  const [processing, setProcessing] = useState<{ contentId: string; targetMinutes: number } | null>(null);
  const [showExpandedPlayer, setShowExpandedPlayer] = useState(false);
  const [showCarMode, setShowCarMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
      {/* Home Screen */}
      <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "home" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}
        style={{ bottom: hasPlayerBar ? "130px" : "64px" }}>
        <HomeScreen visible={activeTab === "home"} onUpload={() => setActiveTab("upload")} />
      </div>

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
        <LibraryScreen visible={activeTab === "library"} />
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

      {/* Settings Gear Button — visible on all tabs except processing/expanded overlays */}
      {!showExpandedPlayer && !showCarMode && activeTab !== "processing" && (
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/10 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white/55 fill-none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      )}

      {/* Settings Screen Overlay */}
      {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
    </div>
  );
}
