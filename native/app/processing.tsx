import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { processContent, generateAudio } from "../lib/api";
import { downloadEpisodeAudio } from "../lib/downloads";
import { syncLibrary } from "../lib/sync";
import { usePlayer } from "../lib/usePlayer";
import {
  STAGE_COPY,
  STAGE_LABELS,
  getStageIndex,
  type ProcessingStage,
} from "../lib/constants";
import { PipelineError, type PipelineErrorCode } from "../lib/types";
import { colors, borderRadius } from "../lib/theme";

// ---------------------------------------------------------------------------
// Error code → user-facing copy
// ---------------------------------------------------------------------------

interface ErrorUi {
  /** Short headline shown in the error card */
  headline: string;
  /** Optional secondary hint below the headline */
  hint?: string;
  /** Whether a retry is likely to succeed (controls button wording) */
  retryable: boolean;
}

const PIPELINE_ERROR_UI: Record<PipelineErrorCode, ErrorUi> = {
  AI_UNAVAILABLE:    {
    headline: "Couldn't reach the AI service",
    hint: "This is usually temporary — try again in a moment.",
    retryable: true,
  },
  TTS_FAILED:        {
    headline: "Audio generation failed",
    hint: "This is usually temporary — try again in a moment.",
    retryable: true,
  },
  RATE_LIMITED:      {
    headline: "Service is busy right now",
    hint: "Please wait a moment and try again.",
    retryable: true,
  },
  CONTENT_TOO_SHORT: {
    headline: "Content is too short",
    hint: "Please go back and add more text before generating an episode.",
    retryable: false,
  },
  CONTENT_TOO_LONG:  {
    headline: "Document is too large to process",
    hint: "Try a shorter excerpt or choose a shorter episode length.",
    retryable: false,
  },
  EXTRACTION_FAILED: {
    headline: "Couldn't extract text from this source",
    hint: "The URL may be paywalled or the file unreadable. Try pasting the text directly.",
    retryable: false,
  },
  INVALID_INPUT:     {
    headline: "Something went wrong with your content",
    hint: "Go back and try uploading again.",
    retryable: false,
  },
  NOT_FOUND:         {
    headline: "Content no longer exists",
    hint: "Go back to the library and start a new episode.",
    retryable: false,
  },
  PROCESSING_FAILED: {
    headline: "Script generation failed",
    hint: "Something went wrong on our end — try again.",
    retryable: true,
  },
  UNAUTHORIZED:      {
    headline: "Authentication error",
    hint: "Please sign out and sign back in.",
    retryable: false,
  },
};

/** Fall-through for unknown / missing codes */
const FALLBACK_ERROR_UI: ErrorUi = {
  headline: "Something went wrong",
  hint: "An unexpected error occurred. Please try again.",
  retryable: true,
};

