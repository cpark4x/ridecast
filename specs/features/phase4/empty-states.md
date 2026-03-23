# Feature: Empty States

> Three context-aware empty states that meet users where they are — new user onboarding, all-caught-up celebration, and a stale-library nudge.

## Motivation

A single generic "No episodes yet" empty state serves none of three distinct situations: a brand new user who needs hand-holding, a power user who's finished their queue and deserves a celebration, and a lapsed user whose newest content is a week old. Each state has a different emotional context and a different next action. Getting this right converts confusion into engagement.

**Mockup references:**
- New user: `docs/mockups/empty-states/empty-state-new-user.html`
- All caught up: `docs/mockups/empty-states/empty-state-caught-up.html`
- Stale nudge: inline amber card above the episode list

**No upstream dependencies** — this spec is self-contained. Apply after `episode-card-redesign` and `homepage-redesign` so the screens that reference these components are already in their new form.

## Changes

### 1. Add helpers to `native/lib/libraryHelpers.ts`

#### Before

```typescript
// native/lib/libraryHelpers.ts — current, ends at filterEpisodes (72 lines)
// No getLibraryContext, no LibraryContext type, no getTopSourceDomain
```

#### After — append to end of file

```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Empty-state context detection
// ─────────────────────────────────────────────────────────────────────────────

export type LibraryContext =
  | "new_user"      // no episodes at all (ever)
  | "all_caught_up" // every episode's every version is completed
  | "stale"         // has active episodes but newest createdAt > 7 days ago
  | "normal";       // active content, nothing special

/**
 * Classify the user's library into one of four contexts.
 * Used to pick the correct empty state or nudge card.
 */
export function getLibraryContext(items: LibraryItem[]): LibraryContext {
  if (items.length === 0) return "new_user";

  const allCompleted = items.every(
    (item) => item.versions.length > 0 && item.versions.every((v) => v.completed),
  );
  if (allCompleted) return "all_caught_up";

  const newestMs = items
    .map((i) => new Date(i.createdAt).getTime())
    .reduce((a, b) => Math.max(a, b), 0);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (newestMs < sevenDaysAgo) return "stale";

  return "normal";
}

/**
 * Return the most-frequently-occurring source domain in the library.
 * Used by StaleLibraryNudge to suggest a source the user already knows.
 * Returns null if no items have a sourceUrl.
 */
export function getTopSourceDomain(items: LibraryItem[]): string | null {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!item.sourceUrl) continue;
    try {
      const domain = new URL(item.sourceUrl).hostname.replace(/^www\./, "");
      counts[domain] = (counts[domain] ?? 0) + 1;
    } catch {
      // skip malformed URLs
    }
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return top?.[0] ?? null;
}
```

---

### 2. New component: `native/components/empty-states/NewUserEmptyState.tsx`

Animated waveform hero, 3-step horizontal flow, full-width CTA, suggestion pills. Follows the `docs/mockups/empty-states/empty-state-new-user.html` design.

