# Feature: Smart Title Generation

> Clean up noisy titles client-side before they hit the screen — strip site suffixes, humanize PDF filenames, and trim everything else to a readable length.

## Motivation

Titles sourced from web pages frequently contain publisher boilerplate that adds noise without adding meaning: "How LeBron James Is Defying Age | ESPN.com", "The AI Alignment Problem - MIT Technology Review", "2024_Q3_earnings_FINAL_v2.pdf". The raw page title or filename is the worst possible display value — it's what the browser tab shows, not what a human would write on a listening queue.

This is a pure display-layer fix. No API calls, no model inference, no new dependencies. The `smartTitle` utility runs synchronously at render time on strings already in memory. The backend AI-powered title generation (using Claude to write a proper summary title during content processing) is a future feature; this spec handles everything that can be fixed deterministically on the client.

Affected surfaces: `EpisodeCard`, `UpNextCard` (in `index.tsx`), `PlayerBar`, and `ExpandedPlayer`.

## Prerequisite

**This spec depends on `episode-identity.md` being implemented first.** `smartTitle` on `PlayerBar` and `ExpandedPlayer` requires `sourceDomain` on `PlayableItem`, which in turn requires `sourceDomain` on `LibraryItem` (added by episode-identity). If implementing smart-titles standalone, stub `item.sourceDomain` as `undefined` in `libraryItemToPlayable` and the render sites.

## Current State

All four surfaces render `item.title` or `currentItem.title` directly with no sanitization:

- `native/components/EpisodeCard.tsx` line 132: `{item.title}`
- `native/app/(tabs)/index.tsx` `UpNextCard` line 135: `{item.title}`
- `native/components/PlayerBar.tsx` line 43: `{currentItem.title}`
- `native/components/ExpandedPlayer.tsx` line 155: `{currentItem.title}`

`native/lib/libraryHelpers.ts` already contains helper functions (`filterEpisodes`, `getUnlistenedItems`, `libraryItemToPlayable`) — `smartTitle` lives here as a pure utility alongside them.

## Changes

### 1. Rewrite `native/lib/libraryHelpers.ts` (complete file with `smartTitle` added)

