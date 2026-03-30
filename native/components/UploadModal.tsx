import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { uploadFile, uploadText, uploadUrl } from "../lib/api";
import { DURATION_PRESETS } from "../lib/constants";
import { getPrefs } from "../lib/prefs";
import type { UploadResponse } from "../lib/types";
import { estimateReadingTime } from "../lib/utils";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import DurationPicker from "./DurationPicker";
import { colors, borderRadius } from "../lib/theme";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 15_000;
const MIN_TEXT_CHARS = 100;
// Blueprint drag-handle color (not in theme — intentional narrow token)
const DRAG_HANDLE_COLOR = "#3A3A4E";
// Dark amber treatment (offline/truncation banners)
const AMBER_BG    = "rgba(217,119,6,0.15)";
const AMBER_BORDER = "rgba(217,119,6,0.3)";
const AMBER_TEXT  = "#D97706";

// ──────────────────────────────────────────────────────────────────────────────
// URL validator (synchronous — no network call)
// ──────────────────────────────────────────────────────────────────────────────

function validateUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Please enter a URL before continuing.";
  try {
    const u = new URL(trimmed);
    if (!["http:", "https:"].includes(u.protocol)) {
      return "URL must start with http:// or https://";
    }
    return null; // valid
  } catch {
    return "That doesn't look like a valid URL. Try something like https://example.com/article…";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Error message humaniser
// ──────────────────────────────────────────────────────────────────────────────

function humaniseError(err: unknown, statusCode?: number): string {
  if (statusCode === 409) {
    return "This content is already in your library.";
  }
  if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
    return "We couldn't read that page. It may require a login or be unavailable.";
  }
  if (statusCode !== undefined && statusCode >= 500) {
    return "The server ran into an error. Please try again in a moment.";
  }
  if (err instanceof Error) {
    if (err.name === "AbortError") {
      return "The request timed out. Check your connection and try again.";
    }
    if (
      err.message.toLowerCase().includes("network") ||
      err.message.toLowerCase().includes("fetch")
    ) {
      return "No internet connection. Please check your network.";
    }
  }
  return "Something went wrong. Please try again.";
}

// ──────────────────────────────────────────────────────────────────────────────
// Offline banner (from offline-guards spec — preserved)
// ──────────────────────────────────────────────────────────────────────────────

function OfflineModalBanner() {
  return (
    <View style={{
      backgroundColor: AMBER_BG,
      borderWidth: 1,
      borderColor: AMBER_BORDER,
      borderRadius: borderRadius.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    }}>
      <Ionicons name="wifi-outline" size={18} color={AMBER_TEXT} />
      <Text style={{ fontSize: 14, color: AMBER_TEXT, fontWeight: "500", flex: 1 }}>
        No internet connection — uploads are disabled until you reconnect.
      </Text>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// OR Divider
// ──────────────────────────────────────────────────────────────────────────────

function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 16, gap: 12 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderDivider }} />
      <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "500" }}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.borderDivider }} />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────────────────

interface UploadModalProps {
  visible: boolean;
  onDismiss: () => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────────────────────

export default function UploadModal({ visible, onDismiss }: UploadModalProps) {
  const router = useRouter();
  const { isConnected, isLoading: networkLoading } = useNetworkStatus();
  const offline = !networkLoading && isConnected === false;

  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rawTextInput, setRawTextInput] = useState("");
  const [targetMinutes, setTargetMinutes] = useState<number>(
    DURATION_PRESETS[2].minutes,
  );

  const urlInputRef = useRef<TextInput>(null);

  // ── Reset when modal opens / closes ──────────────────────────────────────
  function handleDismiss() {
    setUrlText("");
    setRawTextInput("");
    setLoading(false);
    setUploadResult(null);
    setErrorMsg(null);
    setTargetMinutes(DURATION_PRESETS[2].minutes);
    onDismiss();
  }

