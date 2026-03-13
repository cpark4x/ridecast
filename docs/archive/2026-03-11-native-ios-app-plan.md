# Native iOS App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship Ridecast as a native iOS app using Expo — full pipeline from upload to playback, with offline support, CarPlay, and lock screen controls.

**Architecture:** Expo managed workflow, calling existing Next.js API. Local SQLite cache for offline resilience. react-native-track-player for audio with auto-download of generated episodes.

**Tech Stack:** Expo (React Native), TypeScript, expo-router, expo-sqlite, react-native-track-player, @clerk/clerk-expo, NativeWind, @g4rb4g3/react-native-carplay

---

## Reference

### API Base URL

The native app calls the existing Next.js backend. Set `EXPO_PUBLIC_API_URL` in `.env`:
- Dev: `http://localhost:3000`
- Prod: `https://ridecast.app` (or whatever the production URL is)

### API Contracts

All endpoints require Clerk auth token in `Authorization: Bearer <token>` header.

| Endpoint | Method | Request | Response |
|---|---|---|---|
| `/api/upload` | POST | multipart/form-data: `file` or `url` | `{ id, title, author, rawText, wordCount, sourceType, sourceUrl, contentHash, createdAt, updatedAt, truncationWarning }` |
| `/api/process` | POST | `{ contentId, targetMinutes }` | `{ id, contentId, format, targetDuration, actualWordCount, compressionRatio, scriptText, contentType, themes[], summary, durationAdvisory, createdAt, updatedAt }` |
| `/api/audio/generate` | POST | `{ scriptId }`, optional `x-elevenlabs-key` header | `{ id, scriptId, filePath, durationSecs, voices[], ttsProvider, createdAt, updatedAt }` |
| `/api/library` | GET | — | Array of `LibraryItem` |
| `/api/playback` | GET | `?audioId=<id>` | `{ id, userId, audioId, position, speed, completed, updatedAt }` |
| `/api/playback` | POST | `{ audioId, position?, speed?, completed? }` | Upserted record |

409 on `/api/upload` means duplicate content — treat as success (fast-path to duration picker). Response body is same as 200 plus `{ error: "This content has already been uploaded." }`.

### Project Structure

```
native/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          ← Home (Daily Drive)
│   │   ├── library.tsx        ← Library
│   │   └── _layout.tsx        ← Tab navigator
│   ├── processing.tsx         ← Processing screen
│   ├── settings.tsx           ← Settings
│   ├── sign-in.tsx            ← Clerk sign-in
│   └── _layout.tsx            ← Root layout (auth gate + providers)
├── components/
│   ├── PlayerBar.tsx
│   ├── ExpandedPlayer.tsx
│   ├── CarMode.tsx
│   ├── UploadModal.tsx
│   ├── EpisodeCard.tsx
│   ├── DurationPicker.tsx
│   ├── EmptyState.tsx
│   └── NewVersionSheet.tsx
├── lib/
│   ├── types.ts               ← Shared types
│   ├── api.ts                 ← API client
│   ├── db.ts                  ← SQLite cache
│   ├── player.ts              ← RNTP setup + service
│   ├── usePlayer.ts           ← Player React hook
│   ├── downloads.ts           ← Auto-download manager
│   ├── sync.ts                ← Library sync
│   ├── auth.ts                ← Clerk token cache
│   ├── carplay.ts             ← CarPlay integration
│   └── constants.ts           ← App constants
├── __tests__/
│   ├── api.test.ts
│   ├── db.test.ts
│   ├── downloads.test.ts
│   ├── sync.test.ts
│   └── player.test.ts
├── assets/
├── app.json
├── babel.config.js
├── tailwind.config.ts
├── nativewind-env.d.ts
├── global.css
├── metro.config.js
├── package.json
└── tsconfig.json
```

### Player Constants

```typescript
export const SMART_RESUME_REWIND_SECS = 3;
export const SMART_RESUME_THRESHOLD_MS = 10_000;
export const POSITION_SAVE_INTERVAL_MS = 5_000;
export const TTS_WPM = 150;
export const READING_WPM = 250;
```

### Duration Presets

```typescript
export const DURATION_PRESETS = [
  { minutes: 2, label: "Quick Take" },
  { minutes: 3, label: "Brief" },
  { minutes: 5, label: "Summary" },
  { minutes: 15, label: "Main Points" },
  { minutes: 30, label: "Deep Dive" },
] as const;

export const DURATION_SLIDER = { min: 2, max: 60, step: 1 } as const;
```

### Processing Stages

```typescript
export type ProcessingStage = "analyzing" | "scripting" | "generating" | "ready";

export const STAGE_COPY: Record<ProcessingStage, string | null> = {
  analyzing: "Reading your content — extracting key ideas and structure",
  scripting: "Writing your episode — shaping key ideas into narrative",
  generating: "Recording your episode — this takes 20–40 seconds",
  ready: null,
};
```

---

## Phase 1: Scaffolding

### Task 1: Create Expo project and install dependencies

**Files:**
- Create: `native/` (entire directory via `create-expo-app`)
- Modify: `native/package.json` (add dependencies)
- Create: `native/.env` (API URL + Clerk key)

**Step 1: Create the Expo app**

```bash
cd /Users/chrispark/Projects/ridecast2
npx create-expo-app@latest native --template tabs
```

Wait for scaffolding to complete. This creates the base project with Expo Router tabs template.

**Step 2: Remove template boilerplate**

```bash
cd native
rm -rf app/(tabs)/explore.tsx app/(tabs)/index.tsx components/ThemedText.tsx components/ThemedView.tsx components/ExternalLink.tsx components/ParallaxScrollView.tsx components/Collapsible.tsx components/HelloWave.tsx components/HapticTab.tsx constants/Colors.ts hooks/useColorScheme.ts hooks/useColorScheme.web.ts hooks/useThemeColor.ts
```

**Step 3: Install production dependencies**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo install react-native-track-player @clerk/clerk-expo expo-sqlite expo-file-system expo-document-picker expo-secure-store nativewind tailwindcss@^3.4 react-native-reanimated react-native-gesture-handler @gorhom/bottom-sheet expo-linking expo-web-browser @react-native-community/slider @react-native-community/netinfo
```

**Step 4: Install dev dependencies**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npm install -D @types/react jest @testing-library/react-native @testing-library/jest-native jest-expo ts-jest
```

**Step 5: Create environment file**

Create `native/.env`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
```

**Step 6: Add .env to .gitignore**

Append to `native/.gitignore`:

```
.env
```

**Step 7: Verify project runs**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo start --ios
```

Expected: Expo dev server starts. The app may crash because we deleted template files — that's fine, we'll fix routing in Task 2. Press Ctrl+C to stop.

**Step 8: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): scaffold Expo project with dependencies"
```

---

### Task 2: Configure NativeWind and Tailwind

**Files:**
- Create: `native/tailwind.config.ts`
- Create: `native/global.css`
- Create: `native/nativewind-env.d.ts`
- Modify: `native/babel.config.js`
- Modify: `native/metro.config.js`

**Step 1: Create Tailwind config**

Create `native/tailwind.config.ts`:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#EA580C",
          light: "#F97316",
          dim: "rgba(234,88,12,0.2)",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F5F5F5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 2: Create global CSS**

Create `native/global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 3: Create NativeWind type declaration**

Create `native/nativewind-env.d.ts`:

```typescript
/// <reference types="nativewind/types" />
```

**Step 4: Update babel.config.js**

Replace `native/babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

**Step 5: Update metro.config.js**

Replace `native/metro.config.js`:

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

**Step 6: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): configure NativeWind and Tailwind CSS"
```

---

### Task 3: Set up Expo Router with tab layout and placeholder screens

**Files:**
- Create: `native/app/_layout.tsx` (root layout)
- Create: `native/app/(tabs)/_layout.tsx` (tab navigator)
- Create: `native/app/(tabs)/index.tsx` (Home placeholder)
- Create: `native/app/(tabs)/library.tsx` (Library placeholder)
- Create: `native/app/processing.tsx` (placeholder)
- Create: `native/app/settings.tsx` (placeholder)
- Create: `native/app/sign-in.tsx` (placeholder)
- Create: `native/lib/constants.ts`

**Step 1: Create constants**

Create `native/lib/constants.ts`:

```typescript
// Player
export const SMART_RESUME_REWIND_SECS = 3;
export const SMART_RESUME_THRESHOLD_MS = 10_000;
export const POSITION_SAVE_INTERVAL_MS = 5_000;
export const TTS_WPM = 150;
export const READING_WPM = 250;

// Duration
export const DURATION_PRESETS = [
  { minutes: 2, label: "Quick Take" },
  { minutes: 3, label: "Brief" },
  { minutes: 5, label: "Summary" },
  { minutes: 15, label: "Main Points" },
  { minutes: 30, label: "Deep Dive" },
] as const;

export const DURATION_SLIDER = { min: 2, max: 60, step: 1 } as const;

// Processing
export type ProcessingStage = "analyzing" | "scripting" | "generating" | "ready";

export const STAGE_COPY: Record<ProcessingStage, string | null> = {
  analyzing: "Reading your content — extracting key ideas and structure",
  scripting: "Writing your episode — shaping key ideas into narrative",
  generating: "Recording your episode — this takes 20\u201340 seconds",
  ready: null,
};

// API
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
```

**Step 2: Create root layout**

Create `native/app/_layout.tsx`:

```tsx
import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="processing"
          options={{ presentation: "fullScreenModal", gestureEnabled: false }}
        />
        <Stack.Screen
          name="settings"
          options={{ presentation: "modal", headerShown: true, title: "Settings" }}
        />
        <Stack.Screen
          name="sign-in"
          options={{ presentation: "fullScreenModal", gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
```

**Step 3: Create tab navigator layout**

Create `native/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#EA580C",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          borderTopColor: "rgba(0,0,0,0.06)",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Step 4: Create placeholder screens**

Create `native/app/(tabs)/index.tsx`:

```tsx
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900">Daily Drive</Text>
        <Text className="text-base text-gray-500 mt-2">Home screen placeholder</Text>
      </View>
    </SafeAreaView>
  );
}
```

Create `native/app/(tabs)/library.tsx`:

```tsx
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LibraryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900">Library</Text>
        <Text className="text-base text-gray-500 mt-2">Library screen placeholder</Text>
      </View>
    </SafeAreaView>
  );
}
```

Create `native/app/processing.tsx`:

```tsx
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProcessingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900">Processing</Text>
        <Text className="text-base text-gray-500 mt-2">Processing screen placeholder</Text>
      </View>
    </SafeAreaView>
  );
}
```

Create `native/app/settings.tsx`:

```tsx
import { View, Text } from "react-native";

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-2xl font-bold text-gray-900">Settings</Text>
      <Text className="text-base text-gray-500 mt-2">Settings screen placeholder</Text>
    </View>
  );
}
```

Create `native/app/sign-in.tsx`:

```tsx
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-2xl font-bold text-gray-900">Sign In</Text>
        <Text className="text-base text-gray-500 mt-2">Sign-in screen placeholder</Text>
      </View>
    </SafeAreaView>
  );
}
```

**Step 5: Verify the app runs with tabs**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo start --ios
```

Expected: App opens with two tabs (Home, Library). Tapping each shows the placeholder. Press Ctrl+C to stop.

**Step 6: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): Expo Router tabs, placeholder screens, constants"
```

---

## Phase 2: Auth

### Task 4: Configure Clerk auth with sign-in wall

**Files:**
- Create: `native/lib/auth.ts` (token cache helper)
- Modify: `native/app/_layout.tsx` (wrap with ClerkProvider + auth gate)
- Modify: `native/app/sign-in.tsx` (real sign-in screen)

**Step 1: Create Clerk token cache using SecureStore**

Create `native/lib/auth.ts`:

```typescript
import * as SecureStore from "expo-secure-store";
import { TokenCache } from "@clerk/clerk-expo";