```typescript
import type { LibraryItem, LibraryFilter, PlayableItem } from "./types";

// ---------------------------------------------------------------------------
// Home screen helpers
// ---------------------------------------------------------------------------

/**
 * Filter to episodes that are "unlistened":
 * has at least one ready version where position === 0 OR not completed.
 */
export function getUnlistenedItems(items: LibraryItem[]): LibraryItem[] {
  return items.filter((item) =>
    item.versions.some(
      (v) => v.status === "ready" && (v.position === 0 || !v.completed),
    ),
  );
}

/**
 * Build a PlayableItem from a LibraryItem using its first ready version.
 * Returns null if no ready version with audioId + audioUrl exists.
 */
export function libraryItemToPlayable(item: LibraryItem): PlayableItem | null {
  const version = item.versions.find(
    (v) => v.status === "ready" && v.audioId && v.audioUrl,
  );
  if (!version || !version.audioId || !version.audioUrl) return null;

  return {
    id: version.audioId,
    title: item.title,
    duration: version.durationSecs ?? version.targetDuration * 60,
    format: version.format,
    audioUrl: version.audioUrl,
    author: item.author,
    sourceType: item.sourceType,
    sourceDomain: item.sourceDomain ?? null,  // ← requires episode-identity spec
    contentType: version.contentType,
    themes: version.themes,
    summary: version.summary,
    targetDuration: version.targetDuration,
    createdAt: item.createdAt,
  };
}

export function filterEpisodes(
  items: LibraryItem[],
  filter: LibraryFilter,
): LibraryItem[] {
  switch (filter) {
    case "all":
      return items;

    case "in_progress":
      return items.filter((item) =>
        item.versions.some((v) => v.position > 0 && !v.completed),
      );

    case "completed":
      return items.filter(
        (item) =>
          item.versions.length > 0 && item.versions.every((v) => v.completed),
      );

    case "generating":
      return items.filter((item) =>
        item.versions.some((v) => v.status === "generating"),
      );

    default:
      return items;
  }
}

// ---------------------------------------------------------------------------
// Smart title
// ---------------------------------------------------------------------------

/**
 * Source type as used in LibraryItem.sourceType.
 * Kept loose (string) so it accepts any backend value without exhaustive mapping.
 */
type SourceType = string;

/**
 * Cleans a raw title for display.
 *
 * Rules applied in order:
 *   1. PDF/file filenames: strip extension, replace separators with spaces, title-case
 *   2. All titles: strip common site-name suffixes/prefixes (| Site, - Site, « Site, › Site)
 *   3. All titles: collapse multiple whitespace runs
 *   4. All titles: truncate to maxLength with ellipsis at last word boundary
 *
 * @param rawTitle   - The raw title string from the API
 * @param sourceType - LibraryItem.sourceType (used to apply PDF-specific rules)
 * @param sourceDomain - Used to strip domain-specific boilerplate (optional)
 * @param maxLength  - Maximum character length before truncation (default: 80)
 */
export function smartTitle(
  rawTitle: string,
  sourceType: SourceType,
  sourceDomain?: string | null,
  maxLength = 80,
): string {
  let title = rawTitle.trim();
  if (!title) return rawTitle;

  // Rule 1: PDF / file-based sources — clean up filename-style titles
  if (sourceType === "pdf" || sourceType === "txt" || sourceType === "epub") {
    title = cleanFilenameTitle(title);
  }

  // Rule 2: Strip site-name suffix patterns
  //   "Title | Site Name"   →  "Title"
  //   "Title - Site Name"   →  "Title"   (only when Site Name is ≤ 3 words)
  //   "Title « Site Name"   →  "Title"
  //   "Title › Site Name"   →  "Title"
  title = stripPublisherSuffix(title, sourceDomain ?? null);

  // Rule 3: Collapse whitespace
  title = title.replace(/\s+/g, " ").trim();

  // Rule 4: Truncate to maxLength with ellipsis at last word boundary
  if (title.length > maxLength) {
    const truncated = title.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    title = (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + "…";
  }

  return title || rawTitle; // never return empty string
}

// ---------------------------------------------------------------------------
// Internal helpers (not exported — call smartTitle instead)
// ---------------------------------------------------------------------------

/**
 * Clean a filename-style title:
 *   "2024_Q3_strategy_report.pdf"  →  "2024 Q3 Strategy Report"
 *   "my-article-draft-FINAL_v2"    →  "My Article Draft"
 */
function cleanFilenameTitle(title: string): string {
  // Strip common file extensions
  let t = title.replace(/\.(pdf|epub|txt|docx|doc|md)$/i, "");

  // Strip trailing version/draft noise: _v2, _FINAL, _draft, _v1.2, _copy, _rev1
  t = t.replace(/[_\s-]+(v\d[\d.]*|final|draft|copy|rev\d*|revision\d*)$/gi, "");

  // Replace separators (underscores, hyphens between words) with spaces
  t = t.replace(/[_-]/g, " ");

  // Title-case
  t = titleCase(t);

  return t.trim();
}

/**
 * Strip publisher name from suffix/prefix patterns.
 *
 * Conservative: only strips when the segment after the separator is ≤ 40 chars
 * (to avoid stripping subtitle-style secondary clauses like
 * "The Rise of AI — What It Means for Work").
 */
function stripPublisherSuffix(title: string, sourceDomain: string | null): string {
  // Strong separators: |, «, › — these almost always indicate a publisher tag
  const STRONG_SEPARATOR = /\s*[|«›]\s*/;

  const strongParts = title.split(STRONG_SEPARATOR);
  if (strongParts.length >= 2) {
    const suffix = strongParts[strongParts.length - 1].trim();
    const prefix = strongParts.slice(0, -1).join(" | ").trim();

    if (suffix.length <= 40 && prefix.length > 0) {
      return prefix;
    }

    // Also try stripping as prefix: "ESPN: Title" → "Title"
    // Only if first segment matches the sourceDomain's root
    const firstSegment = strongParts[0].trim();
    const rest = strongParts.slice(1).join(" | ").trim();
    if (
      firstSegment.length <= 40 &&
      rest.length > 0 &&
      sourceDomain &&
      firstSegment.toLowerCase().includes(sourceDomain.split(".")[0])
    ) {
      return rest;
    }
  }

  // Weaker separator: " - "
  // Only strip if the right side is ≤ 3 words and ≤ 30 chars (looks like a publisher suffix)
  const dashParts = title.split(" - ");
  if (dashParts.length >= 2) {
    const lastPart = dashParts[dashParts.length - 1].trim();
    const bodyParts = dashParts.slice(0, -1).join(" - ").trim();
    const wordCount = lastPart.split(/\s+/).length;
    if (wordCount <= 3 && lastPart.length <= 30 && bodyParts.length > 0) {
      return bodyParts;
    }
  }

  return title;
}

function titleCase(str: string): string {
  const MINOR_WORDS = new Set([
    "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at",
    "to", "by", "in", "of", "up", "as",
  ]);
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i === 0 || !MINOR_WORDS.has(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(" ");
}
```