  // ── URL upload ────────────────────────────────────────────────────────────
  async function handleUrlSubmit() {
    if (offline) {
      Alert.alert("No Connection", "Please check your internet connection and try again.");
      return;
    }

    const trimmed = urlText.trim();

    // Synchronous validation — no spinner for bad input
    const validationError = validateUrl(trimmed);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const result = await uploadUrl(trimmed, { signal: controller.signal });
      setUploadResult(result);
    } catch (err: unknown) {
      const statusCode =
        err instanceof Object && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : undefined;
      setErrorMsg(humaniseError(err, statusCode));
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  // ── File upload ───────────────────────────────────────────────────────────
  async function handleFilePick() {
    if (offline) {
      Alert.alert("No Connection", "Please check your internet connection and try again.");
      return;
    }

    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/epub+zip",
          "text/plain",
          "text/markdown",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
        ],
        copyToCacheDirectory: true,
      });
    } catch {
      Alert.alert("Error", "Could not open document picker.");
      return;
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "application/octet-stream";
    const name = asset.name ?? "upload";

    setLoading(true);
    setErrorMsg(null);
    try {
      const uploadRes = await uploadFile(asset.uri, name, mimeType);
      setUploadResult(uploadRes);
    } catch (err: unknown) {
      const statusCode =
        err instanceof Object && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : undefined;
      setErrorMsg(humaniseError(err, statusCode));
    } finally {
      setLoading(false);
    }
  }

  // ── Text paste ────────────────────────────────────────────────────────────
  async function handleTextSubmit() {
    if (offline) {
      Alert.alert("No Connection", "Please check your internet connection and try again.");
      return;
    }

    const trimmed = rawTextInput.trim();
    if (trimmed.length < MIN_TEXT_CHARS) {
      setErrorMsg(`Please paste at least ${MIN_TEXT_CHARS} characters of text.`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const result = await uploadText(trimmed);
      setUploadResult(result);
    } catch (err: unknown) {
      const statusCode =
        err instanceof Object && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : undefined;
      setErrorMsg(humaniseError(err, statusCode));
    } finally {
      setLoading(false);
    }
  }

  // ── Create Episode ────────────────────────────────────────────────────────
  function handleCreateEpisode() {
    if (!uploadResult) return;
    if (offline) {
      Alert.alert("No Connection", "Please check your internet connection and try again.");
      return;
    }
    handleDismiss();
    router.push({
      pathname: "/processing",
      params: {
        contentId: uploadResult.id,
        targetMinutes: String(targetMinutes),
        title: uploadResult.title,
      },
    });
  }

  const readingTime = uploadResult
    ? estimateReadingTime(uploadResult.wordCount)
    : null;

  // Shared input style
  const inputStyle = {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: borderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  } as const;

  // Shared primary button style
  const primaryBtnStyle = {
    backgroundColor: colors.accentPrimary,
    paddingVertical: 12,
    borderRadius: borderRadius.card,
    alignItems: "center" as const,
    marginTop: 12,
  };

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={handleDismiss}
      onDismiss={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: colors.surface }}
      >
        {/* Drag handle — iOS pageSheet supports native swipe-to-dismiss */}
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: DRAG_HANDLE_COLOR }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: colors.surface }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 40,
            backgroundColor: colors.surface,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "600", color: colors.textPrimary, marginTop: 12, marginBottom: 20 }}>
            Add Content
          </Text>

          {/* Offline banner */}
          {offline && <OfflineModalBanner />}

          {/* ── Section 1: Input ──────────────────────────────────────── */}
          {!uploadResult && (
            <>
              {/* URL input */}
              <TextInput
                ref={urlInputRef}
                style={inputStyle}
                placeholder="Paste a URL…"
                placeholderTextColor={colors.textSecondary}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                value={urlText}
                onChangeText={(t) => {
                  setUrlText(t);
                  if (errorMsg) setErrorMsg(null); // clear stale error on new input
                }}
                returnKeyType="go"
                onSubmitEditing={handleUrlSubmit}
                autoFocus
                editable={!loading && !offline}
              />

              {/* Inline error */}
              {errorMsg && (
                <View style={{ marginTop: 8, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                  <Ionicons name="alert-circle" size={14} color={colors.statusError} />
                  <Text style={{ fontSize: 12, color: colors.statusError, flex: 1 }}>{errorMsg}</Text>
                </View>
              )}

              {/* Fetch URL button */}
              {urlText.trim().length > 0 && (
                <TouchableOpacity
                  onPress={handleUrlSubmit}
                  disabled={loading || offline}
                  style={[primaryBtnStyle, (loading || offline) ? { opacity: 0.7 } : {}]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: colors.textPrimary, fontWeight: "600", fontSize: 14 }}>
                      Fetch URL
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* OR divider */}
              <OrDivider />

              {/* File picker */}
              <TouchableOpacity
                onPress={handleFilePick}
                disabled={loading || offline}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: colors.borderDropzone,
                  borderRadius: borderRadius.card,
                  paddingVertical: 16,
                  gap: 8,
                  opacity: offline ? 0.5 : 1,
                }}
              >
                <Ionicons name="document-outline" size={20} color={offline ? colors.textTertiary : colors.textSecondary} />
                <Text style={{ fontSize: 16, fontWeight: "500", color: offline ? colors.textSecondary : colors.textPrimary }}>
                  Choose File
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>(PDF, EPUB, TXT, Markdown, Word .docx)</Text>
              </TouchableOpacity>

              {/* OR divider — text paste */}
              <OrDivider label="or paste text" />

              {/* Raw text input */}
              <TextInput
                style={[inputStyle, { minHeight: 100, textAlignVertical: "top" }]}
                placeholder="Paste article text here…"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={rawTextInput}
                onChangeText={(t) => {
                  setRawTextInput(t);
                  if (errorMsg) setErrorMsg(null);
                }}
                editable={!loading && !offline}
              />

              {/* Live word count hint */}
              {rawTextInput.trim().length > 0 && (
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: "right" }}>
                  ~{rawTextInput.trim().split(/\s+/).length} words
                </Text>
              )}

              {/* Use This Text button */}
              {rawTextInput.trim().length >= MIN_TEXT_CHARS && (
                <TouchableOpacity
                  onPress={handleTextSubmit}
                  disabled={loading || offline}
                  style={[primaryBtnStyle, (loading || offline) ? { opacity: 0.7 } : {}]}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={{ color: colors.textPrimary, fontWeight: "600", fontSize: 14 }}>
                      Use This Text
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* File upload loading (only for file picks, not text submits) */}
              {loading && !urlText.trim() && rawTextInput.trim().length < MIN_TEXT_CHARS && (
                <View style={{ alignItems: "center", marginTop: 24 }}>
                  <ActivityIndicator size="large" color={colors.accentPrimary} />
                  <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>
                    Processing…
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ── Section 2: Preview + Duration picker ──────────────────── */}
          {uploadResult && (
            <>
              {/* Truncation warning */}
              {uploadResult.truncationWarning && (
                <View style={{
                  marginBottom: 16,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 8,
                  backgroundColor: AMBER_BG,
                  borderWidth: 1,
                  borderColor: AMBER_BORDER,
                  borderRadius: borderRadius.card,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}>
                  <Ionicons name="warning-outline" size={16} color={AMBER_TEXT} />
                  <Text style={{ fontSize: 12, color: AMBER_TEXT, flex: 1 }}>
                    {uploadResult.truncationWarning}
                  </Text>
                </View>
              )}

              {/* Content preview */}
              <View style={{
                backgroundColor: colors.surfaceElevated,
                borderRadius: borderRadius.card,
                padding: 16,
                marginBottom: 20,
              }}>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 }}
                  numberOfLines={2}
                >
                  {uploadResult.title}
                </Text>
                {uploadResult.author && (
                  <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 8 }}>
                    {uploadResult.author}
                  </Text>
                )}
                <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                  <View style={{
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.borderInput,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: borderRadius.full,
                  }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {uploadResult.wordCount.toLocaleString()} words
                    </Text>
                  </View>
                  {readingTime !== null && (
                    <View style={{
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.borderInput,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: borderRadius.full,
                    }}>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        ~{readingTime} min read
                      </Text>
                    </View>
                  )}
                  <View style={{
                    backgroundColor: "rgba(255,107,53,0.15)",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: borderRadius.full,
                  }}>
                    <Text style={{ fontSize: 12, color: colors.accentPrimary, fontWeight: "500" }}>
                      {uploadResult.sourceType.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Duration picker */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 12 }}>
                Episode Length
              </Text>
              <DurationPicker value={targetMinutes} onChange={setTargetMinutes} />

              {/* Create Episode button */}
              <TouchableOpacity
                onPress={handleCreateEpisode}
                disabled={offline}
                style={{
                  marginTop: 24,
                  paddingVertical: 16,
                  borderRadius: borderRadius.card,
                  alignItems: "center",
                  backgroundColor: offline ? colors.surface : colors.accentPrimary,
                }}
              >
                <Text style={{
                  fontWeight: "700",
                  fontSize: 16,
                  color: offline ? colors.textTertiary : colors.textPrimary,
                }}>
                  Create Episode
                </Text>
              </TouchableOpacity>

              {/* Change content */}
              <TouchableOpacity
                onPress={() => setUploadResult(null)}
                style={{ marginTop: 12, alignItems: "center" }}
              >
                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                  Use different content
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
