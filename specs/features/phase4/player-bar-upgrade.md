# Feature: Player Bar Upgrade

> Upgrade the minimal PlayerBar to show a source icon, source attribution, and time remaining — so you always know what's playing without opening the full player.

## Motivation

The current `PlayerBar` shows only a title and play/pause button. A title alone doesn't tell the user *where* the content is from or how much is left. Adding a source icon (emoji + tint background), a source attribution line ("espn.com · 12 min left"), and a tight visual hierarchy makes the mini player a real status surface — not just a play/pause shortcut. All required data already lives on `PlayableItem` — no new fetches.

---

## Changes

### 1. New file: `native/components/SourceIcon.tsx`

Shared component used by `PlayerBar` and future episode card redesigns. Renders an emoji icon inside a tinted rounded square. Size is parameterized via `"sm" | "md" | "lg"`.

```tsx
// native/components/SourceIcon.tsx
import React from "react";
import { Text, View } from "react-native";

// Source type → icon emoji + brand color
const SOURCE_META: Record<string, { icon: string; color: string; label: string }> = {
  pdf:    { icon: "📄", color: "#EF4444", label: "PDF"    },
  url:    { icon: "🔗", color: "#3B82F6", label: "Web"    },
  epub:   { icon: "📚", color: "#8B5CF6", label: "EPUB"   },
  txt:    { icon: "📝", color: "#6B7280", label: "Text"   },
  pocket: { icon: "📌", color: "#10B981", label: "Pocket" },
};

interface SourceIconProps {
  sourceType: string;
  size?: "sm" | "md" | "lg"; // sm=24, md=32, lg=40
}

export default function SourceIcon({ sourceType, size = "md" }: SourceIconProps) {
  const meta = SOURCE_META[sourceType.toLowerCase()] ?? {
    icon: "📄",
    color: "#6B7280",
    label: sourceType.toUpperCase(),
  };
  const dim = size === "sm" ? 24 : size === "lg" ? 40 : 32;
  const fontSize = size === "sm" ? 12 : size === "lg" ? 20 : 16;

  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 4,
        backgroundColor: meta.color + "20", // ~12% opacity tint
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize }}>{meta.icon}</Text>
    </View>
  );
}
```

> **Future:** When the `episode-identity` spec lands, update `SourceIcon` to use a domain favicon `<Image>` for URL-type sources. The emoji + tint is the fallback for all other types and for any favicon fetch failure.

---

### 2. Modify: `native/lib/utils.ts` — add `sourceName` and `timeRemaining`

Add two new exported helpers at the end of the file. No existing functions are modified.

**Additions (append to `native/lib/utils.ts`):**

```typescript
// ────────────────────────────────────────────────────────────────────────────
// Player bar helpers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable source name from a PlayableItem.
 * Priority: extracted domain from sourceUrl > author > sourceType label
 *
 * Examples:
 *   sourceName("url", "https://www.espn.com/article/123", null) → "espn.com"
 *   sourceName("pdf", null, "John Smith")                       → "John Smith"
 *   sourceName("epub", null, null)                              → "EPUB"
 */
export function sourceName(
  sourceType: string,
  sourceUrl: string | null | undefined,
  author: string | null | undefined,
): string {
  if (sourceUrl) {
    try {
      const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
      return host; // e.g. "espn.com", "nytimes.com"
    } catch {
      // fall through
    }
  }
  if (author) return author;
  return sourceType.toUpperCase();
}

/**
 * Returns "X min left" (when ≥ 60 s remaining) or "X sec left" (< 60 s).
 * Clamps to 0 — never returns negative values.
 *
 * Examples:
 *   timeRemaining(60, 780)  → "12 min left"   (720 s remaining)
 *   timeRemaining(730, 760) → "30 sec left"
 *   timeRemaining(800, 760) → "0 sec left"
 */
export function timeRemaining(positionSecs: number, durationSecs: number): string {
  const remaining = Math.max(0, durationSecs - positionSecs);
  if (remaining >= 60) {
    return `${Math.ceil(remaining / 60)} min left`;
  }
  return `${Math.ceil(remaining)} sec left`;
}
```

