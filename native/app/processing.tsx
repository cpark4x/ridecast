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
      ? "#16A34A"
      : status === "active"
        ? "#EA580C"
        : "#D1D5DB";

  const labelColor =
    status === "complete"
      ? "text-green-700"
      : status === "active"
        ? "text-brand"
        : "text-gray-400";

  return (
    <View className="flex-row items-center gap-4 py-3.5">
      {/* Icon / spinner */}
      <View className="w-8 items-center">
        {status === "active" ? (
          <ActivityIndicator size="small" color="#EA580C" />
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
      <View className="flex-1">
        <Text className={`text-base font-semibold ${labelColor}`}>
          {meta.label}
        </Text>
        {status === "active" && STAGE_COPY[stage] ? (
          <Text className="text-xs text-gray-500 mt-0.5">
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

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Cancel button top-left */}
      <View className="px-4 pt-2 pb-1">
        <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text className="text-sm text-gray-400">Cancel</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center px-8">
        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900 mb-2">Creating Episode</Text>
        <Text className="text-sm text-gray-500 mb-10 text-center">
          This usually takes 30–60 seconds
        </Text>

        {/* Stage list */}
        <View className="w-full bg-gray-50 rounded-2xl px-5 py-2 mb-8">
          {STAGE_LABELS.map(({ stage: s }) => (
            <StageRow key={s} stage={s} currentStage={stage} />
          ))}
        </View>

        {/* Error state */}
        {errorMsg && (
          <View className="w-full items-center">
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 w-full mb-4">
              <Text className="text-sm text-red-700 text-center">{errorMsg}</Text>
            </View>

            {audioError ? (
              <View className="flex-row gap-3 w-full">
                <TouchableOpacity
                  onPress={handleRetryAudio}
                  className="flex-1 bg-brand py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-semibold">Retry Audio</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleTryAgain}
                  className="flex-1 border border-gray-300 py-3 rounded-xl items-center"
                >
                  <Text className="text-gray-700 font-semibold">Start Over</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleTryAgain}
                className="bg-brand py-3 px-8 rounded-xl items-center w-full"
              >
                <Text className="text-white font-semibold">Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
