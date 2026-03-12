# Feature: Smart Search

> Upgrade library search to match across all metadata — source name, domain, themes, and summary — not just title and author.

## Motivation

The current `searchEpisodes()` query is `WHERE title LIKE ? OR author LIKE ?`. A user who searches "sports" finds nothing if "ESPN" or themes like "basketball" aren't in the title. As libraries grow and users add content from many sources, search quality becomes the primary navigation tool. Option A — adding indexed columns — is the right balance of simplicity and performance for SQLite at this scale.

## Changes

### 1. Schema migration — add search columns to `episodes` table

Add two new columns to the `episodes` table:
- `source_name TEXT` — the human-readable source (domain or author), e.g. `"espn.com"`, `"John Smith"`, `"PDF"`
- `themes_text TEXT` — space-joined themes for full-text-like matching, e.g. `"basketball sports NBA playoffs"`
- `summary_snippet TEXT` — first 300 chars of the primary version's summary (optional but useful)

These are derived/denormalized columns — computed at upsert time from existing data.

```typescript
// In migrate() in native/lib/db.ts — add migration guard
await db.execAsync(`
  -- Migration: add search columns (safe to run multiple times)
  ALTER TABLE episodes ADD COLUMN source_name    TEXT NOT NULL DEFAULT '';
  ALTER TABLE episodes ADD COLUMN themes_text    TEXT NOT NULL DEFAULT '';
  ALTER TABLE episodes ADD COLUMN summary_snippet TEXT NOT NULL DEFAULT '';
`);
```

> SQLite `ALTER TABLE ADD COLUMN` is idempotent-safe — use a try/catch to ignore "duplicate column" errors from re-runs, or check `PRAGMA table_info(episodes)` first.

Safe migration pattern:
```typescript
async function addColumnIfMissing(db: SQLite.SQLiteDatabase, table: string, column: string, definition: string) {
  const info = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!info.some(row => row.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// In migrate():
await addColumnIfMissing(db, "episodes", "source_name",     "TEXT NOT NULL DEFAULT ''");
await addColumnIfMissing(db, "episodes", "themes_text",     "TEXT NOT NULL DEFAULT ''");
await addColumnIfMissing(db, "episodes", "summary_snippet", "TEXT NOT NULL DEFAULT ''");
```

### 2. Compute search fields at upsert time

Update `upsertEpisodes()` in `native/lib/db.ts` to populate the new columns:

```typescript
import { sourceName } from "./utils"; // from player-bar-upgrade spec

export async function upsertEpisodes(items: LibraryItem[]) {
  const db = await getDb();
  for (const item of items) {
    // Derive search metadata
    const srcName = sourceName(item.sourceType, item.sourceUrl, item.author);

    // Collect all unique themes across all versions
    const allThemes = [...new Set(item.versions.flatMap(v => v.themes ?? []))];
    const themesText = allThemes.join(" ").toLowerCase();

    // First ready version's summary, truncated
    const primarySummary = item.versions.find(v => v.status === "ready")?.summary ?? "";
    const summarySnippet = (primarySummary ?? "").slice(0, 300).toLowerCase();

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

### 3. Updated `searchEpisodes()` query

```typescript
export async function searchEpisodes(query: string): Promise<LibraryItem[]> {
  const db = await getDb();
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
    pattern, pattern, pattern, pattern, pattern, pattern,
  );

  return rows.map(rowToLibraryItem);
}
```

The `lower()` calls on stored text ensure case-insensitive matching across all fields. `themes_text` and `summary_snippet` are already stored lowercased.

### 4. Backfill existing rows

When the app launches and migrates, existing rows have empty `source_name`, `themes_text`, `summary_snippet`. The next `syncLibrary()` call will re-upsert all items and populate the columns. No explicit backfill needed — the sync cycle handles it.

However, to ensure search works immediately on first launch after the upgrade (before sync), add a one-time backfill in `migrate()`:

```typescript
// After adding columns, backfill from existing data
// source_name can be derived from source_url/author/source_type
// themes_text requires json_versions parsing — do this in JS, not SQL
await backfillSearchColumns(db);

