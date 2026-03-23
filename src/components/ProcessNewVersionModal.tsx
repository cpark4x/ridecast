"use client";

import { useState } from "react";

const PRESETS = [
  { minutes: 2, label: "Quick Take" },
  { minutes: 3, label: "Brief" },
  { minutes: 5, label: "Summary" },
  { minutes: 15, label: "Main Points" },
  { minutes: 30, label: "Deep Dive" },
];

interface ProcessNewVersionModalProps {
  isOpen: boolean;
  contentId: string;
  contentTitle: string;
  onClose: () => void;
  onVersionCreated: () => void;
}

export function ProcessNewVersionModal({
  isOpen,
  contentId,
  contentTitle,
  onClose,
  onVersionCreated,
}: ProcessNewVersionModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, targetMinutes: selectedMinutes }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate version");
      }
      onVersionCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="absolute inset-0 z-[70] flex flex-col">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mt-auto bg-[var(--bg)] rounded-t-[20px] pb-8">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-black/20 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="text-lg font-bold">New Version</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--surface-2)] active:scale-90"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 stroke-[var(--text-mid)] fill-none"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content title */}
        <div className="px-5 pb-4">
          <p className="text-sm text-[var(--text-mid)] mb-1">Content</p>
          <p className="text-sm font-semibold truncate">{contentTitle}</p>
        </div>

        {/* Duration presets */}
        <div className="px-5 pb-5">
          <p className="text-sm text-[var(--text-mid)] mb-3">Choose duration</p>
          <div className="flex gap-2 flex-wrap">
            {PRESETS.map((preset) => {
              const isSelected = selectedMinutes === preset.minutes;
              return (
                <button
                  key={preset.minutes}
                  onClick={() => setSelectedMinutes(preset.minutes)}
                  aria-label={`${preset.minutes} min`}
                  className={`px-4 py-2.5 rounded-[12px] text-sm font-semibold transition-all ${
                    isSelected
                      ? "bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white shadow-[0_2px_8px_rgba(234,88,12,0.25)]"
                      : "bg-[var(--surface-2)] text-[var(--text-mid)] border border-black/[0.07]"
                  }`}
                >
                  <span className="block text-xs opacity-70">{preset.label}</span>
                  <span>{preset.minutes} min</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 pb-3">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Generate button */}
        <div className="px-5">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3.5 rounded-[14px] bg-gradient-to-br from-[#EA580C] to-[#F97316] text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(234,88,12,0.28)]"
          >
            {isGenerating
              ? "Generating…"
              : `Generate ${selectedMinutes}-min Version`}
          </button>
        </div>
      </div>
    </div>
  );
}