### 2. Update `native/lib/types.ts` — add `sourceDomain` to `PlayableItem`

**Diff:**

```diff
 export interface PlayableItem {
   id: string; // audioId
   title: string;
   duration: number; // seconds
   format: string;
   audioUrl: string; // local file path or remote URL
   author?: string | null;
   sourceType?: string | null;
   sourceUrl?: string | null;
+  sourceDomain?: string | null;  // propagated from LibraryItem for smartTitle
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
```

### 3. Update `native/components/EpisodeCard.tsx`

**Diff** — add import:

```diff
+import { smartTitle } from "../lib/libraryHelpers";
 import type { AudioVersion, LibraryItem, PlayableItem } from "../lib/types";
```

**Diff** — derive `displayTitle` after the existing derived values, before `handleLongPress`:

```diff
   const isGenerating  = versions.some((v) => v.status === "generating");
   const allCompleted  = versions.length > 0 && versions.every((v) => v.completed);
+
+  // Derive a cleaned title for all display surfaces in this card
+  const displayTitle = smartTitle(item.title, item.sourceType, item.sourceDomain);
```

**Diff** — replace `item.title` in the title `<Text>`:

```diff
-            <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={2}>
-              {item.title}
-            </Text>
+            <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={2}>
+              {displayTitle}
+            </Text>
```

**Diff** — replace `item.title` in `ActionSheetIOS.showActionSheetWithOptions` (the action sheet header):

```diff
       ActionSheetIOS.showActionSheetWithOptions(
         {
           options: ["Cancel", "New Version", "Delete"],
           cancelButtonIndex: 0,
           destructiveButtonIndex: 2,
-          title: item.title,
+          title: displayTitle,
         },
```

**Diff** — replace `item.title` in the Android `Alert.alert` header:

```diff
-      Alert.alert(item.title, "What would you like to do?", [
+      Alert.alert(displayTitle, "What would you like to do?", [
```

> Note: `PlayableItem` objects built inside `EpisodeCard` (in the version pills loop) still use `item.title` as the raw title — `smartTitle` is applied at render time by whichever component displays the title, not at construction time.

### 4. Update `UpNextCard` in `native/app/(tabs)/index.tsx`

**Diff** — add import (alongside the existing libraryHelpers import):

```diff
-import { getUnlistenedItems, libraryItemToPlayable } from "../../lib/libraryHelpers";
+import { getUnlistenedItems, libraryItemToPlayable, smartTitle } from "../../lib/libraryHelpers";
```

**Diff** — derive `displayTitle` inside `UpNextCard` and use it:

