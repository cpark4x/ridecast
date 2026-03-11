import type { LibraryItem } from "../lib/types";

const mockRunAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockExecAsync = jest.fn();

jest.mock("expo-sqlite", () => ({
  openDatabaseAsync: jest.fn(async () => ({
    runAsync: mockRunAsync,
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
    execAsync: mockExecAsync,
  })),
}));

// Import AFTER mock is set up
import {
  getDb,
  setDb,
  upsertEpisodes,
  getAllEpisodes,
  searchEpisodes,
  getLocalPlayback,
  saveLocalPlayback,
  getDownloadPath,
  recordDownload,
  getStorageInfo,
} from "../lib/db";

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the module-level _db cache so each test gets a fresh DB
  setDb(null as unknown as import("expo-sqlite").SQLiteDatabase);
});

describe("db", () => {
  describe("getDb", () => {
    it("initializes database and runs migrations", async () => {
      await getDb();
      expect(mockExecAsync).toHaveBeenCalledTimes(1);
      const sql = mockExecAsync.mock.calls[0][0] as string;
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS episodes");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS playback");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS downloads");
    });
  });

  describe("upsertEpisodes", () => {
    it("inserts each episode with serialized versions JSON", async () => {
      await getDb();

      const items: LibraryItem[] = [
        {
          id: "c1",
          title: "Test Episode",
          author: "Author",
          sourceType: "url",
          sourceUrl: "https://example.com",
          wordCount: 1000,
          createdAt: "2026-01-01T00:00:00Z",
          versions: [
            {
              scriptId: "s1",
              audioId: "a1",
              audioUrl: "https://cdn.example.com/audio.mp3",
              durationSecs: 300,
              targetDuration: 5,
              format: "narrator",
              status: "ready",
              completed: false,
              position: 0,
              createdAt: "2026-01-01T00:00:00Z",
              summary: "A test summary",
              contentType: "article",
              themes: ["tech"],
              compressionRatio: 0.3,
              actualWordCount: 750,
              voices: ["alloy"],
              ttsProvider: "openai",
            },
          ],
        },
      ];

      await upsertEpisodes(items);

      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      const args = mockRunAsync.mock.calls[0];
      expect(args[0]).toContain("INSERT OR REPLACE INTO episodes");
      expect(args[1]).toBe("c1");
      expect(args[2]).toBe("Test Episode");
    });
  });

  describe("getAllEpisodes", () => {
    it("maps database rows to LibraryItem objects", async () => {
      await getDb();
      mockGetAllAsync.mockResolvedValueOnce([
        {
          content_id: "c1",
          title: "Episode 1",
          author: null,
          source_type: "url",
          source_url: "https://example.com",
          word_count: 1000,
          created_at: "2026-01-01T00:00:00Z",
          json_versions: "[]",
        },
      ]);

      const episodes = await getAllEpisodes();
      expect(episodes).toHaveLength(1);
      expect(episodes[0].id).toBe("c1");
      expect(episodes[0].title).toBe("Episode 1");
      expect(episodes[0].versions).toEqual([]);
    });
  });

  describe("searchEpisodes", () => {
    it("searches by title with LIKE pattern", async () => {
      await getDb();
      mockGetAllAsync.mockResolvedValueOnce([]);

      await searchEpisodes("react");

      const [sql, p1, p2] = mockGetAllAsync.mock.calls[0];
      expect(sql).toContain("WHERE title LIKE ? OR author LIKE ?");
      expect(p1).toBe("%react%");
      expect(p2).toBe("%react%");
    });
  });

  describe("playback", () => {
    it("getLocalPlayback returns null for missing record", async () => {
      await getDb();
      mockGetFirstAsync.mockResolvedValueOnce(null);

      const result = await getLocalPlayback("audio-999");
      expect(result).toBeNull();
    });

    it("getLocalPlayback maps row to PlaybackState", async () => {
      await getDb();
      mockGetFirstAsync.mockResolvedValueOnce({
        audio_id: "a1",
        position: 42.5,
        speed: 1.5,
        completed: 0,
        updated_at: "2026-01-01T00:00:00Z",
      });

      const result = await getLocalPlayback("a1");
      expect(result).toEqual({
        audioId: "a1",
        position: 42.5,
        speed: 1.5,
        completed: false,
        updatedAt: "2026-01-01T00:00:00Z",
      });
    });

    it("saveLocalPlayback upserts with ON CONFLICT", async () => {
      await getDb();
      await saveLocalPlayback({
        audioId: "a1",
        position: 100,
        speed: 1.25,
        completed: false,
      });

      const [sql] = mockRunAsync.mock.calls[0];
      expect(sql).toContain("INSERT INTO playback");
      expect(sql).toContain("ON CONFLICT(audio_id) DO UPDATE");
    });
  });

  describe("downloads", () => {
    it("recordDownload inserts download metadata", async () => {
      await getDb();
      await recordDownload("a1", "/path/to/file.mp3", 5000000);

      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO downloads"),
        "a1",
        "/path/to/file.mp3",
        5000000,
      );
    });

    it("getStorageInfo returns count and total", async () => {
      await getDb();
      mockGetFirstAsync.mockResolvedValueOnce({ count: 3, total: 15000000 });

      const info = await getStorageInfo();
      expect(info).toEqual({ count: 3, totalBytes: 15000000 });
    });
  });
});
