# Feature: ElevenLabs Provider Routing

> Auto-select ElevenLabsTTSProvider when ELEVENLABS_API_KEY is set; fall back to OpenAITTSProvider when it isn't. Update narrator and conversation voice configs with ElevenLabs voice IDs.

## Motivation

`elevenlabs-provider.md` adds the class. This spec wires it in. The routing must be fully backward-compatible: existing users with no ELEVENLABS_API_KEY get identical behavior.

## Prerequisite

`elevenlabs-provider.md` must be implemented first (ElevenLabsTTSProvider class must exist).

## Current State

`src/app/api/audio/generate/route.ts` instantiates OpenAITTSProvider directly:
```typescript
const provider = new OpenAITTSProvider();
```

`src/lib/tts/narrator.ts` uses a hardcoded voice:
```typescript
const NARRATOR_VOICE = { voice: "alloy", instructions: "..." };
```

`src/lib/tts/conversation.ts` uses hardcoded Host A / Host B voices with OpenAI voice names.

## Changes

### 1. Provider factory (`src/lib/tts/provider.ts` — new file)

```typescript
import { OpenAITTSProvider } from "./openai";
import { ElevenLabsTTSProvider } from "./elevenlabs";
import type { TTSProvider } from "./types";

export function createTTSProvider(): TTSProvider {
  if (process.env.ELEVENLABS_API_KEY) {
    return new ElevenLabsTTSProvider();
  }
  return new OpenAITTSProvider();
}
```

### 2. Update audio generation route (`src/app/api/audio/generate/route.ts`)

Replace direct instantiation with the factory:

```typescript
// Before
const provider = new OpenAITTSProvider();

// After
import { createTTSProvider } from "@/lib/tts/provider";
const provider = createTTSProvider();
```

### 3. Update narrator voice config (`src/lib/tts/narrator.ts`)

Add ElevenLabs voice alongside OpenAI voice, selected by provider type:

```typescript
import { ElevenLabsTTSProvider } from "./elevenlabs";

const OPENAI_NARRATOR_VOICE = {
  voice: "alloy",
  instructions: "Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.",
};

const ELEVENLABS_NARRATOR_VOICE = {
  voice: "21m00Tcm4TlvDq8ikWAM", // Rachel — warm, natural female narrator
  instructions: "Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.",
};

export async function generateNarratorAudio(
  provider: TTSProvider,
  scriptText: string
): Promise<Buffer> {
  const voice = provider instanceof ElevenLabsTTSProvider
    ? ELEVENLABS_NARRATOR_VOICE
    : OPENAI_NARRATOR_VOICE;
  // ... rest unchanged
}
```

### 4. Update conversation voice config (`src/lib/tts/conversation.ts`)

Same pattern — add ElevenLabs voice IDs for Host A and Host B:

```typescript
const ELEVENLABS_HOST_A = {
  voice: "pNInz6obpgDQGcFmaJgB", // Adam — energetic, curious
  instructions: "Energetic, curious podcast host. Ask questions with genuine interest.",
};

const ELEVENLABS_HOST_B = {
  voice: "21m00Tcm4TlvDq8ikWAM", // Rachel — thoughtful, expert
  instructions: "Thoughtful, expert podcast host. Give clear, insightful answers.",
};
```

Select based on `provider instanceof ElevenLabsTTSProvider`.

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/tts/provider.ts` | New file — createTTSProvider factory |
| `src/app/api/audio/generate/route.ts` | Use createTTSProvider() instead of `new OpenAITTSProvider()` |
| `src/lib/tts/narrator.ts` | Add ElevenLabs voice config, select by provider type |
| `src/lib/tts/conversation.ts` | Add ElevenLabs voice configs, select by provider type |

## Tests

**File:** `src/lib/tts/provider.test.ts` (new)

```typescript
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./openai", () => ({ OpenAITTSProvider: vi.fn() }));
vi.mock("./elevenlabs", () => ({ ElevenLabsTTSProvider: vi.fn() }));

describe("createTTSProvider", () => {
  afterEach(() => { delete process.env.ELEVENLABS_API_KEY; });

  it("returns OpenAITTSProvider when ELEVENLABS_API_KEY is not set", async () => {
    const { createTTSProvider } = await import("./provider");
    const { OpenAITTSProvider } = await import("./openai");
    const provider = createTTSProvider();
    expect(provider).toBeInstanceOf(OpenAITTSProvider);
  });

  it("returns ElevenLabsTTSProvider when ELEVENLABS_API_KEY is set", async () => {
    process.env.ELEVENLABS_API_KEY = "test-key";
    // Re-import to pick up env change
    vi.resetModules();
    const { createTTSProvider } = await import("./provider");
    const { ElevenLabsTTSProvider } = await import("./elevenlabs");
    const provider = createTTSProvider();
    expect(provider).toBeInstanceOf(ElevenLabsTTSProvider);
  });
});
```

## Success Criteria

```bash
npm run test    # provider.test.ts passes; existing audio generation tests unaffected
npm run build   # no type errors
```

Manual verification:
- [ ] Without `ELEVENLABS_API_KEY` in `.env` → audio generates using OpenAI voices (existing behavior)
- [ ] With `ELEVENLABS_API_KEY` set → audio generates using ElevenLabs Rachel/Adam voices

## Scope

Routing logic only. No changes to the TTSProvider interface. No changes to chunking, parsing, or audio storage. The `instanceof` check is intentional — it avoids adding configuration complexity for a two-provider system. If a third provider is added later, refactor to a strategy pattern at that point.
