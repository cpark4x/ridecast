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
    <div className="absolute inset-0 z-[200] bg-[#0a0a0f] flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
        <button
          onClick={onClose}
          className="text-sm text-white/55 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <span className="text-sm font-semibold">Settings</span>
        <button
          onClick={handleSave}
          className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <div className="p-6 flex flex-col gap-6">
        <div>
          <h2 className="text-[13px] font-semibold text-white/55 uppercase tracking-wider mb-3">
            Voice Quality
          </h2>
          <div className="bg-white/[0.06] border border-white/[0.08] rounded-[14px] p-4">
            <div className="mb-3">
              <label className="text-sm font-semibold block mb-1">
                ElevenLabs API Key
              </label>
              <p className="text-xs text-white/55 mb-3">
                Optional. Enables best-in-class voice quality. Get a key at
                elevenlabs.io. Without this, episodes use OpenAI TTS voices.
              </p>
              <input
                type="password"
                value={elevenLabsKey}
                onChange={(e) => setElevenLabsKey(e.target.value)}
                placeholder="sk_..."
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-[10px] px-4 py-3 text-sm font-mono text-white placeholder-white/30 outline-none focus:border-indigo-500"
              />
            </div>
            {elevenLabsKey && (
              <p className="text-[11px] text-amber-400/70">
                Stored locally on this device. Never sent to any server except
                ElevenLabs.
              </p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[13px] font-semibold text-white/55 uppercase tracking-wider mb-3">
            About
          </h2>
          <div className="bg-white/[0.06] border border-white/[0.08] rounded-[14px] p-4">
            <p className="text-sm text-white/55">
              Ridecast2 — Turn anything you want to read into audio worth
              listening to.
            </p>
            <p className="text-xs text-white/30 mt-2">
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
