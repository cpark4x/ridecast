# Feature: App Infrastructure Hardening

> React error boundaries on all screens, Sentry crash reporting, performance monitoring for critical flows, and memory leak prevention in the audio player.

## Motivation

Production-quality apps don't crash without context. A JavaScript error in any screen currently crashes the entire app with a white screen and no user-facing explanation. Adding React error boundaries catches screen-level errors gracefully. Sentry surfaces crashes in production before users report them. Memory leak prevention in the audio player ensures long listening sessions don't degrade.

## Scope

- **`native/components/ErrorBoundary.tsx`** — class component wrapping each screen
- **Sentry integration** via `@sentry/react-native` — initialized in root layout
- **Performance spans** on `library.loadLocal` and `syncLibrary`
- **Memory leak audit** of audio player — event listener cleanup, `unloadAsync`, `isMounted` guards
- **Global error handler** for unhandled promise rejections
- **No** native crash reporting (Sentry JS layer only)
- **No** user-facing crash report submission flow
- **No** automated performance budgets or CI performance gates
- Sentry DSN is optional for local development (disabled when `__DEV__`)

## Changes

### 1. Error boundary component — `native/components/ErrorBoundary.tsx` (new)

```tsx
// native/components/ErrorBoundary.tsx
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
    console.error("[ErrorBoundary] Caught error:", error.message);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);

    // Sentry capture — no-op if Sentry not initialized
    try {
      const Sentry = require("@sentry/react-native");
      Sentry.captureException(error, {
        extra: { componentStack: info.componentStack },
      });
    } catch {
      // Sentry not installed — ignore
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-white items-center justify-center px-8">
          <Text className="text-4xl mb-4">⚠️</Text>
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-8">
            {__DEV__
              ? this.state.error?.message ?? "Unknown error"
              : "An unexpected error occurred. Please try again."}
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            className="bg-brand px-8 py-3 rounded-2xl"
          >
            <Text className="text-base font-bold text-white">Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Convenience HOC wrapper
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackTitle?: string,
): React.FC<P> {
  return function WrappedWithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallbackTitle={fallbackTitle}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
```

### 2. Wrap tab screens with ErrorBoundary

**`native/app/(tabs)/library.tsx`** — before:
```tsx
export default function LibraryScreen() {
  // ...
}
```

**After:**
```tsx
import { ErrorBoundary } from "../../components/ErrorBoundary";

function LibraryScreen() {
  // ...existing implementation unchanged
}

export default function LibraryScreenWrapper() {
  return (
    <ErrorBoundary fallbackTitle="Library unavailable">
      <LibraryScreen />
    </ErrorBoundary>
  );
}
```

Apply same pattern to:
- `native/app/(tabs)/index.tsx` → `fallbackTitle="Home unavailable"`
- `native/app/settings.tsx` → `fallbackTitle="Settings unavailable"`
- `native/app/following.tsx` → `fallbackTitle="Following unavailable"`

### 3. Install Sentry

```bash
cd native && npx expo install @sentry/react-native
```

Add to `.env.example` at project root:
```bash
# Sentry (optional — leave blank for local dev)
EXPO_PUBLIC_SENTRY_DSN=https://YOUR_KEY@oXXXXXX.ingest.sentry.io/XXXXXXX
```

### 4. Initialize Sentry in root layout — `native/app/_layout.tsx`

**Before** (imports section):
```tsx
import { Stack } from "expo-router";
// ...existing imports
```

**After:**
```tsx
import { Stack } from "expo-router";
import * as Sentry from "@sentry/react-native";
// ...existing imports

// Initialize before any component renders
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  environment: __DEV__ ? "development" : "production",
  tracesSampleRate: __DEV__ ? 0 : 0.2,   // 20% of transactions in prod
  enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  integrations: [
    new Sentry.ReactNativeTracing({
      // Expo Router integration — captures route changes automatically
    }),
  ],
});
```

**Before** (default export):
```tsx
export default function RootLayout() {
  // ...
}
```

**After:**
```tsx
function RootLayout() {
  // ...existing implementation unchanged

  // Add global unhandled rejection handler inside useEffect:
  useEffect(() => {
    const prevHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error("[GlobalHandler]", error, { isFatal });
      Sentry.captureException(error, { extra: { isFatal } });
      // Call previous handler so Expo's default behavior still runs
      prevHandler(error, isFatal);
    });
    return () => {
      ErrorUtils.setGlobalHandler(prevHandler);
    };
  }, []);

  return (
    // ...existing render
  );
}

export default Sentry.wrap(RootLayout);
```

### 5. Performance monitoring spans — `native/app/(tabs)/library.tsx`

Add Sentry performance spans around the two critical paths.

**Before** (`loadLocal` function):
```typescript
async function loadLocal() {
  try {
    const items = await getAllEpisodes();
    setEpisodes(items);
  } catch (err) {
    console.warn("[library] loadLocal error:", err);
  }
}
```

**After:**
```typescript
import * as Sentry from "@sentry/react-native";

async function loadLocal() {
  const span = Sentry.startInactiveSpan({ name: "library.loadLocal", op: "db.query" });
  try {
    const items = await getAllEpisodes();
    setEpisodes(items);
  } catch (err) {
    console.warn("[library] loadLocal error:", err);
    Sentry.captureException(err);
  } finally {
    span?.end();
  }
}
```

**Before** (`syncInBackground` function):
```typescript
async function syncInBackground() {
  try {
    const items = await syncLibrary();
    setEpisodes(items);
  } catch (err) {
    console.warn("[library] background sync error:", err);
  }
}
```

