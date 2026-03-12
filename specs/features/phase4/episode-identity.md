# Feature: Episode Identity Data Model

> Add source attribution to every episode — publisher name, domain, brand color, and a content preview — so the library, home screen, and future following system all have a shared identity layer to build on.

## Motivation

Every episode in the library currently shows a generic source-type badge ("URL", "PDF"). There is no way to tell at a glance that one URL episode is from ESPN, another from Substack, and a third from arXiv. The library redesign mockups (`docs/mockups/library-redesign-v2.html`), the homepage redesign, and the proposed following system all assume a richer identity layer exists. Without it, those features cannot be built.

This spec adds five fields to `LibraryItem` and the `episodes` SQLite table:
- `sourceIcon` — a favicon URL or a generated icon identifier for the source
- `sourceName` — human-readable publisher name (e.g. "ESPN", "Substack")
- `sourceDomain` — the registrable domain (e.g. "espn.com")
- `sourceBrandColor` — hex color for theming (e.g. "#C41230" for ESPN)
- `description` — a 200-character content preview for the card

A new `SourceIcon` component renders a 36px branded circle using these fields. Known publishers get hardcoded brand colors; unknown sources get a hash-derived color from the domain string.

This spec is intentionally **data-model first** — it adds the fields, populates them from the API response where available, and renders them on the existing `EpisodeCard`. Downstream consumers (library redesign, following screen) build on top of this foundation.

## Current State

`native/lib/types.ts` `LibraryItem`:
```typescript
export interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
}
```

`native/lib/db.ts` `episodes` table:
```sql
CREATE TABLE IF NOT EXISTS episodes (
  content_id    TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  author        TEXT,
  source_type   TEXT NOT NULL,
  source_url    TEXT,
  word_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  json_versions TEXT NOT NULL DEFAULT '[]'
);
```

`native/lib/sync.ts`: passes API response directly to `db.upsertEpisodes` with no field mapping.

`native/components/EpisodeCard.tsx`: shows a source-type badge and author only.

## Changes

### 1. Update `LibraryItem` type in `native/lib/types.ts`

```typescript
export interface LibraryItem {
  id: string; // contentId
  title: string;
  author: string | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  wordCount: number;
  versions: AudioVersion[];
  // --- Episode identity fields (all nullable for backward compatibility) ---
  sourceIcon: string | null;       // favicon URL or null
  sourceName: string | null;       // e.g. "ESPN", "Substack"
  sourceDomain: string | null;     // e.g. "espn.com"
  sourceBrandColor: string | null; // e.g. "#C41230" — used to color SourceIcon
  description: string | null;      // first ~200 chars of content or AI summary
}
```

All five new fields are `| null` — existing rows that don't have them (synced before this update, or from an older API response) will simply render the fallback states.

### 2. Add schema migration in `native/lib/db.ts`

SQLite's `ALTER TABLE ADD COLUMN` does not support `IF NOT EXISTS` (pre-SQLite 3.37.0). The safe cross-version approach is to attempt each `ALTER` and silently ignore `duplicate column` errors.

Add a `migrateV2` function and call it from `migrate`:

```typescript
async function migrate(db: SQLite.SQLiteDatabase) {
  // Original schema (unchanged)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS episodes (
      content_id    TEXT PRIMARY KEY,
      title         TEXT NOT NULL,
      author        TEXT,
      source_type   TEXT NOT NULL,
      source_url    TEXT,
      word_count    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      json_versions TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS playback (
      audio_id   TEXT PRIMARY KEY,
      position   REAL NOT NULL DEFAULT 0,
      speed      REAL NOT NULL DEFAULT 1.0,
      completed  INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS downloads (
      audio_id   TEXT PRIMARY KEY,
      local_path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // V2: episode identity columns
  await migrateV2(db);
}

/**
 * Adds identity columns to the episodes table.
 * Uses try/catch per column because SQLite < 3.37.0 doesn't support
 * ALTER TABLE ADD COLUMN IF NOT EXISTS.
 */
async function migrateV2(db: SQLite.SQLiteDatabase) {
  const newColumns = [
    "ALTER TABLE episodes ADD COLUMN source_icon       TEXT",
    "ALTER TABLE episodes ADD COLUMN source_name       TEXT",
    "ALTER TABLE episodes ADD COLUMN source_domain     TEXT",
    "ALTER TABLE episodes ADD COLUMN source_brand_color TEXT",
    "ALTER TABLE episodes ADD COLUMN description       TEXT",
  ];

  for (const stmt of newColumns) {
    try {
      await db.execAsync(stmt);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}
```

