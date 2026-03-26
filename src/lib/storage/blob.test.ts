import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockBlobServiceFromConnectionString,
  mockBlobServiceCredential,
  mockGetContainerClient,
  mockGenerateBlobSASQueryParameters,
  mockBlobSASPermissionsParse,
  mockStorageSharedKeyCredential,
} = vi.hoisted(() => {
  const StorageSharedKeyCredentialMock = vi.fn(function MockStorageSharedKeyCredential(
    this: { accountName: string; accountKey: string },
    accountName: string,
    accountKey: string,
  ) {
    this.accountName = accountName;
    this.accountKey = accountKey;
  });
  const blobServiceCredential = new StorageSharedKeyCredentialMock(
    "service-account",
    "service-key",
  );
  const getContainerClientMock = vi.fn().mockReturnValue({
    getBlockBlobClient: vi.fn().mockReturnValue({
      uploadData: vi.fn().mockResolvedValue({}),
      url: "https://account.blob.core.windows.net/ridecast-audio/test.mp3",
    }),
  });

  return {
    mockBlobServiceFromConnectionString: vi.fn().mockReturnValue({
      credential: blobServiceCredential,
      getContainerClient: getContainerClientMock,
    }),
    mockBlobServiceCredential: blobServiceCredential,
    mockGetContainerClient: getContainerClientMock,
    mockGenerateBlobSASQueryParameters: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue("sig=test"),
    }),
    mockBlobSASPermissionsParse: vi.fn().mockReturnValue("read"),
    mockStorageSharedKeyCredential: StorageSharedKeyCredentialMock,
  };
});

const UPLOAD_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=test";
const FIRST_CONNECTION_STRING =
  "DefaultEndpointsProtocol=https;AccountName=first;AccountKey=first-key";
const SECOND_CONNECTION_STRING =
  "DefaultEndpointsProtocol=https;AccountName=second;AccountKey=second-key";
const TEST_BLOB_URL = "https://account.blob.core.windows.net/ridecast-audio/test.mp3";
const TEST_BLOB_URL_WITH_OLD_SAS = `${TEST_BLOB_URL}?sv=old-sas`;

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: {
    fromConnectionString: mockBlobServiceFromConnectionString,
  },
  generateBlobSASQueryParameters: mockGenerateBlobSASQueryParameters,
  BlobSASPermissions: { parse: mockBlobSASPermissionsParse },
  StorageSharedKeyCredential: mockStorageSharedKeyCredential,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uploadAudio", () => {
  beforeEach(() => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      UPLOAD_CONNECTION_STRING;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    delete process.env.AZURE_STORAGE_CONTAINER_NAME;
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

  it("re-reads the container client when the connection string changes", async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      FIRST_CONNECTION_STRING;
    const { uploadAudio } = await import("./blob");

    await uploadAudio(Buffer.from("first"), "first.mp3");

    process.env.AZURE_STORAGE_CONNECTION_STRING =
      SECOND_CONNECTION_STRING;

    await uploadAudio(Buffer.from("second"), "second.mp3");

    expect(mockBlobServiceFromConnectionString).toHaveBeenNthCalledWith(
      1,
      FIRST_CONNECTION_STRING,
    );
    expect(mockBlobServiceFromConnectionString).toHaveBeenNthCalledWith(
      2,
      SECOND_CONNECTION_STRING,
    );
  });

  it("reuses the blob service client when only the container name changes", async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      FIRST_CONNECTION_STRING;
    process.env.AZURE_STORAGE_CONTAINER_NAME = "first-container";
    const { uploadAudio } = await import("./blob");

    await uploadAudio(Buffer.from("first"), "first.mp3");

    process.env.AZURE_STORAGE_CONTAINER_NAME = "second-container";

    await uploadAudio(Buffer.from("second"), "second.mp3");

    expect(mockBlobServiceFromConnectionString).toHaveBeenCalledTimes(1);
    expect(mockGetContainerClient).toHaveBeenNthCalledWith(1, "first-container");
    expect(mockGetContainerClient).toHaveBeenNthCalledWith(2, "second-container");
  });

  it("reuses the container client while the connection string and container name are unchanged", async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      FIRST_CONNECTION_STRING;
    process.env.AZURE_STORAGE_CONTAINER_NAME = "shared-container";
    const { uploadAudio } = await import("./blob");

    await uploadAudio(Buffer.from("first"), "first.mp3");
    await uploadAudio(Buffer.from("second"), "second.mp3");

    expect(mockBlobServiceFromConnectionString).toHaveBeenCalledTimes(1);
    expect(mockGetContainerClient).toHaveBeenCalledTimes(1);
    expect(mockGetContainerClient).toHaveBeenCalledWith("shared-container");
  });
});

