export interface ScriptSegment {
  speaker: string;
  text: string;
}

const SPEAKER_LABEL = /^\[([^\]]+)\]\s*/;

export function parseConversationScript(script: string): ScriptSegment[] {
  if (!script.trim()) return [];

  const lines = script.split('\n');
  const segments: ScriptSegment[] = [];

  let currentSpeaker: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(SPEAKER_LABEL);

    if (match) {
      if (currentLines.length > 0) {
        segments.push({ speaker: currentSpeaker ?? 'narrator', text: currentLines.join('\n') });
      }
      currentSpeaker = match[1];
      currentLines = [line.replace(SPEAKER_LABEL, '')];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    segments.push({ speaker: currentSpeaker ?? 'narrator', text: currentLines.join('\n') });
  }

  return segments;
}