export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail — token will be re-fetched
    }
  },
};
```

**Step 2: Update root layout with ClerkProvider and auth gate**

Replace `native/app/_layout.tsx`:

```tsx
import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "../lib/auth";

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const onSignInScreen = segments[0] === "sign-in";
    if (!isSignedIn && !onSignInScreen) {
      router.replace("/sign-in");
    } else if (isSignedIn && onSignInScreen) {
      router.replace("/");
    }
  }, [isSignedIn, isLoaded, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <StatusBar style="dark" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="processing"
              options={{ presentation: "fullScreenModal", gestureEnabled: false }}
            />
            <Stack.Screen
              name="settings"
              options={{ presentation: "modal", headerShown: true, title: "Settings" }}
            />
            <Stack.Screen
              name="sign-in"
              options={{ presentation: "fullScreenModal", gestureEnabled: false }}
            />
          </Stack>
        </AuthGate>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
```

**Step 3: Build sign-in screen with Clerk Apple OAuth**

Replace `native/app/sign-in.tsx`:

```tsx
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useCallback, useState } from "react";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_apple" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAppleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { createdSessionId, setActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL("/"),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch (err) {
      setError("Sign in failed. Please try again.");
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
  }, [startOAuthFlow]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        {/* Value Prop */}
        <View className="w-20 h-20 rounded-[22px] bg-brand items-center justify-center mb-8">
          <Ionicons name="headset" size={40} color="white" />
        </View>
        <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
          Ridecast
        </Text>
        <Text className="text-base text-gray-500 text-center mb-2 leading-relaxed">
          Turn any article, PDF, or link into a podcast episode you can listen
          to on your commute.
        </Text>
        <Text className="text-sm text-gray-400 text-center mb-12">
          Upload. Listen. Learn.
        </Text>

        {/* Sign In Button */}
        <TouchableOpacity
          onPress={handleAppleSignIn}
          disabled={loading}
          className="w-full flex-row items-center justify-center bg-black rounded-2xl py-4 px-6"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Continue with Apple
              </Text>
            </>
          )}
        </TouchableOpacity>

        {error && (
          <Text className="text-red-500 text-sm mt-4 text-center">{error}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
```

**Step 4: Verify auth flow**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo start --ios
```

Expected: App launches and immediately redirects to the sign-in screen. The "Continue with Apple" button is visible. (Full OAuth flow requires real Clerk keys in `.env`.)

Press Ctrl+C to stop.

**Step 5: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): Clerk auth — sign-in wall, Apple OAuth, token cache"
```

---

## Phase 3: API Client + SQLite

### Task 5: Create shared types

**Files:**
- Create: `native/lib/types.ts`

**Step 1: Write type definitions**

Create `native/lib/types.ts`:

```typescript
// --- API response types (mirrors Next.js backend) ---

export interface UploadResponse {
  id: string;
  title: string;
  author: string | null;
  rawText: string;
  wordCount: number;
  sourceType: string;
  sourceUrl: string | null;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
  truncationWarning: string | null;
  error?: string; // present on 409 duplicate
}

export interface ProcessResponse {
  id: string; // scriptId
  contentId: string;
  format: string;
  targetDuration: number;
  actualWordCount: number;
  compressionRatio: number;
  scriptText: string;
  contentType: string | null;
  themes: string[];
  summary: string | null;
  durationAdvisory: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateResponse {
  id: string; // audioId
  scriptId: string;
  filePath: string;
  durationSecs: number;
  voices: string[];
  ttsProvider: string;
  createdAt: string;
  updatedAt: string;
}

export interface AudioVersion {
  scriptId: string;
  audioId: string | null;
  audioUrl: string | null;
  durationSecs: number | null;
  targetDuration: number;
  format: string;
  status: "ready" | "generating" | "processing";
  completed: boolean;
  position: number;
  createdAt: string;
  summary: string | null;
  contentType: string | null;
  themes: string[];
  compressionRatio: number;
  actualWordCount: number;
  voices: string[];
  ttsProvider: string;
}

export interface LibraryItem {
  id: string; // contentId
  title: string;
  author: string | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}

export interface PlaybackState {
  id?: string;
  userId?: string;
  audioId: string;
  position: number;
  speed: number;
  completed: boolean;
  updatedAt?: string;
}

// --- App-level types ---

export interface PlayableItem {
  id: string; // audioId
  title: string;
  duration: number; // seconds
  format: string;
  audioUrl: string; // local file path or remote URL
  author?: string | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  contentType?: string | null;
  themes?: string[];
  summary?: string | null;
  targetDuration?: number | null;
  wordCount?: number | null;
  compressionRatio?: number | null;
  voices?: string[];
  ttsProvider?: string | null;
  createdAt?: string | null;
}

export type LibraryFilter = "all" | "in_progress" | "completed" | "generating";
```

**Step 2: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/lib/types.ts
git commit -m "feat(native): shared TypeScript types for API and app"
```

---

### Task 6: Build API client

**Files:**
- Create: `native/lib/api.ts`
- Create: `native/__tests__/api.test.ts`

**Step 1: Write the API client**

Create `native/lib/api.ts`:

```typescript
import { API_URL } from "./constants";
import type {
  UploadResponse,
  ProcessResponse,
  GenerateResponse,
  LibraryItem,
  PlaybackState,
} from "./types";

let _getToken: (() => Promise<string | null>) | null = null;

/**
 * Call once at app startup (from root layout) to wire Clerk's getToken.
 * Keeps the API module decoupled from React.
 */
export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!_getToken) throw new Error("Token provider not initialized — call setTokenProvider first");
  const token = await _getToken();
  if (!token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function fetchJSON<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = {
    ...((await authHeaders()) as Record<string, string>),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }

  return data as T;
}

// --- Upload ---

export async function uploadUrl(url: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("url", url);

  const auth = await authHeaders();
  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: auth,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data as UploadResponse;
}

export async function uploadFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const auth = await authHeaders();
  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: auth,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    throw new Error(data.error ?? "Upload failed");
  }
  return data as UploadResponse;
}

// --- Process ---

export async function processContent(
  contentId: string,
  targetMinutes: number,
): Promise<ProcessResponse> {
  return fetchJSON<ProcessResponse>("/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentId, targetMinutes }),
  });
}

// --- Generate Audio ---

export async function generateAudio(
  scriptId: string,
  elevenLabsKey?: string,
): Promise<GenerateResponse> {
  const extra: Record<string, string> = { "Content-Type": "application/json" };
  if (elevenLabsKey) extra["x-elevenlabs-key"] = elevenLabsKey;

  return fetchJSON<GenerateResponse>("/api/audio/generate", {
    method: "POST",
    headers: extra,
    body: JSON.stringify({ scriptId }),
  });
}

// --- Library ---

export async function fetchLibrary(): Promise<LibraryItem[]> {
  return fetchJSON<LibraryItem[]>("/api/library");
}

// --- Playback ---

export async function getPlaybackState(
  audioId: string,
): Promise<PlaybackState> {
  return fetchJSON<PlaybackState>(`/api/playback?audioId=${audioId}`);
}

export async function savePlaybackState(state: {
  audioId: string;
  position?: number;
  speed?: number;
  completed?: boolean;
}): Promise<PlaybackState> {
  return fetchJSON<PlaybackState>("/api/playback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}
```

**Step 2: Write API client tests**

Create `native/__tests__/api.test.ts`:

```typescript
import {
  setTokenProvider,
  uploadUrl,
  fetchLibrary,
  processContent,
  generateAudio,
  getPlaybackState,
  savePlaybackState,
} from "../lib/api";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  setTokenProvider(async () => "test-token-123");
});

describe("api client", () => {
  describe("uploadUrl", () => {
    it("sends URL in FormData with auth header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "content-1",
          title: "Test Article",
          wordCount: 500,
        }),
      });

      const result = await uploadUrl("https://example.com/article");
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/upload");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBe("Bearer test-token-123");
      expect(result.id).toBe("content-1");
    });

    it("treats 409 as success (duplicate content)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          id: "content-1",
          title: "Existing Article",
          error: "This content has already been uploaded.",
        }),
      });

      const result = await uploadUrl("https://example.com/existing");
      expect(result.id).toBe("content-1");
      expect(result.error).toContain("already been uploaded");
    });

    it("throws on server error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Server exploded" }),
      });

      await expect(uploadUrl("https://bad.com")).rejects.toThrow("Server exploded");
    });
  });

  describe("fetchLibrary", () => {
    it("returns library items with auth header", async () => {
      const mockLibrary = [
        {
          id: "c1",
          title: "Episode 1",
          author: null,
          sourceType: "url",
          sourceUrl: "https://example.com",
          createdAt: "2026-01-01T00:00:00Z",
          wordCount: 1000,
          versions: [],
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockLibrary,
      });

      const result = await fetchLibrary();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Episode 1");
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe("Bearer test-token-123");
    });
  });

  describe("processContent", () => {
    it("sends contentId and targetMinutes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "script-1",
          contentId: "content-1",
          format: "narrator",
          targetDuration: 5,
        }),
      });

      const result = await processContent("content-1", 5);
      expect(result.id).toBe("script-1");
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.contentId).toBe("content-1");
      expect(body.targetMinutes).toBe(5);
    });
  });

  describe("generateAudio", () => {
    it("sends scriptId and optional ElevenLabs key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          id: "audio-1",
          scriptId: "script-1",
          durationSecs: 300,
        }),
      });

      const result = await generateAudio("script-1", "el-key-123");
      expect(result.id).toBe("audio-1");

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers["x-elevenlabs-key"]).toBe("el-key-123");
    });
  });

  describe("playback state", () => {
    it("getPlaybackState fetches by audioId", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          audioId: "audio-1",
          position: 42.5,
          speed: 1.5,
          completed: false,
        }),
      });

      const result = await getPlaybackState("audio-1");
      expect(result.position).toBe(42.5);
      expect(result.speed).toBe(1.5);
    });

    it("savePlaybackState sends partial update", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          audioId: "audio-1",
          position: 100,
          speed: 1.0,
          completed: false,
        }),
      });

      await savePlaybackState({ audioId: "audio-1", position: 100 });
      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.audioId).toBe("audio-1");
      expect(body.position).toBe(100);
    });
  });

  describe("auth", () => {
    it("throws when token provider returns null", async () => {
      setTokenProvider(async () => null);

      await expect(fetchLibrary()).rejects.toThrow("Not authenticated");
    });
  });
});
```

**Step 3: Configure Jest**

Add to `native/package.json` (merge into existing):

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "jest": {
    "preset": "jest-expo",
    "testPathIgnorePatterns": ["/node_modules/", "/android/", "/ios/"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|nativewind)"
    ]
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npm test
```

Expected: All API client tests pass.

**Step 5: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): API client with auth headers, upload, process, generate, library, playback"
```

---

### Task 7: Build SQLite database layer

**Files:**
- Create: `native/lib/db.ts`
- Create: `native/__tests__/db.test.ts`

**Step 1: Write the SQLite database module**

Create `native/lib/db.ts`:

```typescript
import * as SQLite from "expo-sqlite";
import type { LibraryItem, AudioVersion, PlaybackState } from "./types";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("ridecast.db");
  await migrate(_db);
  return _db;
}

/** For tests — inject a pre-opened database. */
export function setDb(db: SQLite.SQLiteDatabase) {
  _db = db;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS episodes (
      content_id    TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      author        TEXT,
      source_type   TEXT NOT NULL,
      source_url    TEXT,
      word_count    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      json_versions TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS playback (
      audio_id   TEXT PRIMARY KEY,
      position   REAL NOT NULL DEFAULT 0,
      speed      REAL NOT NULL DEFAULT 1.0,
      completed  INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS downloads (
      audio_id   TEXT PRIMARY KEY,
      local_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// --- Episodes (library cache) ---

export async function upsertEpisodes(items: LibraryItem[]) {
  const db = await getDb();
  for (const item of items) {
    await db.runAsync(
      `INSERT OR REPLACE INTO episodes
        (content_id, title, author, source_type, source_url, word_count, created_at, json_versions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.title,
      item.author,
      item.sourceType,
      item.sourceUrl,
      item.wordCount,
      item.createdAt,
      JSON.stringify(item.versions),
    );
  }
}

