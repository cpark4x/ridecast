import { syncLibrary, syncPlayback } from "../lib/sync";
import * as api from "../lib/api";
import * as db from "../lib/db";
import * as downloads from "../lib/downloads";

jest.mock("../lib/api");
jest.mock("../lib/db");
jest.mock("../lib/downloads");

const mockApi = api as jest.Mocked<typeof api>;
const mockDb = db as jest.Mocked<typeof db>;
const mockDownloads = downloads as jest.Mocked<typeof downloads>;

beforeEach(() => jest.clearAllMocks());

describe("syncLibrary", () => {
  it("fetches from server, enriches with identity fields, caches in SQLite, returns items", async () => {
    const items = [
      {
        id: "c1",
        title: "Episode 1",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: "2026-01-01",
        wordCount: 1000,
        versions: [],
      },
    ];
    mockApi.fetchLibrary.mockResolvedValueOnce(items);

    const result = await syncLibrary();

    expect(mockApi.fetchLibrary).toHaveBeenCalledTimes(1);
    // syncLibrary enriches items with derived identity fields before upserting
    expect(mockDb.upsertEpisodes).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "c1",
          title: "Episode 1",
          sourceIcon: expect.any(String),
          sourceName: expect.any(String),
        }),
      ]),
    );
    expect(result[0]).toMatchObject({ id: "c1", title: "Episode 1" });
    // Enriched fields should be present
    expect(result[0]).toHaveProperty("sourceIcon");
    expect(result[0]).toHaveProperty("sourceName");
  });

  it("triggers downloads for ready episodes without local files", async () => {
    const items = [
      {
        id: "c1",
        title: "Episode 1",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: "2026-01-01",
        wordCount: 1000,
        versions: [
          {
            scriptId: "s1",
            audioId: "a1",
            audioUrl: "https://cdn.example.com/a1.mp3",
            durationSecs: 300,
            targetDuration: 5,
            format: "narrator",
            status: "ready" as const,
            completed: false,
            position: 0,
            createdAt: "2026-01-01",
            summary: null,
            contentType: null,
            themes: [],
            compressionRatio: 0.5,
            actualWordCount: 750,
            voices: [],
            ttsProvider: "openai",
          },
        ],
      },
    ];
    mockApi.fetchLibrary.mockResolvedValueOnce(items);
    mockDb.getDownloadPath.mockResolvedValueOnce(null);
    mockDownloads.downloadEpisodeAudio.mockResolvedValue("/mock/docs/episodes/a1.mp3");

    await syncLibrary();

    expect(mockDownloads.downloadEpisodeAudio).toHaveBeenCalledWith(
      "a1",
      "https://cdn.example.com/a1.mp3",
    );
  });

  it("skips download for already-downloaded episodes", async () => {
    const items = [
      {
        id: "c1",
        title: "Episode 1",
        author: null,
        sourceType: "url",
        sourceUrl: null,
        createdAt: "2026-01-01",
        wordCount: 1000,
        versions: [
          {
            scriptId: "s1",
            audioId: "a1",
            audioUrl: "https://cdn.example.com/a1.mp3",
            durationSecs: 300,
            targetDuration: 5,
            format: "narrator",
            status: "ready" as const,
            completed: false,
            position: 0,
            createdAt: "2026-01-01",
            summary: null,
            contentType: null,
            themes: [],
            compressionRatio: 0.5,
            actualWordCount: 750,
            voices: [],
            ttsProvider: "openai",
          },
        ],
      },
    ];
    mockApi.fetchLibrary.mockResolvedValueOnce(items);
    mockDb.getDownloadPath.mockResolvedValueOnce("/local/a1.mp3");

    await syncLibrary();

    expect(mockDownloads.downloadEpisodeAudio).not.toHaveBeenCalled();
  });
});

describe("syncPlayback", () => {
  it("pushes local state to server when local is newer", async () => {
    mockDb.getAllLocalPlayback.mockResolvedValueOnce([
      {
        audioId: "a1",
        position: 100,
        speed: 1.5,
        completed: false,
        updatedAt: "2026-03-11T12:00:00Z",
      },
    ]);
    mockApi.getPlaybackState.mockResolvedValueOnce({
      audioId: "a1",
      position: 50,
      speed: 1.0,
      completed: false,
      updatedAt: "2026-03-11T10:00:00Z",
    });

    await syncPlayback();

    expect(mockApi.savePlaybackState).toHaveBeenCalledWith({
      audioId: "a1",
      position: 100,
      speed: 1.5,
      completed: false,
    });
  });

  it("pulls server state when server is newer", async () => {
    mockDb.getAllLocalPlayback.mockResolvedValueOnce([
      {
        audioId: "a1",
        position: 50,
        speed: 1.0,
        completed: false,
        updatedAt: "2026-03-11T10:00:00Z",
      },
    ]);
    mockApi.getPlaybackState.mockResolvedValueOnce({
      audioId: "a1",
      position: 100,
      speed: 1.5,
      completed: false,
      updatedAt: "2026-03-11T12:00:00Z",
    });

    await syncPlayback();

    expect(mockDb.saveLocalPlayback).toHaveBeenCalledWith({
      audioId: "a1",
      position: 100,
      speed: 1.5,
      completed: false,
    });
    expect(mockApi.savePlaybackState).not.toHaveBeenCalled();
  });
});
