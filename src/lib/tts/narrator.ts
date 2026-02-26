import { TTSProvider } from "./types";

const NARRATOR_VOICE = {
  voice: "alloy",
  instructions:
    "Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.",
};

export async function generateNarratorAudio(
  provider: TTSProvider,
  scriptText: string
): Promise<Buffer> {
  return provider.generateSpeech(scriptText, NARRATOR_VOICE);
}
