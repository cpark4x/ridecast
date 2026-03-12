# Feature: Smart Title Generation

> Clean up noisy titles client-side before they hit the screen — strip site suffixes, humanize PDF filenames, and trim everything else to a readable length.

## Motivation

Titles sourced from web pages frequently contain publisher boilerplate that adds noise without adding meaning: "How LeBron James Is Defying Age | ESPN.com", "The AI Alignment Problem - MIT Technology Review", "2024_Q3_earnings_FINAL_v2.pdf". The raw page title or filename is the worst possible display value — it's what the browser tab shows, not what a human would write on a listening queue.

This is a pure display-layer fix. No API calls, no model inference, no new dependencies. The `smartTitle` utility runs synchronously at render time on strings already in memory. The backend AI-powered title generation (using Claude to write a proper summary title during content processing) is a future feature; this spec handles everything that can be fixed deterministically on the client.

Affected surfaces: `EpisodeCard`, `UpNextCard` (in `index.tsx`), `PlayerBar`, and `ExpandedPlayer`.

## Current State

All four surfaces render `item.title` or `currentItem.title` directly with no sanitization:

- `native/components/EpisodeCard.tsx` line 132: `{item.title}`
- `native/app/(tabs)/index.tsx` `UpNextCard` line 135: `{item.title}`
- Wherever `PlayerBar` renders title (search `native/components/PlayerBar.tsx` or equivalent)
- Wherever `ExpandedPlayer` renders title

`native/lib/libraryHelpers.ts` already contains helper functions (`filterEpisodes`, `getUnlistenedItems`, `libraryItemToPlayable`) — `smartTitle` lives here as a pure utility alongside them.

## Changes

### 1. Add `smartTitle` utility to `native/lib/libraryHelpers.ts`

```typescript
/**
 * Source type as used in LibraryItem.sourceType.
 * Kept loose (string) so it accepts any backend value without exhaustive mapping.
 */
type SourceType = string;

/**
 * Cleans a raw title for display.
 *
 * Rules applied in order:
 *   1. PDF filenames: strip extension, replace separators with spaces, title-case
 *   2. All titles: strip common site-name suffixes/prefixes (| Site, - Site, « Site, › Site)
 *   3. All titles: collapse multiple whitespace runs
 *   4. All titles: truncate to maxLength with ellipsis
 *
 * @param rawTitle  - The raw title string from the API
 * @param sourceType - LibraryItem.sourceType (used to apply PDF-specific rules)
 * @param sourceDomain - Used to strip domain-specific boilerplate (optional)
 * @param maxLength - Maximum character length before truncation (default: 80)
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
  //   "Title - Site Name"   →  "Title"   (only when Site Name looks like a domain or brand)
  //   "Title « Site Name"   →  "Title"
  //   "Title › Site Name"   →  "Title"
  //   "Site Name: Title"    →  "Title"   (prefix pattern — rarer, be conservative)
  title = stripPublisherSuffix(title, sourceDomain ?? null);

  // Rule 3: Collapse whitespace
  title = title.replace(/\s+/g, " ").trim();

  // Rule 4: Truncate
  if (title.length > maxLength) {
    // Break at last word boundary before maxLength
    const truncated = title.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    title = (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + "…";
  }

  return title || rawTitle; // never return empty string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Clean a filename-style title:
 *   "2024_Q3_strategy_report.pdf"  →  "Q3 Strategy Report"
 *   "my-article-draft-FINAL_v2"    →  "My Article Draft Final V2"  → "My Article Draft"
 */
function cleanFilenameTitle(title: string): string {
  // Strip common file extensions
  let t = title.replace(/\.(pdf|epub|txt|docx|doc|md)$/i, "");

  // Strip trailing version/draft noise: _v2, _FINAL, _draft, _v1.2
  t = t.replace(/[_\s-]+(v\d[\d.]*|final|draft|copy|rev\d*|revision\d*)$/gi, "");

  // Replace separators (underscores, hyphens between words) with spaces
  t = t.replace(/[_-]/g, " ");

  // Title-case
  t = toTitleCase(t);

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
  // Separators that indicate a publisher tag: |, «, ›, —  (em-dash only at end)
  // Also handle " - " but only if the right side is short (≤ 40 chars) and looks like
  // a brand (no sentence-case verb structure)
  const STRONG_SEPARATORS = /\s*[|«›]\s*/;

  const strongMatch = title.split(STRONG_SEPARATORS);
  if (strongMatch.length >= 2) {
    const suffix = strongMatch[strongMatch.length - 1].trim();
    const prefix = strongMatch.slice(0, -1).join(" | ").trim();
    // If the suffix is short enough to be a publisher name and the prefix is non-empty, strip
    if (suffix.length <= 40 && prefix.length > 0) {
      return prefix;
    }
    // Also try stripping as a prefix: "ESPN: Title" → "Title"
    const firstSegment = strongMatch[0].trim();
    const rest = strongMatch.slice(1).join(" | ").trim();
    if (firstSegment.length <= 40 && rest.length > 0) {
      // Only do prefix strip if the first segment matches a known publisher or domain
      if (sourceDomain && firstSegment.toLowerCase().includes(sourceDomain.split(".")[0])) {
        return rest;
      }
    }
  }

  // Weaker separator: " - " — only strip if right side is ≤ 30 chars and contains no spaces
  // in its "root" (i.e., looks like "ESPN.com" not "A Longer Phrase")
  const dashParts = title.split(" - ");
  if (dashParts.length >= 2) {
    const lastPart = dashParts[dashParts.length - 1].trim();
    const bodyParts = dashParts.slice(0, -1).join(" - ").trim();
    const wordCount = lastPart.split(/\s+/).length;
    if (wordCount <= 3 && lastPart.length <= 30 && bodyParts.length > 0) {
      // Looks like a publisher suffix
      return bodyParts;
    }
  }

  return title;
}

function toTitleCase(str: string): string {
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

### 2. Update `native/components/EpisodeCard.tsx`

Import `smartTitle` and use it wherever the title is rendered:

```typescript
import { smartTitle } from "../lib/libraryHelpers";
```

In the render body, derive the display title once and use it throughout:

```tsx
// After the existing derived values (isGenerating, allCompleted, etc.):
const displayTitle = smartTitle(item.title, item.sourceType, item.sourceDomain);
```

Replace `{item.title}` with `{displayTitle}` in the title `<Text>` element:

```tsx
<Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={2}>
  {displayTitle}
