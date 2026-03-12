# Feature: Settings & Onboarding Polish

> Add missing settings (default duration, haptics toggle, notification preferences), first-run tooltip hints, and settings screen cleanup using persistent AsyncStorage preferences.

## Motivation

The settings screen is sparse and missing options users expect. New users have no in-app guidance about the core "paste URL → episode" flow. Adding a sensible settings surface and lightweight first-run hints removes the "what do I do now?" confusion without a heavy onboarding wizard.

## Scope

- **New `native/lib/prefs.ts`** — AsyncStorage-backed preferences module
- **Rebuild `native/app/settings.tsx`** — add Playback, Notifications, Account, Storage, About sections
- **New `SettingsSection` / `SettingsToggleRow`** helper components
- **Wire `defaultDuration`** into `UploadModal.tsx` DurationPicker initial value
- **First-run tooltip** in Library screen (or Home screen) near FAB
- **No** iCloud/server sync of preferences — AsyncStorage local only
- **No** user-configurable voice selection
- **No** interactive onboarding tour — tooltip-style hints only
- Haptics toggle wires into the `Haptics` wrapper from the `haptic-feedback` spec

## Changes

### 1. Preferences module — `native/lib/prefs.ts` (new)

```typescript
// native/lib/prefs.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "@ridecast/prefs/v1";

export interface AppPrefs {
  defaultDuration: number;        // minutes: 5, 10, 15, 20, 30 — default: 10
  hapticsEnabled: boolean;        // default: true
  notificationsEnabled: boolean;  // default: false (not-yet-requested)
  hasSeenOnboarding: boolean;     // default: false
}

export const DEFAULT_PREFS: AppPrefs = {
  defaultDuration: 10,
  hapticsEnabled: true,
  notificationsEnabled: false,
  hasSeenOnboarding: false,
};

export async function getPrefs(): Promise<AppPrefs> {
  try {
    const stored = await AsyncStorage.getItem(PREFS_KEY);
    if (!stored) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(stored) } as AppPrefs;
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function setPrefs(update: Partial<AppPrefs>): Promise<void> {
  const current = await getPrefs();
  const next = { ...current, ...update };
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
}

export async function resetPrefs(): Promise<void> {
  await AsyncStorage.removeItem(PREFS_KEY);
}
```

### 2. Reusable settings UI components — `native/components/settings/`

#### `native/components/settings/SettingsSection.tsx` (new)

```tsx
// native/components/settings/SettingsSection.tsx
import React from "react";
import { Text, View } from "react-native";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="mt-6">
      <Text className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        {title}
      </Text>
      <View className="mx-4 bg-white rounded-2xl overflow-hidden border border-gray-100">
        {children}
      </View>
    </View>
  );
}
```

#### `native/components/settings/SettingsRow.tsx` (new)

```tsx
// native/components/settings/SettingsRow.tsx
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SettingsRowProps {
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightLabel?: string;
  children?: React.ReactNode;
  destructive?: boolean;
}

export default function SettingsRow({
  label,
  subtitle,
  onPress,
  rightLabel,
  children,
  destructive = false,
}: SettingsRowProps) {
  const inner = (
    <View className="px-4 py-4 flex-row items-center justify-between">
      <View className="flex-1 mr-3">
        <Text
          className={`text-base font-medium ${
            destructive ? "text-red-500" : "text-gray-900"
          }`}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
        ) : null}
      </View>
      {children ?? (
        <View className="flex-row items-center gap-1">
          {rightLabel ? (
            <Text className="text-sm text-gray-400">{rightLabel}</Text>
          ) : null}
          {onPress ? (
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          ) : null}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}
```

#### `native/components/settings/SettingsToggleRow.tsx` (new)

```tsx
// native/components/settings/SettingsToggleRow.tsx
import React from "react";
import { Switch, Text, View } from "react-native";

interface SettingsToggleRowProps {
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: (value: boolean) => void | Promise<void>;
  disabled?: boolean;
}

export default function SettingsToggleRow({
  label,
  subtitle,
  value,
  onChange,
  disabled = false,
}: SettingsToggleRowProps) {
  return (
    <View className="px-4 py-3.5 flex-row items-center justify-between">
      <View className="flex-1 mr-4">
        <Text className={`text-base font-medium ${disabled ? "text-gray-400" : "text-gray-900"}`}>
          {label}
        </Text>
        {subtitle ? (
          <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: "#D1D5DB", true: "#EA580C" }}
        thumbColor="white"
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}
```

#### `native/components/settings/SettingsDivider.tsx` (new)