**After:**
```typescript
async function syncInBackground() {
  const span = Sentry.startInactiveSpan({ name: "library.syncInBackground", op: "http.client" });
  try {
    const items = await syncLibrary();
    setEpisodes(items);
  } catch (err) {
    console.warn("[library] background sync error:", err);
    // Don't capture to Sentry — network errors on background sync are expected when offline
  } finally {
    span?.end();
  }
}
```

### 6. Memory leak prevention — audio player files

Audit `native/lib/usePlayer.ts` (or `PlayerContext.tsx`) for these three patterns:

#### Leak 1: Sound event listener not removed

**Before:**
```typescript
useEffect(() => {
  sound.setOnPlaybackStatusUpdate(handleStatus);
}, [sound]);
```

**After:**
```typescript
useEffect(() => {
  if (!sound) return;
  sound.setOnPlaybackStatusUpdate(handleStatus);
  return () => {
    sound.setOnPlaybackStatusUpdate(null);   // Remove listener
    sound.unloadAsync().catch((err) => {
      console.warn("[player] unload error:", err);
    });
  };
}, [sound]);
```

#### Leak 2: Position polling interval not cleared

**Before:**
```typescript
useEffect(() => {
  const interval = setInterval(pollPosition, 500);
}, []);
```

**After:**
```typescript
useEffect(() => {
  const interval = setInterval(pollPosition, 500);
  return () => clearInterval(interval);  // ← always clear
}, []);
```

#### Leak 3: Async `setState` after unmount

**Pattern to apply** anywhere async state is set after network/DB calls:
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);

// In async callback:
const data = await someAsyncOperation();
if (!isMountedRef.current) return;   // Guard before setState
setState(data);
```

**Audit checklist for player files:**
- [ ] `useEffect` cleanup functions present for all `setOnPlaybackStatusUpdate` calls
- [ ] `sound.unloadAsync()` called when changing tracks (not just on unmount)
- [ ] No `setInterval` without corresponding `clearInterval` in cleanup
- [ ] All async `setState` calls guarded with `isMountedRef.current` or moved to `useReducer`

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/ErrorBoundary.tsx` | **New** — class-based React error boundary + `withErrorBoundary` HOC |
| `native/app/(tabs)/library.tsx` | Wrap `LibraryScreen` in `ErrorBoundary`; add Sentry spans to `loadLocal` and `syncInBackground` |
| `native/app/(tabs)/index.tsx` | Wrap default export in `ErrorBoundary` |
| `native/app/settings.tsx` | Wrap default export in `ErrorBoundary` |
| `native/app/following.tsx` | Wrap default export in `ErrorBoundary` |
| `native/app/_layout.tsx` | Initialize Sentry; set global error handler; wrap with `Sentry.wrap()` |
| `native/lib/usePlayer.ts` (or `PlayerContext.tsx`) | Fix memory leaks: listener cleanup, `unloadAsync` on track change, `isMountedRef` guard |
| `native/package.json` | Add `@sentry/react-native` |
| `.env.example` | Add `EXPO_PUBLIC_SENTRY_DSN` |

## Tests

```typescript
// native/__tests__/ErrorBoundary.test.tsx
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Text } from "react-native";

// Component that throws on demand
function BombComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test explosion");
  return <Text testID="content">Content</Text>;
}

// Suppress error boundary console.error during tests
beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <BombComponent shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(getByTestId("content")).toBeTruthy();
  });

  it("renders fallback UI when child throws", () => {
    const { getByText } = render(
      <ErrorBoundary fallbackTitle="Library unavailable">
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(getByText("Library unavailable")).toBeTruthy();
    expect(getByText("Try Again")).toBeTruthy();
  });

  it("shows error message in DEV mode", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    // In __DEV__, error message is shown
    // This assertion depends on __DEV__ being true in test env
    expect(getByText(/Test explosion/)).toBeTruthy();
  });

  it("resets boundary when Try Again is pressed", () => {
    const { getByText, getByTestId, rerender } = render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Boundary is in error state
    expect(getByText("Try Again")).toBeTruthy();

    // Press Try Again → resets state
    fireEvent.press(getByText("Try Again"));

    // Re-render with non-throwing component
    rerender(
      <ErrorBoundary>
        <BombComponent shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(getByTestId("content")).toBeTruthy();
  });

  it("uses default fallback title when none provided", () => {
    const { getByText } = render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(getByText("Something went wrong")).toBeTruthy();
  });
});
```

## Success Criteria

```bash
# Install Sentry
cd native && npx expo install @sentry/react-native
# → resolves without peer dependency conflicts

# TypeScript clean
cd native && npx tsc --noEmit
# → 0 errors

# Unit tests pass
cd native && npx jest __tests__/ErrorBoundary.test.tsx --no-coverage
# → Test Suites: 1 passed, Tests: 5 passed

# Manual smoke tests:
# 1. Add a temporary throw to LibraryScreen render → ErrorBoundary shows "Library unavailable"
# 2. Tap "Try Again" → ErrorBoundary resets → screen re-renders (remove throw first)
# 3. Verify white-screen crash is gone for any component-level JS error
# 4. Open and close expanded player 10 times → no visible memory growth in Hermes profiler
#    (Dev menu → Performance → Hermes Memory tab)
# 5. Build for production: EXPO_PUBLIC_SENTRY_DSN=<real-dsn> npx expo build:ios
#    → verify Sentry events appear in dashboard on forced test crash
```

- `ErrorBoundary` wraps all 4 tab screens and the settings screen
- `Sentry.init()` called in root layout (SDK initialized even when DSN is placeholder)
- Audio player files have cleanup functions verified present — no `setInterval` without `clearInterval`
- No TypeScript errors