```tsx
// native/components/empty-states/NewUserEmptyState.tsx — new file

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ---------------------------------------------------------------------------
// Waveform bar configuration
// Heights mirror the mockup's symmetric mountain shape (center = tallest)
// ---------------------------------------------------------------------------

const BARS: Array<{ height: number; delay: number; opacity: number }> = [
  { height: 14, delay:   0, opacity: 0.35 },
  { height: 20, delay:   0, opacity: 1.0  },
  { height: 22, delay: 120, opacity: 0.35 },
  { height: 32, delay: 120, opacity: 1.0  },
  { height: 38, delay: 240, opacity: 0.45 },
  { height: 48, delay: 240, opacity: 1.0  },
  { height: 44, delay: 360, opacity: 0.45 },
  { height: 56, delay: 360, opacity: 1.0  },
  { height: 48, delay: 480, opacity: 0.50 },
  { height: 64, delay: 480, opacity: 1.0  }, // center / tallest
  { height: 48, delay: 480, opacity: 0.50 },
  { height: 56, delay: 360, opacity: 1.0  },
  { height: 44, delay: 360, opacity: 0.45 },
  { height: 48, delay: 240, opacity: 1.0  },
  { height: 38, delay: 240, opacity: 0.45 },
  { height: 32, delay: 120, opacity: 1.0  },
  { height: 22, delay: 120, opacity: 0.35 },
  { height: 20, delay:   0, opacity: 1.0  },
  { height: 14, delay:   0, opacity: 0.35 },
];

// ---------------------------------------------------------------------------
// AnimatedWaveform
// ---------------------------------------------------------------------------

function AnimatedWaveform() {
  const anims = useRef(BARS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(BARS[i].delay),
          Animated.timing(anim, {
            toValue: 0.35,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [anims]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 3,
        height: 72,
        justifyContent: "center",
      }}
    >
      {BARS.map((bar, i) => (
        <Animated.View
          key={i}
          style={{
            width: 5,
            height: bar.height,
            borderRadius: 3,
            backgroundColor: "#EA580C",
            opacity: anims[i].interpolate({
              inputRange:  [0.35, 1],
              outputRange: [bar.opacity * 0.35, bar.opacity],
            }),
            transform: [{ scaleY: anims[i] }],
            transformOrigin: "bottom",
          }}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 3-step flow data
// ---------------------------------------------------------------------------

const STEPS = [
  { icon: "🔗", label: "Paste a URL or\nupload a file"        },
  { icon: "✨", label: "We create a smart\naudio episode"      },
  { icon: "🎧", label: "Listen anywhere,\nanytime"             },
] as const;

// ---------------------------------------------------------------------------
// Suggestion pills data
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  { label: "A Substack post",  color: "#F97316" },
  { label: "A news article",   color: "#60A5FA" },
  { label: "A PDF from work",  color: "#34C759" },
  { label: "A GitHub README",  color: "#A78BFA" },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NewUserEmptyStateProps {
  onCreateEpisode: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewUserEmptyState({ onCreateEpisode }: NewUserEmptyStateProps) {
  return (
    <View className="flex-1 items-center px-6 pt-6 pb-8">

      {/* ── Waveform hero ── */}
      <View className="w-full bg-gray-50 rounded-3xl pt-8 pb-6 px-4 mb-8 items-center">
        <AnimatedWaveform />
        <Text className="text-xl font-bold text-gray-900 text-center mt-6 mb-2">
          Turn anything into audio
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-5 max-w-xs">
          Articles, PDFs, newsletters, docs — we turn them into episodes for your commute.
        </Text>
      </View>

      {/* ── 3-step flow ── */}
      <View className="w-full flex-row justify-between mb-8 px-2">
        {STEPS.map((step, i) => (
          <View key={i} className="flex-1 items-center gap-2.5">
            {/* Icon circle */}
            <View className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 items-center justify-center">
              <Text style={{ fontSize: 18 }}>{step.icon}</Text>
              {/* Step number badge */}
              <View
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand items-center justify-center"
              >
                <Text className="text-white text-xs font-bold" style={{ fontSize: 8 }}>
                  {i + 1}
                </Text>
              </View>
            </View>
            {/* Label */}
            <Text className="text-xs font-semibold text-gray-500 text-center leading-4">
              {step.label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Primary CTA ── */}
      <TouchableOpacity
        onPress={onCreateEpisode}
        activeOpacity={0.85}
        className="w-full bg-brand py-4 rounded-2xl items-center mb-6"
        accessibilityLabel="Create Your First Episode"
      >
        <Text className="text-base font-bold text-white">
          Create Your First Episode
        </Text>
      </TouchableOpacity>

      {/* ── Suggestion pills ── */}
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Try one of these
      </Text>
      <View className="flex-row flex-wrap gap-2 justify-center">
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.label}
            onPress={onCreateEpisode}
            className="flex-row items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full"
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.color }} />
            <Text className="text-xs font-medium text-gray-600">{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
}
```

---

### 3. New component: `native/components/empty-states/AllCaughtUpEmptyState.tsx`

