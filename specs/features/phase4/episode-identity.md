# Feature: Episode Identity Data Model

> Add source attribution to every episode — publisher name, domain, brand color, and a content preview — so the library, home screen, and future following system all have a shared identity layer to build on.

## Motivation

Every episode in the library currently shows a generic source-type badge ("URL", "PDF"). There is no way to tell at a glance that one URL episode is from ESPN, another from Substack, and a third from arXiv. The library redesign mockups (`docs/mockups/library/library-redesign-v2.html`), the homepage redesign, and the proposed following system all assume a richer identity layer exists. Without it, those features cannot be built.

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

### 1. Update `LibraryItem` in `native/lib/types.ts`

**Diff:**

```diff
 export interface LibraryItem {
   id: string; // contentId
   title: string;
   author: string | null;
   sourceType: string;
   sourceUrl: string | null;
   createdAt: string;
   wordCount: number;
   versions: AudioVersion[];
+  // --- Episode identity fields (all nullable for backward compat) ---
+  sourceIcon: string | null;        // favicon URL or null
+  sourceName: string | null;        // e.g. "ESPN", "Substack"
+  sourceDomain: string | null;      // e.g. "espn.com"
+  sourceBrandColor: string | null;  // e.g. "#C41230"
+  description: string | null;       // first ~200 chars of content or AI summary
 }
```

All five new fields are `| null` — existing rows synced before this update will simply render the fallback states.

### 2. Update `native/lib/db.ts` (complete file shown with all changes)

Changes:
- `migrate()` calls a new `migrateV2()` that adds the five identity columns with `ALTER TABLE ADD COLUMN`
- `upsertEpisodes()` includes the five new columns in the `INSERT OR REPLACE`
- `getAllEpisodes()` and `searchEpisodes()` read the new columns and map them to the returned objects

```typescript
import * as SQLite from "expo-sqlite";
import type { LibraryItem, AudioVersion, PlaybackState } from "./types";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("ridecast.db");
  await migrate(_db);
  return _db;
}

export function setDb(db: SQLite.SQLiteDatabase) {
  _db = db;
}

async function migrate(db: SQLite.SQLiteDatabase) {
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
    "ALTER TABLE episodes ADD COLUMN source_icon        TEXT",
    "ALTER TABLE episodes ADD COLUMN source_name        TEXT",
    "ALTER TABLE episodes ADD COLUMN source_domain      TEXT",
    "ALTER TABLE episodes ADD COLUMN source_brand_color TEXT",
    "ALTER TABLE episodes ADD COLUMN description        TEXT",
  ];

  for (const stmt of newColumns) {
    try {
      await db.execAsync(stmt);
    } catch {
      // Column already exists — safe to ignore
    }
  }
}

// --- Episodes (library cache) ---

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
      item.sourceIcon ?? null,
      item.sourceName ?? null,
      item.sourceDomain ?? null,
      item.sourceBrandColor ?? null,
      item.description ?? null,
    );
  }
}

export async function getAllEpisodes(): Promise<LibraryItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    content_id: string;
    title: string;
    author: string | null;
    source_type: string;
    source_url: string | null;
    word_count: number;
    created_at: string;
    json_versions: string;
    source_icon: string | null;
    source_name: string | null;
    source_domain: string | null;
    source_brand_color: string | null;
    description: string | null;
  }>("SELECT * FROM episodes ORDER BY created_at DESC");

  return rows.map((row) => ({
    id: row.content_id,
    title: row.title,
    author: row.author,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    wordCount: row.word_count,
    createdAt: row.created_at,
    versions: JSON.parse(row.json_versions) as AudioVersion[],
    sourceIcon: row.source_icon,
    sourceName: row.source_name,
    sourceDomain: row.source_domain,
    sourceBrandColor: row.source_brand_color,
    description: row.description,
  }));
}

export async function searchEpisodes(query: string): Promise<LibraryItem[]> {
  const db = await getDb();
  const pattern = `%${query}%`;
  const rows = await db.getAllAsync<{
    content_id: string;
    title: string;
    author: string | null;
    source_type: string;
    source_url: string | null;
    word_count: number;
    created_at: string;
    json_versions: string;
    source_icon: string | null;
    source_name: string | null;
    source_domain: string | null;
    source_brand_color: string | null;
    description: string | null;
  }>(
    "SELECT * FROM episodes WHERE title LIKE ? OR author LIKE ? ORDER BY created_at DESC",
    pattern,
    pattern,
  );

  return rows.map((row) => ({
    id: row.content_id,
    title: row.title,
    author: row.author,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    wordCount: row.word_count,
    createdAt: row.created_at,
    versions: JSON.parse(row.json_versions) as AudioVersion[],
    sourceIcon: row.source_icon,
    sourceName: row.source_name,
    sourceDomain: row.source_domain,
    sourceBrandColor: row.source_brand_color,
    description: row.description,
  }));
}

// --- Playback positions ---

export async function getLocalPlayback(audioId: string): Promise<PlaybackState | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    audio_id: string;
    position: number;
    speed: number;
    completed: number;
    updated_at: string;
  }>("SELECT * FROM playback WHERE audio_id = ?", audioId);

  if (!row) return null;
  return {
    audioId: row.audio_id,
    position: row.position,
    speed: row.speed,
    completed: row.completed === 1,
    updatedAt: row.updated_at,
  };
}

export async function saveLocalPlayback(state: {
  audioId: string;
  position?: number;
  speed?: number;
  completed?: boolean;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO playback (audio_id, position, speed, completed, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(audio_id) DO UPDATE SET
       position = COALESCE(excluded.position, playback.position),
       speed = COALESCE(excluded.speed, playback.speed),
       completed = COALESCE(excluded.completed, playback.completed),
       updated_at = excluded.updated_at`,
    state.audioId,
    state.position ?? 0,
    state.speed ?? 1.0,
    state.completed ? 1 : 0,
    now,
  );
}