```tsx
// native/components/settings/SettingsDivider.tsx
import React from "react";
import { View } from "react-native";

export default function SettingsDivider() {
  return <View className="h-px bg-gray-100 mx-4" />;
}
```

### 3. Rebuilt settings screen — `native/app/settings.tsx`

Full replacement:

```tsx
// native/app/settings.tsx
import React, { useCallback, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getStorageInfo, getAllEpisodes } from "../lib/db";
import { deleteDownload } from "../lib/downloads";
import { formatStorageSize } from "../lib/utils";
import { getPrefs, setPrefs, DEFAULT_PREFS, type AppPrefs } from "../lib/prefs";
import { usePlayer } from "../lib/usePlayer";
import SettingsSection from "../components/settings/SettingsSection";
import SettingsRow from "../components/settings/SettingsRow";
import SettingsToggleRow from "../components/settings/SettingsToggleRow";
import SettingsDivider from "../components/settings/SettingsDivider";

const DURATION_OPTIONS = [5, 10, 15, 20, 30];
const APP_VERSION = "1.0.0";
const BUILD_NUMBER = "42";
const ELEVENLABS_STORE_KEY = "elevenlabs_api_key";

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { speed } = usePlayer();

  const [prefs, setPrefsState] = useState<AppPrefs>(DEFAULT_PREFS);
  const [storageCount, setStorageCount] = useState(0);
  const [storageBytes, setStorageBytes] = useState(0);
  const [elevenLabsKey, setElevenLabsKey] = useState("");

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
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header with back button */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="mr-3"
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900">Settings</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Account ──────────────────────────────────────── */}
        <SettingsSection title="Account">
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
          <SettingsDivider />
          <SettingsRow
            label="Sign Out"
            onPress={handleSignOut}
            destructive
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </SettingsRow>
        </SettingsSection>

        {/* ── Playback ─────────────────────────────────────── */}
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
          >
            <View className="bg-orange-100 px-3 py-1 rounded-full">
              <Text className="text-sm font-bold text-brand">{speed.toFixed(2)}x</Text>
            </View>
          </SettingsRow>
        </SettingsSection>

        {/* ── Notifications ────────────────────────────────── */}
        <SettingsSection title="Notifications">
          <SettingsToggleRow
            label="Episode Ready"
            subtitle="Notify when an episode finishes generating"
            value={prefs.notificationsEnabled}
            onChange={handleNotificationsToggle}
          />
        </SettingsSection>

        {/* ── ElevenLabs ───────────────────────────────────── */}
        <SettingsSection title="ElevenLabs">
          <SettingsRow
            label="API Key"
            subtitle={
              elevenLabsKey
                ? "Premium voice quality enabled"
                : "Optional — enables premium voice quality"
            }
            onPress={() => router.push("/elevenlabs-key")}
            rightLabel={elevenLabsKey ? "Configured ✓" : "Not set"}
          />
        </SettingsSection>

        {/* ── Storage ──────────────────────────────────────── */}
        <SettingsSection title="Storage">
          <View className="px-4 py-4 flex-row items-center justify-between">
            <Text className="text-base font-medium text-gray-900">
              Downloaded Episodes
            </Text>
            <Text className="text-sm text-gray-500">
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
              color={storageCount === 0 ? "#D1D5DB" : "#EF4444"}
            />
          </SettingsRow>
        </SettingsSection>

        {/* ── About ────────────────────────────────────────── */}
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
    </SafeAreaView>
  );
}
```

### 4. Wire `defaultDuration` into UploadModal — `native/components/UploadModal.tsx`

**Before:**
```typescript
const [targetMinutes, setTargetMinutes] = useState<number>(DURATION_PRESETS[2].minutes); // default: 5 min
```

**After:**
```typescript
import { getPrefs } from "../lib/prefs";

// Inside component, replace the useState:
const [targetMinutes, setTargetMinutes] = useState<number>(DURATION_PRESETS[2].minutes);

// Add effect to load pref on mount:
useEffect(() => {
  getPrefs()
    .then((p) => setTargetMinutes(p.defaultDuration))
    .catch(() => {});
}, []);
```

### 5. First-run tooltip — `native/app/(tabs)/library.tsx`

Add tooltip state and render near the FAB. Wire dismissal on FAB tap.

**Add to `LibraryScreen` state:**
```typescript
import { getPrefs, setPrefs } from "../../lib/prefs";

const [showOnboardingHint, setShowOnboardingHint] = useState(false);

// Add to existing useEffect or create new one triggered by episodes length:
useEffect(() => {
  if (episodes.length === 0) {
    getPrefs().then((p) => {
      if (!p.hasSeenOnboarding) setShowOnboardingHint(true);
    }).catch(() => {});
  }
}, [episodes.length]);

async function dismissOnboardingHint() {
  setShowOnboardingHint(false);
  await setPrefs({ hasSeenOnboarding: true }).catch(() => {});
}
```

