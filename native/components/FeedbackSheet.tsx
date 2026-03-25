import React, {
  forwardRef,
  useCallback,
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
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";
import { submitTextFeedback, submitVoiceFeedback } from "../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedbackSheetRef {
  open(): void;
}

type Tab = "type" | "talk";
type SheetState = "idle" | "recording" | "preview" | "submitting" | "done";

// ---------------------------------------------------------------------------
// Helper: format seconds as mm:ss
// ---------------------------------------------------------------------------

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FeedbackSheet = forwardRef<FeedbackSheetRef>((_props, ref) => {
  const modalRef = useRef<BottomSheetModal>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
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

  const cleanupRecording = useCallback(() => {
    clearDurationTimer();
    // Cancel any pending auto-dismiss so a stale timer from a prior session
    // cannot dismiss a freshly reopened sheet.
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
  }, [clearDurationTimer]);

  // -------------------------------------------------------------------------
  // Imperative handle
  // -------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    open() {
      // Cancel any pending dismiss timer from a prior submit before resetting
      // state, so a stale timer cannot later dismiss this freshly opened sheet.
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      cleanupRecording();
      setTab("type");
      setText("");
      setState("idle");
      setRecordingUri(null);
      setRecordingDuration(0);
      modalRef.current?.present();
    },
  }));

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
    setState("submitting");
    try {
      await submitTextFeedback({ text, screenContext, episodeId });
      setState("done");
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        modalRef.current?.dismiss();
      }, 1500);
    } catch {
      Alert.alert("Submission Failed", "Your feedback could not be sent. Please try again.");
      setState("idle");
    }
  }, [text, screenContext, episodeId]);

  // -------------------------------------------------------------------------
  // Handlers: talk tab
  // -------------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      recordingRef.current = recording;
      setRecordingDuration(0);
      setState("recording");

      // Duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      Alert.alert("Recording Failed", "Could not start recording. Please try again.");
      setState("idle");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    clearDurationTimer();
    try {
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      setRecordingUri(uri);
      setState("preview");
    } catch {
      Alert.alert("Recording Failed", "Could not stop recording. Please try again.");
      setState("idle");
    }
  }, [clearDurationTimer]);

  const discardRecording = useCallback(() => {
    setRecordingUri(null);
    setRecordingDuration(0);
    setState("idle");
  }, []);

  const handleSubmitVoice = useCallback(async () => {
    if (!recordingUri) return;
    setState("submitting");
    try {
      await submitVoiceFeedback({ fileUri: recordingUri, screenContext, episodeId });
      setState("done");
      dismissTimerRef.current = setTimeout(() => {
        dismissTimerRef.current = null;
        modalRef.current?.dismiss();
      }, 1500);
    } catch {
      // Return to preview so the user can retry or discard intentionally.
      setState("preview");
    }
  }, [recordingUri, screenContext, episodeId]);

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