Animated green check circle with rising confetti particles, inline stats bar (episodes + hours listened), color-coded suggestion cards, CTA button. Follows `docs/mockups/empty-states/empty-state-caught-up.html`.

```tsx
// native/components/empty-states/AllCaughtUpEmptyState.tsx — new file

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ---------------------------------------------------------------------------
// Confetti particle animation
// ---------------------------------------------------------------------------

interface ConfettiParticleProps {
  color: string;
  offsetX: number;
  offsetY: number;
  delay: number;
  size?: number;
}

function ConfettiParticle({ color, offsetX, offsetY, delay, size = 6 }: ConfettiParticleProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -55,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.9,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1800,
              useNativeDriver: true,
            }),
          ]),
        ]),
        // Reset instantly before next loop cycle
        Animated.parallel([
          Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity,    { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, [translateY, opacity, delay]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        top: offsetY,
        left: offsetX,
        transform: [{ translateY }],
        opacity,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Confetti configuration — 8 particles around the check circle
// ---------------------------------------------------------------------------

const CONFETTI_DOTS = [
  { color: "#EA580C", offsetX: 14,  offsetY: 20,  delay: 0    },
  { color: "#FBBF24", offsetX: 44,  offsetY: 10,  delay: 300  },
  { color: "#60A5FA", offsetX: 94,  offsetY: 18,  delay: 600  },
  { color: "#34C759", offsetX: 84,  offsetY: 12,  delay: 900  },
  { color: "#A78BFA", offsetX: 6,   offsetY: 28,  delay: 1200 },
  { color: "#F472B6", offsetX: 104, offsetY: 8,   delay: 1500 },
  { color: "#FBBF24", offsetX: 28,  offsetY: 30,  delay: 400  },
  { color: "#EA580C", offsetX: 74,  offsetY: 22,  delay: 700, size: 4 },
] as const;

// ---------------------------------------------------------------------------
// CheckCircleScene — animated circle + confetti
// ---------------------------------------------------------------------------

function CheckCircleScene() {
  const scale   = useRef(new Animated.Value(0.4)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <View style={{ width: 120, height: 120, alignItems: "center", justifyContent: "center" }}>
      {/* Confetti particles — rendered behind the circle */}
      {CONFETTI_DOTS.map((dot, i) => (
        <ConfettiParticle key={i} {...dot} />
      ))}

      {/* Outer pulse ring */}
      <View
        style={{
          position: "absolute",
          width: 110,
          height: 110,
          borderRadius: 55,
          borderWidth: 1.5,
          borderColor: "rgba(34,197,94,0.2)",
        }}
      />

      {/* Green check circle */}
      <Animated.View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: "#22C55E",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale }],
          opacity,
          shadowColor: "#22C55E",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 8,
        }}
      >
        <Ionicons name="checkmark" size={38} color="white" />
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Suggestion card data
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  {
    title:    "A newsletter you love",
    desc:     "Paste a Substack or email newsletter URL",
    accentColor: "#F97316",
    iconName: "mail-outline" as const,
    iconColor: "#F97316",
  },
  {
    title:    "That PDF you've been putting off",
    desc:     "Upload a document and listen instead",
    accentColor: "#34C759",
    iconName: "document-text-outline" as const,
    iconColor: "#34C759",
  },
  {
    title:    "An article you saved",
    desc:     "Paste any URL — we'll extract and convert it",
    accentColor: "#60A5FA",
    iconName: "globe-outline" as const,
    iconColor: "#60A5FA",
  },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AllCaughtUpStats {
  episodeCount: number;
  totalHours: number;
}

interface AllCaughtUpEmptyStateProps {
  stats: AllCaughtUpStats;
  onAddNew: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AllCaughtUpEmptyState({
  stats,
  onAddNew,
}: AllCaughtUpEmptyStateProps) {
  return (
    <View className="flex-1 items-center px-6 pt-6 pb-8">

      {/* ── Celebratory hero card ── */}
      <View className="w-full bg-gray-50 rounded-3xl pt-8 pb-6 px-4 mb-5 items-center">
        <CheckCircleScene />
        <Text className="text-xl font-bold text-gray-900 text-center mt-5 mb-2">
          You're all caught up!
        </Text>
        <Text className="text-sm text-gray-500 text-center leading-5 max-w-xs">
          You've listened to everything in your queue.{"\n"}Nice work — here's what to add next.
        </Text>
      </View>

      {/* ── Stats bar ── */}
      <View className="w-full flex-row bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 mb-5 items-center justify-around">
        <View className="items-center">
          <Text className="text-2xl font-bold text-gray-900">{stats.episodeCount}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">episodes</Text>
        </View>
        <View className="w-px h-8 bg-gray-200" />
        <View className="items-center">
          <Text className="text-2xl font-bold text-gray-900">{stats.totalHours.toFixed(1)}</Text>
          <Text className="text-xs text-gray-500 mt-0.5">hours listened</Text>
        </View>
      </View>

      {/* ── Suggestion cards ── */}
      <Text className="text-base font-bold text-gray-900 self-start mb-3">
        Add something new
      </Text>
      <View className="w-full gap-2.5 mb-5">
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity
            key={s.title}
            onPress={onAddNew}
            activeOpacity={0.75}
            className="w-full flex-row items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm overflow-hidden"
          >
            {/* Left accent stripe */}
            <View
              style={{
                position: "absolute",
                left: 0,
                top: 12,
                bottom: 12,
                width: 3,
                borderRadius: 2,
                backgroundColor: s.accentColor,
              }}
            />
            {/* Icon */}
            <View
              className="w-10 h-10 rounded-xl items-center justify-center ml-2"
              style={{ backgroundColor: `${s.accentColor}20` }}
            >
              <Ionicons name={s.iconName} size={20} color={s.iconColor} />
            </View>
            {/* Text */}
            <View className="flex-1 min-w-0">
              <Text className="text-sm font-bold text-gray-900" numberOfLines={1}>
                {s.title}
              </Text>
              <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
                {s.desc}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Primary CTA ── */}
      <TouchableOpacity
        onPress={onAddNew}
        activeOpacity={0.85}
        className="w-full bg-brand py-4 rounded-2xl items-center"
        accessibilityLabel="Add Something New"
      >
        <Text className="text-base font-bold text-white">Add Something New</Text>
      </TouchableOpacity>

    </View>
  );
}
```

