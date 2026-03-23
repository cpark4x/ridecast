import { downloadEpisodeAudio, resolveAudioUrl, deleteDownload } from "../lib/downloads";
import * as db from "../lib/db";
import * as FileSystem from "expo-file-system/legacy";

jest.mock("../lib/db");
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "/mock/docs/",
  downloadAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

const mockDb = db as jest.Mocked<typeof db>;
const mockFS = FileSystem as jest.Mocked<typeof FileSystem>;

beforeEach(() => jest.clearAllMocks());

describe("downloadEpisodeAudio", () => {
  it("downloads file and records in db", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce(null);
    mockFS.getInfoAsync.mockResolvedValueOnce({ exists: false, isDirectory: false, uri: "" });
    mockFS.downloadAsync.mockResolvedValueOnce({
      status: 200,
      uri: "/mock/docs/episodes/a1.mp3",
      headers: {},
      mimeType: "audio/mpeg",
      md5: undefined,
    });
    mockFS.getInfoAsync.mockResolvedValueOnce({
      exists: true,
      isDirectory: false,
      uri: "/mock/docs/episodes/a1.mp3",
      size: 5000000,
      modificationTime: 0,
    });

    const path = await downloadEpisodeAudio("a1", "https://cdn.example.com/a1.mp3");

    expect(path).toBe("/mock/docs/episodes/a1.mp3");
    expect(mockDb.recordDownload).toHaveBeenCalledWith(
      "a1",
      "/mock/docs/episodes/a1.mp3",
      5000000,
    );
  });

  it("returns existing path if already downloaded", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce("/mock/docs/episodes/a1.mp3");
    mockFS.getInfoAsync.mockResolvedValueOnce({
      exists: true,
      isDirectory: false,
      uri: "/mock/docs/episodes/a1.mp3",
      size: 5000000,
      modificationTime: 0,
    });

    const path = await downloadEpisodeAudio("a1", "https://cdn.example.com/a1.mp3");

    expect(path).toBe("/mock/docs/episodes/a1.mp3");
    expect(mockFS.downloadAsync).not.toHaveBeenCalled();
  });
});

describe("resolveAudioUrl", () => {
  it("returns local path when downloaded", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce("/mock/docs/episodes/a1.mp3");
    mockFS.getInfoAsync.mockResolvedValueOnce({
      exists: true,
      isDirectory: false,
      uri: "/mock/docs/episodes/a1.mp3",
      size: 5000000,
      modificationTime: 0,
    });

    const url = await resolveAudioUrl("a1", "https://cdn.example.com/a1.mp3");
    expect(url).toBe("/mock/docs/episodes/a1.mp3");
  });

  it("returns remote URL when not downloaded", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce(null);

    const url = await resolveAudioUrl("a1", "https://cdn.example.com/a1.mp3");
    expect(url).toBe("https://cdn.example.com/a1.mp3");
  });
});

describe("deleteDownload", () => {
  it("deletes file and removes db record", async () => {
    mockDb.getDownloadPath.mockResolvedValueOnce("/mock/docs/episodes/a1.mp3");

    await deleteDownload("a1");

    expect(mockFS.deleteAsync).toHaveBeenCalledWith(
      "/mock/docs/episodes/a1.mp3",
      { idempotent: true },
    );
    expect(mockDb.deleteDownloadRecord).toHaveBeenCalledWith("a1");
  });
});
