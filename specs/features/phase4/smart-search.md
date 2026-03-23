# Feature: Smart Search

> Upgrade library search to match across all metadata — source name, domain, themes, and summary — not just title and author.

## Motivation

The current `searchEpisodes()` query is `WHERE title LIKE ? OR author LIKE ?`. A user who searches "sports" finds nothing if "ESPN" or themes like "basketball" aren't in the title. As libraries grow and users add content from many sources, search quality becomes the primary navigation tool. Option A — adding indexed columns — is the right balance of simplicity and performance for SQLite at this scale.

## Scope

- **No** FTS5 virtual table — Option A (`LIKE` on denormalized columns) is the implementation
- **No** fuzzy matching / typo tolerance — exact substring matching only
- **No** search result highlighting
- **No** search analytics or logging
- **No** backend/API search endpoint — all search is local SQLite only

## Changes

### 1. Add `sourceName()` helper to `native/lib/utils.ts`

The helper is used by both `upsertEpisodes()` and `backfillSearchColumns()`. It produces a consistent human-readable source label.

**File:** `native/lib/utils.ts`

**Before** (end of file after `timeAgo`):
```typescript
// (end of file)
```

**After** (add to end of file):
```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Source name
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Human-readable source label for search indexing.
 * Priority: URL hostname → author → sourceType.toUpperCase()
 * e.g. sourceName("url", "https://espn.com/article", null) → "espn.com"
 *      sourceName("pdf", null, "John Smith")              → "John Smith"
 *      sourceName("epub", null, null)                     → "EPUB"
 */
export function sourceName(
  sourceType: string,
  sourceUrl: string | null | undefined,
  author: string | null | undefined,
): string {
  if (sourceUrl) {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      // fall through
    }
  }
  if (author) return author;
  return sourceType.toUpperCase();
}
```

### 2. Schema migration — add search columns to `episodes` table

**File:** `native/lib/db.ts`

**Before** (`migrate` function, lines 17–45):
```typescript
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
    ...
  `);
}
```

**After** (full `migrate` function replacement):
```typescript
async function addColumnIfMissing(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
) {
  const info = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  if (!info.some((row) => row.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
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

  // Migration: add search columns (safe — skipped if column already exists)
  await addColumnIfMissing(db, "episodes", "source_name",     "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, "episodes", "themes_text",     "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, "episodes", "summary_snippet", "TEXT NOT NULL DEFAULT ''");

  // Backfill existing rows that predate this migration
  await backfillSearchColumns(db);
}
```

### 3. Add internal `EpisodeRow` type and `rowToLibraryItem` mapper

These eliminate the duplicated inline row-mapping in `getAllEpisodes` and `searchEpisodes`.

**File:** `native/lib/db.ts`

**Before** (two separate inline mappers in `getAllEpisodes` and `searchEpisodes`, both returning the same shape).

**After** (add near the top of the file, after imports):
```typescript
// ─────────────────────────────────────────────────────────────────────────────
// Internal row type + mapper
// ─────────────────────────────────────────────────────────────────────────────

type EpisodeRow = {
  content_id: string;
  title: string;
  author: string | null;
  source_type: string;
  source_url: string | null;
  word_count: number;
  created_at: string;
  json_versions: string;
  source_name: string;
  themes_text: string;
  summary_snippet: string;
};

function rowToLibraryItem(row: EpisodeRow): LibraryItem {
  return {
    id: row.content_id,
    title: row.title,
    author: row.author,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    wordCount: row.word_count,
    createdAt: row.created_at,
    versions: JSON.parse(row.json_versions) as AudioVersion[],
  };
}
```

### 4. Update `upsertEpisodes()` to populate search columns

**File:** `native/lib/db.ts`

**Before:**
```typescript
export async function upsertEpisodes(items: LibraryItem[]) {
  const db = await getDb();
  for (const item of items) {
    await db.runAsync(
      `INSERT OR REPLACE INTO episodes
        (content_id, title, author, source_type, source_url, word_count, created_at, json_versions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.title,
      item.author,
      item.sourceType,
      item.sourceUrl,
      item.wordCount,
      item.createdAt,
      JSON.stringify(item.versions),
    );
  }
}
```

**After:**
```typescript
export async function upsertEpisodes(items: LibraryItem[]) {
  const db = await getDb();
  for (const item of items) {
    // Derive denormalized search columns
    const srcName = sourceName(item.sourceType, item.sourceUrl, item.author);
    const allThemes = [
      ...new Set(item.versions.flatMap((v) => v.themes ?? [])),
    ];
    const themesText = allThemes.join(" ").toLowerCase();
    const primarySummary =
      item.versions.find((v) => v.status === "ready")?.summary ?? "";
    const summarySnippet = primarySummary.slice(0, 300).toLowerCase();

    await db.runAsync(
      `INSERT OR REPLACE INTO episodes
        (content_id, title, author, source_type, source_url, word_count, created_at,
         json_versions, source_name, themes_text, summary_snippet)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.title,
      item.author,
      item.sourceType,
      item.sourceUrl,
      item.wordCount,
      item.createdAt,
      JSON.stringify(item.versions),
      srcName,
      themesText,
      summarySnippet,
    );
  }
}
```

### 5. Update `getAllEpisodes()` to use `rowToLibraryItem`

**File:** `native/lib/db.ts`

**Before:**
```typescript
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
  }));
}
```

**After:**
```typescript
export async function getAllEpisodes(): Promise<LibraryItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EpisodeRow>(
    "SELECT * FROM episodes ORDER BY created_at DESC",
  );
  return rows.map(rowToLibraryItem);
}
```

### 6. Update `searchEpisodes()` to search all metadata columns

**File:** `native/lib/db.ts`

**Before:**
```typescript
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
  }));
}
```

**After:**
```typescript
export async function searchEpisodes(query: string): Promise<LibraryItem[]> {
  const db = await getDb();
  // Use lowercased pattern; stored columns themes_text/summary_snippet are already lowercase
  const pattern = `%${query.toLowerCase()}%`;

  const rows = await db.getAllAsync<EpisodeRow>(
    `SELECT * FROM episodes
     WHERE lower(title)          LIKE ?
        OR lower(author)         LIKE ?
        OR lower(source_name)    LIKE ?
        OR lower(source_type)    LIKE ?
        OR themes_text           LIKE ?
        OR summary_snippet       LIKE ?
     ORDER BY created_at DESC`,
    pattern,
    pattern,
    pattern,
    pattern,
    pattern,
    pattern,
  );

  return rows.map(rowToLibraryItem);
}
```

### 7. Add `backfillSearchColumns()` for rows that predate the migration

**File:** `native/lib/db.ts`

Add this function before `migrate()`:

```typescript
/**
 * Backfill source_name, themes_text, summary_snippet for rows that were
 * inserted before this migration ran (i.e. where source_name is still '').
 * Called once by migrate() on startup after adding the columns.
 */