---

### 4. New component: `native/components/empty-states/StaleLibraryNudge.tsx`

Dismissible amber card rendered **above** the episode list (not a full-screen empty state). Appears when the user has active content but the newest item is older than 7 days.

```tsx
// native/components/empty-states/StaleLibraryNudge.tsx — new file

import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StaleLibraryNudgeProps {
  daysSinceNewest: number;
  /** Most common source domain in the library, e.g. "espn.com" — may be null */
  topSourceDomain: string | null;
  onDismiss: () => void;
  onAddNew: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaleLibraryNudge({
  daysSinceNewest,
  topSourceDomain,
  onDismiss,
  onAddNew,
}: StaleLibraryNudgeProps) {
  return (
    <View className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-3">
          <Text className="text-sm font-semibold text-amber-900 mb-1">
            Your newest content is {daysSinceNewest} day{daysSinceNewest === 1 ? "" : "s"} old
          </Text>
          <Text className="text-xs text-amber-700 leading-4">
            {topSourceDomain
              ? `Check ${topSourceDomain} for new articles to add`
              : "Paste a URL to create a new episode"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Dismiss"
        >
          <Ionicons name="close" size={16} color="#92400E" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onAddNew}
        activeOpacity={0.8}
        className="mt-3 bg-amber-500 py-2 rounded-xl items-center"
        accessibilityLabel="Add Episode"
      >
        <Text className="text-xs font-bold text-white">Add Episode</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

### 5. Wire empty states into the Home screen (`native/app/(tabs)/index.tsx`)

This is a **diff** against the version produced by `homepage-redesign` spec. The only section that changes is the empty state at the bottom of the ScrollView and the addition of `staleDismissed` state and `computedStats`.

#### New imports to add

```typescript
// Before: imports in index.tsx (from homepage-redesign spec)
import EmptyState from "../../components/EmptyState";

