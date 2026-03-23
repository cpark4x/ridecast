# Feature: ElevenLabs API Key Settings Screen

> Let users enter their ElevenLabs API key through the app UI instead of editing a .env file, so the best voices are accessible without a developer setup.

## Motivation

ElevenLabs integration is built and routing is wired — but activating it requires editing `.env` and restarting the server. That's a developer workflow. A settings screen brings it to any user. The key is stored in localStorage and sent as a request header; the server reads it if present, falling back to the env var.

## Prerequisite

`elevenlabs-provider` and `elevenlabs-routing` specs must be implemented. Specifically `createTTSProvider()` must exist in `src/lib/tts/provider.ts`.

## Current State (confirmed in code)

`src/app/api/audio/generate/route.ts`: calls `createTTSProvider()` which reads `process.env.ELEVENLABS_API_KEY`.

`AppShell.tsx`: no settings access point exists.

## Changes

### 1. Update `createTTSProvider` to accept an optional key (`src/lib/tts/provider.ts`)

```typescript
// Before
export function createTTSProvider(): TTSProvider {
  if (process.env.ELEVENLABS_API_KEY) {
    return new ElevenLabsTTSProvider();
  }
  return new OpenAITTSProvider();
}

// After
export function createTTSProvider(elevenLabsKey?: string): TTSProvider {
  const key = elevenLabsKey || process.env.ELEVENLABS_API_KEY;
  if (key) {
    return new ElevenLabsTTSProvider(key);
  }
  return new OpenAITTSProvider();
}
```

Update `ElevenLabsTTSProvider` constructor to accept an optional key parameter:
```typescript
constructor(apiKey?: string) {
  this.client = new ElevenLabsClient({
    apiKey: apiKey || process.env.ELEVENLABS_API_KEY,
  });
}
```

### 2. Read user-provided key from request header (`src/app/api/audio/generate/route.ts`)

```typescript
// In the POST handler, before creating the provider:
const userElevenLabsKey = request.headers.get("x-elevenlabs-key") ?? undefined;
const provider = createTTSProvider(userElevenLabsKey);
```

### 3. New `SettingsScreen` component (`src/components/SettingsScreen.tsx`)

```typescript
"use client";

import { useState, useEffect } from "react";

const ELEVENLABS_KEY = "ridecast:elevenlabs-api-key";

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      setElevenLabsKey(localStorage.getItem(ELEVENLABS_KEY) ?? "");
    } catch {}
  }, []);

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
        <button onClick={onClose} className="text-sm text-white/55 hover:text-white transition-colors">
          Cancel
        </button>
        <span className="text-sm font-semibold">Settings</span>
        <button onClick={handleSave} className="text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors">
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
              <label className="text-sm font-semibold block mb-1">ElevenLabs API Key</label>
              <p className="text-xs text-white/55 mb-3">
                Optional. Enables best-in-class voice quality. Get a key at elevenlabs.io.
                Without this, episodes use OpenAI TTS voices.
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
                Stored locally on this device. Never sent to any server except ElevenLabs.
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
              Ridecast2 — Turn anything you want to read into audio worth listening to.
            </p>
            <p className="text-xs text-white/30 mt-2">
              AI processing uses your own API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY) configured at the server level.
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
```

### 4. Add settings access to `AppShell.tsx`

Add a gear icon to the top-right of the home/upload screen header area, and render `SettingsScreen` as an overlay:

```typescript
import { SettingsScreen } from "./SettingsScreen";

// In AppShell state:
const [showSettings, setShowSettings] = useState(false);

// Render SettingsScreen overlay:
{showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
```

Add a settings gear button visible in the app header (above the bottom nav area).

### 5. Send ElevenLabs key with generation requests (`src/components/ProcessingScreen.tsx`)

When calling `/api/audio/generate`, include the key header if present:

```typescript
import { useElevenLabsKey } from "./SettingsScreen";

// In the component:
const elevenLabsKey = useElevenLabsKey();

// In the fetch call:
const headers: HeadersInit = { "Content-Type": "application/json" };
if (elevenLabsKey) headers["x-elevenlabs-key"] = elevenLabsKey;

await fetch("/api/audio/generate", { method: "POST", headers, body: ... });
```

## Files to Modify

| File | Change |
|---|---|
| `src/lib/tts/provider.ts` | Accept optional key param, pass to ElevenLabsTTSProvider |
| `src/lib/tts/elevenlabs.ts` | Constructor accepts optional apiKey param |
| `src/app/api/audio/generate/route.ts` | Read `x-elevenlabs-key` header, pass to createTTSProvider |
| `src/components/SettingsScreen.tsx` | New file — settings UI + useElevenLabsKey hook |
| `src/components/AppShell.tsx` | Add settings gear button, render SettingsScreen overlay |
| `src/components/ProcessingScreen.tsx` | Send key header when generating audio |

## Tests

**File:** `src/components/SettingsScreen.test.tsx` (new)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsScreen, useElevenLabsKey } from "./SettingsScreen";
import { renderHook } from "@testing-library/react";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: () => { store = {}; },
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
});

describe("SettingsScreen", () => {
  it("saves ElevenLabs key to localStorage on Save", async () => {
    render(<SettingsScreen onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("sk_..."), { target: { value: "sk_test_key" } });
    fireEvent.click(screen.getByText("Save"));
    expect(localStorageMock.setItem).toHaveBeenCalledWith("ridecast:elevenlabs-api-key", "sk_test_key");
  });

  it("removes key from localStorage when saved empty", () => {
    render(<SettingsScreen onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Save"));
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("ridecast:elevenlabs-api-key");
  });
});

describe("useElevenLabsKey", () => {
  it("returns null when no key stored", () => {
    const { result } = renderHook(() => useElevenLabsKey());
    expect(result.current).toBeNull();
  });

  it("returns stored key", () => {
    localStorageMock.getItem.mockReturnValueOnce("sk_stored");
    const { result } = renderHook(() => useElevenLabsKey());
    expect(result.current).toBe("sk_stored");
  });
});
```

**File:** `src/app/api/audio/generate/route.test.ts` — add test for header reading:

```typescript
it("uses x-elevenlabs-key header when provided", async () => {
  // Arrange: mock createTTSProvider to capture the key passed
  const mockProvider = { generateSpeech: vi.fn().mockResolvedValue(Buffer.from("audio")) };
  vi.mocked(createTTSProvider).mockReturnValueOnce(mockProvider);

  const req = new Request("http://localhost/api/audio/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-elevenlabs-key": "sk_from_header",
    },
    body: JSON.stringify({ scriptId: "s1" }),
  });

  await POST(req);
  expect(createTTSProvider).toHaveBeenCalledWith("sk_from_header");
});
```

## Success Criteria

```bash
npm run test    # SettingsScreen tests pass; audio generate route tests pass
npm run build   # no type errors
```

Manual verification:
- [ ] Tap settings gear → SettingsScreen opens
- [ ] Enter ElevenLabs key → tap Save → key persists after refresh
- [ ] Generate audio with key set → server logs show ElevenLabs voices used
- [ ] Clear the key → generate audio → falls back to OpenAI voices

## Scope

6 files. No database changes. The ElevenLabs key lives in localStorage only — never written to the server. Server uses it per-request from the header, with env var as fallback. This preserves the BYOK philosophy and requires zero server restart.
