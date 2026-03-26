import {
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

let cachedBlobServiceClient: { connectionString: string; client: BlobServiceClient } | null = null;
let cachedContainerClients = new Map<string, ContainerClient>();

function getStorageConnectionString(): string {
  const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connString) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");

  return connString;
}

function getStorageCredential(): StorageSharedKeyCredential {
  const credential = getBlobServiceClient().credential;
  if (!(credential instanceof StorageSharedKeyCredential)) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING must include an account key");
  }

  return credential;
}

function getBlobServiceClient(): BlobServiceClient {
  const connString = getStorageConnectionString();
  if (cachedBlobServiceClient?.connectionString === connString) {
    return cachedBlobServiceClient.client;
  }

  const client = BlobServiceClient.fromConnectionString(connString);
  cachedBlobServiceClient = { connectionString: connString, client };
  cachedContainerClients = new Map();
  return client;
}

function parseBlobUrlParts(url: URL): { containerName: string; blobName: string } {
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (!pathParts[0]) {
    throw new Error("Invalid blob URL: no container path segment found");
  }
  const rawBlobPathParts = pathParts.slice(1);
  if (rawBlobPathParts.length === 0) {
    throw new Error("Invalid blob URL: missing blob path");
  }

  let containerName: string;
  let blobName: string;
  try {
    containerName = decodeURIComponent(pathParts[0]);
    blobName = rawBlobPathParts.map((part) => decodeURIComponent(part)).join("/");
  } catch {
    throw new Error("Invalid blob URL: malformed path encoding");
  }

  return {
    containerName,
    blobName,
  };
}

export function getBlobContainerClient(containerName: string): ContainerClient {
  const serviceClient = getBlobServiceClient();
  const cachedClient = cachedContainerClients.get(containerName);
  if (cachedClient) {
    return cachedClient;
  }

  const containerClient = serviceClient.getContainerClient(containerName);
  cachedContainerClients.set(containerName, containerClient);
  return containerClient;
}

/**
 * Upload an audio buffer to Azure Blob Storage.
 * Returns the public URL of the uploaded blob.
 */
export async function uploadAudio(
  buffer: Buffer,
  filename?: string,
): Promise<string> {
  const blobName = filename ?? `${uuidv4()}.mp3`;
  const client = getBlobContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_NAME ?? "ridecast-audio",
  );
  const blockBlob = client.getBlockBlobClient(blobName);

  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: "audio/mpeg" },
  });

  return blockBlob.url;
}

/**
 * Generate a time-limited SAS URL for a blob.
 * Bypasses public access settings — works even when the container is private.
 */
export function generateSasUrl(blobUrl: string): string {
  const credential = getStorageCredential();
  const url = new URL(blobUrl);

  // Extract container and blob name from the URL
  const { containerName, blobName } = parseBlobUrlParts(url);

  const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const sas = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    credential,
  ).toString();

  url.search = sas;
  return url.toString();
}

/**
 * Parse a blob storage URL into its container name and blob name components.
 * Example: https://account.blob.core.windows.net/container/path/to/blob.mp3
 *   → { containerName: 'container', blobName: 'path/to/blob.mp3' }
 *
 * @throws Error if the URL is missing either the container segment or blob path
 */
export function parseBlobUrl(url: string): { containerName: string; blobName: string } {
  return parseBlobUrlParts(new URL(url));
}

/**
 * Returns true if Azure Blob Storage is configured.
 * Falls back to local filesystem when false (development).
 */
export function isBlobStorageConfigured(): boolean {
  return !!process.env.AZURE_STORAGE_CONNECTION_STRING;
}