export async function getAllEpisodes(): Promise<LibraryItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    content_id: string;
    title: string;
    author: string | null;
    source_type: string;
    source_url: string | null;
    word_count: number;
    created_at: string;
    json_versions: string;
  }>("SELECT * FROM episodes ORDER BY created_at DESC");

  return rows.map((row) => ({
    id: row.content_id,
    title: row.title,
    author: row.author,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    wordCount: row.word_count,
    createdAt: row.created_at,
    versions: JSON.parse(row.json_versions) as AudioVersion[],
  }));
}

export async function searchEpisodes(query: string): Promise<LibraryItem[]> {
  const db = await getDb();
  const pattern = `%${query}%`;
  const rows = await db.getAllAsync<{
    content_id: string;
    title: string;
    author: string | null;
    source_type: string;
    source_url: string | null;
    word_count: number;
    created_at: string;
    json_versions: string;
  }>(
    "SELECT * FROM episodes WHERE title LIKE ? OR author LIKE ? ORDER BY created_at DESC",
    pattern,
    pattern,
  );

  return rows.map((row) => ({
    id: row.content_id,
    title: row.title,
    author: row.author,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    wordCount: row.word_count,
    createdAt: row.created_at,
    versions: JSON.parse(row.json_versions) as AudioVersion[],
  }));
}

// --- Playback positions ---

export async function getLocalPlayback(audioId: string): Promise<PlaybackState | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    audio_id: string;
    position: number;
    speed: number;
    completed: number;
    updated_at: string;
  }>("SELECT * FROM playback WHERE audio_id = ?", audioId);

  if (!row) return null;
  return {
    audioId: row.audio_id,
    position: row.position,
    speed: row.speed,
    completed: row.completed === 1,
    updatedAt: row.updated_at,
  };
}

export async function saveLocalPlayback(state: {
  audioId: string;
  position?: number;
  speed?: number;
  completed?: boolean;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO playback (audio_id, position, speed, completed, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(audio_id) DO UPDATE SET
       position = COALESCE(excluded.position, playback.position),
       speed = COALESCE(excluded.speed, playback.speed),
       completed = COALESCE(excluded.completed, playback.completed),
       updated_at = excluded.updated_at`,
    state.audioId,
    state.position ?? 0,
    state.speed ?? 1.0,
    state.completed ? 1 : 0,
    now,
  );
}

export async function getAllLocalPlayback(): Promise<PlaybackState[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    audio_id: string;
    position: number;
    speed: number;
    completed: number;
    updated_at: string;
  }>("SELECT * FROM playback");

  return rows.map((row) => ({
    audioId: row.audio_id,
    position: row.position,
    speed: row.speed,
    completed: row.completed === 1,
    updatedAt: row.updated_at,
  }));
}

// --- Downloads ---

export async function recordDownload(audioId: string, localPath: string, sizeBytes: number) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO downloads (audio_id, local_path, size_bytes)
     VALUES (?, ?, ?)`,
    audioId,
    localPath,
    sizeBytes,
  );
}

export async function getDownloadPath(audioId: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ local_path: string }>(
    "SELECT local_path FROM downloads WHERE audio_id = ?",
    audioId,
  );
  return row?.local_path ?? null;
}

export async function getStorageInfo(): Promise<{ count: number; totalBytes: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number; total: number }>(
    "SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total FROM downloads",
  );
  return { count: row?.count ?? 0, totalBytes: row?.total ?? 0 };
}

export async function deleteDownloadRecord(audioId: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM downloads WHERE audio_id = ?", audioId);
}
```

**Step 2: Write database tests**

Create `native/__tests__/db.test.ts`:

> **Note:** expo-sqlite is not available in Jest — we mock the database interface and verify SQL logic and data mapping.

```typescript
import type { LibraryItem } from "../lib/types";

const mockRunAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockExecAsync = jest.fn();

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => ({
    runAsync: mockRunAsync,
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
    execAsync: mockExecAsync,
  })),
}));

// Import after mock
import {
  getDb,
  upsertEpisodes,
  getAllEpisodes,
  searchEpisodes,
  getLocalPlayback,
  saveLocalPlayback,
  getDownloadPath,
  recordDownload,
  getStorageInfo,
} from "../lib/db";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("db", () => {
  describe("getDb", () => {
    it("initializes database and runs migrations", async () => {
      const db = await getDb();
      expect(mockExecAsync).toHaveBeenCalledTimes(1);
      const sql = mockExecAsync.mock.calls[0][0] as string;
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS episodes");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS playback");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS downloads");
    });
  });

  describe("upsertEpisodes", () => {
    it("inserts each episode with serialized versions JSON", async () => {
      await getDb();

      const items: LibraryItem[] = [
        {
          id: "c1",
          title: "Test Episode",
          author: "Author",
          sourceType: "url",
          sourceUrl: "https://example.com",
          wordCount: 1000,
          createdAt: "2026-01-01T00:00:00Z",
          versions: [
            {
              scriptId: "s1",
              audioId: "a1",
              audioUrl: "https://cdn.example.com/audio.mp3",
              durationSecs: 300,
              targetDuration: 5,
              format: "narrator",
              status: "ready",
              completed: false,
              position: 0,
              createdAt: "2026-01-01T00:00:00Z",
              summary: "A test summary",
              contentType: "article",
              themes: ["tech"],
              compressionRatio: 0.3,
              actualWordCount: 750,
              voices: ["alloy"],
              ttsProvider: "openai",
            },
          ],
        },
      ];

      await upsertEpisodes(items);

      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      const args = mockRunAsync.mock.calls[0];
      expect(args[0]).toContain("INSERT OR REPLACE INTO episodes");
      expect(args[1]).toBe("c1");
      expect(args[2]).toBe("Test Episode");
      expect(args[8]).toContain('"audioId":"a1"');
    });
  });

  describe("getAllEpisodes", () => {
    it("maps database rows to LibraryItem objects", async () => {
      await getDb();
      mockGetAllAsync.mockResolvedValueOnce([
        {
          content_id: "c1",
          title: "Episode 1",
          author: null,
          source_type: "url",
          source_url: "https://example.com",
          word_count: 1000,
          created_at: "2026-01-01T00:00:00Z",
          json_versions: "[]",
        },
      ]);

      const episodes = await getAllEpisodes();
      expect(episodes).toHaveLength(1);
      expect(episodes[0].id).toBe("c1");
      expect(episodes[0].title).toBe("Episode 1");
      expect(episodes[0].versions).toEqual([]);
    });
  });

  describe("searchEpisodes", () => {
    it("searches by title with LIKE pattern", async () => {
      await getDb();
      mockGetAllAsync.mockResolvedValueOnce([]);

      await searchEpisodes("react");

      const [sql, p1, p2] = mockGetAllAsync.mock.calls[0];
      expect(sql).toContain("WHERE title LIKE ? OR author LIKE ?");
      expect(p1).toBe("%react%");
      expect(p2).toBe("%react%");
    });
  });

  describe("playback", () => {
    it("getLocalPlayback returns null for missing record", async () => {
      await getDb();
      mockGetFirstAsync.mockResolvedValueOnce(null);

      const result = await getLocalPlayback("audio-999");
      expect(result).toBeNull();
    });

    it("getLocalPlayback maps row to PlaybackState", async () => {
      await getDb();
      mockGetFirstAsync.mockResolvedValueOnce({
        audio_id: "a1",
        position: 42.5,
        speed: 1.5,
        completed: 0,
        updated_at: "2026-01-01T00:00:00Z",
      });

      const result = await getLocalPlayback("a1");
      expect(result).toEqual({
        audioId: "a1",
        position: 42.5,
        speed: 1.5,
        completed: false,
        updatedAt: "2026-01-01T00:00:00Z",
      });
    });

    it("saveLocalPlayback upserts with ON CONFLICT", async () => {
      await getDb();
      await saveLocalPlayback({
        audioId: "a1",
        position: 100,
        speed: 1.25,
        completed: false,
      });

      const [sql] = mockRunAsync.mock.calls[0];
      expect(sql).toContain("INSERT INTO playback");
      expect(sql).toContain("ON CONFLICT(audio_id) DO UPDATE");
    });
  });

  describe("downloads", () => {
    it("recordDownload inserts download metadata", async () => {
      await getDb();
      await recordDownload("a1", "/path/to/file.mp3", 5000000);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO downloads"),
        "a1",
        "/path/to/file.mp3",
        5000000,
      );
    });

    it("getStorageInfo returns count and total", async () => {
      await getDb();
      mockGetFirstAsync.mockResolvedValueOnce({ count: 3, total: 15000000 });

      const info = await getStorageInfo();
      expect(info).toEqual({ count: 3, totalBytes: 15000000 });
    });
  });
});
```

**Step 3: Run tests**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npm test -- __tests__/db.test.ts
```

Expected: All db tests pass.

**Step 4: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): SQLite database layer — episodes, playback, downloads"
```

---

### Task 8: Build sync and download modules

**Files:**
- Create: `native/lib/sync.ts`
- Create: `native/lib/downloads.ts`
- Create: `native/__tests__/sync.test.ts`
- Create: `native/__tests__/downloads.test.ts`

**Step 1: Write the sync module**

Create `native/lib/sync.ts`:

```typescript
import * as api from "./api";
import * as db from "./db";
import { downloadEpisodeAudio } from "./downloads";
import type { LibraryItem } from "./types";

/**
 * Full library sync: fetch from server, cache in SQLite, trigger downloads.
 * Called on app launch, pull-to-refresh, and after upload completes.
 * Returns the fresh library for immediate UI use.
 */
export async function syncLibrary(): Promise<LibraryItem[]> {
  const serverItems = await api.fetchLibrary();
  await db.upsertEpisodes(serverItems);

  // Auto-download any ready episodes that aren't downloaded yet
  for (const item of serverItems) {
    for (const version of item.versions) {
      if (version.status === "ready" && version.audioId && version.audioUrl) {
        const existing = await db.getDownloadPath(version.audioId);
        if (!existing) {
          // Fire-and-forget — don't block sync on downloads
          downloadEpisodeAudio(version.audioId, version.audioUrl).catch(
            (err) => console.warn("[sync] download failed:", version.audioId, err),
          );
        }
      }
    }
  }

  return serverItems;
}

/**
 * Sync playback positions: push local changes to server.
 * Strategy: "newer timestamp wins" — compare local updatedAt vs server updatedAt.
 * Called periodically and on app foreground.
 */
export async function syncPlayback(): Promise<void> {
  const localStates = await db.getAllLocalPlayback();

  for (const local of localStates) {
    try {
      const server = await api.getPlaybackState(local.audioId);

      // If server has a newer timestamp, pull it down
      if (server.updatedAt && local.updatedAt) {
        const serverTime = new Date(server.updatedAt).getTime();
        const localTime = new Date(local.updatedAt).getTime();
        if (serverTime > localTime) {
          await db.saveLocalPlayback({
            audioId: local.audioId,
            position: server.position,
            speed: server.speed,
            completed: server.completed,
          });
          continue;
        }
      }

      // Otherwise push local to server
      await api.savePlaybackState({
        audioId: local.audioId,
        position: local.position,
        speed: local.speed,
        completed: local.completed,
      });
    } catch {
      // Silently skip — will retry next sync cycle
    }
  }
}
```

**Step 2: Write the download manager**

Create `native/lib/downloads.ts`:

```typescript
import * as FileSystem from "expo-file-system";
import * as db from "./db";

const DOWNLOADS_DIR = `${FileSystem.documentDirectory}episodes/`;

/** Ensure the downloads directory exists. */
async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
}

/**
 * Download an episode MP3 to local storage and record in SQLite.
 * Skips if already downloaded. Returns the local file path.
 */