export async function getAllLocalPlayback(): Promise<PlaybackState[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    audio_id: string;
    position: number;
    speed: number;
    completed: number;
    updated_at: string;
  }>("SELECT * FROM playback");

  return rows.map((row) => ({
    audioId: row.audio_id,
    position: row.position,
    speed: row.speed,
    completed: row.completed === 1,
    updatedAt: row.updated_at,
  }));
}

// --- Downloads ---

export async function recordDownload(audioId: string, localPath: string, sizeBytes: number) {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO downloads (audio_id, local_path, size_bytes)
     VALUES (?, ?, ?)`,
    audioId,
    localPath,
    sizeBytes,
  );
}

export async function getDownloadPath(audioId: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ local_path: string }>(
    "SELECT local_path FROM downloads WHERE audio_id = ?",
    audioId,
  );
  return row?.local_path ?? null;
}

export async function getStorageInfo(): Promise<{ count: number; totalBytes: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number; total: number }>(
    "SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total FROM downloads",
  );
  return { count: row?.count ?? 0, totalBytes: row?.total ?? 0 };
}

export async function deleteDownloadRecord(audioId: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM downloads WHERE audio_id = ?", audioId);
}

export async function deleteEpisode(
  contentId: string,
  audioIds: string[],
): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM episodes WHERE content_id = ?", contentId);
  for (const audioId of audioIds) {
    await db.runAsync("DELETE FROM playback WHERE audio_id = ?", audioId);
    await db.runAsync("DELETE FROM downloads WHERE audio_id = ?", audioId);
  }
}
```

> The `deleteEpisode` function at the bottom is included here for completeness — it is specified separately in the `delete-episodes` spec.

### 3. Create `native/lib/sourceUtils.ts` (new file)

```typescript
/**
 * Known source publishers with display name and brand color.
 * Add entries here as new publishers are onboarded.
 */
const KNOWN_SOURCES: Record<string, { name: string; color: string }> = {
  "espn.com":        { name: "ESPN",        color: "#C41230" },
  "substack.com":    { name: "Substack",    color: "#FF6719" },
  "github.com":      { name: "GitHub",      color: "#24292F" },
  "hbr.org":         { name: "HBR",         color: "#A51C30" },
  "arxiv.org":       { name: "arXiv",       color: "#46A89B" },
  "theverge.com":    { name: "The Verge",   color: "#2E1E5B" },
  "nytimes.com":     { name: "NYT",         color: "#000000" },
  "bloomberg.com":   { name: "Bloomberg",   color: "#1F6FEB" },
  "medium.com":      { name: "Medium",      color: "#000000" },
  "wired.com":       { name: "WIRED",       color: "#000000" },
  "techcrunch.com":  { name: "TechCrunch",  color: "#0A8D35" },
  "arstechnica.com": { name: "Ars Technica",color: "#FF4E00" },
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

### 4. Update `native/lib/sync.ts` (complete file)

**Diff:**

```diff
 import * as api from "./api";
 import * as db from "./db";
 import { downloadEpisodeAudio } from "./downloads";
+import { deriveSourceIdentity } from "./sourceUtils";
 import type { LibraryItem } from "./types";

 export async function syncLibrary(): Promise<LibraryItem[]> {
   const serverItems = await api.fetchLibrary();
-  await db.upsertEpisodes(serverItems);
+
+  // Enrich each item with derived identity fields before storing.
+  // If the server already provides sourceDomain, use it as-is.
+  // Otherwise derive from sourceUrl client-side.
+  const enrichedItems: LibraryItem[] = serverItems.map((item) => {
+    const derived = item.sourceDomain
+      ? {} // server already populated — don't overwrite
+      : deriveSourceIdentity(item.sourceUrl);
+
+    return {
+      ...item,
+      sourceIcon:       item.sourceIcon       ?? null,
+      sourceName:       item.sourceName       ?? derived.sourceName       ?? null,
+      sourceDomain:     item.sourceDomain     ?? derived.sourceDomain     ?? null,
+      sourceBrandColor: item.sourceBrandColor ?? derived.sourceBrandColor ?? null,
+      description:      item.description      ?? null,
+    };
+  });
+
+  await db.upsertEpisodes(enrichedItems);

-  for (const item of serverItems) {
+  for (const item of enrichedItems) {
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

-  return serverItems;
+  return enrichedItems;
 }

 export async function syncPlayback(): Promise<void> {
   // ... unchanged
```

Full `syncLibrary` function for copy-paste:

```typescript
import * as api from "./api";
import * as db from "./db";
import { downloadEpisodeAudio } from "./downloads";
import { deriveSourceIdentity } from "./sourceUtils";
import type { LibraryItem } from "./types";

export async function syncLibrary(): Promise<LibraryItem[]> {
  const serverItems = await api.fetchLibrary();

  // Enrich each item with derived identity fields before storing.
  // Server-provided fields take priority; derive from sourceUrl as fallback.
  const enrichedItems: LibraryItem[] = serverItems.map((item) => {
    const derived = item.sourceDomain
      ? {} // server already populated — don't overwrite
      : deriveSourceIdentity(item.sourceUrl);

    return {
      ...item,
      sourceIcon:       item.sourceIcon       ?? null,
      sourceName:       item.sourceName       ?? (derived as Partial<typeof derived>).sourceName       ?? null,
      sourceDomain:     item.sourceDomain     ?? (derived as Partial<typeof derived>).sourceDomain     ?? null,
      sourceBrandColor: item.sourceBrandColor ?? (derived as Partial<typeof derived>).sourceBrandColor ?? null,
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
```

> The `syncPlayback` function is unchanged — copy it from the current `sync.ts` verbatim.

### 5. Create `native/components/SourceIcon.tsx` (new file)

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
  /** Font size for the initial letter. Default: 15 */
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

### 6. Update `native/components/EpisodeCard.tsx`

**Diff** — add import:

```diff
+import SourceIcon from "./SourceIcon";
 import type { AudioVersion, LibraryItem, PlayableItem } from "../lib/types";
```

**Diff** — replace the `{/* Author */}` block with the identity row + description:

```diff
-        {/* Author */}
-        {item.author ? (
-          <Text className="text-sm text-gray-500 mt-0.5" numberOfLines={1}>
-            {item.author}
-          </Text>
-        ) : null}
+        {/* Source identity row — replaces bare author line */}
+        <View className="flex-row items-center gap-2 mt-1.5">
+          {(item.sourceName || item.sourceDomain) && (
+            <SourceIcon
+              sourceName={item.sourceName}
+              sourceDomain={item.sourceDomain}
+              sourceBrandColor={item.sourceBrandColor}
+              size={20}
+              fontSize={9}
+            />
+          )}
+          <Text className="text-sm text-gray-500" numberOfLines={1}>
+            {item.sourceName ?? item.author ?? item.sourceType.toUpperCase()}
+          </Text>
+        </View>
+
+        {/* Description preview */}
+        {item.description ? (
+          <Text className="text-xs text-gray-400 mt-1 leading-4" numberOfLines={2}>
+            {item.description}
+          </Text>
+        ) : null}
```

### 7. Update `UpNextCard` in `native/app/(tabs)/index.tsx`

**Diff** — add import:

```diff
+import SourceIcon from "../../components/SourceIcon";
 import { getUnlistenedItems, libraryItemToPlayable } from "../../lib/libraryHelpers";
```

**Diff** — replace the source pill in `UpNextCard` with `SourceIcon` + publisher name:

```diff
         <View className="flex-row items-center gap-2 mt-1">
-          {/* Source pill */}
-          <View
-            className="px-2 py-0.5 rounded-full"
-            style={{ backgroundColor: sourcePillBg(item.sourceType) }}
-          >
-            <Text className="text-xs font-medium text-gray-700">
-              {item.sourceType.toUpperCase()}
-            </Text>
-          </View>
-          {/* Time ago */}
-          <Text className="text-xs text-gray-400">{timeAgo(item.createdAt)}</Text>
+          <SourceIcon
+            sourceName={item.sourceName}
+            sourceDomain={item.sourceDomain}
+            sourceBrandColor={item.sourceBrandColor}
+            size={18}
+            fontSize={8}
+          />
+          <Text className="text-xs font-medium text-gray-600">
+            {item.sourceName ?? item.sourceType.toUpperCase()}
+          </Text>
+          <Text className="text-xs text-gray-400">{timeAgo(item.createdAt)}</Text>
         </View>
```

> The `sourcePillBg` helper and `SOURCE_COLOR` constant in `index.tsx` can be removed after this change since the source pill is no longer rendered. Leave them if any other component references them, otherwise delete.

## Files to Create/Modify

| File | Change |
|---|---|
| `native/lib/types.ts` | Add 5 identity fields to `LibraryItem` |
| `native/lib/db.ts` | Add `migrateV2` for identity columns; update `upsertEpisodes`, `getAllEpisodes`, `searchEpisodes` |
| `native/lib/sourceUtils.ts` | New — `extractDomain`, `deriveSourceIdentity`, `hashColor`, `KNOWN_SOURCES` |
| `native/lib/sync.ts` | Import `deriveSourceIdentity`; enrich items before upserting; return enriched items |
| `native/components/SourceIcon.tsx` | New — branded circle component |
| `native/components/EpisodeCard.tsx` | Import `SourceIcon`; replace author line with identity row; add description preview |
| `native/app/(tabs)/index.tsx` | Import `SourceIcon`; replace source pill in `UpNextCard` with `SourceIcon` + publisher name |

## Tests

**File:** `native/lib/__tests__/sourceUtils.test.ts` (new)

```typescript
import { describe, it, expect } from "@jest/globals";
import { extractDomain, deriveSourceIdentity, hashColor } from "../sourceUtils";

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

  it("collapses substack custom domain to substack.com", () => {
    expect(extractDomain("https://astralcodexten.substack.com/p/post")).toBe("substack.com");
  });

  it("returns null for null input", () => {
    expect(extractDomain(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractDomain("")).toBeNull();
  });

  it("returns null for an unparseable string", () => {
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

  it("returns known name and brand color for arxiv.org", () => {
    const result = deriveSourceIdentity("https://arxiv.org/abs/2401.00001");
    expect(result.sourceName).toBe("arXiv");
    expect(result.sourceBrandColor).toBe("#46A89B");
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

  it("returns all nulls for undefined URL", () => {
    const result = deriveSourceIdentity(undefined);
    expect(result.sourceDomain).toBeNull();
  });
});

describe("hashColor", () => {
  it("returns a valid 6-digit hex color string", () => {
    expect(hashColor("example.com")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("is deterministic — same input always produces same output", () => {
    expect(hashColor("waitbutwhy.com")).toBe(hashColor("waitbutwhy.com"));
    expect(hashColor("example.com")).toBe(hashColor("example.com"));
  });

  it("produces different colors for different domains", () => {
    expect(hashColor("example.com")).not.toBe(hashColor("different.com"));
  });

  it("handles empty string without throwing", () => {
    expect(() => hashColor("")).not.toThrow();
    expect(hashColor("")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
```

**File:** `native/lib/__tests__/db-migration-v2.test.ts` (new)

```typescript
import { describe, it, expect } from "@jest/globals";
import { getDb, upsertEpisodes, getAllEpisodes } from "../db";
import type { LibraryItem } from "../types";

const IDENTITY_ITEM: LibraryItem = {
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
    expect(found?.description).toBe("LeBron James leads the Lakers in a dominant win.");
    expect(found?.sourceIcon).toBeNull();
  });

  it("upsert overwrites identity fields on repeat calls", async () => {
    await upsertEpisodes([IDENTITY_ITEM]);
    await upsertEpisodes([{ ...IDENTITY_ITEM, sourceName: "ESPN Updated" }]);
    const items = await getAllEpisodes();
    const found = items.find((i) => i.id === "content-identity-1");
    expect(found?.sourceName).toBe("ESPN Updated");
  });

  it("returns null for identity fields on pre-migration rows", async () => {
    // Simulate a row inserted without identity columns (pre-v2)
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO episodes
         (content_id, title, author, source_type, source_url, word_count, created_at, json_versions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      "old-content-1",
      "Old Episode",
      null,
      "url",
      null,
      100,
      new Date().toISOString(),
      "[]",
    );

    const items = await getAllEpisodes();
    const old = items.find((i) => i.id === "old-content-1");
    expect(old).toBeDefined();
    expect(old?.sourceName).toBeNull();
    expect(old?.sourceBrandColor).toBeNull();
    expect(old?.description).toBeNull();
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
    const letter = getByText("E");
    const container = letter.parent;
    expect(container?.props.style).toMatchObject({ backgroundColor: "#C41230" });
  });

  it("uses hashColor when sourceBrandColor is null but domain is provided", () => {
    const { getByText } = render(
      <SourceIcon sourceName="Waitbutwhy" sourceDomain="waitbutwhy.com" sourceBrandColor={null} />,
    );
    const container = getByText("W").parent;
    // Must be a hex color that is not the gray fallback
    expect(container?.props.style.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(container?.props.style.backgroundColor).not.toBe("#6B7280");
  });

  it("uses gray fallback when both brand color and domain are null", () => {
    const { getByText } = render(
      <SourceIcon sourceName="Unknown" sourceDomain={null} sourceBrandColor={null} />,
    );
    const container = getByText("U").parent;
    expect(container?.props.style).toMatchObject({ backgroundColor: "#6B7280" });
  });

  it("renders '?' when sourceName is null", () => {
    const { getByText } = render(
      <SourceIcon sourceName={null} sourceDomain={null} sourceBrandColor={null} />,
    );
    expect(getByText("?")).toBeTruthy();
  });

  it("accepts a custom size prop and applies it to the circle", () => {
    const { getByText } = render(
      <SourceIcon sourceName="HBR" sourceDomain="hbr.org" sourceBrandColor="#A51C30" size={48} />,
    );
    const container = getByText("H").parent;
    expect(container?.props.style).toMatchObject({ width: 48, height: 48, borderRadius: 24 });
  });

  it("renders uppercase letter even when sourceName is lowercase", () => {
    const { getByText } = render(
      <SourceIcon sourceName="example" sourceDomain="example.com" sourceBrandColor={null} />,
    );
    expect(getByText("E")).toBeTruthy();
  });
});
```

## Success Criteria

```bash
cd native
npx jest lib/__tests__/sourceUtils.test.ts
# 13 tests pass

npx jest lib/__tests__/db-migration-v2.test.ts
# 3 tests pass

npx jest components/__tests__/SourceIcon.test.tsx
# 7 tests pass

npx tsc --noEmit
# No type errors — all LibraryItem usages must provide or stub the 5 new fields
```

Manual verification:
- [ ] Library screen: episode cards show a small colored circle (20px) next to the source name
- [ ] ESPN episodes: red (#C41230) circle with "E", text shows "ESPN"
- [ ] Substack episodes: orange (#FF6719) circle with "S", text shows "Substack"
- [ ] Unknown source (e.g. personal blog): hash-derived color circle, text shows title-cased domain
- [ ] Episodes with null sourceName fall through to `item.author` then `sourceType.toUpperCase()` gracefully
- [ ] Episodes with a description show 2-line preview text below the identity row
- [ ] Home screen Up Next cards show SourceIcon instead of the colored source type pill
- [ ] Pull-to-refresh enriches existing episodes with identity data from the new sync logic
- [ ] Pre-migration rows (no identity columns) render without crashing — fallback to gray circle

## Scope

Client-side data model and display only. The backend `GET /api/library` response does not need to provide the identity fields — `sync.ts` derives them locally from `sourceUrl`. If the backend later returns these fields, `sync.ts` uses the server values preferentially (per the `item.sourceDomain ? {} : deriveSourceIdentity(...)` guard). Favicon fetching (`sourceIcon`) is reserved — the field is stored but no fetch logic is implemented here. Full AI-powered source identification and brand color extraction is a future backend feature. The `KNOWN_SOURCES` table is the interim solution. No changes to `PlayableItem` — this spec is purely about `LibraryItem` and its storage.
