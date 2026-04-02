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
  // mockReset clears queued mockResolvedValueOnce values and custom implementations
  // left over from previous tests. clearAllMocks only clears call records.
  mockGetAllAsync.mockReset();
  mockExecAsync.mockReset();
  // Default: getAllAsync returns [] (needed for backfill query during migration)
  mockGetAllAsync.mockResolvedValue([]);
  // Reset the module-level _db cache so each test gets a fresh DB
  setDb(null as unknown as import("expo-sqlite").SQLiteDatabase);
});

describe("db", () => {
  describe("getDb", () => {
    it("initializes database and runs migrations (V1 + V2 + V3)", async () => {
      await getDb();
      // Call 0: main CREATE TABLE statements
      // Calls 1-5: migrateV2 ALTER TABLE ADD COLUMN for identity fields
      // Calls 6-7: migrateV3 addColumnIfMissing for themes_text, summary_snippet
      expect(mockExecAsync).toHaveBeenCalledTimes(8);
      const sql = mockExecAsync.mock.calls[0][0] as string;
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS episodes");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS playback");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS downloads");
    });

    it("V3 migration adds themes_text and summary_snippet columns", async () => {
      await getDb();
      // Calls 6 and 7 are the V3 ALTER TABLEs
      const v3Call1 = mockExecAsync.mock.calls[6][0] as string;
      const v3Call2 = mockExecAsync.mock.calls[7][0] as string;
      expect(v3Call1).toContain("themes_text");
      expect(v3Call2).toContain("summary_snippet");
    });

    it("V3 migration completes normally when columns already exist", async () => {
      // addColumnIfMissing wraps ALTER TABLE in try/catch, so duplicate-column
      // errors are silently swallowed. Verify the migration resolves even when
      // the V3 ALTER TABLE calls throw.
      let execCount = 0;
      mockExecAsync.mockImplementation(async () => {
        execCount++;
        if (execCount >= 7) throw new Error("duplicate column name");
      });

      await expect(getDb()).resolves.toBeDefined();
      // 1 CREATE + 5 V2 ALTERs + 2 V3 ALTERs (errors caught) = 8 total
      expect(mockExecAsync).toHaveBeenCalledTimes(8);
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

    it("derives search columns (source_name, themes_text, summary_snippet)", async () => {
      await getDb();

      const items: LibraryItem[] = [
        {
          id: "c1",
          title: "ESPN Article",
          author: "ESPN Staff",
          sourceType: "url",
          sourceUrl: "https://espn.com/nba",
          wordCount: 800,
          createdAt: "2026-01-01T00:00:00Z",
          versions: [
            {
              scriptId: "s1",
              audioId: "a1",
              audioUrl: null,
              durationSecs: 300,
              targetDuration: 5,
              format: "narrative",
              status: "ready",
              completed: false,
              position: 0,
              createdAt: "2026-01-01T00:00:00Z",
              summary: "The NBA playoffs are heating up.",
              contentType: "article",
              themes: ["basketball", "NBA"],
              compressionRatio: 0.1,
              actualWordCount: 750,
              voices: ["nova"],
              ttsProvider: "openai",
            },
          ],
        },
      ];

      await upsertEpisodes(items);

      const args = mockRunAsync.mock.calls[0];
      const sql = args[0] as string;
      expect(sql).toContain("themes_text, summary_snippet");
      // Args: id, title, author, sourceType, sourceUrl, wordCount, createdAt, json_versions,
      //       sourceIcon, sourceName, sourceDomain, sourceBrandColor, description,
      //       themesText, summarySnippet
      // Index: 1    2      3       4           5          6          7          8
      //        9           10          11            12              13
      //        14          15
      expect(args[10]).toBe("espn.com");                         // derived source_name
      expect(args[14]).toBe("basketball nba");                   // themes_text (lowercased, deduped)
      expect(args[15]).toBe("the nba playoffs are heating up."); // summary_snippet (lowercased)
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
          source_icon: null,
          source_name: "example.com",
          source_domain: null,
          source_brand_color: null,
          description: null,
          themes_text: "",
          summary_snippet: "",
        },
      ]);

      const episodes = await getAllEpisodes();
      expect(episodes).toHaveLength(1);
      expect(episodes[0].id).toBe("c1");
      expect(episodes[0].title).toBe("Episode 1");
      expect(episodes[0].versions).toEqual([]);
      expect(episodes[0].sourceName).toBe("example.com");
    });
  });

  describe("searchEpisodes", () => {
    it("searches across 6 columns with lowercased LIKE pattern", async () => {
      await getDb();
      mockGetAllAsync.mockResolvedValueOnce([]);

      await searchEpisodes("React");

      // Find the searchEpisodes call (contains LIKE, not the backfill query)
      const searchCall = mockGetAllAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).includes("LIKE"),
      );
      expect(searchCall).toBeDefined();
      const [sql, ...params] = searchCall!;
      expect(sql).toContain("lower(title)");
      expect(sql).toContain("lower(author)");
      expect(sql).toContain("lower(source_name)");
      expect(sql).toContain("lower(source_type)");
      expect(sql).toContain("themes_text");
      expect(sql).toContain("summary_snippet");
      // All 6 params are the same lowercased pattern
      expect(params).toEqual(["%react%", "%react%", "%react%", "%react%", "%react%", "%react%"]);
    });

    it("lowercases the search query for case-insensitive matching", async () => {
      await getDb();
      mockGetAllAsync.mockResolvedValueOnce([]);

      await searchEpisodes("NBA");

      const searchCall = mockGetAllAsync.mock.calls.find(
        (call: unknown[]) => typeof call[0] === "string" && (call[0] as string).includes("LIKE"),
      );
      expect(searchCall![1]).toBe("%nba%");
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

// ── sourceName (pure function from utils) ───────────────────────────────────

describe("sourceName", () => {
  const { sourceName } = require("../lib/utils") as {
    sourceName: (t: string, u: string | null, a: string | null) => string;
  };

  it("extracts hostname from URL", () => {
    expect(sourceName("url", "https://www.espn.com/nba", null)).toBe("espn.com");
  });

  it("strips www. prefix", () => {
    expect(sourceName("url", "https://www.nytimes.com/article", null)).toBe("nytimes.com");
  });

  it("falls back to author when no URL", () => {
    expect(sourceName("pdf", null, "John Smith")).toBe("John Smith");
  });

  it("falls back to sourceType label when no URL or author", () => {
    expect(sourceName("epub", null, null)).toBe("EPUB");
  });

  it("prefers URL over author", () => {
    expect(sourceName("url", "https://espn.com", "ESPN Staff")).toBe("espn.com");
  });
});