export async function downloadEpisodeAudio(
  audioId: string,
  remoteUrl: string,
): Promise<string> {
  // Check if already downloaded
  const existing = await db.getDownloadPath(audioId);
  if (existing) {
    const info = await FileSystem.getInfoAsync(existing);
    if (info.exists) return existing;
    // File was deleted externally — re-download
  }

  await ensureDir();
  const localPath = `${DOWNLOADS_DIR}${audioId}.mp3`;

  const result = await FileSystem.downloadAsync(remoteUrl, localPath);
  if (result.status !== 200) {
    throw new Error(`Download failed with status ${result.status}`);
  }

  const info = await FileSystem.getInfoAsync(localPath);
  const sizeBytes = info.exists && "size" in info ? info.size ?? 0 : 0;

  await db.recordDownload(audioId, localPath, sizeBytes);
  return localPath;
}

/**
 * Resolve the playback URL for an audioId:
 * - Returns local file path if downloaded
 * - Falls back to remote URL for streaming
 */
export async function resolveAudioUrl(
  audioId: string,
  remoteUrl: string,
): Promise<string> {
  const localPath = await db.getDownloadPath(audioId);
  if (localPath) {
    const info = await FileSystem.getInfoAsync(localPath);
    if (info.exists) return localPath;
  }
  return remoteUrl;
}

/**
 * Delete a downloaded episode from disk and SQLite.
 */
export async function deleteDownload(audioId: string): Promise<void> {
  const localPath = await db.getDownloadPath(audioId);
  if (localPath) {
    try {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    } catch {
      // File already gone
    }
  }
  await db.deleteDownloadRecord(audioId);
}
```

**Step 3: Write sync tests**

Create `native/__tests__/sync.test.ts`:

```typescript
import { syncLibrary, syncPlayback } from "../lib/sync";
import * as api from "../lib/api";
import * as db from "../lib/db";
import * as downloads from "../lib/downloads";

jest.mock("../lib/api");
jest.mock("../lib/db");
jest.mock("../lib/downloads");

const mockApi = api as jest.Mocked<typeof api>;
const mockDb = db as jest.Mocked<typeof db>;
const mockDownloads = downloads as jest.Mocked<typeof downloads>;

beforeEach(() => jest.clearAllMocks());

describe("syncLibrary", () => {
  it("fetches from server, caches in SQLite, returns items", async () => {
    const items = [
      {
        id: "c1",
        title: "Episode 1",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: "2026-01-01",
        wordCount: 1000,
        versions: [],
      },
    ];
    mockApi.fetchLibrary.mockResolvedValueOnce(items);

    const result = await syncLibrary();

    expect(mockApi.fetchLibrary).toHaveBeenCalledTimes(1);
    expect(mockDb.upsertEpisodes).toHaveBeenCalledWith(items);
    expect(result).toEqual(items);
  });

  it("triggers downloads for ready episodes without local files", async () => {
    const items = [
      {
        id: "c1",
        title: "Episode 1",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: "2026-01-01",
        wordCount: 1000,
        versions: [
          {
            scriptId: "s1",
            audioId: "a1",
            audioUrl: "https://cdn.example.com/a1.mp3",
            durationSecs: 300,
            targetDuration: 5,
            format: "narrator",
            status: "ready" as const,
            completed: false,
            position: 0,
            createdAt: "2026-01-01",
            summary: null,
            contentType: null,
            themes: [],
            compressionRatio: 0.5,
            actualWordCount: 750,
            voices: [],
            ttsProvider: "openai",
          },
        ],
      },
    ];
    mockApi.fetchLibrary.mockResolvedValueOnce(items);
    mockDb.getDownloadPath.mockResolvedValueOnce(null);

    await syncLibrary();

    expect(mockDownloads.downloadEpisodeAudio).toHaveBeenCalledWith(
      "a1",
      "https://cdn.example.com/a1.mp3",
    );
  });

  it("skips download for already-downloaded episodes", async () => {
    const items = [
      {
        id: "c1",
        title: "Episode 1",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: "2026-01-01",
        wordCount: 1000,
        versions: [
          {
            scriptId: "s1",
            audioId: "a1",
            audioUrl: "https://cdn.example.com/a1.mp3",
            durationSecs: 300,
            targetDuration: 5,
            format: "narrator",
            status: "ready" as const,
            completed: false,
            position: 0,
            createdAt: "2026-01-01",
            summary: null,
            contentType: null,
            themes: [],
            compressionRatio: 0.5,
            actualWordCount: 750,
            voices: [],
            ttsProvider: "openai",
          },
        ],
      },
    ];
    mockApi.fetchLibrary.mockResolvedValueOnce(items);
    mockDb.getDownloadPath.mockResolvedValueOnce("/local/a1.mp3");

    await syncLibrary();

    expect(mockDownloads.downloadEpisodeAudio).not.toHaveBeenCalled();
  });
});

describe("syncPlayback", () => {
  it("pushes local position to server when local is newer", async () => {
    mockDb.getAllLocalPlayback.mockResolvedValueOnce([
      {
        audioId: "a1",
        position: 120,
        speed: 1.5,
        completed: false,
        updatedAt: "2026-01-02T00:00:00Z",
      },
    ]);
    mockApi.getPlaybackState.mockResolvedValueOnce({
      audioId: "a1",
      position: 60,
      speed: 1.0,
      completed: false,
      updatedAt: "2026-01-01T00:00:00Z",
    });

    await syncPlayback();

    expect(mockApi.savePlaybackState).toHaveBeenCalledWith({
      audioId: "a1",
      position: 120,
      speed: 1.5,
      completed: false,
    });
  });

  it("pulls server position when server is newer", async () => {
    mockDb.getAllLocalPlayback.mockResolvedValueOnce([
      {
        audioId: "a1",
        position: 60,
        speed: 1.0,
        completed: false,
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    mockApi.getPlaybackState.mockResolvedValueOnce({
      audioId: "a1",
      position: 200,
      speed: 1.25,
      completed: false,
      updatedAt: "2026-01-03T00:00:00Z",
    });

    await syncPlayback();

    expect(mockDb.saveLocalPlayback).toHaveBeenCalledWith({
      audioId: "a1",
      position: 200,
      speed: 1.25,
      completed: false,
    });
    expect(mockApi.savePlaybackState).not.toHaveBeenCalled();
  });
});
```

**Step 4: Write download manager tests**

Create `native/__tests__/downloads.test.ts`:

```typescript
import { downloadEpisodeAudio, resolveAudioUrl, deleteDownload } from "../lib/downloads";
import * as db from "../lib/db";

jest.mock("../lib/db");
jest.mock("expo-file-system", () => ({
  documentDirectory: "/mock/docs/",
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

import * as FileSystem from "expo-file-system";

const mockDb = db as jest.Mocked<typeof db>;
const mockFS = FileSystem as jest.Mocked<typeof FileSystem>;

beforeEach(() => jest.clearAllMocks());

describe("downloadEpisodeAudio", () => {
  it("downloads file and records in SQLite", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce(null);
    (mockFS.getInfoAsync as jest.Mock)
      .mockResolvedValueOnce({ exists: false }) // dir check
      .mockResolvedValueOnce({ exists: true, size: 5000000 }); // file size
    (mockFS.downloadAsync as jest.Mock).mockResolvedValueOnce({ status: 200 });

    const path = await downloadEpisodeAudio("a1", "https://cdn.example.com/a1.mp3");

    expect(path).toBe("/mock/docs/episodes/a1.mp3");
    expect(mockFS.downloadAsync).toHaveBeenCalledWith(
      "https://cdn.example.com/a1.mp3",
      "/mock/docs/episodes/a1.mp3",
    );
    expect(mockDb.recordDownload).toHaveBeenCalledWith(
      "a1",
      "/mock/docs/episodes/a1.mp3",
      5000000,
    );
  });

  it("skips download if file already exists locally", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce("/mock/docs/episodes/a1.mp3");
    (mockFS.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });

    const path = await downloadEpisodeAudio("a1", "https://cdn.example.com/a1.mp3");

    expect(path).toBe("/mock/docs/episodes/a1.mp3");
    expect(mockFS.downloadAsync).not.toHaveBeenCalled();
  });

  it("throws on download failure", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce(null);
    (mockFS.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true }); // dir exists
    (mockFS.downloadAsync as jest.Mock).mockResolvedValueOnce({ status: 404 });

    await expect(
      downloadEpisodeAudio("a1", "https://cdn.example.com/missing.mp3"),
    ).rejects.toThrow("Download failed with status 404");
  });
});

describe("resolveAudioUrl", () => {
  it("returns local path when downloaded", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce("/mock/docs/episodes/a1.mp3");
    (mockFS.getInfoAsync as jest.Mock).mockResolvedValueOnce({ exists: true });

    const url = await resolveAudioUrl("a1", "https://cdn.example.com/a1.mp3");
    expect(url).toBe("/mock/docs/episodes/a1.mp3");
  });

  it("falls back to remote URL when not downloaded", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce(null);

    const url = await resolveAudioUrl("a1", "https://cdn.example.com/a1.mp3");
    expect(url).toBe("https://cdn.example.com/a1.mp3");
  });
});

describe("deleteDownload", () => {
  it("removes file from disk and SQLite", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce("/mock/docs/episodes/a1.mp3");

    await deleteDownload("a1");

    expect(mockFS.deleteAsync).toHaveBeenCalledWith("/mock/docs/episodes/a1.mp3", {
      idempotent: true,
    });
    expect(mockDb.deleteDownloadRecord).toHaveBeenCalledWith("a1");
  });
});
```

**Step 5: Run all tests**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npm test
```

Expected: All tests pass (api, db, sync, downloads).

**Step 6: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): sync engine + download manager with full test coverage"
```

---

## Phase 4: Library Screen

### Task 9: Build EpisodeCard component and Library screen

**Files:**
- Create: `native/components/EpisodeCard.tsx`
- Modify: `native/app/(tabs)/library.tsx` (real implementation)

**Step 1: Build the EpisodeCard component**

Create `native/components/EpisodeCard.tsx`:

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { LibraryItem, AudioVersion } from "../lib/types";

interface EpisodeCardProps {
  item: LibraryItem;
  onPlay: (item: LibraryItem, version: AudioVersion) => void;
  onNewVersion?: (item: LibraryItem) => void;
}

function sourceIcon(sourceType: string): keyof typeof Ionicons.glyphMap {
  switch (sourceType) {
    case "url": return "link";
    case "pdf": return "document-text";
    case "epub": return "book";
    default: return "document";
  }
}

function formatDuration(secs: number): string {
  const mins = Math.round(secs / 60);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function EpisodeCard({ item, onPlay, onNewVersion }: EpisodeCardProps) {
  const readyVersions = item.versions.filter((v) => v.status === "ready");
  const generatingVersions = item.versions.filter((v) => v.status !== "ready");
  const primaryVersion = readyVersions[0] ?? null;
  const progress =
    primaryVersion && primaryVersion.durationSecs
      ? primaryVersion.position / primaryVersion.durationSecs
      : 0;

  return (
    <TouchableOpacity
      onPress={() => primaryVersion && onPlay(item, primaryVersion)}
      disabled={!primaryVersion}
      className="bg-white rounded-2xl p-4 mb-3 border border-gray-100"
      activeOpacity={0.7}
    >
      {/* Header row */}
      <View className="flex-row items-start gap-3">
        <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center">
          <Ionicons name={sourceIcon(item.sourceType)} size={20} color="#9CA3AF" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
            {item.title}
          </Text>
          {item.author && (
            <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
              {item.author}
            </Text>
          )}
        </View>
        {onNewVersion && (
          <TouchableOpacity
            onPress={() => onNewVersion(item)}
            className="ml-2 w-8 h-8 items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-vertical" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Version pills */}
      {readyVersions.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {readyVersions.map((v) => (
            <TouchableOpacity
              key={v.scriptId}
              onPress={() => onPlay(item, v)}
              className={`px-3 py-1 rounded-full border ${
                v === primaryVersion
                  ? "bg-brand/10 border-brand"
                  : "bg-gray-50 border-gray-200"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  v === primaryVersion ? "text-brand" : "text-gray-600"
                }`}
              >
                {v.durationSecs ? formatDuration(v.durationSecs) : `~${v.targetDuration} min`}
                {v.completed && " \u2713"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Generating badge */}
      {generatingVersions.length > 0 && (
        <View className="flex-row items-center mt-2">
          <View className="w-2 h-2 rounded-full bg-brand mr-2" />
          <Text className="text-xs text-brand font-medium">
            Generating{" "}
            {generatingVersions.length === 1
              ? "version"
              : `${generatingVersions.length} versions`}
            ...
          </Text>
        </View>
      )}

      {/* Progress bar */}
      {primaryVersion && !primaryVersion.completed && progress > 0.01 && (
        <View className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
          <View
            className="h-full bg-brand rounded-full"
            style={{ width: `${Math.min(progress * 100, 100)}%` }}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}
```