async function backfillSearchColumns(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<EpisodeRow>("SELECT * FROM episodes WHERE source_name = ''");
  for (const row of rows) {
    const versions = JSON.parse(row.json_versions) as AudioVersion[];
    const srcName = sourceName(row.source_type, row.source_url, row.author);
    const themesText = [...new Set(versions.flatMap(v => v.themes ?? []))].join(" ").toLowerCase();
    const summary = versions.find(v => v.status === "ready")?.summary ?? "";
    await db.runAsync(
      `UPDATE episodes SET source_name=?, themes_text=?, summary_snippet=? WHERE content_id=?`,
      srcName, themesText, summary.slice(0, 300).toLowerCase(), row.content_id
    );
  }
}
```

### 5. Option B (not recommended) — separate search index table

For reference, Option B would be:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS episodes_fts USING fts5(
  content_id UNINDEXED,
  title, author, source_name, themes_text, summary_snippet
);
```

This gives true full-text search with stemming. Rejected for now: FTS5 requires expo-sqlite-fts (a separate package), and the `LIKE` approach is sufficient for libraries under ~1000 episodes. Revisit if search performance degrades.

### 6. Type extract helper (internal)

Add a reusable row mapper in `db.ts`:

```typescript
type EpisodeRow = {
  content_id: string; title: string; author: string | null;
  source_type: string; source_url: string | null;
  word_count: number; created_at: string; json_versions: string;
  source_name: string; themes_text: string; summary_snippet: string;
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

Replace the inline mappers in `getAllEpisodes()` and `searchEpisodes()` with `rowToLibraryItem`.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/lib/db.ts` | Schema migration (add 3 columns), update `upsertEpisodes()` with new fields, update `searchEpisodes()` query, add `rowToLibraryItem`, add `backfillSearchColumns()` |
| `native/lib/utils.ts` | Dependency — `sourceName()` helper (from `player-bar-upgrade` spec) |

## Tests

**`native/lib/db.test.ts`** (or new `search.test.ts`):

```typescript
describe("searchEpisodes", () => {
  beforeEach(async () => {
    // Use in-memory SQLite for tests
    const db = await SQLite.openDatabaseAsync(":memory:");
    setDb(db);
    await upsertEpisodes([
      {
        id: "1", title: "NBA Playoffs Preview", author: "ESPN Staff",
        sourceType: "url", sourceUrl: "https://espn.com/nba/article",
        wordCount: 800, createdAt: new Date().toISOString(),
        versions: [{ ...baseVersion, themes: ["basketball", "NBA", "playoffs"], summary: "The NBA playoffs are heating up..." }],
      },
    ]);
  });

  it("matches by title", async () => {
    const results = await searchEpisodes("NBA");
    expect(results).toHaveLength(1);
  });

  it("matches by source domain", async () => {
    const results = await searchEpisodes("espn");
    expect(results).toHaveLength(1);
  });

  it("matches by theme", async () => {
    const results = await searchEpisodes("basketball");
    expect(results).toHaveLength(1);
  });

  it("matches by summary content", async () => {
    const results = await searchEpisodes("heating up");
    expect(results).toHaveLength(1);
  });

  it("returns empty for no match", async () => {
    const results = await searchEpisodes("nonexistent");
    expect(results).toHaveLength(0);
  });
});
```

## Success Criteria

```bash
cd native && npx tsc --noEmit
```

- [ ] Searching "espn" returns ESPN articles even if title doesn't contain "ESPN"
- [ ] Searching a theme like "sports" or "finance" returns relevant episodes
- [ ] Searching part of a summary phrase finds the episode
- [ ] Case-insensitive: "NBA" and "nba" return the same results
- [ ] Existing episodes are backfilled on first launch after upgrade
- [ ] Search performance is acceptable (<100ms) for libraries up to 500 episodes

## Scope

- **No** FTS5 virtual table — Option A (`LIKE` on indexed columns) is the implementation
- **No** fuzzy matching / typo tolerance — exact substring matching only
- **No** search result highlighting
- **No** search analytics or logging
- **No** backend/API search endpoint — all search is local SQLite only
