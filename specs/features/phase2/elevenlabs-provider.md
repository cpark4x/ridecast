# Feature: ElevenLabs TTS Provider

> Add `ElevenLabsTTSProvider` implementing the existing `TTSProvider` interface, so ElevenLabs can be swapped in as the audio generation backend.

## Motivation

OpenAI TTS is "good enough." ElevenLabs is definitively best-in-class. ElevenReader's 4.64★ App Store rating exists almost entirely because of ElevenLabs voice quality. This spec adds the provider class only — routing logic is a separate spec (`elevenlabs-routing.md`).

## Current State

`src/lib/tts/types.ts` defines:
```typescript
export interface TTSProvider {
  generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer>;
}
```

`src/lib/tts/openai.ts` implements this interface — use it as the exact pattern to follow.

## Changes

### 1. Install dependency

```bash
npm install elevenlabs
```

### 2. Create `src/lib/tts/elevenlabs.ts`

```typescript
import { ElevenLabsClient } from "elevenlabs";
import type { TTSProvider, VoiceConfig } from "./types";
import { retryWithBackoff } from "@/lib/utils/retry";

export class ElevenLabsTTSProvider implements TTSProvider {
  private client: ElevenLabsClient;

  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }

  async generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer> {
    const audioStream = await retryWithBackoff(() =>
      this.client.textToSpeech.convert(voice.voice, {
        text,
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
      })
    );

    // ElevenLabs returns a ReadableStream — collect into Buffer
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
```

### 3. Add `ELEVENLABS_API_KEY` to `.env.example`

```bash
# Optional: use ElevenLabs for higher-quality voices
# ELEVENLABS_API_KEY=your_key_here
```

## Files to Modify

| File | Change |
|------|--------|
| `package.json` / `package-lock.json` | Add `elevenlabs` dependency |
| `src/lib/tts/elevenlabs.ts` | New file — ElevenLabsTTSProvider |
| `.env.example` | Add commented ELEVENLABS_API_KEY entry |

## Tests

**File:** `src/lib/tts/elevenlabs.test.ts` (new)

Mock pattern:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ElevenLabsTTSProvider } from "./elevenlabs";

// Mock the elevenlabs SDK
vi.mock("elevenlabs", () => ({
  ElevenLabsClient: vi.fn().mockImplementation(() => ({
    textToSpeech: {
      convert: vi.fn().mockResolvedValue(
        // Return an async iterable that yields one chunk
        (async function* () { yield Buffer.from("fake-mp3-audio"); })()
      ),
    },
  })),
}));

describe("ElevenLabsTTSProvider", () => {
  it("calls textToSpeech.convert with the correct voice ID and text", async () => {
    const provider = new ElevenLabsTTSProvider();
    const result = await provider.generateSpeech("Hello world", {
      voice: "21m00Tcm4TlvDq8ikWAM",
      instructions: "Warm narrator",
    });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("uses eleven_multilingual_v2 model", async () => {
    const { ElevenLabsClient } = await import("elevenlabs");
    const mockConvert = vi.fn().mockResolvedValue(
      (async function* () { yield Buffer.from("audio"); })()
    );
    vi.mocked(ElevenLabsClient).mockImplementation(() => ({
      textToSpeech: { convert: mockConvert },
    }) as never);

    const provider = new ElevenLabsTTSProvider();
    await provider.generateSpeech("test", { voice: "abc123", instructions: "" });

    expect(mockConvert).toHaveBeenCalledWith(
      "abc123",
      expect.objectContaining({ modelId: "eleven_multilingual_v2" })
    );
  });
});
```

## Success Criteria

```bash
npm install           # elevenlabs installed
npm run test          # elevenlabs.test.ts passes; existing tests unaffected
npm run build         # no type errors
```

## Scope

This spec creates the provider class only. No audio generation route changes. No voice routing changes. Those are in `elevenlabs-routing.md`. The class can be instantiated but will only be used after the routing spec is implemented.