```diff
 function UpNextCard({ item, playable, onPlay }: UpNextCardProps) {
   const readyVersion = item.versions.find(
     (v) => v.status === "ready" && v.audioId,
   );
   const durationSecs = readyVersion?.durationSecs ?? (readyVersion?.targetDuration ?? 0) * 60;
+  const displayTitle = smartTitle(item.title, item.sourceType, item.sourceDomain);

   return (
     <TouchableOpacity
       onPress={() => onPlay(playable)}
       activeOpacity={0.75}
       className="mx-4 mb-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm"
     >
       <View className="px-4 py-3 flex-row items-center gap-3">
         {/* Play icon */}
         <View className="w-9 h-9 rounded-full bg-gray-50 items-center justify-center border border-gray-100">
           <Ionicons name="play" size={14} color="#EA580C" />
         </View>

         {/* Content */}
         <View className="flex-1">
           <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
-            {item.title}
+            {displayTitle}
           </Text>
```

### 5. Update `native/components/PlayerBar.tsx`

**Diff** — add import:

```diff
+import { smartTitle } from "../lib/libraryHelpers";
 import { usePlayer } from "../lib/usePlayer";
```

**Diff** — derive `displayTitle` from `currentItem` and use it:

```diff
   if (!currentItem) return null;

   const progressPercent =
     duration > 0 ? Math.min((position / duration) * 100, 100) : 0;
+
+  const displayTitle = smartTitle(
+    currentItem.title,
+    currentItem.sourceType ?? "url",
+    currentItem.sourceDomain,
+  );

   return (
```

```diff
         {/* Title */}
         <Text
           className="flex-1 text-sm font-semibold text-gray-900"
           numberOfLines={1}
         >
-          {currentItem.title}
+          {displayTitle}
         </Text>
```

### 6. Update `native/components/ExpandedPlayer.tsx`

**Diff** — add import at the top:

```diff
+import { smartTitle } from "../lib/libraryHelpers";
 import { usePlayer } from "../lib/usePlayer";
 import { formatDuration, nextSpeed } from "../lib/utils";
```

**Diff** — derive `displayTitle` after `if (!currentItem) return null;`:

```diff
   if (!currentItem) return null;

   const displayPosition = scrubPosition ?? position;
   const remaining = Math.max(0, duration - displayPosition);
   const bg = artworkBg(currentItem.contentType, currentItem.sourceType);
+
+  const displayTitle = smartTitle(
+    currentItem.title,
+    currentItem.sourceType ?? "url",
+    currentItem.sourceDomain,
+  );
```

**Diff** — replace `{currentItem.title}` in the artwork section:

```diff
             {/* Title + author */}
             <Text
               className="text-xl font-bold text-gray-900 mt-5 text-center"
               numberOfLines={2}
             >
-              {currentItem.title}
+              {displayTitle}
             </Text>
```

## Files to Create/Modify

| File | Change |
|---|---|
| `native/lib/libraryHelpers.ts` | Add `smartTitle`, `cleanFilenameTitle`, `stripPublisherSuffix`, `titleCase`; update `libraryItemToPlayable` to pass `sourceDomain` |
| `native/lib/types.ts` | Add `sourceDomain?: string \| null` to `PlayableItem` |
| `native/components/EpisodeCard.tsx` | Import `smartTitle`; derive `displayTitle`; use in title `<Text>` and action sheet title |
| `native/app/(tabs)/index.tsx` | Import `smartTitle`; `UpNextCard` derives `displayTitle` and uses it |
| `native/components/PlayerBar.tsx` | Import `smartTitle`; derive `displayTitle` from `currentItem`; use in title `<Text>` |
| `native/components/ExpandedPlayer.tsx` | Import `smartTitle`; derive `displayTitle` from `currentItem`; use in title `<Text>` |

## Tests

**File:** `native/lib/__tests__/smartTitle.test.ts` (new)

