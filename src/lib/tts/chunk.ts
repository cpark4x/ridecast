/**
 * Split text into chunks that stay within OpenAI TTS's input limit.
 *
 * OpenAI's TTS API has a 4096-character input limit. We split on paragraph
 * boundaries first, then on sentence boundaries if a paragraph is still
 * too long. This preserves natural speech pauses.
 */

const MAX_CHUNK_CHARS = 3800; // Leave headroom below 4096 limit

export function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) {
    return [text];
  }

  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    // If a single paragraph exceeds the limit, split it by sentences.
    if (para.length > MAX_CHUNK_CHARS) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      for (const sentence of splitSentences(para)) {
        if (current.length + sentence.length + 1 > MAX_CHUNK_CHARS) {
          if (current) chunks.push(current.trim());
          current = sentence;
        } else {
          current += (current ? " " : "") + sentence;
        }
      }
      continue;
    }

    if (current.length + para.length + 2 > MAX_CHUNK_CHARS) {
      if (current) chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/** Rough sentence splitter — good enough for TTS chunking. */
function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+[\s"]*/g) ?? [text];
}