// After: replace with context-aware imports
import { getLibraryContext, getTopSourceDomain } from "../../lib/libraryHelpers";
import NewUserEmptyState     from "../../components/empty-states/NewUserEmptyState";
import AllCaughtUpEmptyState from "../../components/empty-states/AllCaughtUpEmptyState";
import StaleLibraryNudge     from "../../components/empty-states/StaleLibraryNudge";
// EmptyState is no longer needed on the home screen — remove its import
```

#### New state to add inside `HomeScreen`

```typescript
// Add inside HomeScreen(), after the existing useState declarations:
const [staleDismissed, setStaleDismissed] = useState(false);
```

#### Derived values to add (after the existing derived data section)

```typescript
// Add after episodeCount / totalDurationSecs derivation:

const context = getLibraryContext(episodes);

const computedStats = {
  episodeCount: episodes.filter(
    (item) => item.versions.length > 0 && item.versions.every((v) => v.completed),
  ).length,
  totalHours:
    episodes.reduce((acc, item) => {
      const secsCompleted = item.versions
        .filter((v) => v.completed)
        .reduce((s, v) => s + (v.durationSecs ?? 0), 0);
      return acc + secsCompleted;
    }, 0) / 3600,
};

const topSourceDomain = getTopSourceDomain(episodes);

const newestMs = episodes.length > 0
  ? episodes.reduce((max, item) => Math.max(max, new Date(item.createdAt).getTime()), 0)
  : 0;
const daysSinceNewest = newestMs > 0
  ? Math.floor((Date.now() - newestMs) / (24 * 60 * 60 * 1000))
  : 0;
```

#### Replace the empty state section in the ScrollView JSX

```tsx
// Before (from homepage-redesign spec):
{episodes.length === 0 && (
  <EmptyState
    icon="headset"
    title="Your Daily Drive is empty"
    subtitle="Upload an article or URL to create your first episode"
    actionLabel="Create Episode"
    onAction={() => setUploadModalVisible(true)}
  />
)}

// After — context-aware empty states + stale nudge:

{/* Stale nudge — appears above the episode list when content exists but is stale */}
{context === "stale" && !staleDismissed && (
  <StaleLibraryNudge
    daysSinceNewest={daysSinceNewest}
    topSourceDomain={topSourceDomain}
    onDismiss={() => setStaleDismissed(true)}
    onAddNew={() => setUploadModalVisible(true)}
  />
)}

{/* Full-screen empty states — mutually exclusive, replace the list */}
{episodes.length === 0 || context === "all_caught_up" ? (
  context === "new_user" || episodes.length === 0 ? (
    <NewUserEmptyState
      onCreateEpisode={() => setUploadModalVisible(true)}
    />
  ) : (
    <AllCaughtUpEmptyState
      stats={computedStats}
      onAddNew={() => setUploadModalVisible(true)}
    />
  )
) : null}
```

---

### 6. Wire empty states into the Library screen (`native/app/(tabs)/library.tsx`)

This is a partial diff — only the relevant sections. The Library screen already has a `FlatList` with `ListEmptyComponent` and `ListHeaderComponent`.

#### New imports to add

```typescript
// Add to existing imports in library.tsx:
import { getLibraryContext, getTopSourceDomain } from "../../lib/libraryHelpers";
import NewUserEmptyState     from "../../components/empty-states/NewUserEmptyState";
import AllCaughtUpEmptyState from "../../components/empty-states/AllCaughtUpEmptyState";
import StaleLibraryNudge     from "../../components/empty-states/StaleLibraryNudge";
```

#### New state to add

```typescript
// Add inside the screen component alongside existing useState declarations:
const [staleDismissed, setStaleDismissed] = useState(false);
```

#### Derived values to add (after filtered episodes are computed)

```typescript
// Add after the existing filter/search logic (after `filteredEpisodes` is derived):
const context = getLibraryContext(episodes); // use unfiltered episodes for context