**Step 2: Build the Library screen**

Replace `native/app/(tabs)/library.tsx` with the full implementation. This screen:
- Loads from SQLite on mount (instant), then syncs from server in background
- Searches locally via SQLite LIKE query with 200ms debounce
- Filters by All / In Progress / Completed / Generating
- Supports pull-to-refresh
- Renders EpisodeCard for each item
- Shows empty state when no results

```tsx
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { EpisodeCard } from "../../components/EpisodeCard";
import { syncLibrary } from "../../lib/sync";
import { getAllEpisodes, searchEpisodes } from "../../lib/db";
import type { LibraryItem, AudioVersion, LibraryFilter } from "../../lib/types";

const FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "generating", label: "Generating" },
];

function filterEpisodes(items: LibraryItem[], filter: LibraryFilter): LibraryItem[] {
  if (filter === "all") return items;
  return items.filter((item) => {
    const versions = item.versions;
    switch (filter) {
      case "in_progress":
        return versions.some(
          (v) => v.status === "ready" && !v.completed && v.position > 0,
        );
      case "completed":
        return versions.some((v) => v.completed);
      case "generating":
        return versions.some((v) => v.status !== "ready");
      default:
        return true;
    }
  });
}

export default function LibraryScreen() {
  const [episodes, setEpisodes] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");

  // Initial load from SQLite (fast), then sync from server
  useEffect(() => {
    (async () => {
      try {
        const cached = await getAllEpisodes();
        setEpisodes(cached);
        setLoading(false);
        const fresh = await syncLibrary();
        setEpisodes(fresh);
      } catch (err) {
        console.error("[library] sync error:", err);
        setLoading(false);
      }
    })();
  }, []);

  // Search handler — queries SQLite directly
  useEffect(() => {
    if (!search.trim()) {
      getAllEpisodes().then(setEpisodes).catch(console.error);
      return;
    }
    const timeout = setTimeout(async () => {
      const results = await searchEpisodes(search.trim());
      setEpisodes(results);
    }, 200); // 200ms debounce
    return () => clearTimeout(timeout);
  }, [search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await syncLibrary();
      setEpisodes(fresh);
    } catch (err) {
      console.error("[library] refresh error:", err);
    }
    setRefreshing(false);
  }, []);

  const handlePlay = useCallback((item: LibraryItem, version: AudioVersion) => {
    // TODO: wire to player in Phase 5
    console.log("[library] play:", item.title, version.audioId);
  }, []);

  const filtered = filterEpisodes(episodes, filter);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#EA580C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-5 pt-2 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Library</Text>
      </View>

      {/* Search */}
      <View className="px-5 mb-3">
        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5">
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Search episodes..."
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Filter chips */}
      <View className="flex-row px-5 mb-3 gap-2">
        {FILTERS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full ${
              filter === key ? "bg-brand" : "bg-gray-100"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                filter === key ? "text-white" : "text-gray-600"
              }`}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Episode list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EpisodeCard item={item} onPlay={handlePlay} />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EA580C"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center pt-20">
            <Ionicons name="library-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-400 text-base mt-4">
              {search ? "No episodes match your search" : "No episodes yet"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
```

**Step 3: Verify the Library screen renders**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo start --ios
```

Expected: Library tab shows header, search bar, filter chips, and empty state. Press Ctrl+C to stop.

**Step 4: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): Library screen — episode cards, search, filter chips, pull-to-refresh"
```

---

## Phase 5: Audio Player Core

### Task 10: Set up react-native-track-player, player hook, and PlayerBar

This is the largest single task. It wires up: RNTP initialization, playback service for lock screen/remote controls, a React context + hook for player state, the persistent mini-player (PlayerBar), Smart Resume, and position persistence to both SQLite and server.

**Files:**
- Create: `native/lib/player.ts` (RNTP setup + playback service)
- Create: `native/lib/usePlayer.ts` (React context + hook wrapping RNTP)
- Create: `native/components/PlayerBar.tsx` (mini player)
- Modify: `native/app/_layout.tsx` (initialize player + wire token provider + PlayerProvider)
- Modify: `native/app/(tabs)/_layout.tsx` (add PlayerBar above tabs)
- Create: `native/__tests__/player.test.ts`

**Step 1: Create RNTP playback service and setup**

Create `native/lib/player.ts`:

```typescript
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
} from "react-native-track-player";

let _isSetup = false;

/**
 * Initialize react-native-track-player. Call once at app startup.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function setupPlayer(): Promise<boolean> {
  if (_isSetup) return true;

  try {
    await TrackPlayer.setupPlayer({
      minBuffer: 2,
      maxBuffer: 30,
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
      forwardJumpInterval: 15,
      backwardJumpInterval: 5,
    });

    await TrackPlayer.setRepeatMode(RepeatMode.Off);
    _isSetup = true;
    return true;
  } catch (error) {
    console.error("[player] setup failed:", error);
    return false;
  }
}

/**
 * Playback service — registered with RNTP. Handles remote events
 * (lock screen, CarPlay, Bluetooth controls).
 */
export async function PlaybackService() {
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    const pos = await TrackPlayer.getPosition();
    const dur = await TrackPlayer.getDuration();
    await TrackPlayer.seekTo(Math.min(dur, pos + event.interval));
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, pos - event.interval));
  });
}
```

**Step 2: Create the player React context and hook**

Create `native/lib/usePlayer.ts`. This module exports:
- `PlayerContext` — React context
- `usePlayer()` — consumer hook (throws if outside provider)
- `usePlayerState()` — the hook that builds the full context value, used inside the provider

The full implementation mirrors the web app's PlayerContext but uses RNTP instead of `<audio>`. Key behaviors:
- Position saves to SQLite every 5s during playback, fire-and-forget sync to server
- Smart Resume: 3s rewind if paused >10s
- Queue management via RNTP built-in queue
- Sleep timer with minute-based timeout or end-of-episode mode
- Resolves local file path before playing (offline support)
- Restores position/speed from SQLite cache on track load

```tsx
import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import TrackPlayer, {
  State,
  usePlaybackState,
  useProgress,
  useActiveTrack,
  Track,
} from "react-native-track-player";
import { AppState, AppStateStatus } from "react-native";
import {
  SMART_RESUME_REWIND_SECS,
  SMART_RESUME_THRESHOLD_MS,
  POSITION_SAVE_INTERVAL_MS,
} from "./constants";
import { saveLocalPlayback, getLocalPlayback } from "./db";
import { savePlaybackState } from "./api";
import { resolveAudioUrl } from "./downloads";
import type { PlayableItem } from "./types";

interface PlayerContextType {
  currentItem: PlayableItem | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  speed: number;
  buffered: number;
  play: (item: PlayableItem) => Promise<void>;
  togglePlay: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipForward: (seconds: number) => Promise<void>;
  skipBack: (seconds: number) => Promise<void>;
  setSpeed: (speed: number) => Promise<void>;
  playQueue: (items: PlayableItem[], startIndex?: number) => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  queue: PlayableItem[];
  queueIndex: number;
  sleepTimer: number | "end" | null;
  setSleepTimer: (value: number | "end" | null) => void;
}

export const PlayerContext = createContext<PlayerContextType | null>(null);

export function usePlayer(): PlayerContextType {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}

/**
 * Hook that provides the full PlayerContextType value.
 * Used inside PlayerProvider to build the context value.
 */