function resolveErrorUi(code: PipelineErrorCode | null): ErrorUi {
  if (!code) return FALLBACK_ERROR_UI;
  return PIPELINE_ERROR_UI[code] ?? FALLBACK_ERROR_UI;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type StageStatus = "upcoming" | "active" | "complete";

function stageStatus(
  rowStage: ProcessingStage,
  currentStage: ProcessingStage,
): StageStatus {
  const rowIdx = getStageIndex(rowStage);
  const curIdx = getStageIndex(currentStage);
  if (rowIdx < curIdx) return "complete";
  if (rowIdx === curIdx) return "active";
  return "upcoming";
}

interface StageRowProps {
  stage: ProcessingStage;
  currentStage: ProcessingStage;
}

function StageRow({ stage, currentStage }: StageRowProps) {
  const meta = STAGE_LABELS.find((s) => s.stage === stage)!;
  const status = stageStatus(stage, currentStage);

  const iconColor =
    status === "complete"
      ? colors.statusSuccess
      : status === "active"
        ? colors.accentPrimary
        : colors.textTertiary;

  const labelColor =
    status === "complete"
      ? colors.statusSuccess
      : status === "active"
        ? colors.accentPrimary
        : colors.textTertiary;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 14 }}>
      {/* Icon / spinner */}
      <View style={{ width: 32, alignItems: "center" }}>
        {status === "active" ? (
          <ActivityIndicator size="small" color={colors.accentPrimary} />
        ) : (
          <Ionicons
            name={
              status === "complete" ? "checkmark-circle" : meta.icon
            }
            size={22}
            color={iconColor}
          />
        )}
      </View>

      {/* Label */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: labelColor }}>
          {meta.label}
        </Text>
        {status === "active" && STAGE_COPY[stage] ? (
          <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}>
            {STAGE_COPY[stage]}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function ProcessingScreen() {
  const router = useRouter();
  const player = usePlayer();
  const { contentId, targetMinutes, title: routeTitle } = useLocalSearchParams<{
    contentId: string;
    targetMinutes: string;
    title?: string;
  }>();

  const [stage, setStage] = useState<ProcessingStage>("analyzing");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<PipelineErrorCode | null>(null);
  const [audioError, setAudioError] = useState(false); // true = audio stage failed

  // Stored IDs for retry logic
  const scriptIdRef = useRef<string | null>(null);
  const audioIdRef = useRef<string | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    runPipeline();

    return () => {
      abortRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runPipeline() {
    scriptIdRef.current = null;
    audioIdRef.current = null;
    audioUrlRef.current = null;
    setErrorMsg(null);
    setErrorCode(null);
    setAudioError(false);

    if (!contentId || !targetMinutes) {
      setErrorMsg("Missing content ID or target duration.");
      return;
    }

    const minutes = Number(targetMinutes);

    // ── Stage 1: Analyzing (cosmetic 3s delay) ────────────────────────────
    setStage("analyzing");

    // ── Stage 2: Scripting — call processContent ──────────────────────────
    setStage("scripting");
    let scriptId: string;
    try {
      const processResult = await processContent(contentId, minutes);
      if (abortRef.current) return;
      scriptId = processResult.id;
      scriptIdRef.current = scriptId;
    } catch (err: unknown) {
      if (!abortRef.current) {
        const code = err instanceof PipelineError ? err.code ?? null : null;
        setErrorCode(code);
        setErrorMsg(err instanceof Error ? err.message : "Processing failed");
      }
      return;
    }

    // ── Stage 3: Generating — call generateAudio ──────────────────────────
    setStage("generating");
    await runAudioGeneration(scriptId);
  }

  async function runAudioGeneration(scriptId: string) {
    setAudioError(false);
    setErrorMsg(null);
    setErrorCode(null);
    try {
      const genResult = await generateAudio(scriptId);
      if (abortRef.current) return;
      audioIdRef.current = genResult.id;
      audioUrlRef.current = genResult.filePath;

      setStage("ready");

      // Fire-and-forget download + sync
      downloadEpisodeAudio(genResult.id, genResult.filePath).catch(() => {
        /* ignore — user can still stream */
      });

      syncLibrary().catch(() => {
        /* ignore */
      });

      // Build PlayableItem and start playback
      const playable = {
        id: genResult.id,
        title: routeTitle ?? "New Episode",
        duration: genResult.durationSecs,
        format: "narrator",
        audioUrl: genResult.filePath,
      };

      if (abortRef.current) return;

      router.replace("/(tabs)");
      player.play(playable).catch(() => {
        /* ignore */
      });
    } catch (err: unknown) {
      if (!abortRef.current) {
        setAudioError(true);
        const code = err instanceof PipelineError ? err.code ?? null : null;
        setErrorCode(code);
        setErrorMsg(err instanceof Error ? err.message : "Audio generation failed");
      }
    }
  }

  function handleCancel() {
    abortRef.current = true;
    router.back();
  }

  function handleTryAgain() {
    runPipeline();
  }

  function handleRetryAudio() {
    if (scriptIdRef.current) {
      setStage("generating");
      runAudioGeneration(scriptIdRef.current);
    } else {
      runPipeline();
    }
  }

  // Progress bar fill: analyzing=0%, scripting=33%, generating=66%, ready=100%
  const progressFill =
    getStageIndex(stage) / (STAGE_LABELS.length - 1);
  const progressWidthPct = `${Math.floor(progressFill * 100)}%` as `${number}%`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>
      {/* Cancel button top-left */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
        <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        {/* Title */}
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 }}>
          Creating Episode
        </Text>
        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 40, textAlign: "center" }}>
          This usually takes 30–60 seconds
        </Text>

        {/* Stage list */}
        <View style={{
          width: "100%",
          backgroundColor: colors.surface,
          borderRadius: borderRadius.card,
          paddingHorizontal: 20,
          paddingVertical: 8,
          marginBottom: 32,
        }}>
          {STAGE_LABELS.map(({ stage: s }) => (
            <StageRow key={s} stage={s} currentStage={stage} />
          ))}
        </View>

        {/* Progress bar */}
        <View style={{
          width: "100%",
          height: 6,
          backgroundColor: colors.surfaceElevated,
          borderRadius: 3,
          marginBottom: 32,
        }}>
          <View style={{
            backgroundColor: colors.accentPrimary,
            height: 6,
            borderRadius: 3,
            width: progressWidthPct,
            minWidth: 0,
          }} />
        </View>

        {/* Error state */}
        {errorMsg && (() => {
          const ui = resolveErrorUi(errorCode);
          return (
            <View style={{ width: "100%", alignItems: "center" }}>
              {/* Error card */}
              <View style={{
                backgroundColor: "rgba(239,68,68,0.12)",
                borderColor: "rgba(239,68,68,0.3)",
                borderWidth: 1,
                borderRadius: borderRadius.card,
                paddingHorizontal: 16,
                paddingVertical: 14,
                width: "100%",
                marginBottom: 16,
                gap: 6,
              }}>
                {/* Icon + headline row */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="alert-circle" size={18} color={colors.statusError} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.statusError, flex: 1 }}>
                    {ui.headline}
                  </Text>
                </View>
                {/* Hint */}
                {ui.hint ? (
                  <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
                    {ui.hint}
                  </Text>
                ) : null}
              </View>

              {/* Action buttons */}
              {audioError ? (
                <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
                  {/* Only show Retry Audio if retryable */}
                  {ui.retryable ? (
                    <TouchableOpacity
                      onPress={handleRetryAudio}
                      style={{
                        flex: 1,
                        backgroundColor: colors.accentPrimary,
                        paddingVertical: 12,
                        borderRadius: borderRadius.card,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Retry Audio</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={{
                      flex: 1,
                      borderColor: colors.borderInput,
                      borderWidth: 1,
                      paddingVertical: 12,
                      borderRadius: borderRadius.card,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Go Back</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
                  {ui.retryable ? (
                    <TouchableOpacity
                      onPress={handleTryAgain}
                      style={{
                        flex: 1,
                        backgroundColor: colors.accentPrimary,
                        paddingVertical: 12,
                        borderRadius: borderRadius.card,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Try Again</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={{
                      flex: ui.retryable ? 1 : undefined,
                      paddingVertical: 12,
                      paddingHorizontal: ui.retryable ? undefined : 32,
                      borderColor: colors.borderInput,
                      borderWidth: 1,
                      borderRadius: borderRadius.card,
                      alignItems: "center",
                      width: ui.retryable ? undefined : "100%",
                    }}
                  >
                    <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Go Back</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })()}
      </View>
    </SafeAreaView>
  );
}