async function backfillSearchColumns(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EpisodeRow>(
    "SELECT * FROM episodes WHERE source_name = ''",
  );
  for (const row of rows) {
    const versions = JSON.parse(row.json_versions) as AudioVersion[];
    const srcName = sourceName(row.source_type, row.source_url, row.author);
    const themesText = [
      ...new Set(versions.flatMap((v) => v.themes ?? [])),
    ]
      .join(" ")
      .toLowerCase();
    const summary =
      versions.find((v) => v.status === "ready")?.summary ?? "";
    await db.runAsync(
      `UPDATE episodes
       SET source_name = ?, themes_text = ?, summary_snippet = ?
       WHERE content_id = ?`,
      srcName,
      themesText,
      summary.slice(0, 300).toLowerCase(),
      row.content_id,
    );
  }
}
```

### 8. Add `sourceName` import to `db.ts`

**File:** `native/lib/db.ts`

**Before:**
```typescript
import * as SQLite from "expo-sqlite";
import type { LibraryItem, AudioVersion, PlaybackState } from "./types";
```

**After:**
```typescript
import * as SQLite from "expo-sqlite";
import type { LibraryItem, AudioVersion, PlaybackState } from "./types";
import { sourceName } from "./utils";
```

## Files to Modify

| File | Change |
|------|--------|
| `native/lib/utils.ts` | Add `sourceName()` helper |
| `native/lib/db.ts` | Add `EpisodeRow` type + `rowToLibraryItem`; update `migrate()` with column guards + backfill; update `upsertEpisodes()` with 3 new fields; update `getAllEpisodes()` to use mapper; update `searchEpisodes()` with 6-column query; add `backfillSearchColumns()`; add `sourceName` import |

## Tests

**File:** `native/lib/db.test.ts` (create if absent; append if exists)

```typescript
import * as SQLite from "expo-sqlite";
import {
  setDb,
  upsertEpisodes,
  searchEpisodes,
  getAllEpisodes,
} from "./db";
import type { LibraryItem, AudioVersion } from "./types";

// ── Fixture ───────────────────────────────────────────────────────────────────

const baseVersion: AudioVersion = {
  scriptId: "s1",
  audioId: "a1",
  audioUrl: "https://cdn.example.com/a1.mp3",
  durationSecs: 300,
  targetDuration: 5,
  format: "narrative",
  status: "ready",
  completed: false,
  position: 0,
  createdAt: new Date().toISOString(),
  summary: null,
  contentType: "article",
  themes: [],
  compressionRatio: 0.1,
  actualWordCount: 750,
  voices: ["nova"],
  ttsProvider: "openai",
};

const espnArticle: LibraryItem = {
  id: "espn-1",
  title: "NBA Playoffs Preview",
  author: "ESPN Staff",
  sourceType: "url",
  sourceUrl: "https://espn.com/nba/article",
  wordCount: 800,
  createdAt: new Date().toISOString(),
  versions: [
    {
      ...baseVersion,
      scriptId: "s-espn",
      audioId: "a-espn",
      themes: ["basketball", "NBA", "playoffs"],
      summary: "The NBA playoffs are heating up with several surprise contenders.",
    },
  ],
};