export function usePlayerState(): PlayerContextType {
  const playbackState = usePlaybackState();
  const progress = useProgress(250);
  const activeTrack = useActiveTrack();

  const [currentItem, setCurrentItem] = useState<PlayableItem | null>(null);
  const [queue, setQueue] = useState<PlayableItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [speed, setSpeedState] = useState(1.0);
  const [sleepTimer, setSleepTimerState] = useState<number | "end" | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  const sleepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPlaying = playbackState.state === State.Playing;

  // Track pause timestamps for Smart Resume
  useEffect(() => {
    if (isPlaying) {
      pausedAtRef.current = null;
    } else if (playbackState.state === State.Paused) {
      pausedAtRef.current = Date.now();
    }
  }, [isPlaying, playbackState.state]);

  // --- Position persistence ---
  // Save to SQLite every POSITION_SAVE_INTERVAL_MS during playback
  useEffect(() => {
    if (!isPlaying || !currentItem) return;
    const interval = setInterval(async () => {
      const pos = await TrackPlayer.getPosition();
      const spd = await TrackPlayer.getRate();
      await saveLocalPlayback({
        audioId: currentItem.id,
        position: pos,
        speed: spd,
      });
      // Fire-and-forget server sync
      savePlaybackState({
        audioId: currentItem.id,
        position: pos,
        speed: spd,
      }).catch(() => {});
    }, POSITION_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, currentItem]);

  // Save on app background
  useEffect(() => {
    const handleAppState = async (state: AppStateStatus) => {
      if (state === "background" && currentItem) {
        const pos = await TrackPlayer.getPosition();
        const spd = await TrackPlayer.getRate();
        await saveLocalPlayback({
          audioId: currentItem.id,
          position: pos,
          speed: spd,
        });
        savePlaybackState({
          audioId: currentItem.id,
          position: pos,
          speed: spd,
        }).catch(() => {});
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [currentItem]);

  // --- Playback controls ---

  const play = useCallback(async (item: PlayableItem) => {
    const audioUrl = await resolveAudioUrl(item.id, item.audioUrl);
    const track: Track = {
      id: item.id,
      url: audioUrl,
      title: item.title,
      artist: item.author ?? "Ridecast",
      duration: item.duration,
    };

    await TrackPlayer.reset();
    await TrackPlayer.add(track);

    // Restore position from local cache
    const localState = await getLocalPlayback(item.id);
    if (localState && localState.position > 0 && !localState.completed) {
      await TrackPlayer.seekTo(localState.position);
      if (localState.speed !== 1.0) {
        await TrackPlayer.setRate(localState.speed);
        setSpeedState(localState.speed);
      }
    }

    await TrackPlayer.play();
    setCurrentItem(item);
    setQueue([]);
    setQueueIndex(0);
  }, []);

  const playQueue = useCallback(async (items: PlayableItem[], startIndex = 0) => {
    if (items.length === 0) return;

    const tracks: Track[] = await Promise.all(
      items.map(async (item) => {
        const audioUrl = await resolveAudioUrl(item.id, item.audioUrl);
        return {
          id: item.id,
          url: audioUrl,
          title: item.title,
          artist: item.author ?? "Ridecast",
          duration: item.duration,
        };
      }),
    );

    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
    if (startIndex > 0) {
      await TrackPlayer.skip(startIndex);
    }

    // Restore position for first track
    const firstItem = items[startIndex];
    const localState = await getLocalPlayback(firstItem.id);
    if (localState && localState.position > 0 && !localState.completed) {
      await TrackPlayer.seekTo(localState.position);
    }

    await TrackPlayer.play();
    setCurrentItem(firstItem);
    setQueue(items);
    setQueueIndex(startIndex);
  }, []);

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      pausedAtRef.current = Date.now();
      await TrackPlayer.pause();
    } else {
      // Smart Resume: rewind if paused > threshold
      if (pausedAtRef.current && Date.now() - pausedAtRef.current > SMART_RESUME_THRESHOLD_MS) {
        const pos = await TrackPlayer.getPosition();
        await TrackPlayer.seekTo(Math.max(0, pos - SMART_RESUME_REWIND_SECS));
      }
      pausedAtRef.current = null;
      await TrackPlayer.play();
    }
  }, [isPlaying]);

  const seekTo = useCallback(async (position: number) => {
    await TrackPlayer.seekTo(position);
    if (currentItem) {
      await saveLocalPlayback({ audioId: currentItem.id, position });
    }
  }, [currentItem]);

  const skipForward = useCallback(async (seconds: number) => {
    const pos = await TrackPlayer.getPosition();
    const dur = await TrackPlayer.getDuration();
    await TrackPlayer.seekTo(Math.min(dur, pos + seconds));
  }, []);

  const skipBack = useCallback(async (seconds: number) => {
    const pos = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, pos - seconds));
  }, []);

  const setSpeed = useCallback(async (newSpeed: number) => {
    await TrackPlayer.setRate(newSpeed);
    setSpeedState(newSpeed);
    if (currentItem) {
      await saveLocalPlayback({ audioId: currentItem.id, speed: newSpeed });
    }
  }, [currentItem]);

  const skipToNext = useCallback(async () => {
    try {
      if (currentItem) {
        await saveLocalPlayback({ audioId: currentItem.id, completed: true });
        savePlaybackState({ audioId: currentItem.id, completed: true }).catch(() => {});
      }
      await TrackPlayer.skipToNext();
      const newIndex = queueIndex + 1;
      setQueueIndex(newIndex);
      if (queue[newIndex]) setCurrentItem(queue[newIndex]);
    } catch {
      // No next track
    }
  }, [currentItem, queue, queueIndex]);

  const skipToPrevious = useCallback(async () => {
    try {
      await TrackPlayer.skipToPrevious();
      const newIndex = queueIndex - 1;
      setQueueIndex(newIndex);
      if (queue[newIndex]) setCurrentItem(queue[newIndex]);
    } catch {
      // No previous track
    }
  }, [queue, queueIndex]);

  // --- Sleep timer ---

  const setSleepTimer = useCallback((value: number | "end" | null) => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
      sleepTimeoutRef.current = null;
    }
    setSleepTimerState(value);
    if (value === null || value === "end") return;
    sleepTimeoutRef.current = setTimeout(async () => {
      await TrackPlayer.pause();
      setSleepTimerState(null);
      sleepTimeoutRef.current = null;
    }, value * 60_000);
  }, []);

  // Handle "end of episode" sleep timer
  useEffect(() => {
    if (sleepTimer !== "end") return;
    const sub = TrackPlayer.addEventListener("playback-queue-ended", async () => {
      await TrackPlayer.pause();
      setSleepTimerState(null);
    });
    return () => sub.remove();
  }, [sleepTimer]);

  // Sync currentItem when RNTP active track changes (e.g., auto-advance)
  useEffect(() => {
    if (!activeTrack) return;
    const matchingItem = queue.find((item) => item.id === activeTrack.id);
    if (matchingItem && matchingItem.id !== currentItem?.id) {
      setCurrentItem(matchingItem);
      const idx = queue.indexOf(matchingItem);
      if (idx !== -1) setQueueIndex(idx);
    }
  }, [activeTrack, queue, currentItem]);

  return {
    currentItem,
    isPlaying,
    position: progress.position,
    duration: progress.duration,
    speed,
    buffered: progress.buffered,
    play,
    togglePlay,
    seekTo,
    skipForward,
    skipBack,
    setSpeed,
    playQueue,
    skipToNext,
    skipToPrevious,
    queue,
    queueIndex,
    sleepTimer,
    setSleepTimer,
  };
}
```

**Step 3: Build the PlayerBar component**

Create `native/components/PlayerBar.tsx`:

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";

interface PlayerBarProps {
  onPress: () => void;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlayerBar({ onPress }: PlayerBarProps) {
  const { currentItem, isPlaying, togglePlay, position, duration } = usePlayer();

  if (!currentItem) return null;

  const progress = duration > 0 ? position / duration : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      className="absolute bottom-0 left-0 right-0 mx-3 mb-2 bg-gray-900 rounded-2xl overflow-hidden"
      style={{
        elevation: 8,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -2 },
      }}
    >
      {/* Progress bar */}
      <View className="h-0.5 bg-gray-700">
        <View
          className="h-full bg-brand"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </View>

      <View className="flex-row items-center px-4 py-3">
        {/* Track info */}
        <View className="flex-1 mr-3">
          <Text className="text-white text-sm font-semibold" numberOfLines={1}>
            {currentItem.title}
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5">
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>

        {/* Play/Pause */}
        <TouchableOpacity
          onPress={togglePlay}
          className="w-10 h-10 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
```

**Step 4: Update root layout to initialize player, wire token provider, and wrap with PlayerProvider**

Replace `native/app/_layout.tsx`:

```tsx
import "../global.css";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/clerk-expo";
import TrackPlayer from "react-native-track-player";
import { tokenCache } from "../lib/auth";
import { setTokenProvider } from "../lib/api";
import { setupPlayer, PlaybackService } from "../lib/player";
import { PlayerContext, usePlayerState } from "../lib/usePlayer";

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

// Register playback service (must be top-level, outside component)
TrackPlayer.registerPlaybackService(() => PlaybackService);

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const onSignInScreen = segments[0] === "sign-in";
    if (!isSignedIn && !onSignInScreen) {
      router.replace("/sign-in");
    } else if (isSignedIn && onSignInScreen) {
      router.replace("/");
    }
  }, [isSignedIn, isLoaded, segments, router]);

  return <>{children}</>;
}

function TokenWire({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenProvider(getToken);
  }, [getToken]);
  return <>{children}</>;
}

function PlayerProvider({ children }: { children: React.ReactNode }) {
  const playerState = usePlayerState();
  return (
    <PlayerContext.Provider value={playerState}>
      {children}
    </PlayerContext.Provider>
  );
}

function AppContent() {
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    setupPlayer().then(setPlayerReady);
  }, []);

  if (!playerReady) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#EA580C" />
      </View>
    );
  }

  return (
    <PlayerProvider>
      <StatusBar style="dark" />
      <AuthGate>
        <TokenWire>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="processing"
              options={{ presentation: "fullScreenModal", gestureEnabled: false }}
            />
            <Stack.Screen
              name="settings"
              options={{ presentation: "modal", headerShown: true, title: "Settings" }}
            />
            <Stack.Screen
              name="sign-in"
              options={{ presentation: "fullScreenModal", gestureEnabled: false }}
            />
          </Stack>
        </TokenWire>
      </AuthGate>
    </PlayerProvider>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
      <ClerkLoaded>
        <AppContent />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
```

**Step 5: Update tab layout to show PlayerBar**

Replace `native/app/(tabs)/_layout.tsx`:

```tsx
import { useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PlayerBar } from "../../components/PlayerBar";

export default function TabLayout() {
  const [expandedPlayerVisible, setExpandedPlayerVisible] = useState(false);

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#EA580C",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            borderTopColor: "rgba(0,0,0,0.06)",
            paddingTop: 60, // make room for PlayerBar
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <PlayerBar onPress={() => setExpandedPlayerVisible(true)} />
      {/* ExpandedPlayer will be added in Phase 7 */}
    </View>
  );
}
```

**Step 6: Write player logic tests**

Create `native/__tests__/player.test.ts`:

```typescript
import {
  SMART_RESUME_REWIND_SECS,
  SMART_RESUME_THRESHOLD_MS,
  POSITION_SAVE_INTERVAL_MS,
} from "../lib/constants";

describe("player constants", () => {
  it("Smart Resume rewinds 3 seconds", () => {
    expect(SMART_RESUME_REWIND_SECS).toBe(3);
  });

  it("Smart Resume threshold is 10 seconds", () => {
    expect(SMART_RESUME_THRESHOLD_MS).toBe(10_000);
  });

  it("Position saves every 5 seconds", () => {
    expect(POSITION_SAVE_INTERVAL_MS).toBe(5_000);
  });
});

describe("Smart Resume logic", () => {
  it("calculates rewind position correctly", () => {
    const currentPosition = 120;
    const pauseDuration = 30_000;
    const threshold = SMART_RESUME_THRESHOLD_MS;

    if (pauseDuration > threshold) {
      const resumePosition = Math.max(0, currentPosition - SMART_RESUME_REWIND_SECS);
      expect(resumePosition).toBe(117);
    }
  });

  it("does not rewind below zero", () => {
    const currentPosition = 1;
    const resumePosition = Math.max(0, currentPosition - SMART_RESUME_REWIND_SECS);
    expect(resumePosition).toBe(0);
  });

  it("does not rewind when pause is short", () => {
    const pauseDuration = 5_000;
    const shouldRewind = pauseDuration > SMART_RESUME_THRESHOLD_MS;
    expect(shouldRewind).toBe(false);
  });
});

describe("position save scheduling", () => {
  it("interval matches expected frequency", () => {
    const expectedSavesPerMinute = 60_000 / POSITION_SAVE_INTERVAL_MS;
    expect(expectedSavesPerMinute).toBe(12);
  });
});
```

**Step 7: Run tests**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npm test
```

Expected: All tests pass.

**Step 8: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): audio player — RNTP setup, player hook, PlayerBar, Smart Resume, position persistence"
```

---

## Phase 6: Home Screen

### Task 11: Build the Home (Daily Drive) screen

**Files:**
- Modify: `native/app/(tabs)/index.tsx` (real implementation)

**Step 1: Build the Home screen**

Replace `native/app/(tabs)/index.tsx` with the full implementation. This screen shows:
- Time-based greeting
- Episode count + total duration of unlistened episodes
- "Play All" button that loads all unlistened episodes into the RNTP queue
- Currently Playing card with progress bar
- Up Next list (unlistened, excluding current)
- Empty state CTA for new users
- FAB to open upload modal (wired in Phase 8)
- Settings gear icon
- Pull-to-refresh

The full code for this screen is ~170 lines. Key helper functions:
- `getGreeting()` — returns "Good morning/afternoon/evening" based on hour
- `toPlayableItem()` — converts LibraryItem + AudioVersion to PlayableItem
- `formatTotalDuration()` — renders "Xh Ym" or "X min"

The screen loads from SQLite immediately on mount, then syncs from server in background.

See Phase 6 in the Reference section of the design doc for the complete screen specification.

```tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../../lib/usePlayer";
import { syncLibrary } from "../../lib/sync";
import { getAllEpisodes } from "../../lib/db";
import type { LibraryItem, AudioVersion, PlayableItem } from "../../lib/types";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTotalDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins} min`;
}

