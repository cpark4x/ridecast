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
import { uploadFile, uploadUrl } from "../lib/api";
import { DURATION_PRESETS } from "../lib/constants";
import type { UploadResponse } from "../lib/types";
import { estimateReadingTime } from "../lib/utils";
import DurationPicker from "./DurationPicker";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UploadModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function UploadModal({ visible, onDismiss }: UploadModalProps) {
  const router = useRouter();

  const [urlText, setUrlText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [targetMinutes, setTargetMinutes] = useState(DURATION_PRESETS[2].minutes); // default: 5 min

  const urlInputRef = useRef<TextInput>(null);

  // ── Reset when modal opens / closes ──────────────────────────────────────
  function handleDismiss() {
    setUrlText("");
    setLoading(false);
    setUploadResult(null);
    setErrorMsg(null);
    setTargetMinutes(DURATION_PRESETS[2].minutes);
    onDismiss();
  }

  // ── URL upload ────────────────────────────────────────────────────────────
  async function handleUrlSubmit() {
    const trimmed = urlText.trim();
    if (!trimmed) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await uploadUrl(trimmed);
      setUploadResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── File upload ───────────────────────────────────────────────────────────
  async function handleFilePick() {
    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/epub+zip",
          "text/plain",
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
      const msg = err instanceof Error ? err.message : "Upload failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  // ── Create Episode ────────────────────────────────────────────────────────
  function handleCreateEpisode() {
    if (!uploadResult) return;
    handleDismiss();
    router.push({
      pathname: "/processing",
      params: {
        contentId: uploadResult.id,
        targetMinutes: String(targetMinutes),
      },
    });
  }

  const readingTime = uploadResult ? estimateReadingTime(uploadResult.wordCount) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
      {/* Dimmed backdrop */}
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={handleDismiss}
      />

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="bg-white rounded-t-3xl"
      >
        {/* Drag handle */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 rounded-full bg-gray-300" />
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <Text className="text-xl font-bold text-gray-900 mt-3 mb-5">Add Content</Text>

          {/* ── Section 1: Input ─────────────────────────────────────────── */}
          {!uploadResult && (
            <>
              {/* URL input */}
              <TextInput
                ref={urlInputRef}
                className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
                placeholder="Paste a URL…"
                placeholderTextColor="#9CA3AF"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                value={urlText}
                onChangeText={setUrlText}
                returnKeyType="go"
                onSubmitEditing={handleUrlSubmit}
                autoFocus
              />

              {urlText.trim().length > 0 && !loading && (
                <TouchableOpacity
                  onPress={handleUrlSubmit}
                  className="mt-2 bg-brand py-2.5 rounded-xl items-center"
                >
                  <Text className="text-white font-semibold text-sm">Fetch URL</Text>
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
                disabled={loading}
                className="flex-row items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-4 gap-2"
              >
                <Ionicons name="document-outline" size={20} color="#6B7280" />
                <Text className="text-base text-gray-600 font-medium">Choose File</Text>
                <Text className="text-xs text-gray-400">(PDF, EPUB, TXT)</Text>
              </TouchableOpacity>

              {/* Loading spinner */}
              {loading && (
                <View className="items-center mt-6">
                  <ActivityIndicator size="large" color="#EA580C" />
                  <Text className="text-sm text-gray-500 mt-2">Processing…</Text>
                </View>
              )}

              {/* Error */}
              {errorMsg && (
                <View className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <Text className="text-sm text-red-700">{errorMsg}</Text>
                </View>
              )}
            </>
          )}

          {/* ── Section 2: Preview + Duration picker ─────────────────────── */}
          {uploadResult && (
            <>
              {/* Content preview */}
              <View className="bg-gray-50 rounded-2xl p-4 mb-5">
                <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={2}>
                  {uploadResult.title}
                </Text>
                {uploadResult.author && (
                  <Text className="text-sm text-gray-500 mb-2">{uploadResult.author}</Text>
                )}
                <View className="flex-row gap-3 flex-wrap">
                  <View className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    <Text className="text-xs text-gray-600">
                      {uploadResult.wordCount.toLocaleString()} words
                    </Text>
                  </View>
                  {readingTime !== null && (
                    <View className="bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                      <Text className="text-xs text-gray-600">~{readingTime} min read</Text>
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
              <Text className="text-sm font-semibold text-gray-700 mb-3">Episode Length</Text>
              <DurationPicker value={targetMinutes} onChange={setTargetMinutes} />

              {/* Create Episode button */}
              <TouchableOpacity
                onPress={handleCreateEpisode}
                className="mt-6 bg-brand py-4 rounded-2xl items-center"
              >
                <Text className="text-white font-bold text-base">Create Episode</Text>
              </TouchableOpacity>

              {/* Change content */}
              <TouchableOpacity
                onPress={() => setUploadResult(null)}
                className="mt-3 items-center"
              >
                <Text className="text-sm text-gray-400">Use different content</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