```typescript
import { describe, it, expect } from "@jest/globals";
import { smartTitle } from "../libraryHelpers";

// ---------------------------------------------------------------------------
// URL sources — strip publisher suffixes
// ---------------------------------------------------------------------------

describe("smartTitle — URL sources: publisher suffix stripping", () => {
  it("strips pipe-separated site name suffix", () => {
    expect(smartTitle("How LeBron Is Defying Age | ESPN.com", "url", "espn.com")).toBe(
      "How LeBron Is Defying Age",
    );
  });

  it("strips pipe-separated site name with spaces", () => {
    expect(
      smartTitle("The AI Alignment Problem | MIT Technology Review", "url", null),
    ).toBe("The AI Alignment Problem");
  });

  it("strips chevron-style suffix (›)", () => {
    expect(smartTitle("Why Nuclear Power › The Atlantic", "url", null)).toBe(
      "Why Nuclear Power",
    );
  });

  it("strips guillemet suffix («)", () => {
    expect(smartTitle("Climate and Cities « Bloomberg", "url", "bloomberg.com")).toBe(
      "Climate and Cities",
    );
  });

  it("strips short hyphen suffix (3 words or fewer)", () => {
    expect(smartTitle("The Future of Work - The Verge", "url", "theverge.com")).toBe(
      "The Future of Work",
    );
  });

  it("does NOT strip hyphen suffix when it is more than 3 words", () => {
    // "What It Means for Work" is 5 words — preserve as subtitle
    const input = "The Rise of AI - What It Means for Work";
    expect(smartTitle(input, "url", null)).toBe(input);
  });

  it("does NOT strip the suffix when doing so would leave an empty title", () => {
    expect(smartTitle("ESPN.com", "url", "espn.com")).toBe("ESPN.com");
  });

  it("passes through a clean title unchanged", () => {
    const clean = "How Transformers Work";
    expect(smartTitle(clean, "url", null)).toBe(clean);
  });

  it("handles undefined sourceDomain gracefully", () => {
    expect(() =>
      smartTitle("Some Title | Publisher", "url", undefined),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// PDF / file sources — filename cleaning
// ---------------------------------------------------------------------------

describe("smartTitle — PDF sources: filename cleaning", () => {
  it("strips .pdf extension and converts separators to spaces", () => {
    expect(smartTitle("2024_Q3_strategy_report.pdf", "pdf", null)).toBe(
      "2024 Q3 Strategy Report",
    );
  });

  it("strips _FINAL suffix", () => {
    expect(smartTitle("board_deck_FINAL.pdf", "pdf", null)).toBe("Board Deck");
  });

  it("strips _v2 suffix", () => {
    expect(smartTitle("proposal_v2.pdf", "pdf", null)).toBe("Proposal");
  });

  it("strips _draft suffix", () => {
    expect(smartTitle("article_draft.pdf", "pdf", null)).toBe("Article");
  });

  it("handles hyphen separators", () => {
    expect(smartTitle("my-research-paper.pdf", "pdf", null)).toBe(
      "My Research Paper",
    );
  });

  it("handles .epub extension", () => {
    expect(smartTitle("deep_work.epub", "epub", null)).toBe("Deep Work");
  });

  it("handles .txt extension", () => {
    expect(smartTitle("meeting_notes.txt", "txt", null)).toBe("Meeting Notes");
  });

  it("preserves a clean title with no filename noise", () => {
    // A PDF whose title was already set correctly by the server
    expect(smartTitle("Deep Work", "pdf", null)).toBe("Deep Work");
  });

  it("handles mixed case FINAL + version noise", () => {
    expect(smartTitle("Q3_Strategy_FINAL_v2.pdf", "pdf", null)).toBe("Q3 Strategy");
  });
});

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

describe("smartTitle — truncation", () => {
  it("truncates titles longer than 80 characters with an ellipsis", () => {
    const long =
      "This Is an Extremely Long Article Title That Goes On and On Beyond Any Reasonable Length For Display";
    const result = smartTitle(long, "url", null);
    expect(result.endsWith("…")).toBe(true);
    // At most 80 chars + 1 ellipsis character
    expect(result.replace("…", "").length).toBeLessThanOrEqual(80);
  });

  it("breaks truncation at a word boundary, not mid-word", () => {
    const long =
      "This Is an Extremely Long Article Title That Goes On and On Beyond Any Reasonable";
    const result = smartTitle(long, "url", null, 40);
    // The character just before the ellipsis should not be a space
    expect(result).not.toMatch(/\s…$/);
    // The content without the ellipsis should be a prefix of the original
    const withoutEllipsis = result.replace("…", "").trimEnd();
    expect(long.startsWith(withoutEllipsis)).toBe(true);
  });

  it("accepts a custom maxLength", () => {
    const result = smartTitle("Short Title That Is Fine", "url", null, 10);
    expect(result.replace("…", "").length).toBeLessThanOrEqual(10);
  });

  it("does not truncate titles that are exactly maxLength characters", () => {
    const exact = "Twelve Char"; // 11 chars
    expect(smartTitle(exact, "url", null, 11)).toBe(exact);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("smartTitle — edge cases", () => {
  it("returns the original rawTitle when the input is empty", () => {
    expect(smartTitle("", "url", null)).toBe("");
  });

  it("collapses extra whitespace runs", () => {
    expect(smartTitle("Title  With   Extra   Spaces", "url", null)).toBe(
      "Title With Extra Spaces",
    );
  });

  it("does not apply filename rules to url sourceType", () => {
    // A URL article whose title happens to contain underscores should not be cleaned
    const title = "Why_AI_Safety_Matters";
    expect(smartTitle(title, "url", null)).toBe(title);
  });

  it("applies filename rules to epub sourceType", () => {
    expect(smartTitle("atomic_habits.epub", "epub", null)).toBe("Atomic Habits");
  });

  it("does not modify titles from unknown sourceTypes", () => {
    const title = "My Pocket Article";
    expect(smartTitle(title, "pocket", null)).toBe(title);
  });

  it("handles null sourceDomain without throwing", () => {
    expect(() => smartTitle("Some Title | Publisher", "url", null)).not.toThrow();
  });
});
```