### 3. Update `upsertEpisodes` and `getAllEpisodes` in `native/lib/db.ts`

Update the `INSERT OR REPLACE` to include the new columns:

```typescript
export async function upsertEpisodes(items: LibraryItem[]) {
  const db = await getDb();
  for (const item of items) {
    await db.runAsync(
      `INSERT OR REPLACE INTO episodes
        (content_id, title, author, source_type, source_url, word_count, created_at,
         json_versions, source_icon, source_name, source_domain, source_brand_color, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.title,
      item.author,
      item.sourceType,
      item.sourceUrl,
      item.wordCount,
      item.createdAt,
      JSON.stringify(item.versions),
      item.sourceIcon,
      item.sourceName,
      item.sourceDomain,
      item.sourceBrandColor,
      item.description,
    );
  }
}
```

Update the row-to-type mapping in `getAllEpisodes` and `searchEpisodes`:

```typescript
// Add to the row type annotation in both getAllEpisodes and searchEpisodes:
source_icon: string | null;
source_name: string | null;
source_domain: string | null;
source_brand_color: string | null;
description: string | null;

// Add to the returned object in both:
sourceIcon: row.source_icon,
sourceName: row.source_name,
sourceDomain: row.source_domain,
sourceBrandColor: row.source_brand_color,
description: row.description,
```

### 4. Create `native/lib/sourceUtils.ts` — domain extraction utility (new file)

```typescript
/**
 * Known source publishers with display name and brand color.
 * Add entries here as new publishers are onboarded.
 */
const KNOWN_SOURCES: Record<string, { name: string; color: string }> = {
  "espn.com":        { name: "ESPN",      color: "#C41230" },
  "substack.com":    { name: "Substack",  color: "#FF6719" },
  "github.com":      { name: "GitHub",    color: "#24292F" },
  "hbr.org":         { name: "HBR",       color: "#A51C30" },
  "arxiv.org":       { name: "arXiv",     color: "#46A89B" },
  "theverge.com":    { name: "The Verge", color: "#2E1E5B" },
  "nytimes.com":     { name: "NYT",       color: "#000000" },
  "bloomberg.com":   { name: "Bloomberg", color: "#1F6FEB" },
  "medium.com":      { name: "Medium",    color: "#000000" },
  "wired.com":       { name: "WIRED",     color: "#000000" },
  "techcrunch.com":  { name: "TechCrunch",color: "#0A8D35" },
  "arstechnica.com": { name: "Ars Technica", color: "#FF4E00" },
};

export interface SourceIdentity {
  sourceDomain: string | null;
  sourceName: string | null;
  sourceBrandColor: string | null;
}

/**
 * Extract registrable domain from a URL string.
 * "https://www.espn.com/mlb/story/..." → "espn.com"
 * Returns null if the URL is unparseable or has no hostname.
 */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    // Strip www. and any other single subdomain
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return hostname;
  } catch {
    return null;
  }
}

/**
 * Derive source identity fields from a URL.
 * Checks KNOWN_SOURCES first; falls back to the raw domain with no brand color.
 */
export function deriveSourceIdentity(sourceUrl: string | null | undefined): SourceIdentity {
  const domain = extractDomain(sourceUrl);
  if (!domain) return { sourceDomain: null, sourceName: null, sourceBrandColor: null };

  const known = KNOWN_SOURCES[domain];
  return {
    sourceDomain: domain,
    sourceName: known?.name ?? toTitleCase(domain.split(".")[0]),
    sourceBrandColor: known?.color ?? null,
  };
}

/**
 * Generates a deterministic hex color from a domain string.
 * Used as a fallback when sourceBrandColor is null.
 * Produces muted, dark-enough colors that work on white backgrounds.
 */
export function hashColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  // Map to a hue in HSL — use fixed saturation/lightness for readability
  const hue = Math.abs(hash) % 360;
  return hslToHex(hue, 55, 38);
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lNorm - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
```

### 5. Update `native/lib/sync.ts` to populate identity fields

```typescript
import * as api from "./api";
import * as db from "./db";
import { downloadEpisodeAudio } from "./downloads";
import { deriveSourceIdentity } from "./sourceUtils";
import type { LibraryItem } from "./types";

