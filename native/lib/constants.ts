// Player
export const SMART_RESUME_REWIND_SECS = 3;
export const CAR_MODE_SKIP_SECS = 30; // Larger skip interval for eyes-off driving
export const SMART_RESUME_THRESHOLD_MS = 10_000;
export const POSITION_SAVE_INTERVAL_MS = 5_000;
export const TTS_WPM = 150;
export const READING_WPM = 250;

// Duration
export const DURATION_PRESETS = [
  { minutes: 2, label: "Quick Take" },
  { minutes: 3, label: "Brief" },
  { minutes: 5, label: "Summary" },
  { minutes: 15, label: "Main Points" },
  { minutes: 30, label: "Deep Dive" },
] as const;

export const DURATION_SLIDER = { min: 2, max: 60, step: 1 } as const;

// Processing
export type ProcessingStage = "analyzing" | "scripting" | "generating" | "ready";

export const STAGE_COPY: Record<ProcessingStage, string | null> = {
  analyzing: "Reading your content — extracting key ideas and structure",
  scripting: "Writing your episode — shaping key ideas into narrative",
  generating: "Recording your episode — this takes 20–40 seconds",
  ready: null,
};

// Stage pipeline metadata (icon names match Ionicons — no RN import needed here)
export const STAGE_LABELS: {
  stage: ProcessingStage;
  label: string;
  icon: string;
}[] = [
  { stage: "analyzing",  label: "Reading content", icon: "search-outline" },
  { stage: "scripting",  label: "Writing script",  icon: "create-outline" },
  { stage: "generating", label: "Recording audio", icon: "mic-outline" },
  { stage: "ready",      label: "Episode ready",   icon: "checkmark-circle-outline" },
];

/**
 * Returns the ordinal index (0–3) for a given processing stage.
 */
export function getStageIndex(stage: ProcessingStage): number {
  return STAGE_LABELS.findIndex((s) => s.stage === stage);
}

// API
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
