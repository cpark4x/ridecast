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

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 15_000;
const MIN_TEXT_CHARS = 100;

// ─────────────────────────────────────────────────────────────────────────────
// URL validator (synchronous — no network call)
// ─────────────────────────────────────────────────────────────────────────────

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
    return "That doesn't look like a valid URL. Try something like https://example.com/article\u2026";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error message humaniser
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Offline banner (from offline-guards spec — preserved)
// ─────────────────────────────────────────────────────────────────────────────

function OfflineModalBanner() {
  return (
    <View className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex-row items-center gap-2">
      <Ionicons name="wifi-outline" size={18} color="#D97706" />
      <Text className="text-sm text-amber-700 font-medium flex-1">
        No internet connection — uploads are disabled until you reconnect.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface UploadModalProps {
  visible: boolean;
  onDismiss: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Reset when modal opens / closes ────────────────────────────────────────
  function handleDismiss() {
    setUrlText("");
    setRawTextInput("");
    setLoading(false);
    setUploadResult(null);
    setErrorMsg(null);
    setTargetMinutes(DURATION_PRESETS[2].minutes);
    onDismiss();
  }

  // ── URL upload ─────────────────────────────────────────────────────────────
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

  // ── File upload ────────────────────────────────────────────────────────────
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

  // ── Text paste ──────────────────────────────────────────────
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

  // ── Create Episode ─────────────────────────────────────────────────────────
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
        style={{ flex: 1, backgroundColor: "white" }}
      >
        {/* Drag handle — iOS pageSheet supports native swipe-to-dismiss */}
        <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D5DB" }} />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
            <Text className="text-xl font-bold text-gray-900 mt-3 mb-5">
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
                  className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                  placeholder="Paste a URL\u2026"
                  placeholderTextColor="#9CA3AF"
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
                  <View className="mt-2 flex-row items-start gap-2">
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text className="text-xs text-red-500 flex-1">{errorMsg}</Text>
                  </View>
                )}

                {/* Fetch URL button */}
                {urlText.trim().length > 0 && (
                  <TouchableOpacity
                    onPress={handleUrlSubmit}
                    disabled={loading || offline}
                    className={`mt-3 bg-brand py-3 rounded-xl items-center ${loading || offline ? "opacity-70" : ""}`}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold text-sm">
                        Fetch URL
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* OR divider */}
                <View className="flex-row items-center my-4 gap-3">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="text-xs text-gray-400 font-medium">or</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

                {/* File picker */}
                <TouchableOpacity
                  onPress={handleFilePick}
                  disabled={loading || offline}
                  className={`flex-row items-center justify-center border-2 border-dashed rounded-xl py-4 gap-2 ${
                    offline ? "border-gray-200 opacity-50" : "border-gray-300"
                  }`}
                >
                  <Ionicons name="document-outline" size={20} color={offline ? "#D1D5DB" : "#6B7280"} />
                  <Text className={`text-base font-medium ${offline ? "text-gray-400" : "text-gray-600"}`}>
                    Choose File
                  </Text>
                  <Text className="text-xs text-gray-400">(PDF, EPUB, TXT, DOCX)</Text>
                </TouchableOpacity>

                {/* OR divider — text paste */}
                <View className="flex-row items-center my-4 gap-3">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="text-xs text-gray-400 font-medium">or paste text</Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

                {/* Raw text input */}
                <TextInput
                  className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                  placeholder="Paste article text here…"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                  value={rawTextInput}
                  onChangeText={(t) => {
                    setRawTextInput(t);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  editable={!loading && !offline}
                />

                {/* Live word count hint */}
                {rawTextInput.trim().length > 0 && (
                  <Text className="text-xs text-gray-400 mt-1 text-right">
                    ~{rawTextInput.trim().split(/\s+/).length} words
                  </Text>
                )}

                {/* Use This Text button */}
                {rawTextInput.trim().length >= MIN_TEXT_CHARS && (
                  <TouchableOpacity
                    onPress={handleTextSubmit}
                    disabled={loading || offline}
                    className={`mt-3 bg-brand py-3 rounded-xl items-center ${loading || offline ? "opacity-70" : ""}`}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-white font-semibold text-sm">
                        Use This Text
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* File upload loading (only for file picks, not text submits) */}
                {loading && !urlText.trim() && rawTextInput.trim().length < MIN_TEXT_CHARS && (
                  <View className="items-center mt-6">
                    <ActivityIndicator size="large" color="#EA580C" />
                    <Text className="text-sm text-gray-500 mt-2">
                      Processing\u2026
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
                  <View className="mb-4 flex-row items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    <Ionicons name="warning-outline" size={16} color="#D97706" />
                    <Text className="text-xs text-amber-700 flex-1">
                      {uploadResult.truncationWarning}
                    </Text>
                  </View>
                )}

                {/* Content preview */}
                <View className="bg-gray-50 rounded-2xl p-4 mb-5">
                  <Text
                    className="text-base font-bold text-gray-900 mb-1"
                    numberOfLines={2}
                  >
                    {uploadResult.title}
                  </Text>
                  {uploadResult.author && (
                    <Text className="text-sm text-gray-500 mb-2">
                      {uploadResult.author}
                    </Text>
                  )}
                  <View className="flex-row gap-3 flex-wrap">
                    <View className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                      <Text className="text-xs text-gray-600">
                        {uploadResult.wordCount.toLocaleString()} words
                      </Text>
                    </View>
                    {readingTime !== null && (
                      <View className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                        <Text className="text-xs text-gray-600">
                          ~{readingTime} min read
                        </Text>
                      </View>
                    )}
                    <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                      <Text className="text-xs text-orange-700 font-medium">
                        {uploadResult.sourceType.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Duration picker */}
                <Text className="text-sm font-semibold text-gray-700 mb-3">
                  Episode Length
                </Text>
                <DurationPicker value={targetMinutes} onChange={setTargetMinutes} />

                {/* Create Episode button */}
                <TouchableOpacity
                  onPress={handleCreateEpisode}
                  disabled={offline}
                  className={`mt-6 py-4 rounded-2xl items-center ${offline ? "bg-gray-300" : "bg-brand"}`}
                >
                  <Text className={`font-bold text-base ${offline ? "text-gray-500" : "text-white"}`}>
                    Create Episode
                  </Text>
                </TouchableOpacity>

                {/* Change content */}
                <TouchableOpacity
                  onPress={() => setUploadResult(null)}
                  className="mt-3 items-center"
                >
                  <Text className="text-sm text-gray-400">
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