export async function syncLibrary(): Promise<LibraryItem[]> {
  const serverItems = await api.fetchLibrary();

  // Enrich each item with derived identity fields before storing
  const enrichedItems: LibraryItem[] = serverItems.map((item) => {
    // If the server already provides identity fields, use them.
    // Otherwise derive from sourceUrl.
    const derived = item.sourceDomain
      ? {} // server already populated, don't overwrite
      : deriveSourceIdentity(item.sourceUrl);

    return {
      ...item,
      sourceIcon:       item.sourceIcon       ?? null,
      sourceName:       item.sourceName       ?? derived.sourceName       ?? null,
      sourceDomain:     item.sourceDomain     ?? derived.sourceDomain     ?? null,
      sourceBrandColor: item.sourceBrandColor ?? derived.sourceBrandColor ?? null,
      description:      item.description      ?? null,
    };
  });

  await db.upsertEpisodes(enrichedItems);

  for (const item of enrichedItems) {
    for (const version of item.versions) {
      if (version.status === "ready" && version.audioId && version.audioUrl) {
        const existing = await db.getDownloadPath(version.audioId);
        if (!existing) {
          downloadEpisodeAudio(version.audioId, version.audioUrl).catch(
            (err) => console.warn("[sync] download failed:", version.audioId, err),
          );
        }
      }
    }
  }

  return enrichedItems;
}

// syncPlayback unchanged
```

### 6. Create `native/components/SourceIcon.tsx` (new file)

```tsx
import React from "react";
import { Text, View } from "react-native";
import { hashColor } from "../lib/sourceUtils";

interface SourceIconProps {
  sourceName: string | null;
  sourceDomain: string | null;
  sourceBrandColor: string | null;
  /** Diameter in pixels. Default: 36 */
  size?: number;
  /** Font size for the letter. Default: 15 */
  fontSize?: number;
}

/**
 * Renders a colored circle with the first letter of sourceName.
 *
 * Color priority:
 *   1. sourceBrandColor (known publishers, or server-provided)
 *   2. Hash-derived color from sourceDomain
 *   3. Gray fallback (#6B7280) when both are null
 */
export default function SourceIcon({
  sourceName,
  sourceDomain,
  sourceBrandColor,
  size = 36,
  fontSize = 15,
}: SourceIconProps) {
  const letter = sourceName?.charAt(0).toUpperCase() ?? "?";

  const bgColor =
    sourceBrandColor ??
    (sourceDomain ? hashColor(sourceDomain) : "#6B7280");

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: "#FFFFFF",
          fontSize,
          fontWeight: "700",
          lineHeight: fontSize + 2,
          includeFontPadding: false,
        }}
      >
        {letter}
      </Text>
    </View>
  );
}
```

### 7. Update `native/components/EpisodeCard.tsx` to show `SourceIcon`, `sourceName`, and `description`

Add the import at the top:
```typescript
import SourceIcon from "./SourceIcon";
```

Replace the author row and add description below the title block:

```tsx
{/* Title row — unchanged */}
<View className="flex-row items-start justify-between gap-2">
  <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={2}>
    {item.title}
  </Text>
  {isGenerating && (
    <View className="bg-amber-100 px-2 py-0.5 rounded-full self-start">
      <Text className="text-xs text-amber-700 font-medium">Generating</Text>
    </View>
  )}
</View>

{/* Source identity row — replaces bare author line */}
<View className="flex-row items-center gap-2 mt-1.5">
  {(item.sourceName || item.sourceDomain) && (
    <SourceIcon
      sourceName={item.sourceName}
      sourceDomain={item.sourceDomain}
      sourceBrandColor={item.sourceBrandColor}
      size={20}
      fontSize={9}
    />
  )}
  <Text className="text-sm text-gray-500" numberOfLines={1}>
    {item.sourceName ?? item.author ?? item.sourceType.toUpperCase()}
  </Text>
</View>

{/* Description preview */}
{item.description ? (
  <Text className="text-xs text-gray-400 mt-1 leading-4" numberOfLines={2}>
    {item.description}
  </Text>
) : null}
```

### 8. Update `UpNextCard` in `native/app/(tabs)/index.tsx` to show `SourceIcon`

Replace the source pill with `SourceIcon` + publisher name:

```tsx
import SourceIcon from "../../components/SourceIcon";

// Inside UpNextCard render, replace the source pill:
<View className="flex-row items-center gap-2 mt-1">
  <SourceIcon
    sourceName={item.sourceName}
    sourceDomain={item.sourceDomain}
    sourceBrandColor={item.sourceBrandColor}
    size={18}
    fontSize={8}
  />
  <Text className="text-xs font-medium text-gray-600">
    {item.sourceName ?? item.sourceType.toUpperCase()}
  </Text>
  <Text className="text-xs text-gray-400">{timeAgo(item.createdAt)}</Text>
