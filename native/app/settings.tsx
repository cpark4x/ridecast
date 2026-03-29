import React, { useCallback, useState } from "react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getStorageInfo, getAllEpisodes } from "../lib/db";
import { deleteDownload } from "../lib/downloads";
import { formatStorageSize, nextSpeed } from "../lib/utils";
import { getPrefs, setPrefs, DEFAULT_PREFS, type AppPrefs } from "../lib/prefs";
import { usePlayer } from "../lib/usePlayer";
import SettingsSection from "../components/settings/SettingsSection";
import SettingsRow from "../components/settings/SettingsRow";
import SettingsToggleRow from "../components/settings/SettingsToggleRow";
import SettingsDivider from "../components/settings/SettingsDivider";
import { useFeedbackSheet } from "../lib/useFeedbackSheet";
import { colors, borderRadius } from "../lib/theme";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DURATION_OPTIONS = [5, 10, 15, 20, 30];
const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const APP_VERSION = "1.0.0";
const BUILD_NUMBER = "42";
const ELEVENLABS_STORE_KEY = "elevenlabs_api_key";

// ---------------------------------------------------------------------------
// Settings Screen
// ---------------------------------------------------------------------------

function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { speed, setSpeed } = usePlayer();

  const [prefs, setPrefsState] = useState<AppPrefs>(DEFAULT_PREFS);
  const [storageCount, setStorageCount] = useState(0);
  const [storageBytes, setStorageBytes] = useState(0);

  // ElevenLabs key state (inline — no /elevenlabs-key route)
  const [elevenLabsKey, setElevenLabsKey] = useState("");
  const [keyDirty, setKeyDirty] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const { openFeedbackSheet } = useFeedbackSheet();

  useFocusEffect(
    useCallback(() => {
      getPrefs().then(setPrefsState).catch(() => {});
      refreshStorageInfo();
      SecureStore.getItemAsync(ELEVENLABS_STORE_KEY)
        .then((v) => { if (v) setElevenLabsKey(v); })
        .catch(() => {});
    }, []),
  );

  async function refreshStorageInfo() {
    try {
      const info = await getStorageInfo();
      setStorageCount(info.count);
      setStorageBytes(info.totalBytes);
    } catch { /* ignore */ }
  }

  async function updatePref<K extends keyof AppPrefs>(
    key: K,
    value: AppPrefs[K],
  ) {
    await setPrefs({ [key]: value });
    setPrefsState((prev) => ({ ...prev, [key]: value }));
  }

  function handleDefaultDurationPress() {
    Alert.alert(
      "Default Duration",
      "Select the default episode length",
      [
        ...DURATION_OPTIONS.map((min) => ({
          text: `${min} min${prefs.defaultDuration === min ? " ✓" : ""}`,
          onPress: () => updatePref("defaultDuration", min),
        })),
        { text: "Cancel", style: "cancel" },
      ],
    );
  }

  async function handleNotificationsToggle(enabled: boolean) {
    if (enabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Notifications Disabled",
          "Enable notifications in Settings to get alerts when episodes finish generating.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" },
          ],
        );
        return; // don't flip toggle if system permission denied
      }
    }
    await updatePref("notificationsEnabled", enabled);
  }

  function handleSpeedCycle() {
    const newSpeed = nextSpeed(speed, SPEEDS);
    setSpeed(newSpeed).catch(() => {});
  }

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

  async function handleSignOut() {
    await signOut();
    router.replace("/sign-in");
  }

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
  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundScreen }}>
      {/* Header with back button */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderDivider,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{ marginRight: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: "600", color: colors.textPrimary }}>Settings</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Account ─────────────────────────────────────────────────── */}
        <SettingsSection title="Account">
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,107,53,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Ionicons name="person" size={18} color={colors.accentPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              {fullName ? (
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.textPrimary }}>{fullName}</Text>
              ) : null}
              {email ? (
                <Text style={{ fontSize: 14, color: colors.textSecondary }} numberOfLines={1}>{email}</Text>
              ) : null}
            </View>
          </View>
          <SettingsDivider />
          <SettingsRow
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          >
            <Ionicons name="log-out-outline" size={18} color={colors.statusError} />
          </SettingsRow>
        </SettingsSection>

        {/* ── Playback ─────────────────────────────────────────────────── */}
        <SettingsSection title="Playback">
          <SettingsRow
            label="Default Duration"
            subtitle="Pre-selected length when creating an episode"
            onPress={handleDefaultDurationPress}
            rightLabel={`${prefs.defaultDuration} min`}
          />
          <SettingsDivider />
          <SettingsToggleRow
            label="Haptic Feedback"
            subtitle="Vibrations on button taps and completions"
            value={prefs.hapticsEnabled}
            onChange={(v) => updatePref("hapticsEnabled", v)}
          />
          <SettingsDivider />
          <SettingsRow
            label="Playback Speed"
            subtitle="Tap to cycle through speeds"
            onPress={handleSpeedCycle}
          >
            <View style={{
              backgroundColor: "rgba(255,107,53,0.15)",
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: borderRadius.full,
            }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.accentPrimary }}>
                {speed.toFixed(2)}x
              </Text>
            </View>
          </SettingsRow>
        </SettingsSection>

        {/* ── Notifications ─────────────────────────────────────────────── */}
        <SettingsSection title="Notifications">
          <SettingsToggleRow
            label="Episode Ready"
            subtitle="Notify when an episode finishes generating"
            value={prefs.notificationsEnabled}
            onChange={handleNotificationsToggle}
          />
        </SettingsSection>

        {/* ── ElevenLabs ───────────────────────────────────────────────── */}
        <SettingsSection title="ElevenLabs">
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: colors.textPrimary, marginBottom: 4 }}>
              API Key
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
              Optional. Enables premium voice quality for your episodes.
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.surfaceElevated,
                borderWidth: 1,
                borderColor: colors.borderInput,
                borderRadius: borderRadius.card,
                paddingHorizontal: 16,
                paddingVertical: 12,
                fontSize: 16,
                color: colors.textPrimary,
              }}
              placeholder="sk-..."
              placeholderTextColor={colors.textSecondary}
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
              style={{
                marginTop: 12,
                paddingVertical: 10,
                borderRadius: borderRadius.card,
                alignItems: "center",
                backgroundColor: keyDirty ? colors.accentPrimary : colors.surfaceElevated,
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: "600",
                color: keyDirty ? colors.textPrimary : colors.textTertiary,
              }}>
                {keySaved ? "Saved ✓" : "Save Key"}
              </Text>
            </TouchableOpacity>
          </View>
        </SettingsSection>

        {/* ── Storage ──────────────────────────────────────────────────── */}
        <SettingsSection title="Storage">
          <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: colors.textPrimary }}>
              Downloaded Episodes
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              {storageCount} file{storageCount !== 1 ? "s" : ""} ·{" "}
              {formatStorageSize(storageBytes)}
            </Text>
          </View>
          <SettingsDivider />
          <SettingsRow
            label="Clear Downloads"
            onPress={handleClearDownloads}
            destructive
            disabled={storageCount === 0}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={storageCount === 0 ? colors.textTertiary : colors.statusError}
            />
          </SettingsRow>
        </SettingsSection>

        {/* ── Support ──────────────────────────────────────────────────── */}
        <SettingsSection title="Support">
          <SettingsRow
            label="Send Feedback"
            subtitle="Report a bug or share an idea"
            onPress={openFeedbackSheet}
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
          </SettingsRow>
        </SettingsSection>

        {/* ── About ────────────────────────────────────────────────────── */}
        <SettingsSection title="About">
          <SettingsRow
            label="Ridecast"
            rightLabel={`v${APP_VERSION} (${BUILD_NUMBER})`}
          />
          <SettingsDivider />
          <SettingsRow
            label="Privacy Policy"
            onPress={() => Linking.openURL("https://ridecast.app/privacy")}
          />
        </SettingsSection>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function SettingsScreenWrapper() {
  return (
    <ErrorBoundary fallbackTitle="Settings unavailable">
      <SettingsScreen />
    </ErrorBoundary>
  );
}
