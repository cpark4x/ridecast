import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { usePathname } from "expo-router";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";
import { submitTextFeedback, submitVoiceFeedback } from "../lib/api";
import { formatDuration } from "../lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedbackSheetRef {
  open(): void;
}

type Tab = "type" | "talk";
type SheetState = "idle" | "recording" | "preview" | "submitting" | "done";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FeedbackSheet = forwardRef<FeedbackSheetRef>((_props, ref) => {
  const modalRef = useRef<BottomSheetModal>(null);
  // expo-audio: single stable recorder instance created by the hook.
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // true when the recorder has been started (record() called); false otherwise.
  const isRecordingActiveRef = useRef(false);
  // Monotonically incremented whenever isRecordingActiveRef changes so that
  // async stop error-recovery can detect if another operation raced it.
  const recordingVersionRef = useRef(0);
  const startRecordingPromiseRef = useRef<Promise<void> | null>(null);
  // Tracks a single in-flight stop promise (replaces the per-instance WeakMap).
  const stopInFlightRef = useRef<Promise<void> | null>(null);
  // Invalidate pending async UI transitions whenever the sheet session resets.
  const uiGenerationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tab, setTab] = useState<Tab>("type");
  const [text, setText] = useState("");
  const [state, setState] = useState<SheetState>("idle");
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Context auto-detection
  const screenContext = usePathname() || "/";
  const { currentItem } = usePlayer();
  const episodeId = currentItem?.id ?? undefined;
  const episodeTitle = currentItem?.title ?? null;

  // -------------------------------------------------------------------------
  // Cleanup helpers — stops any active timer + recording without resetting UI
  // state (UI reset is the caller's responsibility).
  // -------------------------------------------------------------------------

  /** Cancel the recording duration interval. Shared by stopRecording and cleanupRecording. */
  const clearDurationTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const isStaleUiGeneration = useCallback(
    (uiGeneration: number) => uiGenerationRef.current !== uiGeneration,
    []
  );

  const completeSubmission = useCallback(
    (uiGeneration: number) => {
      setState("done");
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
      }
      dismissTimerRef.current = setTimeout(() => {
        if (isStaleUiGeneration(uiGeneration)) {
          dismissTimerRef.current = null;
          return;
        }
        dismissTimerRef.current = null;
        modalRef.current?.dismiss();
      }, 1500);
    },
    [isStaleUiGeneration]
  );

  const startDurationTimer = useCallback(() => {
    clearDurationTimer();
    timerRef.current = setInterval(() => {
      setRecordingDuration((duration) => duration + 1);
    }, 1000);
  }, [clearDurationTimer]);

  /** Toggle the recorder's active flag and bump the version so racing async
   *  operations can detect that the state changed while they were awaiting. */
  const setRecorderActive = useCallback((active: boolean) => {
    if (isRecordingActiveRef.current === active) {
      return;
    }
    isRecordingActiveRef.current = active;
    recordingVersionRef.current += 1;
  }, []);

  /** Stop the single shared audioRecorder, deduplicating concurrent calls via
   *  a shared in-flight promise ref (replaces the per-instance WeakMap). */
  const stopCurrentRecording = useCallback(() => {
    const inFlightStopPromise = stopInFlightRef.current;
    if (inFlightStopPromise) {
      return inFlightStopPromise;
    }

    const wasActive = isRecordingActiveRef.current;
    // Capture the version that setRecorderActive(false) will produce so the
    // error handler can detect if another operation raced the stop.
    const clearedRecordingVersion = wasActive
      ? recordingVersionRef.current + 1
      : null;
    if (wasActive) {
      setRecorderActive(false);
    }

    const stopPromise = (async () => {
      try {
        await audioRecorder.stop();
      } catch (error: unknown) {
        // Roll back the active flag only if nothing else touched it in between.
        if (
          wasActive &&
          !isRecordingActiveRef.current &&
          recordingVersionRef.current === clearedRecordingVersion
        ) {
          setRecorderActive(true);
        }
        throw error;
      } finally {
        stopInFlightRef.current = null;
      }
    })();

    stopInFlightRef.current = stopPromise;
    return stopPromise;
  }, [audioRecorder, setRecorderActive]);

  const cleanupStaleRecording = useCallback(
    (logPrefix: string) => {
      stopCurrentRecording().catch((error: unknown) => {
        if (__DEV__) {
          console.warn(logPrefix, error);
        }
      });
    },
    [stopCurrentRecording]
  );

  const cleanupRecording = useCallback(() => {
    uiGenerationRef.current += 1;
    startRecordingPromiseRef.current = null;
    clearDurationTimer();
    // Cancel any pending auto-dismiss so a stale timer from a prior session
    // cannot dismiss a freshly reopened sheet.
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (!isRecordingActiveRef.current) {
      return;
    }

    // Intentionally fire-and-forget: cleanup runs on sheet dismiss / reopen
    // where we can't surface errors to the user. Log in dev so native
    // resource issues remain visible during development.
    stopCurrentRecording().catch((err: unknown) => {
      if (__DEV__) {
        console.warn("[FeedbackSheet] cleanup stop failed:", err);
      }
    });
  }, [clearDurationTimer, stopCurrentRecording]);

  const discardRecording = useCallback(() => {
    setRecordingUri(null);
    setRecordingDuration(0);
    setState("idle");
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, [cleanupRecording]);

  // -------------------------------------------------------------------------
  // Imperative handle
  // -------------------------------------------------------------------------

  useImperativeHandle(
    ref,
    () => ({
      open() {
        // Reuse the shared cleanup path so stale timers or recordings from a
        // prior session cannot leak into this freshly opened sheet.
        cleanupRecording();
        setTab("type");
        setText("");
        discardRecording();
        modalRef.current?.present();
      },
    }),
    [cleanupRecording, discardRecording]
  );

  // -------------------------------------------------------------------------
  // Guarded tab change: blocked while a recording is active so the mic never
  // stays live behind a hidden UI.
  // -------------------------------------------------------------------------

  const handleTabChange = useCallback(
    (newTab: Tab) => {
      if (state === "recording") return;
      setTab(newTab);
    },
    [state]
  );

  // -------------------------------------------------------------------------
  // Handlers: text tab
  // -------------------------------------------------------------------------

  const handleSubmitText = useCallback(async () => {
    if (!text.trim()) return;
    const uiGeneration = uiGenerationRef.current;
    setState("submitting");
    try {
      await submitTextFeedback({ text, screenContext, episodeId });
      if (isStaleUiGeneration(uiGeneration)) {
        return;
      }
      completeSubmission(uiGeneration);
    } catch {
      if (isStaleUiGeneration(uiGeneration)) {
        return;
      }
      Alert.alert("Submission Failed", "Your feedback could not be sent. Please try again.");
      setState("idle");
    }
  }, [completeSubmission, episodeId, isStaleUiGeneration, screenContext, text]);

  // -------------------------------------------------------------------------
  // Handlers: talk tab
  // -------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    const inFlightStartPromise = startRecordingPromiseRef.current;
    if (inFlightStartPromise) {
      return inFlightStartPromise;
    }

    const uiGeneration = uiGenerationRef.current;
    const isStale = () => uiGenerationRef.current !== uiGeneration;

    const startPromise = (async () => {
      try {
        if (isRecordingActiveRef.current) {
          clearDurationTimer();
          await stopCurrentRecording();
          if (isStale()) {
            return;
          }
        }

        const { granted } = await AudioModule.requestRecordingPermissionsAsync();
        if (isStale()) {
          return;
        }
        if (!granted) return;

        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        if (isStale()) {
          return;
        }

        await audioRecorder.prepareToRecordAsync();
        if (isStale()) {
          cleanupStaleRecording(
            "[FeedbackSheet] stale prepare cleanup failed:"
          );
          return;
        }
        audioRecorder.record();
        if (isStale()) {
          cleanupStaleRecording(
            "[FeedbackSheet] stale start cleanup failed:"
          );
          return;
        }
        setRecorderActive(true);
        setRecordingDuration(0);
        setState("recording");
        startDurationTimer();
      } catch {
        if (isStale()) {
          return;
        }
        Alert.alert("Recording Failed", "Could not start recording. Please try again.");
        setState("idle");
      } finally {
        if (uiGenerationRef.current === uiGeneration) {
          startRecordingPromiseRef.current = null;
        }
      }
    })();

    startRecordingPromiseRef.current = startPromise;
    return startPromise;
  }, [
    audioRecorder,
    cleanupStaleRecording,
    clearDurationTimer,
    setRecorderActive,
    startDurationTimer,
    stopCurrentRecording,
  ]);

  const stopRecording = useCallback(async () => {
    if (!isRecordingActiveRef.current) return;

    clearDurationTimer();
    const uiGeneration = uiGenerationRef.current;

    try {
      await stopCurrentRecording();
      if (isStaleUiGeneration(uiGeneration)) {
        return;
      }

      const uri = audioRecorder.uri;
      if (!uri) {
        Alert.alert("Recording Failed", "Could not access the recording. Please try again.");
        discardRecording();
        return;
      }

      setRecordingUri(uri);
      setState("preview");
    } catch {
      if (isStaleUiGeneration(uiGeneration)) {
        return;
      }

      if (isRecordingActiveRef.current) {
        startDurationTimer();
      }
      Alert.alert("Recording Failed", "Could not stop recording. Please try again.");
      setState("recording");
    }
  }, [
    audioRecorder,
    clearDurationTimer,
    discardRecording,
    isStaleUiGeneration,
    startDurationTimer,
    stopCurrentRecording,
  ]);

  const handleSubmitVoice = useCallback(async () => {
    if (!recordingUri) return;
    const uiGeneration = uiGenerationRef.current;
    setState("submitting");
    try {
      await submitVoiceFeedback({ fileUri: recordingUri, screenContext, episodeId });
      if (isStaleUiGeneration(uiGeneration)) {
        return;
      }
      completeSubmission(uiGeneration);
    } catch {
      if (isStaleUiGeneration(uiGeneration)) {
        return;
      }
      // Return to preview so the user can retry or discard intentionally.
      setState("preview");
    }
  }, [
    completeSubmission,
    episodeId,
    isStaleUiGeneration,
    recordingUri,
    screenContext,
  ]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    []
  );

  const renderTypeTab = () => {
    const canSubmit = text.trim().length > 0 && state !== "submitting";
    return (
      <View>
        <TextInput
          testID="text-input"
          style={styles.textInput}
          multiline
          placeholder={"Tell us what\u2019s on your mind\u2026"}
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={setText}
          editable={state !== "submitting"}
        />
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmitText}
          disabled={!canSubmit}
        >
          {state === "submitting" ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderTalkTab = () => {
    if (state === "submitting") {
      return (
        <View style={styles.talkCenter}>
          <ActivityIndicator size="large" color="#EA580C" />
        </View>
      );
    }
    if (state === "preview") {
      return (
        <View style={styles.talkCenter}>
          <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
          <View style={styles.previewButtons}>
            <TouchableOpacity testID="rerecord-button" style={styles.reRecordButton} onPress={discardRecording}>
              <Text style={styles.reRecordButtonText}>Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="submit-voice-button" style={styles.submitButton} onPress={handleSubmitVoice}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    if (state === "recording") {
      return (
        <View style={styles.talkCenter}>
          <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
          <TouchableOpacity testID="stop-button" style={styles.stopButton} onPress={stopRecording}>
            <Ionicons name="stop" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    }
    // idle
    return (
      <View style={styles.talkCenter}>
        <TouchableOpacity testID="mic-button" style={styles.micButton} onPress={startRecording}>
          <Ionicons name="mic" size={40} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.micHint}>Tap to record</Text>
      </View>
    );
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <BottomSheetModal
      ref={modalRef}
      enableDynamicSizing
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onDismiss={cleanupRecording}
    >
      <BottomSheetView style={styles.container}>
        {/* Done state */}
        {state === "done" ? (
          <View style={styles.doneContainer}>
            <Ionicons name="checkmark-circle" size={48} color="#16A34A" />
            <Text style={styles.doneText}>{"Thanks! We'll look into this."}</Text>
          </View>
        ) : (
          <>
            {/* Header */}
            <Text style={styles.header}>Send Feedback</Text>

            {/* Context chips */}
            <View style={styles.chipsRow}>
              <View style={styles.pathChip}>
                <Text style={styles.pathChipText} numberOfLines={1}>
                  {screenContext}
                </Text>
              </View>
              {episodeTitle ? (
                <View style={styles.episodeChip}>
                  <Text style={styles.episodeChipText} numberOfLines={1}>
                    {episodeTitle}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Tab bar */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabButton, tab === "type" && styles.tabButtonActive]}
                onPress={() => handleTabChange("type")}
                disabled={state === "recording"}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    tab === "type" ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  ]}
                >
                  Type
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, tab === "talk" && styles.tabButtonActive]}
                onPress={() => handleTabChange("talk")}
                disabled={state === "recording"}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    tab === "talk" ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  ]}
                >
                  Talk
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab content */}
            <View style={styles.tabContent}>
              {tab === "type" ? renderTypeTab() : renderTalkTab()}
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

FeedbackSheet.displayName = "FeedbackSheet";
export default FeedbackSheet;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    marginTop: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  pathChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 200,
  },
  pathChipText: {
    color: "#6B7280",
    fontSize: 12,
  },
  episodeChip: {
    backgroundColor: "#FFF7ED",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 200,
  },
  episodeChipText: {
    color: "#EA580C",
    fontSize: 12,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#111827",
  },
  tabButtonTextInactive: {
    color: "#9CA3AF",
  },
  tabContent: {
    minHeight: 180,
  },
  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: "#111827",
    textAlignVertical: "top",
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: "#EA580C",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  talkCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 16,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  micHint: {
    color: "#6B7280",
    fontSize: 14,
  },
  stopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  durationText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  previewButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  reRecordButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  reRecordButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  doneContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  doneText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
});
