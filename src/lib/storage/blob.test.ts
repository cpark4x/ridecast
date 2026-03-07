import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn().mockReturnValue({
      getContainerClient: vi.fn().mockReturnValue({
        getBlockBlobClient: vi.fn().mockReturnValue({
          uploadData: vi.fn().mockResolvedValue({}),
          url: "https://account.blob.core.windows.net/ridecast-audio/test.mp3",
        }),
      }),
    }),
  },
}));

describe("uploadAudio", () => {
  beforeEach(() => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      "DefaultEndpointsProtocol=https;AccountName=test";
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    vi.resetModules();
  });

  it("returns a blob URL after upload", async () => {
    const { uploadAudio } = await import("./blob");
    const url = await uploadAudio(Buffer.from("audio"), "test.mp3");
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain("test.mp3");
  });

  it("throws if connection string is not set", async () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    vi.resetModules();
    const { uploadAudio } = await import("./blob");
    await expect(uploadAudio(Buffer.from("x"))).rejects.toThrow(
      "AZURE_STORAGE_CONNECTION_STRING",
    );
  });
});

describe("isBlobStorageConfigured", () => {
  afterEach(() => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    vi.resetModules();
  });

  it("returns true when connection string is set", async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = "test";
    vi.resetModules();
    const { isBlobStorageConfigured } = await import("./blob");
    expect(isBlobStorageConfigured()).toBe(true);
  });

  it("returns false when connection string is missing", async () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    vi.resetModules();
    const { isBlobStorageConfigured } = await import("./blob");
    expect(isBlobStorageConfigured()).toBe(false);
  });
});
