# Feature: iOS Share Extension

> Share any URL or text from Safari (or any app) directly to Ridecast — appears in the iOS Share Sheet as "Add to Ridecast".

## Motivation

The iOS Share Sheet is the native content handoff mechanism. When a user is reading an article in Safari, Reeder, or any app, the path to creating a Ridecast episode should be: tap Share → "Add to Ridecast" → done. No copy/paste, no tab switching. This is the lowest-friction possible entry point on iOS — and it makes Ridecast feel like a first-class citizen of the Apple ecosystem.

## Changes

### 1. Overview

iOS Share Extensions are separate app targets that run in a sandboxed process. In an Expo managed workflow, creating a native extension requires either:

- **Option A: Expo config plugin** (recommended for managed workflow) — a plugin that modifies the Xcode project to add a Share Extension target
- **Option B: Bare workflow** — eject from Expo and manage the Xcode project directly

**Recommendation: Option A** — use `expo-share-extension` or a custom config plugin. The managed workflow is preserved.

### 2. Install and configure expo-share-extension

```bash
cd native && npx expo install expo-share-extension
```

> If `expo-share-extension` is not maintained or has issues, use `react-native-share-menu` or implement a bare-bones native extension via a custom config plugin.

Add to `native/app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-share-extension",
        {
          "activationRules": [
            { "NSExtensionActivationSupportsWebURLWithMaxCount": 1 },
            { "NSExtensionActivationSupportsText": true }
          ]
        }
      ]
    ]
  }
}
```

### 3. Share Extension UI (`native/share-extension/ShareView.tsx` — new)

The share extension runs a minimal React Native component. Keep it lightweight — it should not import the full app bundle.

```typescript
// native/share-extension/ShareView.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";

interface SharedContent {
  url: string | null;
  text: string | null;
}

export default function ShareView() {
  const [content, setContent] = useState<SharedContent>({ url: null, text: null });
  const [duration, setDuration] = useState(10);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Read shared content from the extension context
    // expo-share-extension provides this via ShareExtension.data
    ShareExtension.data().then((data) => {
      const url = data.find(item => item.type === "url")?.value ?? null;
      const text = data.find(item => item.type === "text")?.value ?? null;
      setContent({ url, text });
    });
  }, []);

  async function handleCreate() {
    const input = content.url ?? content.text;
    if (!input) return;

    setStatus("submitting");
    try {
      await submitToRidecast(input, duration);
      setStatus("success");
      setTimeout(() => ShareExtension.close(), 1500);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  const displayUrl = content.url
    ? (() => { try { return new URL(content.url).hostname; } catch { return content.url; } })()
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
        <TouchableOpacity onPress={() => ShareExtension.close()}>
          <Text style={{ fontSize: 16, color: "#6B7280" }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>Add to Ridecast</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Content preview */}
        <View style={{ backgroundColor: "#F3F4F6", borderRadius: 12, padding: 12, marginBottom: 20 }}>
          <Text style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>Adding</Text>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }} numberOfLines={2}>
            {displayUrl ?? content.text?.slice(0, 100) ?? "Unknown content"}
          </Text>
        </View>

        {/* Duration picker */}
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
          Episode Duration
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
          {[5, 10, 15, 20, 30].map((min) => (
            <TouchableOpacity
              key={min}
              onPress={() => setDuration(min)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: duration === min ? "#EA580C" : "#F3F4F6",
                borderWidth: 1,
                borderColor: duration === min ? "#EA580C" : "#E5E7EB",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: duration === min ? "white" : "#374151" }}>
                {min}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status messages */}
        {status === "error" && errorMsg && (
          <Text style={{ fontSize: 13, color: "#EF4444", marginBottom: 16, textAlign: "center" }}>
            {errorMsg}
          </Text>
        )}

        {status === "success" && (
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#16A34A", textAlign: "center", marginBottom: 16 }}>
            ✓ Episode added to your library
          </Text>
        )}

        {/* Create button */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={status === "submitting" || status === "success"}
          style={{
            backgroundColor: "#EA580C",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            opacity: status === "submitting" ? 0.7 : 1,
          }}
        >
          {status === "submitting" ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ fontSize: 16, fontWeight: "700", color: "white" }}>
              Create Episode
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

### 4. API call from share extension (`native/share-extension/api.ts`)

The share extension runs in a separate process with no access to the main app's state or context. API calls must be made directly:

```typescript
// native/share-extension/api.ts
import * as SecureStore from "expo-secure-store";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "https://ridecast.app";

async function getAuthToken(): Promise<string | null> {
  // Clerk stores the session token in SecureStore
  // The extension must use the same App Group to access it
  // App Group: group.com.ridecast.app (configure in app.json)
  return SecureStore.getItemAsync("clerk_session_token");
}