function toPlayableItem(item: LibraryItem, version: AudioVersion): PlayableItem | null {
  if (!version.audioId || !version.audioUrl || !version.durationSecs) return null;
  return {
    id: version.audioId,
    title: item.title,
    duration: version.durationSecs,
    format: version.format,
    audioUrl: version.audioUrl,
    author: item.author,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    contentType: version.contentType,
    themes: version.themes,
    summary: version.summary,
    targetDuration: version.targetDuration,
    wordCount: item.wordCount,
    compressionRatio: version.compressionRatio,
    voices: version.voices,
    ttsProvider: version.ttsProvider,
    createdAt: version.createdAt,
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const player = usePlayer();
  const [episodes, setEpisodes] = useState<LibraryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      const cached = await getAllEpisodes();
      setEpisodes(cached);
      try {
        const fresh = await syncLibrary();
        setEpisodes(fresh);
      } catch {
        // Use cached data
      }
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await syncLibrary();
      setEpisodes(fresh);
    } catch {
      // Keep existing
    }
    setRefreshing(false);
  }, []);

  // Compute unlistened episodes (ready, not completed)
  const unlistened = useMemo(() => {
    const items: { item: LibraryItem; version: AudioVersion }[] = [];
    for (const ep of episodes) {
      const ready = ep.versions.find(
        (v) => v.status === "ready" && !v.completed && v.audioId,
      );
      if (ready) items.push({ item: ep, version: ready });
    }
    return items;
  }, [episodes]);

  const totalDuration = useMemo(
    () => unlistened.reduce((sum, { version }) => sum + (version.durationSecs ?? 0), 0),
    [unlistened],
  );

  const handlePlayAll = useCallback(async () => {
    const playable = unlistened
      .map(({ item, version }) => toPlayableItem(item, version))
      .filter((p): p is PlayableItem => p !== null);
    if (playable.length > 0) {
      await player.playQueue(playable);
    }
  }, [unlistened, player]);

  const handlePlayEpisode = useCallback(
    async (item: LibraryItem, version: AudioVersion) => {
      const playable = toPlayableItem(item, version);
      if (playable) await player.play(playable);
    },
    [player],
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EA580C" />
        }
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-3xl font-bold text-gray-900">
              {getGreeting()}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/settings")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="settings-outline" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          {unlistened.length > 0 && (
            <Text className="text-base text-gray-500 mt-1">
              {unlistened.length} episode{unlistened.length !== 1 ? "s" : ""} &middot;{" "}
              {formatTotalDuration(totalDuration)}
            </Text>
          )}
        </View>

        {/* Play All Button */}
        {unlistened.length > 0 && (
          <View className="px-6 mb-6">
            <TouchableOpacity
              onPress={handlePlayAll}
              className="bg-brand rounded-2xl py-4 px-6 flex-row items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">
                Play All
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Currently Playing */}
        {player.currentItem && (
          <View className="px-6 mb-6">
            <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Currently Playing
            </Text>
            <View className="bg-gray-50 rounded-2xl p-4">
              <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
                {player.currentItem.title}
              </Text>
              {player.currentItem.author && (
                <Text className="text-sm text-gray-500 mt-0.5">
                  {player.currentItem.author}
                </Text>
              )}
              <View className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-brand rounded-full"
                  style={{
                    width: `${player.duration > 0 ? Math.min((player.position / player.duration) * 100, 100) : 0}%`,
                  }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Up Next */}
        {unlistened.length > 0 && (
          <View className="px-6">
            <Text className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Up Next
            </Text>
            {unlistened
              .filter(({ version }) => version.audioId !== player.currentItem?.id)
              .slice(0, 10)
              .map(({ item, version }) => (
                <TouchableOpacity
                  key={version.audioId ?? version.scriptId}
                  onPress={() => handlePlayEpisode(item, version)}
                  className="flex-row items-center py-3 border-b border-gray-100"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-xl bg-gray-100 items-center justify-center mr-3">
                    <Ionicons name="play" size={16} color="#EA580C" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="text-sm text-gray-500">
                      {version.durationSecs
                        ? `${Math.round(version.durationSecs / 60)} min`
                        : `~${version.targetDuration} min`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Empty State */}
        {episodes.length === 0 && (
          <View className="items-center justify-center pt-20 px-8">
            <Ionicons name="headset-outline" size={64} color="#D1D5DB" />
            <Text className="text-xl font-semibold text-gray-900 mt-6 text-center">
              Your Daily Drive is empty
            </Text>
            <Text className="text-base text-gray-500 mt-2 text-center leading-relaxed">
              Paste a URL or upload a file to create your first episode.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB — opens upload modal (wired in Phase 8) */}
      <TouchableOpacity
        onPress={() => {
          // TODO: open upload modal in Phase 8
        }}
        className="absolute bottom-24 right-6 w-14 h-14 bg-brand rounded-full items-center justify-center"
        style={{
          elevation: 6,
          shadowColor: "#EA580C",
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
```

**Step 2: Verify the Home screen renders**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo start --ios
```

Expected: Home tab shows greeting, empty state with CTA, FAB, and settings gear. Press Ctrl+C to stop.

**Step 3: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): Home screen — greeting, Play All, Currently Playing, Up Next, FAB"
```

---

## Phase 7: Expanded Player

### Task 12: Build ExpandedPlayer component

**Files:**
- Create: `native/components/ExpandedPlayer.tsx`
- Modify: `native/app/(tabs)/_layout.tsx` (wire ExpandedPlayer)

**Step 1: Build the ExpandedPlayer**

Create `native/components/ExpandedPlayer.tsx`. This is a full-screen modal with:
- Artwork with brand gradient
- Track title, author, content type
- Scrubber (Slider) with position/remaining time
- Skip back 5s, previous, play/pause, next, skip forward 15s
- Speed picker (0.5x to 2.0x)
- Sleep timer picker (5/15/30/60 min, end of episode, off)
- Car mode button
- Queue view toggle

Speed options: `[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]`

Sleep options: `[5 min, 15 min, 30 min, 60 min, End of episode, Off]`

The full component is ~250 lines. Uses `@react-native-community/slider` for the scrubber and the `usePlayer` hook for all state.

```tsx
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { usePlayer } from "../lib/usePlayer";
import { useState } from "react";

interface ExpandedPlayerProps {
  visible: boolean;
  onClose: () => void;
  onOpenCarMode?: () => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
const SLEEP_OPTIONS = [
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "60 min", value: 60 },
  { label: "End of episode", value: "end" as const },
  { label: "Off", value: null },
];

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ExpandedPlayer({ visible, onClose, onOpenCarMode }: ExpandedPlayerProps) {
  const player = usePlayer();
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showQueue, setShowQueue] = useState(false);

  if (!player.currentItem) return null;

  const remaining = Math.max(0, player.duration - player.position);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-down" size={28} color="#374151" />
          </TouchableOpacity>
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Now Playing
          </Text>
          <TouchableOpacity onPress={() => setShowQueue((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="list" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        {showQueue ? (
          <ScrollView className="flex-1 px-5">
            <Text className="text-lg font-bold text-gray-900 mb-4">Queue</Text>
            {player.queue.length === 0 ? (
              <Text className="text-gray-400">No queue — playing single episode</Text>
            ) : (
              player.queue.map((item, index) => (
                <View
                  key={item.id}
                  className={`flex-row items-center py-3 border-b border-gray-100 ${
                    index === player.queueIndex ? "bg-brand/5 -mx-2 px-2 rounded-xl" : ""
                  }`}
                >
                  <Text className="text-sm text-gray-400 w-8">{index + 1}</Text>
                  <View className="flex-1">
                    <Text
                      className={`text-base ${
                        index === player.queueIndex ? "font-semibold text-brand" : "text-gray-900"
                      }`}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-400 ml-2">{Math.round(item.duration / 60)}m</Text>
                </View>
              ))
            )}
          </ScrollView>
        ) : (
          <View className="flex-1 px-6">
            {/* Artwork */}
            <View className="items-center mt-8 mb-8">
              <View
                className="w-64 h-64 rounded-[32px] items-center justify-center"
                style={{ backgroundColor: "#EA580C", shadowColor: "#EA580C", shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }}
              >
                <Ionicons name="headset" size={80} color="white" />
              </View>
            </View>

            {/* Track info */}
            <View className="mb-6">
              <Text className="text-xl font-bold text-gray-900" numberOfLines={2}>{player.currentItem.title}</Text>
              {player.currentItem.author && <Text className="text-base text-gray-500 mt-1">{player.currentItem.author}</Text>}
              {player.currentItem.contentType && (
                <Text className="text-sm text-brand mt-1 capitalize">{player.currentItem.contentType.replace(/_/g, " ")}</Text>
              )}
            </View>

            {/* Scrubber */}
            <View className="mb-2">
              <Slider
                value={player.position}
                minimumValue={0}
                maximumValue={player.duration || 1}
                onSlidingComplete={(value) => player.seekTo(value)}
                minimumTrackTintColor="#EA580C"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#EA580C"
              />
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-gray-500">{formatTime(player.position)}</Text>
                <Text className="text-xs text-gray-500">-{formatTime(remaining)}</Text>
              </View>
            </View>

            {/* Main controls */}
            <View className="flex-row items-center justify-center gap-6 mb-6">
              <TouchableOpacity onPress={() => player.skipBack(5)}>
                <View className="items-center">
                  <Ionicons name="play-back" size={28} color="#374151" />
                  <Text className="text-[10px] text-gray-500 mt-0.5">5s</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={player.skipToPrevious}>
                <Ionicons name="play-skip-back" size={28} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity onPress={player.togglePlay} className="w-16 h-16 rounded-full bg-brand items-center justify-center">
                <Ionicons name={player.isPlaying ? "pause" : "play"} size={32} color="white" style={player.isPlaying ? undefined : { marginLeft: 3 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={player.skipToNext}>
                <Ionicons name="play-skip-forward" size={28} color="#374151" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => player.skipForward(15)}>
                <View className="items-center">
                  <Ionicons name="play-forward" size={28} color="#374151" />
                  <Text className="text-[10px] text-gray-500 mt-0.5">15s</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Secondary controls */}
            <View className="flex-row items-center justify-around">
              <TouchableOpacity onPress={() => setShowSpeedPicker((v) => !v)} className="items-center">
                <Text className="text-sm font-bold text-gray-700">{player.speed}x</Text>
                <Text className="text-[10px] text-gray-400">Speed</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSleepPicker((v) => !v)} className="items-center">
                <Ionicons name="moon" size={20} color={player.sleepTimer ? "#EA580C" : "#9CA3AF"} />
                <Text className="text-[10px] text-gray-400">Sleep</Text>
              </TouchableOpacity>
              {onOpenCarMode && (
                <TouchableOpacity onPress={onOpenCarMode} className="items-center">
                  <Ionicons name="car" size={20} color="#9CA3AF" />
                  <Text className="text-[10px] text-gray-400">Car</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Speed Picker */}
            {showSpeedPicker && (
              <View className="flex-row flex-wrap justify-center gap-2 mt-4 p-3 bg-gray-50 rounded-2xl">
                {SPEED_OPTIONS.map((s) => (
                  <TouchableOpacity key={s} onPress={() => { player.setSpeed(s); setShowSpeedPicker(false); }}
                    className={`px-4 py-2 rounded-full ${player.speed === s ? "bg-brand" : "bg-white border border-gray-200"}`}>
                    <Text className={`text-sm font-medium ${player.speed === s ? "text-white" : "text-gray-700"}`}>{s}x</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Sleep Timer Picker */}
            {showSleepPicker && (
              <View className="flex-row flex-wrap justify-center gap-2 mt-4 p-3 bg-gray-50 rounded-2xl">
                {SLEEP_OPTIONS.map((opt) => (
                  <TouchableOpacity key={String(opt.value)} onPress={() => { player.setSleepTimer(opt.value); setShowSleepPicker(false); }}
                    className={`px-4 py-2 rounded-full ${player.sleepTimer === opt.value ? "bg-brand" : "bg-white border border-gray-200"}`}>
                    <Text className={`text-sm font-medium ${player.sleepTimer === opt.value ? "text-white" : "text-gray-700"}`}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
```

**Step 2: Wire ExpandedPlayer into tab layout**

Replace `native/app/(tabs)/_layout.tsx`:

```tsx
import { useState } from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PlayerBar } from "../../components/PlayerBar";
import { ExpandedPlayer } from "../../components/ExpandedPlayer";

export default function TabLayout() {
  const [expandedPlayerVisible, setExpandedPlayerVisible] = useState(false);

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#EA580C",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: {
            borderTopColor: "rgba(0,0,0,0.06)",
            paddingTop: 60,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="library" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <PlayerBar onPress={() => setExpandedPlayerVisible(true)} />
      <ExpandedPlayer
        visible={expandedPlayerVisible}
        onClose={() => setExpandedPlayerVisible(false)}
      />
    </View>
  );
}
```

**Step 3: Verify ExpandedPlayer works**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo start --ios
```

Expected: When an episode is playing, tapping PlayerBar opens the full-screen player with scrubber, controls, speed picker, and sleep timer. Press Ctrl+C to stop.

**Step 4: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): ExpandedPlayer — scrubber, skip controls, speed, sleep timer, queue view"
```

---

## Phase 8: Upload + Processing

### Task 13: Build UploadModal and DurationPicker

**Files:**
- Create: `native/components/DurationPicker.tsx`
- Create: `native/components/UploadModal.tsx`

**Step 1: Build the DurationPicker**

Create `native/components/DurationPicker.tsx`. Renders preset buttons (Quick Take through Deep Dive) and a custom slider (2–60 minutes, step 1).

**Step 2: Build the UploadModal**

Create `native/components/UploadModal.tsx`. Two-step flow:
1. **Input step:** Paste URL or pick file (via expo-document-picker for PDF/EPUB/TXT). "Continue" calls `uploadUrl()` or `uploadFile()` from `lib/api.ts`. 409 duplicate is treated as success.
2. **Duration step:** Shows content title/word count preview, DurationPicker, and "Create X-Minute Episode" button that navigates to `/processing` with `contentId`, `targetMinutes`, and `title` params.

The modal renders as an absolute overlay with backdrop and keyboard-avoiding view. Resets all state on close.

**Step 3: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): UploadModal — URL/file input, DurationPicker, two-step flow"
```

---

### Task 14: Build Processing screen and wire upload flow

**Files:**
- Modify: `native/app/processing.tsx` (real implementation)
- Modify: `native/app/(tabs)/index.tsx` (wire FAB to UploadModal)
- Modify: `native/app/(tabs)/library.tsx` (add FAB + UploadModal)

**Step 1: Build the Processing screen**

Replace `native/app/processing.tsx`. Receives `contentId`, `targetMinutes`, `title` from route params. Pipeline:
1. Call `processContent(contentId, targetMinutes)` — visual stage advances from "analyzing" to "scripting" after 3s (cosmetic), then to "generating" when the API returns
2. Call `generateAudio(scriptRecord.id)` — stage advances to "generating", then "ready" on success
3. On completion: fire-and-forget `downloadEpisodeAudio()` and `syncLibrary()`, show "Play Now" and "Back to Library" buttons
4. Error handling: if process fails, show "Try Again" (restarts full pipeline). If audio fails, show "Retry Audio Generation" (retries just audio) AND "Start Over" (restarts full pipeline). Uses `errorStage` to determine which buttons to show.

Processing stages mirror the web app's `ProcessingScreen.tsx`:
- analyzing → scripting → generating → ready
- Stage copy from `STAGE_COPY` constants
- 4-step progress indicator with checkmarks for completed stages

**Step 2: Wire FAB to UploadModal on Home screen**

In `native/app/(tabs)/index.tsx`:
- Import `UploadModal` from `../../components/UploadModal`
- Add state: `const [uploadModalVisible, setUploadModalVisible] = useState(false)`
- Update FAB's `onPress` to: `() => setUploadModalVisible(true)`
- Add `<UploadModal visible={uploadModalVisible} onClose={() => setUploadModalVisible(false)} />` before closing `</SafeAreaView>`

**Step 3: Add FAB + UploadModal to Library screen too**

Same pattern in `native/app/(tabs)/library.tsx` — add FAB and UploadModal so users can create episodes from either tab.

**Step 4: Verify the full upload -> processing -> play flow**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo start --ios
```

Expected: Tap FAB -> upload modal -> paste URL -> Continue -> duration picker -> "Create X-Minute Episode" -> processing screen with animated stages -> "Play Now" on completion.

Press Ctrl+C to stop.

**Step 5: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): upload + processing — full pipeline from URL/file to playback"
```

---

## Phase 9: Car Mode + Settings

### Task 15: Build Car Mode overlay

**Files:**
- Create: `native/components/CarMode.tsx`
- Modify: `native/app/(tabs)/_layout.tsx` (wire Car Mode)

**Step 1: Build CarMode component**

Create `native/components/CarMode.tsx`. Full-screen black modal with:
- 140px play/pause button (center)
- -30s skip (left) and +30s skip (right) in 80px circles
- Episode title and position/duration
- Close button (top right, subtle gray)

Designed for eyes-off use. Black background, white/gray controls, oversized touch targets.

**Step 2: Wire Car Mode into tab layout**

In `native/app/(tabs)/_layout.tsx`:
- Import `CarMode`
- Add state: `const [carModeVisible, setCarModeVisible] = useState(false)`
- Pass `onOpenCarMode={() => setCarModeVisible(true)}` to `ExpandedPlayer`
- Add `<CarMode visible={carModeVisible} onClose={() => setCarModeVisible(false)} />` after `ExpandedPlayer`

**Step 3: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): Car Mode — full-screen black overlay, 140px play/pause, +/-30s skip"
```

---

### Task 16: Build Settings screen

**Files:**
- Modify: `native/app/settings.tsx` (real implementation)

**Step 1: Build the Settings screen**

Replace `native/app/settings.tsx`. Sections:
- **Account:** Clerk user name/email, "Sign Out" button with confirmation alert
- **ElevenLabs (BYOK):** SecureStore-backed API key input, save/remove button
- **Storage:** Episode download count and total size from `getStorageInfo()`
- **About:** App name and version

Uses `expo-secure-store` for the ElevenLabs key (stored under `ridecast_elevenlabs_key`). Uses `@clerk/clerk-expo`'s `useAuth()` for sign out and `useUser()` for display info.

**Step 2: Verify Settings screen**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo start --ios
```

Expected: Tapping gear icon opens Settings with account info, ElevenLabs key input, storage info, and sign out button.

Press Ctrl+C to stop.

**Step 3: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): Settings — account, ElevenLabs BYOK, storage info, sign out"
```

---

## Phase 10: CarPlay Integration

> **Note:** CarPlay requires the `com.apple.developer.carplay-audio` entitlement from Apple. Development and simulator testing work without it. If the entitlement is not approved by launch, skip this phase — the rest of the app works without it.

### Task 17: Integrate CarPlay with browsable library

**Files:**
- Create: `native/lib/carplay.ts`
- Modify: `native/app/_layout.tsx` (initialize CarPlay)
- Modify: `native/app.json` (add entitlement + background audio)

**Step 1: Install CarPlay dependency**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npm install @g4rb4g3/react-native-carplay
```

**Step 2: Create CarPlay module**

Create `native/lib/carplay.ts`. Sets up three CarPlay templates:
- **Root:** List with "Now Playing" and "Library" items
- **Now Playing:** Uses `NowPlayingTemplate` — automatic from RNTP media session
- **Library:** `ListTemplate` with up to 20 recent episodes from SQLite. `onSelect` resolves local audio URL and starts playback via TrackPlayer.

Register `CarPlay.registerOnConnect` and `CarPlay.registerOnDisconnect`.

**Step 3: Initialize CarPlay in root layout**

In `native/app/_layout.tsx`, import `initCarPlay` from `../lib/carplay` and call it after player setup completes in `AppContent`'s useEffect.

**Step 4: Add entitlement + background audio to app.json**

In `native/app.json`, add under `expo.ios`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["audio"],
        "com.apple.developer.carplay-audio": true
      }
    }
  }
}
```

**Step 5: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): CarPlay integration — Now Playing, browsable library, template navigation"
```

---

## Phase 11: Polish

### Task 18: First-run experience and empty states

**Files:**
- Create: `native/components/EmptyState.tsx`
- Modify: `native/app/(tabs)/index.tsx` (use EmptyState component)
- Modify: `native/app/(tabs)/library.tsx` (use EmptyState component)

**Step 1: Build reusable EmptyState component**

Create `native/components/EmptyState.tsx`. Props: `icon`, `title`, `message`, optional `actionLabel` + `onAction`. Renders centered icon, title, message, and optional CTA button.

**Step 2: Update Home and Library to use EmptyState with CTA**

Replace inline empty state JSX in both screens with `<EmptyState>` that opens the upload modal.

**Step 3: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): EmptyState component, first-run CTAs on Home and Library"
```

---

### Task 19: Episode versioning in Library

**Files:**
- Create: `native/components/NewVersionSheet.tsx`
- Modify: `native/app/(tabs)/library.tsx` (wire NewVersionSheet)

**Step 1: Build NewVersionSheet**

Create `native/components/NewVersionSheet.tsx`. A modal that:
- Shows the episode title and word count
- Renders `DurationPicker` for selecting a different duration
- "Create X-Minute Version" button navigates to `/processing` with the existing `contentId`

**Step 2: Wire into Library screen**

In `native/app/(tabs)/library.tsx`:
- Add state: `const [newVersionItem, setNewVersionItem] = useState<LibraryItem | null>(null)`
- Pass `onNewVersion={(item) => setNewVersionItem(item)}` to each `EpisodeCard`
- Render `<NewVersionSheet visible={!!newVersionItem} item={newVersionItem} onClose={() => setNewVersionItem(null)} />`

The three-dot menu on `EpisodeCard` (already implemented in Task 9) triggers `onNewVersion`.

**Step 3: Commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): episode versioning — new version sheet, duration picker, version pills"
```

---

### Task 20: Network banner and final polish

**Files:**
- Create: `native/components/NetworkBanner.tsx`
- Modify: `native/app/(tabs)/_layout.tsx` (add network banner)

**Step 1: Build network status banner**

Create `native/components/NetworkBanner.tsx`. Uses `@react-native-community/netinfo` to listen for connectivity changes. Shows amber banner "You're offline — playing from downloaded episodes" when disconnected. Returns null when connected.

**Step 2: Add NetworkBanner to tab layout**

In `native/app/(tabs)/_layout.tsx`, import and add `<NetworkBanner />` at the top of the `<View className="flex-1">` wrapper, before `<Tabs>`.

**Step 3: Run all tests one final time**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npm test
```

Expected: All tests pass.

**Step 4: Verify the full app end-to-end**

```bash
cd /Users/chrispark/Projects/ridecast2/native
npx expo start --ios
```

Walk through every workflow:
1. Sign in (or bypass with dev token)
2. Home screen with greeting + empty state
3. Library screen with search + filters
4. FAB -> Upload modal -> paste URL -> duration -> processing -> play
5. PlayerBar -> ExpandedPlayer -> scrubber, speed, sleep timer
6. Car Mode from ExpandedPlayer
7. Settings -> ElevenLabs key, storage info, sign out
8. Pull-to-refresh on both Home and Library
9. Offline banner when disconnecting network

Press Ctrl+C to stop.

**Step 5: Final commit**

```bash
cd /Users/chrispark/Projects/ridecast2
git add native/
git commit -m "feat(native): polish — network banner, error states, final wiring"
```

---

## Summary

| Phase | Tasks | What's Built |
|---|---|---|
| 1. Scaffolding | 1–3 | Expo project, NativeWind, Expo Router tabs, placeholders |
| 2. Auth | 4 | Clerk sign-in wall, Apple OAuth, token cache |
| 3. API + SQLite | 5–8 | Types, API client, SQLite cache, sync engine, download manager |
| 4. Library | 9 | EpisodeCard, Library screen with search + filters |
| 5. Audio Player | 10 | RNTP, player hook, PlayerBar, Smart Resume, position persistence |
| 6. Home | 11 | Daily Drive screen, Play All, Currently Playing, Up Next |
| 7. Expanded Player | 12 | Full-screen player, scrubber, speed, sleep timer, queue |
| 8. Upload + Processing | 13–14 | Upload modal, duration picker, processing screen, auto-download |
| 9. Car Mode + Settings | 15–16 | Car Mode overlay, Settings screen |
| 10. CarPlay | 17 | CarPlay browsable library + Now Playing |
| 11. Polish | 18–20 | Empty states, episode versioning, network banner |

**Total: 20 tasks across 11 phases.** Each phase is a self-contained dev-machine session.