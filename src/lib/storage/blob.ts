import {
  BlobServiceClient,
  ContainerClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

let containerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
  if (containerClient) return containerClient;

  const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName =
    process.env.AZURE_STORAGE_CONTAINER_NAME ?? "ridecast-audio";

  if (!connString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
  }

  const serviceClient = BlobServiceClient.fromConnectionString(connString);
  containerClient = serviceClient.getContainerClient(containerName);
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
  const client = getContainerClient();
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
  const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connString) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");

  // Parse connection string for account name and key
  const parts = Object.fromEntries(
    connString.split(";").map((s) => {
      const idx = s.indexOf("=");
      return [s.slice(0, idx), s.slice(idx + 1)];
    }),
  );
  const accountName = parts["AccountName"];
  const accountKey = parts["AccountKey"];
  if (!accountName || !accountKey) throw new Error("Invalid connection string");

  // Extract container and blob name from the URL
  const { containerName, blobName } = parseBlobUrl(blobUrl);

  const credential = new StorageSharedKeyCredential(accountName, accountKey);
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

  return `${blobUrl}?${sas}`;
}

/**
 * Parse a blob storage URL into its container name and blob name components.
 * Example: https://account.blob.core.windows.net/container/path/to/blob.mp3
 *   → { containerName: 'container', blobName: 'path/to/blob.mp3' }
 */
export function parseBlobUrl(url: string): { containerName: string; blobName: string } {
  const pathParts = new URL(url).pathname.split('/').filter(Boolean);
  return {
    containerName: pathParts[0],
    blobName: pathParts.slice(1).join('/'),
  };
}

/**
 * Returns true if Azure Blob Storage is configured.
 * Falls back to local filesystem when false (development).
 */
export function isBlobStorageConfigured(): boolean {
  return !!process.env.AZURE_STORAGE_CONNECTION_STRING;
}