</Text>
```

Also replace `item.title` in `handleLongPress` where it's used as the action sheet title — the display title is better UX:

```typescript
ActionSheetIOS.showActionSheetWithOptions(
  {
    options: ["Cancel", "New Version", "Delete"],
    cancelButtonIndex: 0,
    destructiveButtonIndex: 2,
    title: displayTitle,  // was: item.title
  },
  // ...
);
```

### 3. Update `UpNextCard` in `native/app/(tabs)/index.tsx`

```typescript
import { smartTitle } from "../../lib/libraryHelpers";
```

In `UpNextCard`:

```tsx
function UpNextCard({ item, playable, onPlay }: UpNextCardProps) {
  const displayTitle = smartTitle(item.title, item.sourceType, item.sourceDomain);
  // ...
  <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
    {displayTitle}
  </Text>
```

### 4. Update `PlayerBar` and `ExpandedPlayer`

`PlayerBar` and `ExpandedPlayer` receive a `PlayableItem` (not `LibraryItem`). `PlayableItem` has `title` and `sourceType` but not `sourceDomain`. Since `PlayableItem` is derived from `LibraryItem` at play time, add `sourceDomain` to the `PlayableItem` type and populate it at the construction sites.

**Update `native/lib/types.ts` `PlayableItem`:**

```typescript
export interface PlayableItem {
  id: string;
  title: string;
  duration: number;
  format: string;
  audioUrl: string;
  author?: string | null;
  sourceType?: string | null;
  sourceUrl?: string | null;
  sourceDomain?: string | null;   // ← add this line
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

**Update `native/lib/libraryHelpers.ts` `libraryItemToPlayable`:**

```typescript
export function libraryItemToPlayable(item: LibraryItem): PlayableItem | null {
  // ...existing null check unchanged...
  return {
    id: version.audioId,
    title: item.title,
    // ...other fields unchanged...
    sourceDomain: item.sourceDomain ?? null,   // ← add this line
  };
}
```

**Update all `PlayableItem` construction sites in `library.tsx` and `index.tsx`** to include `sourceDomain: item.sourceDomain ?? null`.

Then in `PlayerBar` and `ExpandedPlayer`, wherever `currentItem.title` is rendered:

```typescript
import { smartTitle } from "../lib/libraryHelpers";

// At the render site (or in a useMemo):
const displayTitle = smartTitle(
  currentItem.title,
  currentItem.sourceType ?? "url",
  currentItem.sourceDomain,
);
```

> If `PlayerBar` and `ExpandedPlayer` live in `native/components/`, find the exact title render with:
> ```bash
> grep -n "currentItem\.title\|item\.title" native/components/PlayerBar.tsx native/components/ExpandedPlayer.tsx
> ```
> Apply the same `smartTitle` wrapper to each match.

## Files to Create/Modify

| File | Change |
|---|---|
| `native/lib/libraryHelpers.ts` | Add `smartTitle`, `cleanFilenameTitle`, `stripPublisherSuffix`, `toTitleCase` helpers; update `libraryItemToPlayable` to pass `sourceDomain` |
| `native/lib/types.ts` | Add `sourceDomain?: string \| null` to `PlayableItem` |
| `native/components/EpisodeCard.tsx` | Derive `displayTitle` via `smartTitle`, use throughout |
| `native/app/(tabs)/index.tsx` | `UpNextCard` uses `smartTitle` |
| `native/components/PlayerBar.tsx` | Use `smartTitle` on `currentItem.title` |
| `native/components/ExpandedPlayer.tsx` | Use `smartTitle` on `currentItem.title` |

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
    expect(smartTitle("The AI Alignment Problem | MIT Technology Review", "url", null)).toBe(
      "The AI Alignment Problem",
    );
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
    // "What It Means for Work" is 5 words — preserve it (subtitle, not publisher)
    const input = "The Rise of AI — What It Means for Work";
    expect(smartTitle(input, "url", null)).toBe(input);
  });

  it("does NOT strip the suffix when doing so would leave an empty title", () => {
    expect(smartTitle("ESPN.com", "url", "espn.com")).toBe("ESPN.com");
  });

  it("passes through a clean title unchanged", () => {
    const clean = "How Transformers Work";
    expect(smartTitle(clean, "url", null)).toBe(clean);
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

  it("handles hyphen separators", () => {
    expect(smartTitle("my-research-paper.pdf", "pdf", null)).toBe(
      "My Research Paper",
    );
  });

  it("handles EPUB extension", () => {
    expect(smartTitle("deep_work.epub", "epub", null)).toBe("Deep Work");
  });

  it("handles TXT extension", () => {
    expect(smartTitle("meeting_notes.txt", "txt", null)).toBe("Meeting Notes");
  });

  it("preserves a title with no filename noise", () => {
    // If someone uploaded a PDF with a clean title already set by the server
    expect(smartTitle("Deep Work", "pdf", null)).toBe("Deep Work");
  });
});

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

