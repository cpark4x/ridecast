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
}

// --- Episodes (library cache) ---

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
