"use client";

import { useState } from "react";
import { BottomNav } from "./BottomNav";
import { UploadScreen } from "./UploadScreen";

export function AppShell() {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <div className="max-w-[430px] w-full mx-auto h-[100dvh] relative overflow-hidden bg-[#0a0a0f] border-l border-r border-white/[0.08]">
      {/* Upload Screen */}
      <div className={`absolute inset-0 bottom-16 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "upload" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
        <UploadScreen onProcess={(contentId, targetMinutes) => {
          console.log("Process:", contentId, targetMinutes);
          setActiveTab("library");
        }} />
      </div>

      {/* Library Screen */}
      <div className={`absolute inset-0 bottom-16 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "library" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
        <div className="p-6">
          <h1 className="text-[26px] font-extrabold tracking-tight">My Episodes</h1>
          <p className="text-white/30 mt-4">Library content will go here</p>
        </div>
      </div>

      {/* Player Screen */}
      <div className={`absolute inset-0 bottom-16 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "player" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
        <div className="p-6 text-center pt-16">
          <svg viewBox="0 0 24 24" className="w-16 h-16 stroke-white/30 fill-none mx-auto mb-5" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
          <h3 className="text-lg font-bold mb-1.5">Nothing playing</h3>
          <p className="text-sm text-white/55">Pick something from your library<br />and it&apos;ll appear here.</p>
        </div>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
