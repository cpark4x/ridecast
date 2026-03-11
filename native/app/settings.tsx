import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getStorageInfo, deleteDownloadRecord, getAllEpisodes } from "../lib/db";
import { deleteDownload } from "../lib/downloads";
import { formatStorageSize, nextSpeed } from "../lib/utils";
import { usePlayer } from "../lib/usePlayer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const ELEVENLABS_STORE_KEY = "elevenlabs_api_key";
const APP_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Section + Row helpers
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2 mt-6">
      {title}
    </Text>
  );
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View className="mx-4 bg-white rounded-xl overflow-hidden border border-gray-100">
      {children}
    </View>
  );
}

function RowDivider() {
  return <View className="h-px bg-gray-100 mx-4" />;
}

// ---------------------------------------------------------------------------
// Settings Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { speed, setSpeed } = usePlayer();

  // ElevenLabs key state
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [keyDirty, setKeyDirty] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  // Storage state
  const [storageCount, setStorageCount] = useState(0);
  const [storageBytes, setStorageBytes] = useState(0);

  // Load stored key + storage info on mount
  useEffect(() => {
    SecureStore.getItemAsync(ELEVENLABS_STORE_KEY)
      .then((val) => {
        if (val) setElevenLabsKey(val);
      })
      .catch(() => {});

    refreshStorageInfo();
  }, []);

  async function refreshStorageInfo() {
    try {
      const info = await getStorageInfo();
      setStorageCount(info.count);
      setStorageBytes(info.totalBytes);
    } catch {
      /* ignore */
    }
  }

  // ── Account ──────────────────────────────────────────────────────────────

  async function handleSignOut() {
    await signOut();
    router.replace("/sign-in");
  }

  // ── Playback ─────────────────────────────────────────────────────────────

  function handleSpeedCycle() {
    const newSpeed = nextSpeed(speed, SPEEDS);
    setSpeed(newSpeed).catch(() => {});
  }

  // ── ElevenLabs ───────────────────────────────────────────────────────────

  async function handleSaveKey() {
    try {
      await SecureStore.setItemAsync(ELEVENLABS_STORE_KEY, elevenLabsKey.trim());
      setKeyDirty(false);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2000);
    } catch {
      Alert.alert("Error", "Could not save API key.");
    }
  }

  // ── Storage ──────────────────────────────────────────────────────────────

  function handleClearDownloads() {
    Alert.alert(
      "Clear Downloads",
      `Delete ${storageCount} downloaded file${storageCount !== 1 ? "s" : ""} (${formatStorageSize(storageBytes)})? You can re-download at any time.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const episodes = await getAllEpisodes();
              for (const item of episodes) {
                for (const version of item.versions) {
                  if (version.audioId) {
                    await deleteDownload(version.audioId).catch(() => {});
                  }
                }
              }
              await refreshStorageInfo();
            } catch {
              Alert.alert("Error", "Could not clear downloads.");
            }
          },
        },
      ],
    );
  }

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;
  const email =
    user?.primaryEmailAddress?.emailAddress ?? null;

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{ paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Account ──────────────────────────────────────────────────── */}
      <SectionHeader title="Account" />
      <SettingsCard>
        {/* User info */}
        <View className="px-4 py-4 flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-orange-100 items-center justify-center">
            <Ionicons name="person" size={18} color="#EA580C" />
          </View>
          <View className="flex-1">
            {fullName ? (
              <Text className="text-base font-semibold text-gray-900">{fullName}</Text>
            ) : null}
            {email ? (
              <Text className="text-sm text-gray-500" numberOfLines={1}>{email}</Text>
            ) : null}
          </View>
        </View>

        <RowDivider />

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="px-4 py-4 flex-row items-center justify-between"
        >
          <Text className="text-base text-red-500 font-medium">Sign Out</Text>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </SettingsCard>

      {/* ── Playback ─────────────────────────────────────────────────── */}
      <SectionHeader title="Playback" />
      <SettingsCard>
        <TouchableOpacity
          onPress={handleSpeedCycle}
          className="px-4 py-4 flex-row items-center justify-between"
        >
          <View>
            <Text className="text-base font-medium text-gray-900">Playback Speed</Text>
            <Text className="text-xs text-gray-500 mt-0.5">Tap to cycle through speeds</Text>
          </View>
          <View className="bg-orange-100 px-3 py-1 rounded-full">
            <Text className="text-sm font-bold text-brand">{speed.toFixed(2)}x</Text>
          </View>
        </TouchableOpacity>
      </SettingsCard>

      {/* ── ElevenLabs ───────────────────────────────────────────────── */}
      <SectionHeader title="ElevenLabs" />
      <SettingsCard>
        <View className="px-4 pt-4 pb-3">
          <Text className="text-base font-medium text-gray-900 mb-1">API Key</Text>
          <Text className="text-xs text-gray-500 mb-3">
            Optional. Enables premium voice quality for your episodes.
          </Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"
            placeholder="sk-..."
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={elevenLabsKey}
            onChangeText={(v) => {
              setElevenLabsKey(v);
              setKeyDirty(true);
              setKeySaved(false);
            }}
          />
          <TouchableOpacity
            onPress={handleSaveKey}
            disabled={!keyDirty}
            className={`mt-3 py-2.5 rounded-xl items-center ${
              keyDirty ? "bg-brand" : "bg-gray-200"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                keyDirty ? "text-white" : "text-gray-400"
              }`}
            >
              {keySaved ? "Saved ✓" : "Save Key"}
            </Text>
          </TouchableOpacity>
        </View>
      </SettingsCard>

      {/* ── Storage ──────────────────────────────────────────────────── */}
      <SectionHeader title="Storage" />
      <SettingsCard>
        {/* Storage info row */}
        <View className="px-4 py-4 flex-row items-center justify-between">
          <Text className="text-base font-medium text-gray-900">Downloaded Episodes</Text>
          <Text className="text-sm text-gray-500">
            {storageCount} episode{storageCount !== 1 ? "s" : ""} · {formatStorageSize(storageBytes)}
          </Text>
        </View>

        <RowDivider />

        {/* Clear downloads */}
        <TouchableOpacity
          onPress={handleClearDownloads}
          disabled={storageCount === 0}
          className="px-4 py-4 flex-row items-center justify-between"
        >
          <Text
            className={`text-base font-medium ${
              storageCount === 0 ? "text-gray-400" : "text-red-500"
            }`}
          >
            Clear Downloads
          </Text>
          <Ionicons
            name="trash-outline"
            size={18}
            color={storageCount === 0 ? "#D1D5DB" : "#EF4444"}
          />
        </TouchableOpacity>
      </SettingsCard>

      {/* ── About ────────────────────────────────────────────────────── */}
      <SectionHeader title="About" />
      <SettingsCard>
        <View className="px-4 py-4 flex-row items-center justify-between">
          <Text className="text-base font-medium text-gray-900">Ridecast</Text>
          <Text className="text-sm text-gray-500">v{APP_VERSION}</Text>
        </View>
      </SettingsCard>
    </ScrollView>
  );
}
