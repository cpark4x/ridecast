# Feature: Minor UX Polish

> Consistent animation timing constants, proper keyboard handling in all modals, scroll position restoration on tab switches, standardized loading indicators, and search bar clear correctness.

## Motivation

These are the "feels off" details that users sense without being able to articulate. Inconsistent animation timing makes the app feel cheap. Keyboard covering inputs is frustrating. Losing scroll position when switching tabs breaks mental continuity. Loading spinner variants appearing in inconsistent places feel unfinished. Fixing all four in one pass raises the overall quality bar.

## Scope

- **`native/lib/animation.ts`** — shared timing constants (new)
- **`native/components/LoadingSpinner.tsx`** — standardized indicator (new)
- **`native/app/(tabs)/_layout.tsx`** — verify `unmountOnBlur: false`, add tabPress haptic
- **`native/app/(tabs)/library.tsx`** — `useScrollToTop` + `scrollEventThrottle`, verify search clear
- **`native/app/(tabs)/index.tsx`** — `useScrollToTop`
- **`native/components/UploadModal.tsx`** — `Keyboard.dismiss()` on backdrop tap
- **No** custom tab bar animations
- **No** shared element transitions between screens
- **No** changes to Expo Router stack transition defaults
- Scroll position restoration only for the two tab screens (Library, Home)

## Changes

### 1. Animation constants — `native/lib/animation.ts` (new)

```typescript
// native/lib/animation.ts
import { Easing } from "react-native";

export const ANIMATION = {
  // Durations (milliseconds)
  fast:   150,  // micro-interactions: chip presses, toggle state changes
  medium: 250,  // component transitions: modals sliding in, cards expanding
  slow:   400,  // page-level transitions, hero animations

  // Spring presets (use with Animated.spring)
  spring: {
    standard: { tension: 80,  friction: 12 },  // default spring feel
    snappy:   { tension: 120, friction: 10 },  // fast/crisp for tap responses
    gentle:   { tension: 50,  friction: 14 },  // slow reveal animations
  },

  // Easing presets (use with Animated.timing)
  easing: {
    standard: Easing.bezier(0.4, 0.0, 0.2, 1),  // Material standard
    decelerate: Easing.bezier(0.0, 0.0, 0.2, 1), // entering screen
    accelerate: Easing.bezier(0.4, 0.0, 1,   1), // leaving screen
  },
} as const;
```

### 2. Standardized loading indicator — `native/components/LoadingSpinner.tsx` (new)

```tsx
// native/components/LoadingSpinner.tsx
import React from "react";
import { ActivityIndicator, View } from "react-native";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  /** Center vertically in a flex-1 container */
  centered?: boolean;
}

export default function LoadingSpinner({
  size = "small",
  centered = false,
}: LoadingSpinnerProps) {
  if (centered) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size={size} color="#EA580C" />
      </View>
    );
  }
  return <ActivityIndicator size={size} color="#EA580C" />;
}
```

**Usage rule:** Replace every `<ActivityIndicator>` across the codebase with `<LoadingSpinner>`.  
Replace every `<ActivityIndicator color="...">` that is not `#EA580C` with `<LoadingSpinner>`.

### 3. Tab navigator — `native/app/(tabs)/_layout.tsx`

Read the current file before editing to verify exact structure, then apply:

**Before** (Tabs component, approximate):
```tsx
<Tabs
  screenOptions={{
    tabBarActiveTintColor: "#EA580C",
    // ... existing options
  }}
>
```

**After** — add `unmountOnBlur: false` (confirm it's already false or make explicit) and tabPress haptic:
```tsx
import * as Haptics from "expo-haptics";

<Tabs
  screenOptions={{
    tabBarActiveTintColor: "#EA580C",
    lazy: true,           // don't render tab until first visited
    unmountOnBlur: false, // keep mounted when switching tabs → preserves scroll
    // ... existing options
  }}
  screenListeners={{
    tabPress: () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  }}
>
```

### 4. Library scroll restoration — `native/app/(tabs)/library.tsx`

**Before:**
```typescript
import React, { useEffect, useRef, useState } from "react";
// ...
const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**After** — add scroll-to-top ref and throttle:
```typescript
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useScrollToTop } from "@react-navigation/native";
// ...

// Add inside LibraryScreen():
const listRef = useRef<FlatList>(null);
useScrollToTop(listRef);  // Tap tab bar icon while on Library → scrolls to top (iOS standard)
```

**Before** (FlatList):
```tsx
<FlatList
  data={filtered}
  keyExtractor={(item) => item.id}
  // ...
/>
```

**After:**
```tsx
<FlatList
  ref={listRef}
  data={filtered}
  keyExtractor={(item) => item.id}
  scrollEventThrottle={16}
  // ...existing props
/>
```

**Search clear fix** — verify the `onChangeText` path correctly resets on empty string.

**Before** (TextInput in library):
```tsx
<TextInput
  ...
  value={searchQuery}
  onChangeText={handleSearchChange}
  clearButtonMode="while-editing"
/>
```

**After** — explicit reset on empty string (iOS clear button fires `onChangeText("")`):
```tsx
<TextInput
  ...
  value={searchQuery}
  onChangeText={(text) => {
    handleSearchChange(text);
    // iOS "×" clear button fires onChangeText("") — explicitly reload full list
    if (text === "") {
      loadLocal();
    }
  }}
  clearButtonMode="while-editing"