---

### 3. Modify: `native/components/PlayerBar.tsx`

Replace the single-line title layout with a three-column layout: source icon left, title + subtitle center, play/pause right. Bar height stays at 64px.

**Before:**
```tsx
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";

export default function PlayerBar() {
  const {
    currentItem,
    isPlaying,
    togglePlay,
    position,
    duration,
    setExpandedPlayerVisible,
  } = usePlayer();

  if (!currentItem) return null;

  const progressPercent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <View className="bg-white border-t border-gray-200">
      {/* Thin progress bar at the very top */}
      <View className="h-0.5 w-full bg-gray-100">
        <View
          className="h-0.5 bg-brand"
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      {/* Bar body */}
      <TouchableOpacity
        onPress={() => setExpandedPlayerVisible(true)}
        activeOpacity={0.8}
        className="flex-row items-center px-4 py-3 gap-3"
        style={{ height: 64 }}
      >
        {/* Title */}
        <Text
          className="flex-1 text-sm font-semibold text-gray-900"
          numberOfLines={1}
        >
          {currentItem.title}
        </Text>

        {/* Play / Pause button — separate press handler so it doesn't bubble */}
        <TouchableOpacity
          onPress={() => void togglePlay()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={26}
            color="#EA580C"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
```

**After:**
```tsx
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayer } from "../lib/usePlayer";
import SourceIcon from "./SourceIcon";
import { sourceName, timeRemaining } from "../lib/utils";

export default function PlayerBar() {
  const {
    currentItem,
    isPlaying,
    togglePlay,
    position,
    duration,
    setExpandedPlayerVisible,
  } = usePlayer();

  if (!currentItem) return null;

  const progressPercent =
    duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  // Show "Loading…" until audio duration is known (avoids "0 sec left" flash)
  const subtitle =
    duration > 0
      ? `${sourceName(currentItem.sourceType ?? "", currentItem.sourceUrl, currentItem.author)} · ${timeRemaining(position, duration)}`
      : "Loading…";

  return (
    <View className="bg-white border-t border-gray-200">
      {/* Thin progress bar at the very top */}
      <View className="h-0.5 w-full bg-gray-100">
        <View
          className="h-0.5 bg-brand"
          style={{ width: `${progressPercent}%` }}
        />
      </View>

      {/* Bar body */}
      <TouchableOpacity
        onPress={() => setExpandedPlayerVisible(true)}
        activeOpacity={0.8}
        className="flex-row items-center px-4 py-3 gap-3"
        style={{ height: 64 }}
      >
        {/* Left: source icon */}
        <SourceIcon sourceType={currentItem.sourceType ?? "url"} size="sm" />

        {/* Center: title + subtitle */}
        <View className="flex-1">
          <Text
            className="text-sm font-semibold text-gray-900"
            numberOfLines={1}
          >
            {currentItem.title}
          </Text>
          <Text
            className="text-xs text-gray-400 mt-0.5"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        {/* Right: play / pause — separate handler so it doesn't bubble */}
        <TouchableOpacity
          onPress={() => void togglePlay()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1"
        >
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={26}
            color="#EA580C"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}
```

**Layout sketch:**
```
┌──────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← 2px progress bar
│ [🔗] Title of episode                ▶  │  ← 64px bar body
│      espn.com · 12 min left             │
└──────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/SourceIcon.tsx` | **New** — source emoji icon with tinted rounded-square background |
| `native/lib/utils.ts` | Add `sourceName()` and `timeRemaining()` helpers at end of file |
| `native/components/PlayerBar.tsx` | Add `SourceIcon` left, two-line center (title + subtitle), keep play/pause right |

---

## Tests

**File:** `native/lib/utils.test.ts` (add to existing file, or create if absent)