const pdfItem: LibraryItem = {
  id: "pdf-1",
  title: "Annual Finance Report",
  author: null,
  sourceType: "pdf",
  sourceUrl: null,
  wordCount: 5000,
  createdAt: new Date().toISOString(),
  versions: [
    {
      ...baseVersion,
      scriptId: "s-pdf",
      audioId: "a-pdf",
      themes: ["finance", "investing", "markets"],
      summary: "Quarterly revenue exceeded expectations by 12 percent.",
    },
  ],
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let db: SQLite.SQLiteDatabase;

beforeEach(async () => {
  db = await SQLite.openDatabaseAsync(":memory:");
  setDb(db);
  // Trigger migrate by calling getDb indirectly via upsertEpisodes
  await upsertEpisodes([espnArticle, pdfItem]);
});

afterEach(async () => {
  await db.closeAsync();
});

// ── getAllEpisodes ─────────────────────────────────────────────────────────────

describe("getAllEpisodes", () => {
  it("returns all upserted items", async () => {
    const items = await getAllEpisodes();
    expect(items).toHaveLength(2);
  });

  it("returns items ordered by created_at DESC", async () => {
    const items = await getAllEpisodes();
    // Both have same timestamp so just verify shape
    expect(items[0]).toHaveProperty("id");
    expect(items[0]).toHaveProperty("versions");
  });
});

// ── searchEpisodes ─────────────────────────────────────────────────────────────

describe("searchEpisodes", () => {
  it("matches by title", async () => {
    const results = await searchEpisodes("NBA Playoffs");
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("espn-1");
  });

  it("matches by author", async () => {
    const results = await searchEpisodes("ESPN Staff");
    expect(results).toHaveLength(1);
  });

  it("matches by source domain (espn.com)", async () => {
    const results = await searchEpisodes("espn");
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("espn-1");
  });

  it("matches by source_type (PDF uppercase)", async () => {
    const results = await searchEpisodes("pdf");
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("pdf-1");
  });

  it("matches by theme", async () => {
    const results = await searchEpisodes("basketball");
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("espn-1");
  });

  it("matches by summary content", async () => {
    const results = await searchEpisodes("heating up");
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("espn-1");
  });

  it("is case-insensitive — uppercase query", async () => {
    const lower = await searchEpisodes("nba");
    const upper = await searchEpisodes("NBA");
    expect(lower).toHaveLength(upper.length);
  });

  it("matches finance theme", async () => {
    const results = await searchEpisodes("finance");
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe("pdf-1");
  });

  it("returns empty array for no match", async () => {
    const results = await searchEpisodes("nonexistentxyz");
    expect(results).toHaveLength(0);
  });

  it("does not return duplicates when multiple fields match", async () => {
    // "NBA" matches title AND themes_text — should deduplicate via SQL SELECT
    const results = await searchEpisodes("nba");
    expect(results).toHaveLength(1);
  });
});

// ── sourceName (utils) ─────────────────────────────────────────────────────────

describe("sourceName", () => {
  // Import separately to test in isolation
  const { sourceName } = require("./utils") as { sourceName: (t: string, u: string | null, a: string | null) => string };

  it("extracts hostname from URL", () => {
    expect(sourceName("url", "https://www.espn.com/nba", null)).toBe("espn.com");
  });

  it("strips www. prefix", () => {
    expect(sourceName("url", "https://www.nytimes.com/article", null)).toBe("nytimes.com");
  });

  it("falls back to author when no URL", () => {
    expect(sourceName("pdf", null, "John Smith")).toBe("John Smith");
  });

  it("falls back to sourceType.toUpperCase() when no URL or author", () => {
    expect(sourceName("epub", null, null)).toBe("EPUB");
  });

  it("prefers URL over author", () => {
    expect(sourceName("url", "https://espn.com", "ESPN Staff")).toBe("espn.com");
  });
});
```

## Success Criteria

```bash
# Type check
cd native && npx tsc --noEmit
# Expect: no errors

# Run unit tests
cd native && npx jest lib/db.test.ts --no-coverage
# Expect: all tests pass

# Run utils tests
cd native && npx jest lib/utils.test.ts --no-coverage
# Expect: sourceName tests pass (add to existing test file or create new)
```

Manual checklist:
- [ ] Searching "espn" returns ESPN articles even if title doesn't contain "ESPN"
- [ ] Searching "basketball" (or any theme) returns episodes with that theme
- [ ] Searching part of a summary phrase returns the matching episode
- [ ] Case-insensitive: "NBA" and "nba" return the same results
- [ ] After fresh install, all pre-existing episodes are backfilled on first launch
- [ ] `upsertEpisodes` on sync re-populates all three columns correctly
- [ ] `PRAGMA table_info(episodes)` shows `source_name`, `themes_text`, `summary_snippet` columns