const computedStats = {
  episodeCount: episodes.filter(
    (item) => item.versions.length > 0 && item.versions.every((v) => v.completed),
  ).length,
  totalHours:
    episodes.reduce((acc, item) => {
      const secsCompleted = item.versions
        .filter((v) => v.completed)
        .reduce((s, v) => s + (v.durationSecs ?? 0), 0);
      return acc + secsCompleted;
    }, 0) / 3600,
};

const topSourceDomain = getTopSourceDomain(episodes);

const newestMs = episodes.length > 0
  ? episodes.reduce((max, item) => Math.max(max, new Date(item.createdAt).getTime()), 0)
  : 0;
const daysSinceNewest = newestMs > 0
  ? Math.floor((Date.now() - newestMs) / (24 * 60 * 60 * 1000))
  : 0;
```

#### Replace `ListEmptyComponent` and add stale nudge to `ListHeaderComponent`

```tsx
// Before:
ListEmptyComponent={
  <EmptyState
    icon="search"
    title="No matches"
    subtitle="Try a different search or filter"
  />
}

// After:
ListEmptyComponent={
  // When the search/filter produces no results, show a search-specific empty state
  filteredEpisodes.length === 0 && episodes.length > 0 ? (
    <EmptyState
      icon="search"
      title="No matches"
      subtitle="Try a different search or filter"
    />
  ) : context === "new_user" ? (
    <NewUserEmptyState
      onCreateEpisode={() => setUploadModalVisible(true)}
    />
  ) : context === "all_caught_up" ? (
    <AllCaughtUpEmptyState
      stats={computedStats}
      onAddNew={() => setUploadModalVisible(true)}
    />
  ) : null
}

// In ListHeaderComponent, add stale nudge before the filter chips:
{context === "stale" && !staleDismissed && (
  <StaleLibraryNudge
    daysSinceNewest={daysSinceNewest}
    topSourceDomain={topSourceDomain}
    onDismiss={() => setStaleDismissed(true)}
    onAddNew={() => setUploadModalVisible(true)}
  />
)}
{/* ... existing filter chips and search bar ... */}
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/empty-states/NewUserEmptyState.tsx` | New — animated waveform onboarding |
| `native/components/empty-states/AllCaughtUpEmptyState.tsx` | New — celebration with confetti, stats, suggestion cards |
| `native/components/empty-states/StaleLibraryNudge.tsx` | New — dismissible amber nudge card |
| `native/lib/libraryHelpers.ts` | Add `LibraryContext` type, `getLibraryContext()`, `getTopSourceDomain()` |
| `native/app/(tabs)/index.tsx` | Wire context detection + context-aware empty states |
| `native/app/(tabs)/library.tsx` | Wire context detection + stale nudge + context-aware ListEmptyComponent |

## Tests

### Unit tests: append to `native/__tests__/libraryHelpers.test.ts`

> Add a new `describe` block below the existing `filterEpisodes` tests in this file. Reuse the existing `makeVersion` and `makeItem` helpers already defined at the top of that file.

```typescript
// Append to native/__tests__/libraryHelpers.test.ts
// (add after the last describe block; reuse makeVersion / makeItem from top of file)

import { getLibraryContext, getTopSourceDomain } from "../lib/libraryHelpers";
import type { LibraryItem } from "../lib/types";

// Re-use the makeVersion / makeItem factories already defined earlier in this file.
// The helpers below reference them by name — they must exist at file scope.

// ─────────────────────────────────────────────────────────────────────────────
// getLibraryContext
// ─────────────────────────────────────────────────────────────────────────────

