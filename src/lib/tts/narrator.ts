import { TTSProvider } from "./types";
import { chunkText } from "./chunk";

const NARRATOR_VOICE = {
  voice: "alloy",
  instructions:
    "Warm, clear audiobook narrator. Speak at a natural, comfortable pace with good enunciation.",
};

export async function generateNarratorAudio(
  provider: TTSProvider,
  scriptText: string
): Promise<Buffer> {
  const chunks = chunkText(scriptText);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    buffers.push(await provider.generateSpeech(chunk, NARRATOR_VOICE));
  }

  return Buffer.concat(buffers);
}
