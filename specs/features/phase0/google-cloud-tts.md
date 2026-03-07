# Feature: Google Cloud TTS Provider

> Add Google Cloud TTS Studio voices as the primary hosted TTS provider, auto-selected over OpenAI when credentials are present.

## Motivation

Google Cloud TTS Studio voices are the same voices powering NotebookLM — widely considered "excellent" and competitive with ElevenLabs. With GCP access, this becomes the default hosted voice at lower cost than OpenAI, with no BYOK requirement for end users.

## Current State (confirmed)

`src/lib/tts/provider.ts` — `createTTSProvider(key?)`:
```typescript
export function createTTSProvider(elevenLabsKey?: string): TTSProvider {
  const key = elevenLabsKey || process.env.ELEVENLABS_API_KEY;
  if (key) return new ElevenLabsTTSProvider(key);
  return new OpenAITTSProvider();
}
```

`TTSProvider` interface in `src/lib/tts/types.ts`:
```typescript
export interface TTSProvider {
  generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer>;
}
```

## Changes

### 1. Install dependency

```bash
npm install @google-cloud/text-to-speech
```

### 2. New `src/lib/tts/google.ts`

```typescript
import textToSpeech from "@google-cloud/text-to-speech";
import type { TTSProvider, VoiceConfig } from "./types";
import { retryWithBackoff } from "@/lib/utils/retry";

export class GoogleCloudTTSProvider implements TTSProvider {
  private client: textToSpeech.TextToSpeechClient;

  constructor() {
    // Credentials auto-loaded from GOOGLE_APPLICATION_CREDENTIALS env var
    this.client = new textToSpeech.TextToSpeechClient();
  }

  async generateSpeech(text: string, voice: VoiceConfig): Promise<Buffer> {
    const [response] = await retryWithBackoff(() =>
      this.client.synthesizeSpeech({
        input: { text },
        voice: {
          name: voice.voice,           // e.g. "en-US-Studio-O"
          languageCode: "en-US",
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 1.0,
        },
      })
    );

    if (!response.audioContent) {
      throw new Error("Google Cloud TTS returned empty audio content");
    }

    return Buffer.from(response.audioContent as Uint8Array);
  }
}
```

### 3. Update voice configs in narrator and conversation

**`src/lib/tts/narrator.ts`** — add Google voice alongside OpenAI and ElevenLabs:

```typescript
const GOOGLE_NARRATOR_VOICE = {
  voice: "en-US-Studio-O",      // warm, natural female narrator
  instructions: "",              // Google uses voice name only, not instructions
};
```

Select by `provider instanceof GoogleCloudTTSProvider`.

**`src/lib/tts/conversation.ts`** — add Google voices for Host A / Host B:

```typescript
const GOOGLE_HOST_A = { voice: "en-US-Studio-M", instructions: "" }; // male, energetic
const GOOGLE_HOST_B = { voice: "en-US-Studio-O", instructions: "" }; // female, thoughtful
```

### 4. Update `createTTSProvider` priority (`src/lib/tts/provider.ts`)

```typescript
import { GoogleCloudTTSProvider } from "./google";
import { ElevenLabsTTSProvider } from "./elevenlabs";
import { OpenAITTSProvider } from "./openai";
import type { TTSProvider } from "./types";

export function createTTSProvider(elevenLabsKey?: string): TTSProvider {
  // 1. Google Cloud TTS — primary hosted provider
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
    return new GoogleCloudTTSProvider();
  }
  // 2. ElevenLabs — BYOK premium option
  const elKey = elevenLabsKey || process.env.ELEVENLABS_API_KEY;
  if (elKey) return new ElevenLabsTTSProvider(elKey);
  // 3. OpenAI — fallback
  return new OpenAITTSProvider();
}
```

### 5. Add to `.env.example`

```bash
# Google Cloud TTS (primary hosted voice — best quality)
# Set EITHER credentials file path OR inline JSON
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
GOOGLE_CLOUD_PROJECT=your-project-id
```

## Files to Modify

| File | Change |
|---|---|
| `package.json` | Add `@google-cloud/text-to-speech` |
| `src/lib/tts/google.ts` | New file — GoogleCloudTTSProvider |
| `src/lib/tts/provider.ts` | Add Google as first-priority provider |
| `src/lib/tts/narrator.ts` | Add Google voice config |
| `src/lib/tts/conversation.ts` | Add Google Host A/B voice configs |
| `.env.example` | Add GOOGLE_APPLICATION_CREDENTIALS |

## Tests

**File:** `src/lib/tts/google.test.ts` (new)

```typescript
import { describe, it, expect, vi } from "vitest";
import { GoogleCloudTTSProvider } from "./google";

vi.mock("@google-cloud/text-to-speech", () => ({
  default: {
    TextToSpeechClient: vi.fn().mockImplementation(() => ({
      synthesizeSpeech: vi.fn().mockResolvedValue([
        { audioContent: Buffer.from("fake-mp3") }
      ]),
    })),
  },
}));

describe("GoogleCloudTTSProvider", () => {
  it("returns a Buffer from synthesizeSpeech", async () => {
    const provider = new GoogleCloudTTSProvider();
    const result = await provider.generateSpeech("Hello world", {
      voice: "en-US-Studio-O",
      instructions: "",
    });
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("uses the voice name from VoiceConfig", async () => {
    const { default: tts } = await import("@google-cloud/text-to-speech");
    const mockSynthesize = vi.fn().mockResolvedValue([{ audioContent: Buffer.from("audio") }]);
    vi.mocked(tts.TextToSpeechClient).mockImplementation(() => ({
      synthesizeSpeech: mockSynthesize,
    }) as never);

    const provider = new GoogleCloudTTSProvider();
    await provider.generateSpeech("test", { voice: "en-US-Studio-M", instructions: "" });

    expect(mockSynthesize).toHaveBeenCalledWith(
      expect.objectContaining({
        voice: expect.objectContaining({ name: "en-US-Studio-M" }),
      })
    );
  });

  it("throws if audioContent is empty", async () => {
    const { default: tts } = await import("@google-cloud/text-to-speech");
    vi.mocked(tts.TextToSpeechClient).mockImplementation(() => ({
      synthesizeSpeech: vi.fn().mockResolvedValue([{ audioContent: null }]),
    }) as never);

    const provider = new GoogleCloudTTSProvider();
    await expect(provider.generateSpeech("test", { voice: "en-US-Studio-O", instructions: "" }))
      .rejects.toThrow("empty audio content");
  });
});
```

**Update `src/lib/tts/provider.test.ts`** to add Google priority test:

```typescript
it("returns GoogleCloudTTSProvider when GOOGLE_APPLICATION_CREDENTIALS is set", async () => {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = "/path/to/creds.json";
  vi.resetModules();
  const { createTTSProvider } = await import("./provider");
  const { GoogleCloudTTSProvider } = await import("./google");
  expect(createTTSProvider()).toBeInstanceOf(GoogleCloudTTSProvider);
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
});
```

## Success Criteria

```bash
npm install
npm run test   # google.test.ts passes; provider.test.ts updated tests pass
npm run build  # no type errors
```

## Scope

TTS layer only. No API route changes. No UI changes. No schema changes. The `instructions` field in VoiceConfig is ignored by Google (it's an OpenAI/ElevenLabs concept) — pass empty string.