</View>
```

## Files to Create/Modify

| File | Change |
|---|---|
| `native/lib/types.ts` | Add 5 identity fields to `LibraryItem` |
| `native/lib/db.ts` | Add `migrateV2` for identity columns, update `upsertEpisodes`, update row mappers in `getAllEpisodes` and `searchEpisodes` |
| `native/lib/sourceUtils.ts` | New — `extractDomain`, `deriveSourceIdentity`, `hashColor`, `KNOWN_SOURCES` |
| `native/lib/sync.ts` | Enrich items with derived identity before upserting |
| `native/components/SourceIcon.tsx` | New — branded circle component |
| `native/components/EpisodeCard.tsx` | Show `SourceIcon`, `sourceName`, `description` |
| `native/app/(tabs)/index.tsx` | Show `SourceIcon` in `UpNextCard` |

## Tests

**File:** `native/lib/__tests__/sourceUtils.test.ts` (new)

```typescript
import { describe, it, expect } from "@jest/globals";
import {
  extractDomain,
  deriveSourceIdentity,
  hashColor,
} from "../sourceUtils";

describe("extractDomain", () => {
  it("extracts registrable domain from a full URL", () => {
    expect(extractDomain("https://www.espn.com/mlb/story/123")).toBe("espn.com");
  });

  it("strips www subdomain", () => {
    expect(extractDomain("https://www.github.com/org/repo")).toBe("github.com");
  });

  it("handles URLs without www", () => {
    expect(extractDomain("https://arxiv.org/abs/2401.00001")).toBe("arxiv.org");
  });

  it("handles substack custom domains as-is (two-part)", () => {
    expect(extractDomain("https://astralcodexten.substack.com/p/post")).toBe(
      "substack.com",
    );
  });

  it("returns null for null input", () => {
    expect(extractDomain(null)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractDomain("")).toBeNull();
  });

  it("returns null for an unparseable URL", () => {
    expect(extractDomain("not a url at all")).toBeNull();
  });
});

describe("deriveSourceIdentity", () => {
  it("returns known name and brand color for espn.com", () => {
    const result = deriveSourceIdentity("https://www.espn.com/nba/story");
    expect(result.sourceName).toBe("ESPN");
    expect(result.sourceBrandColor).toBe("#C41230");
    expect(result.sourceDomain).toBe("espn.com");
  });

  it("returns known name and brand color for theverge.com", () => {
    const result = deriveSourceIdentity("https://www.theverge.com/2024/1/ai");
    expect(result.sourceName).toBe("The Verge");
    expect(result.sourceBrandColor).toBe("#2E1E5B");
  });

  it("returns title-cased domain name for unknown sources", () => {
    const result = deriveSourceIdentity("https://waitbutwhy.com/article");
    expect(result.sourceName).toBe("Waitbutwhy");
    expect(result.sourceBrandColor).toBeNull();
    expect(result.sourceDomain).toBe("waitbutwhy.com");
  });

  it("returns all nulls for null URL", () => {
    const result = deriveSourceIdentity(null);
    expect(result.sourceDomain).toBeNull();
    expect(result.sourceName).toBeNull();
    expect(result.sourceBrandColor).toBeNull();
  });
});

describe("hashColor", () => {
  it("returns a valid hex color string", () => {
    const color = hashColor("example.com");
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is deterministic for the same input", () => {
    expect(hashColor("waitbutwhy.com")).toBe(hashColor("waitbutwhy.com"));
  });

  it("produces different colors for different domains", () => {
    expect(hashColor("example.com")).not.toBe(hashColor("different.com"));
  });
});
```

**File:** `native/lib/__tests__/db-migration-v2.test.ts` (new)

```typescript
import { describe, it, expect } from "@jest/globals";
import { getDb, upsertEpisodes, getAllEpisodes } from "../db";

const IDENTITY_ITEM = {
  id: "content-identity-1",
  title: "Identity Test Episode",
  author: null,
  sourceType: "url",
  sourceUrl: "https://www.espn.com/nba/story/123",
  wordCount: 500,
  createdAt: new Date().toISOString(),
  versions: [],
  sourceIcon: null,
  sourceName: "ESPN",
  sourceDomain: "espn.com",
  sourceBrandColor: "#C41230",
  description: "LeBron James leads the Lakers in a dominant win.",
};

