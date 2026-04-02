// --- Pipeline error codes (mirrors src/app/api/* route `code` fields) ---

/**
 * Machine-readable error codes returned by the three pipeline API routes.
 * The client uses these to show specific, actionable messages rather than
 * surfacing raw server strings.
 */
export type PipelineErrorCode =
  | 'AI_UNAVAILABLE'    // Claude / Anthropic unreachable or misconfigured
  | 'TTS_FAILED'        // OpenAI TTS unreachable or misconfigured
  | 'CONTENT_TOO_SHORT' // rawText below minimum processable length
  | 'CONTENT_TOO_LONG'  // prompt exceeded model context window
  | 'EXTRACTION_FAILED' // couldn't pull usable text from URL/file
  | 'RATE_LIMITED'      // upstream API returned 429
  | 'INVALID_INPUT'     // bad request (missing fields, bad URL, etc.)
  | 'NOT_FOUND'         // content or script record not found in DB
  | 'PROCESSING_FAILED' // generic AI processing failure
  | 'UNAUTHORIZED';     // auth / API key misconfigured

/**
 * Error thrown by the native API client for pipeline step failures.
 * Extends Error so existing `err instanceof Error` guards still work,
 * and adds a `code` field for UI-level differentiation.
 */
export class PipelineError extends Error {
  readonly code: PipelineErrorCode | undefined;
  constructor(message: string, code?: PipelineErrorCode) {
    super(message);
    this.name = 'PipelineError';
    this.code = code;
  }
}

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
  thumbnailUrl?: string | null;
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
  thumbnailUrl?: string | null;
}

export type LibraryFilter = "active" | "all" | "in_progress" | "completed" | "generating";

// --- Feedback API types ---

export interface FeedbackResponse {
  id: string;
  summary: string;
  category: string;
}

export interface TelemetryEventPayload {
  eventType: "api_error" | "playback_failure" | "processing_timeout" | "upload_failure";
  metadata: Record<string, unknown>;
  /** Client-generated id for server-side deduplication on retry. */
  clientEventId?: string;
}

export interface TelemetryResponse {
  id: string;
}
