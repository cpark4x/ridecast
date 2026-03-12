# Feature: Minor UX Polish

> Consistent animation timing, proper keyboard handling in modals, scroll position restoration on tab switches, and loading indicator consistency (GitHub #41).

## Motivation

These are the "feels off" details that users sense without being able to articulate. Inconsistent animation timing makes the app feel cheap. Keyboard covering inputs is frustrating. Losing scroll position when switching tabs breaks mental continuity. Loading spinner variants appearing in inconsistent places feel unfinished. Fixing all four in one pass raises the overall quality bar.

## Changes

### 1. Consistent animation timing

Audit all `Animated.timing` calls across the app and align to a shared timing constants file:

**`native/lib/animation.ts`** (new):
```typescript
export const ANIMATION = {
  // Standard durations
  fast:    150,  // micro-interactions: chips, toggles
  medium:  250,  // transitions: modals sliding in, cards expanding
  slow:    400,  // page-level transitions, hero animations

  // Easing (use with Animated.timing easing param)
  // React Native's Easing module
  standard: { tension: 80, friction: 12 },   // spring defaults
  snappy:   { tension: 120, friction: 10 },  // fast spring for taps
} as const;
```

Audit locations to update:
- `UploadModal.tsx` — modal slide-in animation
- `ExpandedPlayer.tsx` — slide-up animation
- `ShimmerCard.tsx` — shimmer loop duration (already 1200ms, keep as-is)
- Any `Animated.timing` with arbitrary durations like `300`, `500` — replace with `ANIMATION.medium`, `ANIMATION.slow`

### 2. Keyboard handling in modals

All modals with text inputs must wrap content in `KeyboardAvoidingView`:

```typescript
import { KeyboardAvoidingView, Platform } from "react-native";

// In UploadModal.tsx and any other modal with TextInput:
<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
>
  {/* modal content */}
</KeyboardAvoidingView>
```

Additional: add `dismissKeyboard` on backdrop tap in all modals:
```typescript
import { Keyboard } from "react-native";

<TouchableOpacity onPress={() => { Keyboard.dismiss(); onDismiss(); }} activeOpacity={1}>
  {/* backdrop */}
</TouchableOpacity>
```

Check all modals: `UploadModal`, `NewVersionSheet`, any future bottom sheets.

### 3. Scroll position restoration on tab switches

Currently each tab screen re-renders from scratch when switching tabs, losing scroll position. React Navigation preserves component state by default but if the component unmounts (e.g., Navigator config), position is lost.

**Fix: Use `useScrollToTop` + persist scroll offset in ref:**

```typescript
// In library.tsx and index.tsx
import { useScrollToTop } from "@react-navigation/native";
import { useRef } from "react";

const scrollRef = useRef<FlatList>(null);
useScrollToTop(scrollRef);  // Tap tab bar → scroll to top (standard iOS behavior)

// Preserve scroll offset across tab switches:
const scrollOffsetRef = useRef(0);

<FlatList
  ref={scrollRef}
  onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
  scrollEventThrottle={32}
  // On list re-mount (if needed):
  initialScrollIndex={undefined}  // let React Navigation handle this
  ...
/>
```

The real fix is ensuring the tab navigator is configured with `unmountOnBlur: false` (the default). Verify `native/app/(tabs)/_layout.tsx`:

```typescript
// In the Tab navigator layout:
<Tabs
  screenOptions={{
    lazy: true,           // don't render until first visited
    unmountOnBlur: false, // ← keep mounted when switching tabs (preserves scroll)
  }}
>
```

If `unmountOnBlur` is already `false` (the default), scroll position is preserved automatically. Verify and document.

### 4. Loading indicator consistency

Audit all loading states across the app and standardize on two patterns:

| Pattern | When to Use | Component |
|---|---|---|
| **Skeleton shimmer** | Cold-launch list load | `SkeletonList` (from skeleton-loading spec) |
| **ActivityIndicator** | Button/action in-progress | `ActivityIndicator color="#EA580C"` |
| **Pull-to-refresh** | User-triggered sync | `RefreshControl tintColor="#EA580C"` |

Remove any inconsistent patterns:
- Any bare `<Text>Loading...</Text>` loading states
- Any `opacity: 0` hidden content while loading (replace with skeleton)
- Any loading spinners that don't use brand color `#EA580C`

Create a shared `<LoadingSpinner />` component for inline use:
```typescript
// native/components/LoadingSpinner.tsx
export default function LoadingSpinner({ size = "small" }: { size?: "small" | "large" }) {
  return <ActivityIndicator size={size} color="#EA580C" />;
}
```

### 5. Haptic feedback on tab bar taps

Wire haptics to the bottom tab bar taps (light impact):

```typescript
// In native/app/(tabs)/_layout.tsx
<Tabs
  screenListeners={{
    tabPress: () => { void Haptics.light(); },
  }}
>
```

This makes the tab bar feel physical.

### 6. Search bar clear button behavior

When the search bar in `library.tsx` has text and the user taps the clear button (`clearButtonMode="while-editing"`):

```typescript
// Handle clear explicitly to reset episodes list:
<TextInput
  ...
  onChangeText={(text) => {
    handleSearchChange(text);
    if (text === "") {
      // Explicitly reset to full list (iOS clear button fires onChangeText(""))
      loadLocal();
    }
  }}
/>
```

This is already partially handled in `handleSearchChange`, but verify the clear button path resets correctly.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/lib/animation.ts` | New — shared animation timing constants |
| `native/components/LoadingSpinner.tsx` | New — standardized loading indicator |
| `native/components/UploadModal.tsx` | Add KeyboardAvoidingView, use ANIMATION constants |
| `native/components/ExpandedPlayer.tsx` | Use ANIMATION constants for slide-up |
| `native/app/(tabs)/_layout.tsx` | Verify `unmountOnBlur: false`, add tabPress haptic |
| `native/app/(tabs)/library.tsx` | Add scrollRef + useScrollToTop, verify search clear |
| `native/app/(tabs)/index.tsx` | Add scrollRef + useScrollToTop |

## Tests

Manual verification:
- [ ] Keyboard appears → modal content shifts up, inputs not hidden behind keyboard
- [ ] Switch Library → Home → Library: scroll position preserved (not reset to top)
- [ ] Tap Library tab from Library: scrolls to top (useScrollToTop behavior)
- [ ] All spinner/loading states use `#EA580C` (brand orange), not default blue
- [ ] Search clear button in library resets list to full (no empty state flash)
- [ ] Tab bar taps fire light haptic

## Success Criteria

```bash
cd native && npx tsc --noEmit
```

- No TypeScript errors from new files
- Keyboard handling verified on both iPhone SE (small) and standard sizes
- No regressions to existing scroll/loading behavior

## Scope

- **No** custom tab bar animations
- **No** shared element transitions between screens
- **No** changes to navigation stack transitions (using Expo Router defaults)
- Scroll position restoration only for the two tab screens (Library, Home) — not nested navigators