describe("getLibraryContext", () => {
  it("returns 'new_user' when items array is empty", () => {
    expect(getLibraryContext([])).toBe("new_user");
  });

  it("returns 'all_caught_up' when every version of every item is completed", () => {
    const completedItem = makeItem("1", [
      makeVersion({ completed: true, position: 300 }),
    ]);
    expect(getLibraryContext([completedItem])).toBe("all_caught_up");
  });

  it("returns 'all_caught_up' when multiple items all completed", () => {
    const items = [
      makeItem("1", [makeVersion({ completed: true })]),
      makeItem("2", [makeVersion({ scriptId: "s2", completed: true })]),
    ];
    expect(getLibraryContext(items)).toBe("all_caught_up");
  });

  it("does NOT return 'all_caught_up' when some versions are incomplete", () => {
    const items = [
      makeItem("1", [makeVersion({ completed: true })]),
      makeItem("2", [makeVersion({ scriptId: "s2", completed: false })]),
    ];
    expect(getLibraryContext(items)).not.toBe("all_caught_up");
  });

  it("returns 'stale' when all items have createdAt > 7 days ago", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const oldItem = makeItem("1", [makeVersion()], { createdAt: eightDaysAgo });
    expect(getLibraryContext([oldItem])).toBe("stale");
  });

  it("returns 'stale' when newest item is exactly 8 days old", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const items = [
      makeItem("1", [makeVersion()], { createdAt: eightDaysAgo }),
      makeItem("2", [makeVersion({ scriptId: "s2" })], { createdAt: eightDaysAgo }),
    ];
    expect(getLibraryContext(items)).toBe("stale");
  });

  it("returns 'normal' when a fresh item (< 7 days old) exists", () => {
    const freshItem = makeItem("1", [makeVersion()], {
      createdAt: new Date().toISOString(),
    });
    expect(getLibraryContext([freshItem])).toBe("normal");
  });

  it("returns 'normal' when mix of old and fresh items exists (newest is fresh)", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const items = [
      makeItem("1", [makeVersion()], { createdAt: eightDaysAgo }),
      makeItem("2", [makeVersion({ scriptId: "s2" })], { createdAt: new Date().toISOString() }),
    ];
    expect(getLibraryContext(items)).toBe("normal");
  });

  it("'all_caught_up' takes priority over 'stale'", () => {
    // If all versions are completed AND newest > 7 days, all_caught_up wins
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const completedOld = makeItem("1", [makeVersion({ completed: true })], {
      createdAt: eightDaysAgo,
    });
    expect(getLibraryContext([completedOld])).toBe("all_caught_up");
  });

  it("returns 'all_caught_up' only when versions array is non-empty on each item", () => {
    // An item with NO versions at all should not count as completed
    const emptyVersionsItem = makeItem("1", []);
    expect(getLibraryContext([emptyVersionsItem])).not.toBe("all_caught_up");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTopSourceDomain
// ─────────────────────────────────────────────────────────────────────────────

describe("getTopSourceDomain", () => {
  it("returns null when no items have a sourceUrl", () => {
    const item = makeItem("1", [makeVersion()], { sourceUrl: null });
    expect(getTopSourceDomain([item])).toBeNull();
  });

  it("returns the only domain when one item has a sourceUrl", () => {
    const item = makeItem("1", [makeVersion()], {
      sourceUrl: "https://espn.com/article",
    });
    expect(getTopSourceDomain([item])).toBe("espn.com");
  });

  it("strips www from domains", () => {
    const item = makeItem("1", [makeVersion()], {
      sourceUrl: "https://www.espn.com/article",
    });
    expect(getTopSourceDomain([item])).toBe("espn.com");
  });

  it("returns the most frequent domain when multiple items exist", () => {
    const items: LibraryItem[] = [
      makeItem("1", [makeVersion()], { sourceUrl: "https://espn.com/a1" }),
      makeItem("2", [makeVersion()], { sourceUrl: "https://espn.com/a2" }),
      makeItem("3", [makeVersion()], { sourceUrl: "https://nytimes.com/a3" }),
    ];
    expect(getTopSourceDomain(items)).toBe("espn.com");
  });

  it("returns null when no items exist", () => {
    expect(getTopSourceDomain([])).toBeNull();
  });

  it("skips items with malformed sourceUrl without throwing", () => {
    const items: LibraryItem[] = [
      makeItem("1", [makeVersion()], { sourceUrl: "not-a-url" }),
      makeItem("2", [makeVersion()], { sourceUrl: "https://espn.com/article" }),
    ];
    expect(() => getTopSourceDomain(items)).not.toThrow();
    expect(getTopSourceDomain(items)).toBe("espn.com");
  });
});
```

### Component smoke tests: `native/__tests__/emptyStateComponents.test.ts` — new file

```typescript
// native/__tests__/emptyStateComponents.test.ts

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NewUserModule     = require("../components/empty-states/NewUserEmptyState");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AllCaughtUpModule = require("../components/empty-states/AllCaughtUpEmptyState");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StaleNudgeModule  = require("../components/empty-states/StaleLibraryNudge");

describe("NewUserEmptyState", () => {
  it("has a default export that is a function", () => {
    expect(typeof NewUserModule.default).toBe("function");
  });
});

describe("AllCaughtUpEmptyState", () => {
  it("has a default export that is a function", () => {
    expect(typeof AllCaughtUpModule.default).toBe("function");
  });
});

describe("StaleLibraryNudge", () => {
  it("has a default export that is a function", () => {
    expect(typeof StaleNudgeModule.default).toBe("function");
  });
});
```

## Success Criteria

```bash
# 1. TypeScript clean
cd native && npx tsc --noEmit
# Expected: 0 errors (including new imports in index.tsx and library.tsx)

# 2. New unit tests pass
cd native && npx jest --testPathPattern="libraryHelpers|emptyStateComponents" --no-coverage
# Expected: all green; getLibraryContext + getTopSourceDomain have full coverage

# 3. Full regression suite
cd native && npx jest --no-coverage
# Expected: 0 regressions

# 4. iOS Simulator — manual smoke
cd native && npx expo run:ios
```

Manual verification checklist (use Simulator with each scenario):

**New user (empty DB or clear SQLite):**
- [ ] Home screen shows `NewUserEmptyState` with animated waveform bars
- [ ] Waveform animation plays in a loop (bars pulse at staggered offsets)
- [ ] 3-step icons (🔗 ✨ 🎧) with numbered badges visible
- [ ] "Create Your First Episode" CTA opens UploadModal
- [ ] Suggestion pills are tappable and open UploadModal

**All caught up (every item has `completed: true`):**
- [ ] Home screen shows `AllCaughtUpEmptyState`
- [ ] Green check circle animates in with spring effect on mount
- [ ] Confetti particles rise and fade in a loop
- [ ] Stats bar shows correct episode count and hours
- [ ] 3 suggestion cards visible with colored left accent stripe
- [ ] "Add Something New" CTA opens UploadModal

**Stale (active episodes but all > 7 days old):**
- [ ] `StaleLibraryNudge` amber card appears above EpisodeCarousel / filter chips
- [ ] Card shows correct `daysSinceNewest` (e.g. "8 days old")
- [ ] Card shows `topSourceDomain` if any items have a URL (e.g. "Check espn.com for new articles")
- [ ] "×" dismiss button hides the card (session-only — reappears on next launch)
- [ ] "Add Episode" button opens UploadModal
- [ ] Dismissing nudge does NOT hide the episode list below it

**Normal state (fresh active episodes):**
- [ ] No nudge card, no empty state — regular episode list as usual

## Scope

- **No** persistent dismissal of the stale nudge — `staleDismissed` is in-memory only; resets on app restart
- **No** ML or personalised suggestions — `NewUserEmptyState` suggestion pills are hardcoded; `AllCaughtUpEmptyState` suggestion cards are hardcoded
- **No** email or push notification integration for the stale state
- **No** streak counter — the mockup shows "6 day streak" but streak tracking is a separate spec; `AllCaughtUpEmptyState` shows only episode count and hours
- Stale threshold is hardcoded at 7 days — not user-configurable in this spec
- `getTopSourceDomain` is session-computed from `LibraryItem.sourceUrl` only; does not query a separate follows/sources table