describe("smartTitle — truncation", () => {
  it("truncates titles longer than 80 characters with an ellipsis", () => {
    const long =
      "This Is an Extremely Long Article Title That Goes On and On Beyond Any Reasonable Length";
    const result = smartTitle(long, "url", null);
    expect(result.length).toBeLessThanOrEqual(82); // 80 + "…"
    expect(result).toMatch(/…$/);
  });

  it("breaks truncation at a word boundary, not mid-word", () => {
    const long =
      "This Is an Extremely Long Article Title That Goes On and On Beyond Any Reasonable";
    const result = smartTitle(long, "url", null, 40);
    expect(result).not.toMatch(/\s…$/); // no trailing space before ellipsis
    const withoutEllipsis = result.replace("…", "");
    expect(long.startsWith(withoutEllipsis.trimEnd())).toBe(true);
  });

  it("accepts a custom maxLength", () => {
    const result = smartTitle("Short Title That Is Fine", "url", null, 10);
    expect(result.length).toBeLessThanOrEqual(11);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("smartTitle — edge cases", () => {
  it("returns the original rawTitle when the cleaned result is empty", () => {
    expect(smartTitle("", "url", null)).toBe("");
  });

  it("collapses extra whitespace", () => {
    expect(smartTitle("Title  With   Extra   Spaces", "url", null)).toBe(
      "Title With Extra Spaces",
    );
  });

  it("handles a null/undefined sourceDomain gracefully", () => {
    expect(() => smartTitle("Some Title | Publisher", "url", null)).not.toThrow();
    expect(() => smartTitle("Some Title | Publisher", "url", undefined)).not.toThrow();
  });

  it("does not modify titles from unknown sourceTypes", () => {
    const title = "My Pocket Article";
    expect(smartTitle(title, "pocket", null)).toBe(title);
  });
});
```

## Success Criteria

```bash
cd native
npx jest lib/__tests__/smartTitle.test.ts
# All tests pass (≥ 20 cases)

npx tsc --noEmit
# No type errors — PlayableItem.sourceDomain optional field accepted at all call sites
```

Manual verification — build the app and check each surface:
- [ ] ESPN article: "LeBron James Is Still Doing It | ESPN.com" → card shows "LeBron James Is Still Doing It"
- [ ] HBR article: "The Leader's Guide to Corporate Culture - Harvard Business Review" → "The Leader's Guide to Corporate Culture"
- [ ] arXiv PDF: "attention_is_all_you_need.pdf" → card shows "Attention Is All You Need"
- [ ] PDF with version noise: "Q3_Strategy_FINAL_v2.pdf" → "Q3 Strategy"
- [ ] Clean title (no noise): "Why Nuclear Energy Is Having a Moment" → unchanged
- [ ] PlayerBar and ExpandedPlayer show the same cleaned title as the library card
- [ ] Action sheet on long-press shows the cleaned title as the sheet header

## Scope

Client-side display only. No backend changes. No new npm dependencies. The `smartTitle` utility does not fetch anything, call any API, or access the filesystem — it is a pure synchronous string transform. AI-powered title generation (using Claude to write a descriptive summary title during the `/api/process` pipeline) is explicitly out of scope and is tracked as a future backend feature. The rules in `stripPublisherSuffix` are intentionally conservative — false positives (accidentally stripping a subtitle) are worse than false negatives (leaving noise in). The `MINOR_WORDS` set in `toTitleCase` is English-only; internationalization is out of scope.
