export interface ScriptSegment {
  speaker: string;
  text: string;
}

export function parseConversationScript(script: string): ScriptSegment[] {
  if (!script.trim()) return [];

  const labelPattern = /^\[([^\]]+)\]\s*/;
  const lines = script.split("\n");
  const segments: ScriptSegment[] = [];
  let currentSpeaker: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(labelPattern);
    if (match) {
      // Save previous segment
      if (currentSpeaker !== null && currentLines.length > 0) {
        segments.push({
          speaker: currentSpeaker,
          text: currentLines.join("\n").trim(),
        });
      }
      currentSpeaker = match[1];
      currentLines = [line.replace(labelPattern, "")];
    } else {
      currentLines.push(line);
    }
  }

  // Save last segment
  if (currentSpeaker !== null && currentLines.length > 0) {
    segments.push({
      speaker: currentSpeaker,
      text: currentLines.join("\n").trim(),
    });
  }

  // If no speaker labels found, treat entire text as narrator
  if (segments.length === 0 && script.trim()) {
    segments.push({ speaker: "narrator", text: script.trim() });
  }

  return segments;
}
