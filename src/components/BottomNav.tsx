"use client";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFabClick: () => void;
}

const tabs = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Library",
    icon: (
      <svg viewBox="0 0 24 24" className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="4" height="16" rx="1.5" />
        <rect x="10" y="4" width="4" height="16" rx="1.5" />
        <rect x="17" y="4" width="4" height="16" rx="1.5" />
      </svg>
    ),
  },
];

export function BottomNav({ activeTab, onTabChange, onFabClick }: BottomNavProps) {
  return (
    <>
      <nav
        className="relative w-full h-16 flex items-center justify-around border-t border-black/[0.07] z-50 pb-[env(safe-area-inset-bottom)]"
        style={{ background: "linear-gradient(to top, rgba(247,246,243,0.98) 60%, rgba(247,246,243,0.85))", backdropFilter: "blur(20px)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors select-none ${
              activeTab === tab.id ? "text-[var(--accent-text)]" : "text-[var(--text-dim)]"
            }`}
          >
            {tab.icon}
            <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Floating Action Button — Upload */}
      <button
        onClick={onFabClick}
        aria-label="Upload content"
        className="absolute bottom-[56px] right-5 z-[51] w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center shadow-[0_2px_8px_rgba(234,88,12,0.35),0_6px_20px_rgba(234,88,12,0.20)] border-2 border-white/25 active:scale-95 transition-transform"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </>
  );
}