## Success Criteria

```bash
cd native
npx jest lib/__tests__/smartTitle.test.ts
# All tests pass (≥ 22 cases)

npx tsc --noEmit
# No type errors — PlayableItem.sourceDomain optional field accepted at all call sites
```

Manual verification — build the app and check each surface:
- [ ] ESPN article: "LeBron James Is Still Doing It | ESPN.com" → card shows "LeBron James Is Still Doing It"
- [ ] HBR article: "The Leader's Guide to Corporate Culture - Harvard Business Review" → "The Leader's Guide to Corporate Culture"
- [ ] arXiv PDF: "attention_is_all_you_need.pdf" → card shows "Attention Is All You Need"
- [ ] PDF with version noise: "Q3_Strategy_FINAL_v2.pdf" → "Q3 Strategy"
- [ ] Clean title (no noise): "Why Nuclear Energy Is Having a Moment" → unchanged
- [ ] PlayerBar title matches the same cleaned title shown on the library card
- [ ] ExpandedPlayer title matches the cleaned title
- [ ] Long-press action sheet header shows the cleaned title (not the raw title)
- [ ] Subtitle-style em-dash: "The Rise of AI — What It Means for Work" → unchanged (not stripped)

## Scope

Client-side display only. No backend changes. No new npm dependencies. `smartTitle` is a pure synchronous string transform — no fetch, no I/O, no async. AI-powered title generation (using Claude to write a descriptive summary title during the `/api/process` pipeline) is explicitly out of scope. The rules in `stripPublisherSuffix` are intentionally conservative — false positives (accidentally stripping a subtitle) are worse than false negatives (leaving noise in). `titleCase` in `cleanFilenameTitle` is English-only; internationalization is out of scope. The `MINOR_WORDS` set covers common English articles and conjunctions only.
