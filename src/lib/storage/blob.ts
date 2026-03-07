import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
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
 * Returns true if Azure Blob Storage is configured.
 * Falls back to local filesystem when false (development).
 */
export function isBlobStorageConfigured(): boolean {
  return !!process.env.AZURE_STORAGE_CONNECTION_STRING;
}
