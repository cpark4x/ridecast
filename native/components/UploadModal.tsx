import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
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
import { uploadFile, uploadUrl } from "../lib/api";
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
const SHEET_HEIGHT = 600; // approx px; large enough for keyboard avoidance

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
  const [targetMinutes, setTargetMinutes] = useState<number>(
    DURATION_PRESETS[2].minutes,
  );

  const urlInputRef = useRef<TextInput>(null);

  // ── Spring animation ───────────────────────────────────────────────────────
  const sheetY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(sheetY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(sheetY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, sheetY]);

  // ── Drag-to-dismiss ────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sheetY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          handleDismiss();
        } else {
          Animated.spring(sheetY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
    }),
  ).current;

  // ── Reset when modal opens / closes ────────────────────────────────────────
  function handleDismiss() {
    setUrlText("");
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
        type: ["application/pdf", "application/epub+zip", "text/plain"],
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
      },
    });
  }

  const readingTime = uploadResult
    ? estimateReadingTime(uploadResult.wordCount)
    : null;

  return (
    <Modal
      visible={visible}
      animationType="none" // Spring animation handled by Animated.View below
      transparent
      onRequestClose={handleDismiss}
    >
      {/* Dimmed backdrop */}
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={handleDismiss}
      />

      {/* Animated sheet */}
      <Animated.View
        style={{
          transform: [{ translateY: sheetY }],
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: "white",
          overflow: "hidden",
        }}
      >
        {/* Drag handle */}
        <View
          className="items-center pt-3 pb-1"
          {...panResponder.panHandlers}
        >
          <View className="w-10 h-1 rounded-full bg-gray-300" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
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
                  <Text className="text-xs text-gray-400">(PDF, EPUB, TXT)</Text>
                </TouchableOpacity>

                {/* File upload loading */}
                {loading && !urlText.trim() && (
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
      </Animated.View>
    </Modal>
  );
}