describe("generateSasUrl", () => {
  beforeEach(() => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      FIRST_CONNECTION_STRING;
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    vi.resetModules();
  });

  it("reuses the cached blob service client while the connection string is unchanged", async () => {
    const { generateSasUrl } = await import("./blob");
    const blobUrl = TEST_BLOB_URL;

    expect(generateSasUrl(blobUrl)).toBe(`${blobUrl}?sig=test`);
    expect(generateSasUrl(blobUrl)).toBe(`${blobUrl}?sig=test`);

    expect(mockBlobServiceFromConnectionString).toHaveBeenCalledTimes(1);
    expect(mockStorageSharedKeyCredential).not.toHaveBeenCalled();
  });

  it("reuses the blob service client's shared key credential", async () => {
    const { generateSasUrl } = await import("./blob");
    const blobUrl = TEST_BLOB_URL;

    expect(generateSasUrl(blobUrl)).toBe(`${blobUrl}?sig=test`);

    expect(mockBlobServiceFromConnectionString).toHaveBeenCalledTimes(1);
    expect(mockBlobServiceCredential).toMatchObject({
      accountName: "service-account",
      accountKey: "service-key",
    });
    expect(mockStorageSharedKeyCredential).not.toHaveBeenCalled();
  });

  it("replaces any existing query string when generating a fresh SAS URL", async () => {
    const { generateSasUrl } = await import("./blob");
    const blobUrl = TEST_BLOB_URL_WITH_OLD_SAS;

    expect(generateSasUrl(blobUrl)).toBe(`${TEST_BLOB_URL}?sig=test`);
  });

  it("rejects container URLs that do not include a blob path", async () => {
    const { generateSasUrl } = await import("./blob");
    expect(() => {
      generateSasUrl("https://account.blob.core.windows.net/ridecast-audio");
    }).toThrow(/missing blob path/i);
    expect(mockGenerateBlobSASQueryParameters).not.toHaveBeenCalled();
  });

  it("re-reads credentials when the connection string changes", async () => {
    const { generateSasUrl } = await import("./blob");
    const blobUrl = TEST_BLOB_URL;

    expect(generateSasUrl(blobUrl)).toBe(`${blobUrl}?sig=test`);

    process.env.AZURE_STORAGE_CONNECTION_STRING =
      SECOND_CONNECTION_STRING;

    expect(generateSasUrl(blobUrl)).toBe(`${blobUrl}?sig=test`);
    expect(mockBlobServiceFromConnectionString).toHaveBeenNthCalledWith(
      1,
      FIRST_CONNECTION_STRING,
    );
    expect(mockBlobServiceFromConnectionString).toHaveBeenNthCalledWith(
      2,
      SECOND_CONNECTION_STRING,
    );
    expect(mockStorageSharedKeyCredential).not.toHaveBeenCalled();
  });
});

describe("parseBlobUrl", () => {
  it("parses a valid blob URL with nested path", async () => {
    const { parseBlobUrl } = await import("./blob");
    const result = parseBlobUrl(
      "https://account.blob.core.windows.net/container/path/to/blob.mp3"
    );
    expect(result).toEqual({
      containerName: "container",
      blobName: "path/to/blob.mp3",
    });
  });

  it("decodes URL-encoded blob names", async () => {
    const { parseBlobUrl } = await import("./blob");
    const result = parseBlobUrl(
      "https://account.blob.core.windows.net/container/path%20with%20spaces/blob%2B1.mp3"
    );
    expect(result).toEqual({
      containerName: "container",
      blobName: "path with spaces/blob+1.mp3",
    });
  });

  it("throws for container-only URLs that do not include a blob path", async () => {
    const { parseBlobUrl } = await import("./blob");
    expect(() => {
      parseBlobUrl("https://account.blob.core.windows.net/container");
    }).toThrow(/missing blob path/i);
  });

  it("throws an error for invalid URL with no path segments", async () => {
    const { parseBlobUrl } = await import("./blob");
    expect(() => {
      parseBlobUrl("https://account.blob.core.windows.net/");
    }).toThrow(/invalid blob URL/i);
  });

  it("throws an error for root path with only domain", async () => {
    const { parseBlobUrl } = await import("./blob");
    expect(() => {
      parseBlobUrl("https://account.blob.core.windows.net");
    }).toThrow(/invalid blob URL/i);
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
