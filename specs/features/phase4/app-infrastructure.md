# Feature: App Infrastructure Hardening

> Error boundaries on all screens, crash reporting integration, performance monitoring, and memory leak prevention in the audio player (GitHub #40).

## Motivation

Production-quality apps don't crash without context. Right now, a JavaScript error in any screen component crashes the entire app with a white screen and no user-facing explanation. Adding React error boundaries catches screen-level errors gracefully. Sentry (or equivalent) surfaces crashes in production before users report them. Performance monitoring catches regressions. Memory leak prevention in the audio player ensures long listening sessions don't degrade.

## Changes

### 1. React Error Boundaries (`native/components/ErrorBoundary.tsx` — new)

A class component (required for `componentDidCatch`) that wraps each screen:

```typescript
import React, { Component } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    // Report to Sentry (when integrated)
    // Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            {__DEV__ ? this.state.error?.message : "An unexpected error occurred. Please restart the app."}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            className="bg-brand px-6 py-3 rounded-2xl"
          >
            <Text className="text-base font-bold text-white">Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}
```

### 2. Wrap all screens with ErrorBoundary

In each screen file, wrap the default export:

```typescript
// native/app/(tabs)/library.tsx
export default function LibraryScreenWrapped() {
  return (
    <ErrorBoundary fallbackTitle="Library unavailable">
      <LibraryScreen />
    </ErrorBoundary>
  );
}
```

Apply to: `index.tsx`, `library.tsx`, `settings.tsx`, `following.tsx`, expanded player, and any future screens.

Alternatively, wrap at the layout level in `native/app/(tabs)/_layout.tsx` to catch all tab screens in one boundary. Use per-screen boundaries for better error attribution.

### 3. Crash reporting — Sentry integration

```bash
cd native && npx expo install @sentry/react-native
```

Initialize in `native/app/_layout.tsx`:

```typescript
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: 0.2,   // 20% of transactions for performance monitoring
  enabled: !__DEV__,       // disable in dev (noisy)
});
```

Add to `.env.example`:
```bash
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

Wrap root component with Sentry:
```typescript
export default Sentry.wrap(RootLayout);
```

**Breadcrumbs** — add navigation breadcrumbs automatically via Expo Router:
```typescript
// Sentry captures navigation events automatically via @sentry/react-native's routing integration
```

### 4. Performance monitoring

Use Sentry performance transactions for the two most critical user flows:

**Episode load time** (SQLite → screen render):
```typescript
// In loadLocal() in library.tsx and index.tsx:
const transaction = Sentry.startTransaction({ name: "library.loadLocal", op: "db" });
try {
  const items = await getAllEpisodes();
  setEpisodes(items);
} finally {
  transaction.finish();
}
```

**Episode generation time** (upload → audio ready):
Already tracked via the existing API call chain. Add Sentry spans around the `/api/upload`, `/api/process`, and `/api/audio/generate` calls in `sync.ts` or the processing screen.

### 5. Memory leak prevention in audio player

The most common leak pattern in audio players:

**Leak 1: Event listeners not removed**
```typescript
// In PlayerContext/usePlayer — ensure all listeners are cleaned up:
useEffect(() => {
  const subscription = sound.setOnPlaybackStatusUpdate(handleStatus);
  return () => {
    subscription.remove?.();       // expo-av v14+
    sound?.unloadAsync().catch(console.warn); // Always unload on unmount
  };
}, [sound]);
```

**Leak 2: setInterval not cleared**
```typescript
// Any position polling interval must be cleared on unmount:
useEffect(() => {
  const interval = setInterval(pollPosition, 500);
  return () => clearInterval(interval);
}, []);
```

**Leak 3: Async setState after unmount**
```typescript
// Use isMounted ref pattern for async operations:
const isMountedRef = useRef(true);
useEffect(() => {
  return () => { isMountedRef.current = false; };
}, []);

// In async callbacks:
if (!isMountedRef.current) return;
setState(newValue);
```

**Audit checklist for audio player files:**
- [ ] `useEffect` cleanup functions present for all subscriptions
- [ ] `sound.unloadAsync()` called when changing tracks
- [ ] No `setInterval` without corresponding `clearInterval` in cleanup
- [ ] Async `setState` guarded by mounted check or AbortController

### 6. Global unhandled promise rejection handler

```typescript
// In native/app/_layout.tsx — root layout:
useEffect(() => {
  const handler = (event: PromiseRejectionEvent) => {
    console.error("[UnhandledRejection]", event.reason);
    Sentry.captureException(event.reason);
  };
  // React Native doesn't have PromiseRejectionEvent in the same form,
  // but expo-dev-client surfaces these. For production:
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    Sentry.captureException(error, { extra: { isFatal } });
    if (isFatal) {
      // Show fallback UI or allow Sentry to handle
    }
  });
}, []);
```

### 7. Memory leak detection in development

Add flipper or Hermes memory profiling note for dev workflow:

```typescript
// In app/_layout.tsx — DEV only:
if (__DEV__) {
  // Enable React Native performance overlay
  // Use Hermes profiler: npx react-native profile-hermes
  // Or use Flipper's React DevTools → Profiler tab
}
```

Document in `native/README.md` (or update existing): how to profile memory with Hermes.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/ErrorBoundary.tsx` | New — React error boundary component |
| `native/app/(tabs)/index.tsx` | Wrap with ErrorBoundary |
| `native/app/(tabs)/library.tsx` | Wrap with ErrorBoundary, add Sentry perf span to `loadLocal` |
| `native/app/(tabs)/_layout.tsx` | Add tabPress haptic, verify unmountOnBlur |
| `native/app/_layout.tsx` | Initialize Sentry, set GlobalHandler |
| `native/lib/PlayerContext.tsx` | Audit and fix potential memory leaks |
| `native/package.json` | Add `@sentry/react-native` |
| `.env.example` | Add `EXPO_PUBLIC_SENTRY_DSN` |

## Tests

```bash
cd native && npx tsc --noEmit
```

- [ ] Throw a test error in a screen component → ErrorBoundary shows fallback UI
- [ ] "Try Again" in fallback resets the boundary and re-renders the screen
- [ ] App does not crash to white screen on any unhandled JS error
- [ ] Open and close expanded player 20 times → no memory growth in Hermes profiler
- [ ] Play 3 different tracks → all previous sounds unloaded (verified via Hermes heap)

## Success Criteria

- ErrorBoundary wraps all tab screens
- Sentry DSN configured and SDK initialized (even if DSN is placeholder)
- Audio player cleanup functions present and correct
- No TypeScript errors

## Scope

- **No** native crash reporting (Sentry's React Native SDK handles JS layer; native crashes require separate native integration)
- **No** user-facing crash report submission flow
- **No** automated performance budgets or CI performance gates
- Sentry is the recommended provider but the DSN is optional to configure for development
