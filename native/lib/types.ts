// --- API response types (mirrors Next.js backend) ---

export interface UploadResponse {
  id: string;
  title: string;
  author: string | null;
  rawText: string;
  wordCount: number;
  sourceType: string;
  sourceUrl: string | null;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
  truncationWarning: string | null;
  error?: string; // present on 409 duplicate
}

export interface ProcessResponse {
  id: string; // scriptId
  contentId: string;
  format: string;
  targetDuration: number;
  actualWordCount: number;
  compressionRatio: number;
  scriptText: string;
  contentType: string | null;
  themes: string[];
  summary: string | null;
  durationAdvisory: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateResponse {
  id: string; // audioId
  scriptId: string;
  filePath: string;
  durationSecs: number;
  voices: string[];
  ttsProvider: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  completed: boolean;
  position: number;
  createdAt: string;
  summary: string | null;
  contentType: string | null;
  themes: string[];
  compressionRatio: number;
  actualWordCount: number;
  voices: string[];
  ttsProvider: string;
}

export interface LibraryItem {
  id: string; // contentId
  title: string;
  author: string | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
  // Episode identity fields (optional + nullable for backward compat)
  sourceIcon?: string | null;
  sourceName?: string | null;
  sourceDomain?: string | null;
  sourceBrandColor?: string | null;
  description?: string | null;
}

export interface PlaybackState {
  id?: string;
  userId?: string;
  audioId: string;
  position: number;
  speed: number;
  completed: boolean;
  updatedAt?: string;
}

// --- App-level types ---

export interface PlayableItem {
  id: string; // audioId
  title: string;
  duration: number; // seconds
  format: string;
  audioUrl: string; // local file path or remote URL
  author?: string | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null; // for smartTitle
  sourceName?: string | null; // for player bar subtitle
  sourceBrandColor?: string | null; // for SourceIcon
  contentType?: string | null;
  themes?: string[];
  summary?: string | null;
  targetDuration?: number | null;
  wordCount?: number | null;
  compressionRatio?: number | null;
  voices?: string[];
  ttsProvider?: string | null;
  createdAt?: string | null;
}

export type LibraryFilter = "all" | "in_progress" | "completed" | "generating";
