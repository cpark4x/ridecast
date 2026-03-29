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
import { colors, borderRadius } from "../lib/theme";

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
        {errorMsg && (
          <View style={{ width: "100%", alignItems: "center" }}>
            <View style={{
              backgroundColor: "rgba(239,68,68,0.12)",
              borderColor: "rgba(239,68,68,0.3)",
              borderWidth: 1,
              borderRadius: borderRadius.card,
              paddingHorizontal: 16,
              paddingVertical: 12,
              width: "100%",
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 14, color: colors.statusError, textAlign: "center" }}>
                {errorMsg}
              </Text>
            </View>

            {audioError ? (
              <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
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
                <TouchableOpacity
                  onPress={handleTryAgain}
                  style={{
                    flex: 1,
                    borderColor: colors.borderInput,
                    borderWidth: 1,
                    paddingVertical: 12,
                    borderRadius: borderRadius.card,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Start Over</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleTryAgain}
                style={{
                  backgroundColor: colors.accentPrimary,
                  paddingVertical: 12,
                  paddingHorizontal: 32,
                  borderRadius: borderRadius.card,
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}


