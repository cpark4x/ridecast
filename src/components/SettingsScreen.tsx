"use client";

import { useState } from "react";

const ELEVENLABS_KEY = "ridecast:elevenlabs-api-key";

function readStoredKey(): string {
  try {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(ELEVENLABS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [elevenLabsKey, setElevenLabsKey] = useState(() => readStoredKey());
  const [saved, setSaved] = useState(false);

  function handleSave() {
    try {
      if (elevenLabsKey.trim()) {
        localStorage.setItem(ELEVENLABS_KEY, elevenLabsKey.trim());
      } else {
        localStorage.removeItem(ELEVENLABS_KEY);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  }

  return (
    <div className="absolute inset-0 z-[200] bg-[var(--bg)] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.07]">
        <button
          onClick={onClose}
          className="text-sm text-[var(--text-mid)] hover:text-[#18181A] transition-colors"
        >
          Cancel
        </button>
        <span className="text-sm font-semibold">Settings</span>
        <button
          onClick={handleSave}
          className="text-sm font-semibold text-[#EA580C] hover:text-[#C2410C] transition-colors"
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <div className="p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-[13px] font-semibold text-[var(--text-mid)] uppercase tracking-wider mb-3">
            Voice Quality
          </h2>
          <div className="bg-white border border-black/[0.07] rounded-[14px] p-4">
            <div className="mb-3">
              <label className="text-sm font-semibold block mb-1">
                ElevenLabs API Key
              </label>
              <p className="text-xs text-[var(--text-mid)] mb-3">
                Optional. Enables best-in-class voice quality. Get a key at
                elevenlabs.io. Without this, episodes use OpenAI TTS voices.
              </p>
              <input
                type="password"
                value={elevenLabsKey}
                onChange={(e) => setElevenLabsKey(e.target.value)}
                placeholder="sk_..."
                className="w-full bg-[var(--surface-2)] border border-black/[0.07] rounded-[10px] px-4 py-3 text-sm font-mono text-[#18181A] placeholder-[var(--text-dim)] outline-none focus:border-[#EA580C]"
              />
            </div>
            {elevenLabsKey && (
              <p className="text-[11px] text-[var(--amber)]">
                Stored locally on this device. Never sent to any server except
                ElevenLabs.
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold text-[var(--text-mid)] uppercase tracking-wider mb-3">
            About
          </h2>
          <div className="bg-white border border-black/[0.07] rounded-[14px] p-4">
            <p className="text-sm text-[var(--text-mid)]">
              Ridecast2 — Turn anything you want to read into audio worth
              listening to.
            </p>
            <p className="text-xs text-[var(--text-dim)] mt-2">
              AI processing uses your own API keys (ANTHROPIC_API_KEY,
              OPENAI_API_KEY) configured at the server level.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for consuming the stored key in API calls
export function useElevenLabsKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ELEVENLABS_KEY);
  } catch {
    return null;
  }
}
