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
import { PocketImportScreen } from "./PocketImportScreen";

export function AppShell() {
  const [activeTab, setActiveTab] = useState("home");
  const [processing, setProcessing] = useState<{ contentId: string; targetMinutes: number } | null>(null);
  const [showExpandedPlayer, setShowExpandedPlayer] = useState(false);
  const [showCarMode, setShowCarMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { currentItem } = usePlayer();

  const handleProcess = useCallback((contentId: string, targetMinutes: number) => {
    setProcessing({ contentId, targetMinutes });
    setShowUploadModal(false);
    setActiveTab("processing");
  }, []);

  const handleProcessComplete = useCallback(() => {
    setProcessing(null);
    setActiveTab("library");
  }, []);

  const hasPlayerBar = !!currentItem && !showExpandedPlayer && !showCarMode;

  return (
    <div className="max-w-[430px] w-full mx-auto h-[100dvh] relative overflow-hidden bg-[var(--bg)] border-l border-r border-black/[0.07] flex flex-col">
      {/* ── Scrollable content area ── all screen tabs live inside here so they
           can never bleed over the PlayerBar / BottomNav chrome below */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {/* Home Screen */}
        <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-y-none transition-all duration-300 ${activeTab === "home" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
          <HomeScreen visible={activeTab === "home"} onUpload={() => setShowUploadModal(true)} />
        </div>

        {/* Processing Screen */}
        <div className={`absolute inset-0 overflow-hidden transition-all duration-300 ${activeTab === "processing" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
          {processing && (
            <ProcessingScreen
              contentId={processing.contentId}
              targetMinutes={processing.targetMinutes}
              onComplete={handleProcessComplete}
            />
          )}
        </div>

        {/* Library Screen */}
        <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-y-none transition-all duration-300 ${activeTab === "library" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
          <LibraryScreen visible={activeTab === "library"} />
        </div>

        {/* Pocket Import Screen */}
        <div className={`absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-y-none transition-all duration-300 ${activeTab === "pocket-import" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
          <PocketImportScreen onComplete={() => setActiveTab("library")} />
        </div>

        {/* Upload Modal Overlay — scoped inside content area */}
        {showUploadModal && (
          <div className="absolute inset-0 z-[60] flex flex-col">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowUploadModal(false)} />
            <div className="relative mt-auto bg-[var(--bg)] rounded-t-[20px] max-h-[90%] overflow-y-auto animate-[slideUp_0.3s_ease]">
              <div className="flex items-center justify-between p-4 pb-0">
                <h2 className="text-lg font-bold">Add Content</h2>
                <button onClick={() => setShowUploadModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)]">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--text-mid)] fill-none" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              <UploadScreen onProcess={handleProcess} onImportPocket={() => { setShowUploadModal(false); setActiveTab("pocket-import"); }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Chrome: PlayerBar then BottomNav ── these are in-flow flex children
           so they are always outside the scrollable area and never scroll away */}
      {hasPlayerBar && (
        <PlayerBar onExpand={() => setShowExpandedPlayer(true)} />
      )}

      {!showExpandedPlayer && !showCarMode && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onFabClick={() => setShowUploadModal(true)} />
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
          className="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-[var(--surface-2)] border border-black/[0.07] hover:bg-[var(--surface-2)]/70 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[var(--text-mid)] fill-none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
