# Feature: Player Bar Upgrade

> Upgrade the minimal PlayerBar to show source icon, source name, and time remaining — so you always know what's playing without opening the full player.

## Motivation

The current `PlayerBar` shows only a title and play/pause button. A title alone doesn't tell the user *where* the content is from or how much is left. Adding a source icon, source attribution line ("ESPN · 12 min left"), and tight visual hierarchy makes the mini player a real status surface — not just a play/pause shortcut.

## Changes

### 1. Audit current PlayerBar

`native/components/PlayerBar.tsx` currently renders:
- A thin orange progress bar at the top
- Title (single line, `text-sm font-semibold`)
- Play/Pause icon button

`currentItem` is a `PlayableItem` which already carries `sourceType`, `sourceUrl`, `author` fields — no data fetching needed.

### 2. SourceIcon component (`native/components/SourceIcon.tsx` — new)

This component is shared with `episode-card-redesign` and `episode-identity`. Create it here; import it elsewhere.

```typescript
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
        backgroundColor: meta.color + "20", // 12% opacity tint
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize }}>{meta.icon}</Text>
    </View>
  );
}
```

> **Note:** When the `episode-identity` spec lands, `SourceIcon` should be updated to use the domain favicon for URL-type sources. For now, emoji icons are the fallback.

### 3. Derive source display name

Add a helper to `native/lib/utils.ts`:

```typescript
/**
 * Returns a human-readable source name from a LibraryItem or PlayableItem.
 * Priority: extracted domain from sourceUrl > author > sourceType label
 */
export function sourceName(sourceType: string, sourceUrl: string | null | undefined, author: string | null | undefined): string {
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
```

### 4. Time remaining helper

Add to `native/lib/utils.ts`:

```typescript
/**
 * Returns "X min left" or "X sec left" string.
 */
export function timeRemaining(positionSecs: number, durationSecs: number): string {
  const remaining = Math.max(0, durationSecs - positionSecs);
  if (remaining >= 60) {
    return `${Math.ceil(remaining / 60)} min left`;
  }
  return `${Math.ceil(remaining)} sec left`;
}
```

### 5. Upgraded PlayerBar layout

Replace the body of `PlayerBar.tsx` with a three-column layout:

```
[ SourceIcon ] [ Title            ] [ ▶ ]
              [ espn.com · 12 min left ]
```

```typescript
import SourceIcon from "./SourceIcon";
import { sourceName, timeRemaining } from "../lib/utils";

// Inside the bar body TouchableOpacity:
<View className="flex-row items-center px-4 py-3 gap-3" style={{ height: 64 }}>
  {/* Left: source icon */}
  <SourceIcon sourceType={currentItem.sourceType ?? "url"} size="sm" />

  {/* Center: title + subtitle */}
  <View className="flex-1">
    <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
      {currentItem.title}
    </Text>
    <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
      {sourceName(currentItem.sourceType ?? "", currentItem.sourceUrl, currentItem.author)}
      {" · "}
      {timeRemaining(position, duration)}
    </Text>
  </View>

  {/* Right: play/pause */}
  <TouchableOpacity onPress={() => void togglePlay()} hitSlop={...} className="p-1">
    <Ionicons name={isPlaying ? "pause" : "play"} size={26} color="#EA580C" />
  </TouchableOpacity>
</View>
```

The `height: 64` stays the same — the subtitle line fits within that height with `py-3`.

### 6. Visual polish

- Source subtitle is `text-xs text-gray-400` — subordinate but readable
- The progress bar at the very top stays unchanged
- The SourceIcon uses `size="sm"` (24×24) to stay compact within 64px bar height
- When `duration === 0` (audio not yet loaded), show `"Loading…"` as the subtitle instead of a time

```typescript
const subtitle =
  duration > 0
    ? `${sourceName(currentItem.sourceType ?? "", currentItem.sourceUrl, currentItem.author)} · ${timeRemaining(position, duration)}`
    : "Loading…";
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/PlayerBar.tsx` | Add SourceIcon left, subtitle row with source name + time remaining |
| `native/components/SourceIcon.tsx` | New — shared source icon component (emoji + tint background) |
| `native/lib/utils.ts` | Add `sourceName()` and `timeRemaining()` helpers |

## Tests

**`native/lib/utils.test.ts`** (or add to existing utils tests):

```typescript
describe("sourceName", () => {
  it("extracts domain from sourceUrl", () => {
    expect(sourceName("url", "https://www.espn.com/article/123", null)).toBe("espn.com");
  });
  it("falls back to author when no URL", () => {
    expect(sourceName("pdf", null, "John Smith")).toBe("John Smith");
  });
  it("falls back to sourceType label", () => {
    expect(sourceName("epub", null, null)).toBe("EPUB");
  });
});

describe("timeRemaining", () => {
  it("returns minutes when >= 60 seconds", () => {
    expect(timeRemaining(60, 780)).toBe("12 min left"); // 720s remaining
  });
  it("returns seconds when < 60 seconds", () => {
    expect(timeRemaining(730, 760)).toBe("30 sec left");
  });
  it("returns 0 sec left when past end", () => {
    expect(timeRemaining(800, 760)).toBe("0 sec left");
  });
});
```

## Success Criteria

```bash
cd native && npx expo run:ios
```

- [ ] PlayerBar shows SourceIcon on the left of the title
- [ ] Subtitle shows "espn.com · 12 min left" (or equivalent for other source types)
- [ ] When no audio duration is loaded yet, subtitle shows "Loading…"
- [ ] Bar height remains 64px — nothing is clipped or wraps awkwardly
- [ ] Subtitle updates live as playback position advances

## Scope

- **No** domain favicon fetching — emoji icon only (favicon upgrade is `episode-identity` spec)
- **No** artwork/thumbnail in the player bar — that's a larger design change
- **No** changes to the expanded player (`ExpandedPlayer.tsx`) — this spec is mini-bar only
- `sourceName()` does not call any API — pure string derivation from existing `PlayableItem` fields
