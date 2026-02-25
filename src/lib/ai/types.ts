export interface ContentAnalysis {
  contentType: string;
  format: 'narrator' | 'conversation';
  themes: string[];
  summary: string;
}

export interface ScriptConfig {
  format: 'narrator' | 'conversation';
  targetMinutes: number;
  contentType: string;
  themes: string[];
}

export interface GeneratedScript {
  text: string;
  wordCount: number;
  format: 'narrator' | 'conversation';
}

export interface AIProvider {
  analyze(text: string): Promise<ContentAnalysis>;
  generateScript(text: string, config: ScriptConfig): Promise<GeneratedScript>;
}