```typescript
import { describe, it, expect } from "vitest";
import { sourceName, timeRemaining } from "./utils";

// ─── sourceName ────────────────────────────────────────────────────────────

describe("sourceName", () => {
  it("extracts domain from sourceUrl, stripping www", () => {
    expect(sourceName("url", "https://www.espn.com/article/123", null)).toBe(
      "espn.com",
    );
  });

  it("extracts domain without www prefix", () => {
    expect(sourceName("url", "https://nytimes.com/section/sports", null)).toBe(
      "nytimes.com",
    );
  });

  it("falls back to author when sourceUrl is null", () => {
    expect(sourceName("pdf", null, "John Smith")).toBe("John Smith");
  });

  it("falls back to author when sourceUrl is empty string", () => {
    expect(sourceName("pdf", "", "Jane Doe")).toBe("Jane Doe");
  });

  it("falls back to uppercase sourceType when no URL and no author", () => {
    expect(sourceName("epub", null, null)).toBe("EPUB");
  });

  it("falls back to uppercase sourceType when URL is malformed", () => {
    expect(sourceName("txt", "not-a-url", null)).toBe("TXT");
  });

  it("prioritises URL over author", () => {
    expect(
      sourceName("url", "https://medium.com/post/123", "Medium Staff"),
    ).toBe("medium.com");
  });

  it("handles undefined sourceUrl and author gracefully", () => {
    expect(sourceName("pocket", undefined, undefined)).toBe("POCKET");
  });
});

// ─── timeRemaining ─────────────────────────────────────────────────────────

describe("timeRemaining", () => {
  it("returns minutes when ≥ 60 seconds remain", () => {
    expect(timeRemaining(60, 780)).toBe("12 min left"); // 720 s remaining
  });

  it("returns 1 min left when exactly 60 seconds remain", () => {
    expect(timeRemaining(0, 60)).toBe("1 min left");
  });

  it("returns seconds when < 60 seconds remain", () => {
    expect(timeRemaining(730, 760)).toBe("30 sec left");
  });

  it("returns '0 sec left' when position is past end", () => {
    expect(timeRemaining(800, 760)).toBe("0 sec left");
  });

  it("returns '0 sec left' when position equals duration", () => {
    expect(timeRemaining(600, 600)).toBe("0 sec left");
  });

  it("ceils fractional seconds", () => {
    // 59.1 seconds remaining → ceil → 60 → "1 min left"
    expect(timeRemaining(0.9, 60)).toBe("1 min left");
  });

  it("ceils fractional minutes", () => {
    // 721 s remaining → ceil(721/60) = 13 min left
    expect(timeRemaining(59, 780)).toBe("13 min left");
  });
});
```

Run tests:
```bash
cd native && npx jest utils.test.ts --no-coverage
# → 15 tests pass (7 sourceName + 7 timeRemaining + existing utils tests)
```

---

## Success Criteria

```bash
# TypeScript — no type errors from new components or helpers
cd native && npx tsc --noEmit
# → 0 errors

# Unit tests pass
cd native && npx jest utils.test.ts --no-coverage
# → All tests pass

# App builds and runs
cd native && npx expo run:ios
# → Build succeeded
```

Manual verification (Simulator is sufficient for visual checks):
- [ ] PlayerBar shows `SourceIcon` (emoji + tinted square) on the left
- [ ] Subtitle line shows e.g. "espn.com · 12 min left" for URL-type content
- [ ] Subtitle shows author name (e.g. "John Smith") for PDF with no URL
- [ ] Subtitle shows "PDF" for PDF with no URL and no author
- [ ] When audio is not yet loaded (`duration === 0`), subtitle shows "Loading…" — not "0 sec left"
- [ ] Subtitle updates live as playback position advances
- [ ] Bar height remains 64px — no clipping, no wrapping on long titles
- [ ] Source icon for `pocket` type shows green 📌 tint

---

## Scope

- **No** domain favicon fetching — emoji icon only; favicon upgrade is `episode-identity` spec
- **No** artwork/thumbnail in the player bar — that's a larger design change
- **No** changes to `ExpandedPlayer.tsx` — this spec is mini-bar only
- `sourceName()` is a pure function — no API calls, no side effects
- `SourceIcon` does not import `Ionicons` — emoji-only rendering to avoid icon font dependency