export async function submitToRidecast(urlOrText: string, duration: number): Promise<void> {
  const token = await getAuthToken();
  if (!token) throw new Error("Not signed in. Please open Ridecast and sign in first.");

  // Determine if it's a URL or raw text
  const isUrl = /^https?:\/\//.test(urlOrText);

  const uploadBody = isUrl
    ? { url: urlOrText }
    : { rawText: urlOrText, sourceType: "text" };

  const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(uploadBody),
  });

  if (!uploadResponse.ok) {
    const data = await uploadResponse.json().catch(() => ({}));
    throw new Error(data.error ?? `Upload failed (${uploadResponse.status})`);
  }

  const upload = await uploadResponse.json();

  // Kick off processing (fire and forget — generation happens in background)
  await fetch(`${API_BASE}/api/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      contentId: upload.id,
      targetDuration: duration,
      format: "narrative",
    }),
  });
  // Note: /api/audio/generate is triggered automatically by the server after /api/process
  // OR the main app polls and triggers it on next sync — depends on backend implementation
}
```

### 5. App Group for shared SecureStore access

For the share extension to access the Clerk session token, both the main app and the extension must share an **App Group**. This allows shared `UserDefaults` and `Keychain` access between targets.

In `native/app.json`:
```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": ["group.com.ridecast.shared"]
      }
    },
    "plugins": [
      [
        "expo-share-extension",
        {
          "appGroupIdentifier": "group.com.ridecast.shared"
        }
      ]
    ]
  }
}
```

Configure `expo-secure-store` to use the App Group:
```typescript
// Use App Group-based Keychain access
await SecureStore.getItemAsync("clerk_session_token", {
  keychainAccessGroup: "group.com.ridecast.shared",
});
```

> **Note:** Clerk's internal token storage may not use `expo-secure-store` directly. Check the Clerk Expo SDK's token cache implementation and ensure it can be configured to use a shared Keychain group. If not, the share extension may need to store a separately issued API key rather than the Clerk session token.

### 6. Not signed in — fallback

If no auth token is found, show an error and deep-link into the main app:

```typescript
if (!token) {
  // Open main app via URL scheme
  ShareExtension.openURL("ridecast://sign-in");
  // or: show inline message
  setErrorMsg("Please open Ridecast and sign in first.");
}
```

Register the URL scheme in `native/app.json`:
```json
{
  "expo": {
    "scheme": "ridecast"
  }
}
```

### 7. Handle text content (no URL)

When the user shares selected text (no URL), send it as raw text:

```typescript
const isUrl = content.url && /^https?:\/\//.test(content.url);
const input = isUrl ? content.url! : (content.text ?? "");

if (!isUrl && input.split(/\s+/).length < 50) {
  setErrorMsg("Selected text is too short to create an episode. Try sharing a full article URL instead.");
  return;
}
```

### 8. Build configuration

```bash
# Rebuild with the share extension plugin
cd native && npx expo prebuild --clean
npx expo run:ios
```

The extension appears as "Add to Ridecast" in the iOS Share Sheet. It must be enabled by the user in the "More" section of the share sheet on first use.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/share-extension/ShareView.tsx` | New — share extension UI component |
| `native/share-extension/api.ts` | New — API submission from extension context |
| `native/app.json` | Add `expo-share-extension` plugin config, App Group entitlement, URL scheme |
| `native/package.json` | Add `expo-share-extension` |

## Tests

Manual testing on physical device (share extension requires real device — not simulator):

- [ ] Share Sheet appears with "Add to Ridecast" option after enabling in "More"
- [ ] Sharing an article URL → ShareView shows URL domain
- [ ] Duration picker selects correctly, defaults to 10 min
- [ ] Tapping "Create Episode" → submitting state → success message → auto-close
- [ ] Episode appears in Ridecast library as "Generating" within a few seconds
- [ ] Not signed in → helpful error message shown
- [ ] Sharing text selection (not URL) → processes as raw text if long enough
- [ ] Short text selection → shows "text too short" error
- [ ] Cancel button dismisses the share sheet

## Success Criteria

```bash
cd native && npx expo prebuild && npx expo run:ios
# Share extension target builds without errors
```

- Share extension appears in iOS Share Sheet for URLs
- API call uses correct auth token
- Episode appears in main app library after creation
- No crash when opened without signing in

## Scope

- **No** content preview or title extraction before submitting (submit first, process async)
- **No** queue management from the extension (submit one item at a time)
- **No** offline queue (if submission fails, show error — no retry mechanism)
- **iOS only** — no Android sharing integration in this spec
- Auth via App Group Keychain only — no separate API key system
- The extension is minimal by design — complex UI should live in the main app
