"use client";

import { useState } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <div className="max-w-[430px] w-full mx-auto h-[100dvh] relative overflow-hidden bg-[#0a0a0f] border-l border-r border-white/[0.08]">
      {/* Upload Screen */}
      <div className={`absolute inset-0 bottom-16 overflow-y-auto overflow-x-hidden transition-all duration-300 ${activeTab === "upload" ? "opacity-100 translate-y-0 pointer-events-auto z-10" : "opacity-0 translate-y-3 pointer-events-none z-0"}`}>
        <div className="p-6">
          <div className="text-center pt-4 mb-8">
            <div className="flex items-center justify-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><circle cx="12" cy="12" r="9" opacity="0.3" /><polygon points="10,8 16,12 10,16" /></svg>
              </div>
              <span className="text-[22px] font-extrabold tracking-tight bg-gradient-to-br from-white to-white/55 bg-clip-text text-transparent">Ridecast 2</span>
            </div>
            <p className="text-sm text-white/55">Turn anything into audio for your commute</p>
          </div>
          <p className="text-white/30 text-center">Upload screen content will go here</p>
        </div>
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