**Update FAB `onPress`:**
```tsx
<TouchableOpacity
  onPress={() => {
    void dismissOnboardingHint();
    setUploadModalVisible(true);
  }}
  className="absolute bottom-8 right-6 w-14 h-14 bg-brand rounded-full items-center justify-center shadow-lg"
  style={{ elevation: 6 }}
  accessibilityLabel="Add content"
>
  <Ionicons name="add" size={28} color="white" />
</TouchableOpacity>

{/* Onboarding hint tooltip */}
{showOnboardingHint && (
  <TouchableOpacity
    onPress={dismissOnboardingHint}
    className="absolute bottom-24 right-4"
    activeOpacity={0.8}
  >
    <View className="bg-gray-900 rounded-2xl px-4 py-3 max-w-52">
      <Text className="text-sm text-white font-medium">
        Tap + to add your first episode
      </Text>
      <Text className="text-xs text-gray-400 mt-0.5">
        Paste a URL or upload a file
      </Text>
      {/* Pointer arrow */}
      <View
        className="absolute -bottom-2 right-6 w-3 h-3 bg-gray-900 rotate-45"
        style={{ transform: [{ rotate: "45deg" }] }}
      />
    </View>
  </TouchableOpacity>
)}
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/lib/prefs.ts` | **New** — AsyncStorage preferences module |
| `native/components/settings/SettingsSection.tsx` | **New** — section wrapper |
| `native/components/settings/SettingsRow.tsx` | **New** — tappable row |
| `native/components/settings/SettingsToggleRow.tsx` | **New** — toggle row |
| `native/components/settings/SettingsDivider.tsx` | **New** — divider |
| `native/app/settings.tsx` | Rebuilt: Playback, Notifications, Account, Storage, About sections; `getPrefs()` loaded on focus |
| `native/components/UploadModal.tsx` | Read `defaultDuration` pref to initialize `DurationPicker` |
| `native/app/(tabs)/library.tsx` | First-run tooltip near FAB; dismiss + mark seen on FAB tap |

## Tests

```typescript
// native/__tests__/prefs.test.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPrefs, setPrefs, resetPrefs, DEFAULT_PREFS } from "../lib/prefs";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("getPrefs", () => {
  it("returns DEFAULT_PREFS when nothing is stored", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const prefs = await getPrefs();
    expect(prefs).toEqual(DEFAULT_PREFS);
  });

  it("merges stored values over defaults", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ defaultDuration: 20, hasSeenOnboarding: true }),
    );
    const prefs = await getPrefs();
    expect(prefs.defaultDuration).toBe(20);
    expect(prefs.hasSeenOnboarding).toBe(true);
    expect(prefs.hapticsEnabled).toBe(DEFAULT_PREFS.hapticsEnabled); // default preserved
  });

  it("returns defaults when AsyncStorage throws", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("disk error"));
    const prefs = await getPrefs();
    expect(prefs).toEqual(DEFAULT_PREFS);
  });
});

describe("setPrefs", () => {
  it("merges update into existing prefs and writes to storage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({ defaultDuration: 10 }),
    );
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);

    await setPrefs({ defaultDuration: 15 });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@ridecast/prefs/v1",
      expect.stringContaining('"defaultDuration":15'),
    );
  });
});

describe("resetPrefs", () => {
  it("removes the storage key", async () => {
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValueOnce(undefined);
    await resetPrefs();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@ridecast/prefs/v1");
  });
});
```

## Success Criteria

```bash
# TypeScript clean
cd native && npx tsc --noEmit
# → 0 errors

# Unit tests pass
cd native && npx jest __tests__/prefs.test.ts --no-coverage
# → Test Suites: 1 passed, 1 total

# Manual verification checklist:
# 1. Settings → Playback → Default Duration → pick 20 min
# 2. Open Upload modal → DurationPicker pre-selects 20 min
# 3. Restart app → open Upload modal → still pre-selects 20 min
# 4. Settings → Notifications → Episode Ready toggle → system permission dialog fires (first time)
# 5. Fresh install (or clear AsyncStorage): open Library tab with no episodes → tooltip appears near FAB
# 6. Tap FAB → tooltip disappears
# 7. Kill/reopen app → tooltip does NOT appear again
```

- Settings screen renders all sections without crash
- Prefs persist between app restarts (verified by killing and reopening app)
- Default duration flows into DurationPicker on fresh UploadModal open
- Notifications toggle only flips after system permission granted