describe("db schema v2 — identity columns", () => {
  it("persists and retrieves identity fields correctly", async () => {
    await upsertEpisodes([IDENTITY_ITEM]);
    const items = await getAllEpisodes();
    const found = items.find((i) => i.id === "content-identity-1");

    expect(found).toBeDefined();
    expect(found?.sourceName).toBe("ESPN");
    expect(found?.sourceDomain).toBe("espn.com");
    expect(found?.sourceBrandColor).toBe("#C41230");
    expect(found?.description).toBe(
      "LeBron James leads the Lakers in a dominant win.",
    );
  });

  it("returns null for identity fields on pre-migration rows", async () => {
    // Simulate a row inserted without identity columns
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO episodes
         (content_id, title, author, source_type, source_url, word_count, created_at, json_versions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      "old-content-1", "Old Episode", null, "url", null, 100,
      new Date().toISOString(), "[]",
    );

    const items = await getAllEpisodes();
    const old = items.find((i) => i.id === "old-content-1");
    expect(old?.sourceName).toBeNull();
    expect(old?.sourceBrandColor).toBeNull();
  });
});
```

**File:** `native/components/__tests__/SourceIcon.test.tsx` (new)

```typescript
import React from "react";
import { render } from "@testing-library/react-native";
import { describe, it, expect } from "@jest/globals";
import SourceIcon from "../SourceIcon";

describe("SourceIcon", () => {
  it("renders the first letter of sourceName", () => {
    const { getByText } = render(
      <SourceIcon sourceName="ESPN" sourceDomain="espn.com" sourceBrandColor="#C41230" />,
    );
    expect(getByText("E")).toBeTruthy();
  });

  it("uses sourceBrandColor as background when provided", () => {
    const { getByText } = render(
      <SourceIcon sourceName="ESPN" sourceDomain="espn.com" sourceBrandColor="#C41230" />,
    );
    // Navigate up to the container View
    const letter = getByText("E");
    const container = letter.parent;
    expect(container?.props.style).toMatchObject({ backgroundColor: "#C41230" });
  });

  it("renders '?' when sourceName is null", () => {
    const { getByText } = render(
      <SourceIcon sourceName={null} sourceDomain={null} sourceBrandColor={null} />,
    );
    expect(getByText("?")).toBeTruthy();
  });

  it("uses gray fallback when both brand color and domain are null", () => {
    const { getByText } = render(
      <SourceIcon sourceName="Unknown" sourceDomain={null} sourceBrandColor={null} />,
    );
    const container = getByText("U").parent;
    expect(container?.props.style).toMatchObject({ backgroundColor: "#6B7280" });
  });

  it("accepts a custom size prop", () => {
    const { getByText } = render(
      <SourceIcon sourceName="HBR" sourceDomain="hbr.org" sourceBrandColor="#A51C30" size={48} />,
    );
    const container = getByText("H").parent;
    expect(container?.props.style).toMatchObject({ width: 48, height: 48, borderRadius: 24 });
  });
});
```

## Success Criteria

```bash
cd native
npx jest lib/__tests__/sourceUtils.test.ts
# 10 tests pass

npx jest lib/__tests__/db-migration-v2.test.ts
# 2 tests pass

npx jest components/__tests__/SourceIcon.test.tsx
# 5 tests pass

npx tsc --noEmit
# No type errors — all LibraryItem usages must provide or stub the 5 new fields
```

Manual verification:
- [ ] Library screen: episode cards show a small colored circle next to the source name
- [ ] ESPN episodes show a red (#C41230) circle with "E"
- [ ] Substack episodes show an orange (#FF6719) circle with "S"
- [ ] Unknown source (e.g. personal blog) shows a hash-derived color circle
- [ ] Episodes with null sourceName fall through to the sourceType badge gracefully
- [ ] Episodes with a description show 2-line preview text below the title
- [ ] Home screen Up Next cards show the SourceIcon instead of the source type pill
- [ ] Pull-to-refresh enriches existing episodes with identity data from the new sync logic
- [ ] Pre-migration rows (no identity columns) render without crashing

## Scope

Client-side data model and display only. The backend `GET /api/library` response does not need to provide the identity fields — `sync.ts` derives them locally from `sourceUrl`. If the backend later starts returning these fields, `sync.ts` will use the server values preferentially (per the `item.sourceDomain ? {} : deriveSourceIdentity(...)` guard). Favicon fetching (`sourceIcon`) is reserved — the field is stored but no favicon fetch logic is implemented here. Full AI-powered source identification and brand color extraction is a future backend feature. The `KNOWN_SOURCES` table is the interim solution.