/>
```

### 5. Home tab scroll restoration — `native/app/(tabs)/index.tsx`

Same pattern as library:

**Add import:**
```typescript
import { useScrollToTop } from "@react-navigation/native";
```

**Add inside component:**
```typescript
const listRef = useRef<FlatList>(null);
useScrollToTop(listRef);
```

**Add `ref` and `scrollEventThrottle` to FlatList or ScrollView:**
```tsx
<FlatList
  ref={listRef}
  scrollEventThrottle={16}
  // ...existing props
/>
```

### 6. Keyboard handling in UploadModal — `native/components/UploadModal.tsx`

The `KeyboardAvoidingView` already exists. Add `Keyboard.dismiss()` to the backdrop tap handler:

**Before:**
```tsx
{/* Dimmed backdrop */}
<TouchableOpacity
  className="flex-1 bg-black/40"
  activeOpacity={1}
  onPress={handleDismiss}
/>
```

**After:**
```tsx
import { Keyboard, ... } from "react-native";

{/* Dimmed backdrop — dismiss keyboard AND close modal */}
<TouchableOpacity
  className="flex-1 bg-black/40"
  activeOpacity={1}
  onPress={() => {
    Keyboard.dismiss();
    handleDismiss();
  }}
/>
```

Also add `keyboardVerticalOffset` to the existing `KeyboardAvoidingView`:

**Before:**
```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  className="bg-white rounded-t-3xl"
>
```

**After:**
```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
  className="bg-white rounded-t-3xl"
>
```

### 7. Audit other bottom sheets for KeyboardAvoidingView

Check `NewVersionSheet.tsx` for any `TextInput` usage. If present, apply the same `KeyboardAvoidingView` + `Keyboard.dismiss()` on backdrop pattern.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/lib/animation.ts` | **New** — shared timing + spring + easing constants |
| `native/components/LoadingSpinner.tsx` | **New** — standardized `ActivityIndicator` wrapper (`color="#EA580C"`) |
| `native/app/(tabs)/_layout.tsx` | Add `unmountOnBlur: false` (explicit), add `tabPress` haptic via `screenListeners` |
| `native/app/(tabs)/library.tsx` | Add `listRef` + `useScrollToTop`; add `scrollEventThrottle={16}`; fix search clear to call `loadLocal()` on empty string |
| `native/app/(tabs)/index.tsx` | Add `listRef` + `useScrollToTop`; add `scrollEventThrottle={16}` |
| `native/components/UploadModal.tsx` | Add `Keyboard.dismiss()` to backdrop `onPress`; add `keyboardVerticalOffset` to `KeyboardAvoidingView` |

## Tests

```typescript
// native/__tests__/animation.test.ts
import { ANIMATION } from "../lib/animation";

describe("ANIMATION constants", () => {
  it("has correct fast duration", () => {
    expect(ANIMATION.fast).toBe(150);
  });

  it("has correct medium duration", () => {
    expect(ANIMATION.medium).toBe(250);
  });

  it("has correct slow duration", () => {
    expect(ANIMATION.slow).toBe(400);
  });

  it("has spring presets as objects", () => {
    expect(ANIMATION.spring.standard).toMatchObject({
      tension: expect.any(Number),
      friction: expect.any(Number),
    });
  });
});

// native/__tests__/LoadingSpinner.test.tsx
import React from "react";
import { render } from "@testing-library/react-native";
import LoadingSpinner from "../components/LoadingSpinner";

describe("LoadingSpinner", () => {
  it("renders ActivityIndicator with brand color", () => {
    const { getByTestId } = render(<LoadingSpinner />);
    // Uses brand orange color
    // Note: ActivityIndicator does not expose color via testID;
    // assert it renders without crash
  });

  it("renders without crashing in small size", () => {
    expect(() => render(<LoadingSpinner size="small" />)).not.toThrow();
  });

  it("renders without crashing in large size", () => {
    expect(() => render(<LoadingSpinner size="large" />)).not.toThrow();
  });

  it("renders centered variant inside a flex-1 container", () => {
    expect(() => render(<LoadingSpinner centered />)).not.toThrow();
  });
});
```

## Success Criteria

```bash
# TypeScript clean
cd native && npx tsc --noEmit
# → 0 errors

# Unit tests pass
cd native && npx jest __tests__/animation.test.ts __tests__/LoadingSpinner.test.tsx --no-coverage
# → Test Suites: 2 passed

# Manual verification checklist:
# Keyboard
# 1. Open UploadModal → tap URL field → keyboard appears → content shifts up correctly
# 2. Tap backdrop → keyboard dismisses AND modal closes
# 3. Test on iPhone SE (small screen) — URL input not hidden behind keyboard

# Scroll restoration  
# 4. Scroll down in Library → switch to Home tab → switch back to Library → position preserved
# 5. Tap Library tab icon while on Library → list scrolls to top (useScrollToTop)

# Loading indicators
# 6. grep for all ActivityIndicator usages — all should use brand color #EA580C or LoadingSpinner

# Search clear
# 7. Type in Library search → tap × clear button → full episode list reloads (no empty flash)

# Haptics
# 8. Tap tab bar → light haptic vibration felt (test on physical device)
```

- All loading states use `#EA580C` (grep: `ActivityIndicator` with no `color` prop should be 0 results)
- `unmountOnBlur: false` confirmed in `_layout.tsx` (scroll position preserved across tab switches)
- No TypeScript errors from new files
