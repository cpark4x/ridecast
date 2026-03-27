/** All supported script formats: AI-chosen (narrator/conversation) or user-chosen (verbatim). */
export type ScriptFormat = 'narrator' | 'conversation' | 'verbatim';

export interface ContentAnalysis {
  contentType: string;
  format: ScriptFormat;
  themes: string[];
  summary: string;
  suggestedTitle: string;
}

export interface ScriptConfig {
  format: ScriptFormat;
  targetMinutes: number;
  contentType: string;
  themes: string[];
}

export interface GeneratedScript {
  text: string;
  wordCount: number;
  format: ScriptFormat;
}

export interface AIProvider {
  analyze(text: string): Promise<ContentAnalysis>;
  generateScript(text: string, config: ScriptConfig): Promise<GeneratedScript>;
}

/** Shared Anthropic model identifier. Update here to change both claude.ts and feedback.ts. */
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

/** Shared OpenAI Whisper model identifier. Update here to change all voice transcription calls. */
export const WHISPER_MODEL = 'whisper-1';
