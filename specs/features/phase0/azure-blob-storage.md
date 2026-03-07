# Feature: Azure Blob Storage for Audio Files

> Replace local filesystem audio storage with Azure Blob Storage so audio files survive deployments and are accessible from any instance.

## Motivation

Audio files are currently written to `public/audio/*.mp3` on the local filesystem. In a containerized Azure deployment, the filesystem is ephemeral — files written in one request may not exist in the next if the container restarts or scales. Azure Blob Storage provides durable, publicly-accessible storage. Files are uploaded once, served directly via CDN URL.

## Current State (confirmed in code)

`src/app/api/audio/generate/route.ts`:
```typescript
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const filename = `${uuidv4()}.mp3`;
const filePath = `audio/${filename}`;
const absolutePath = path.join(process.cwd(), "public", filePath);

await mkdir(path.dirname(absolutePath), { recursive: true });
await writeFile(absolutePath, audioBuffer);
// stored as: filePath = "audio/uuid.mp3"
```

`src/app/api/audio/[id]/route.ts` serves the file by reading `audio.filePath` and streaming from `public/`.

`Audio.filePath` in Prisma: stores `"audio/uuid.mp3"` (relative).

## Changes

### 1. Install

```bash
npm install @azure/storage-blob
```

### 2. New `src/lib/storage/blob.ts`

```typescript
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

let containerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
  if (containerClient) return containerClient;

  const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME ?? "ridecast-audio";

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
export async function uploadAudio(buffer: Buffer, filename?: string): Promise<string> {
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
```

### 3. Update audio generation route (`src/app/api/audio/generate/route.ts`)

Replace the filesystem write with blob upload. Keep local filesystem as fallback for development:

```typescript
import { uploadAudio, isBlobStorageConfigured } from "@/lib/storage/blob";

// Before (remove these):
// import { writeFile, mkdir } from "fs/promises";
// import path from "path";

// Replace the file write block:
let filePath: string;

if (isBlobStorageConfigured()) {
  // Production: upload to Azure Blob Storage
  const filename = `${uuidv4()}.mp3`;
  filePath = await uploadAudio(audioBuffer, filename);
} else {
  // Development fallback: local filesystem
  const { writeFile, mkdir } = await import("fs/promises");
  const filename = `${uuidv4()}.mp3`;
  const relativePath = `audio/${filename}`;
  const absolutePath = path.join(process.cwd(), "public", relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, audioBuffer);
  filePath = relativePath;
}
```

### 4. Update audio streaming route (`src/app/api/audio/[id]/route.ts`)

Currently serves files from `public/`. With blob storage, `filePath` is now a full HTTPS URL — just redirect:

```typescript
// In GET handler:
const audio = await prisma.audio.findUnique({ where: { id: params.id } });
if (!audio) return new Response("Not found", { status: 404 });

// If filePath is a full URL (blob storage), redirect
if (audio.filePath.startsWith("https://")) {
  return Response.redirect(audio.filePath, 302);
}

// Otherwise serve from local public/ (development)
// ... existing local serve logic
```

### 5. Update `.env.example`

```bash
# Azure Blob Storage (required in production; omit for local dev)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=ridecast-audio
```

## Files to Modify

| File | Change |
|---|---|
| `package.json` | Add `@azure/storage-blob` |
| `src/lib/storage/blob.ts` | New file — uploadAudio + isBlobStorageConfigured |
| `src/app/api/audio/generate/route.ts` | Use blob upload when configured, filesystem fallback |
| `src/app/api/audio/[id]/route.ts` | Redirect to blob URL when filePath is https:// |
| `.env.example` | Add Azure Storage env vars |

## Tests

**File:** `src/lib/storage/blob.test.ts` (new)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

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
    process.env.AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName=test";
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
    await expect(uploadAudio(Buffer.from("x"))).rejects.toThrow("AZURE_STORAGE_CONNECTION_STRING");
  });
});

describe("isBlobStorageConfigured", () => {
  it("returns true when connection string is set", () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = "test";
    const { isBlobStorageConfigured } = require("./blob");
    expect(isBlobStorageConfigured()).toBe(true);
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
  });

  it("returns false when connection string is missing", () => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    const { isBlobStorageConfigured } = require("./blob");
    expect(isBlobStorageConfigured()).toBe(false);
  });
});
```

## Success Criteria

```bash
npm install
npm run test   # blob.test.ts passes; audio generate tests unaffected
npm run build  # no type errors
```

Manual (requires Azure setup):
- [ ] With `AZURE_STORAGE_CONNECTION_STRING` set: generate audio → `Audio.filePath` is `https://...blob.core.windows.net/...`
- [ ] Without `AZURE_STORAGE_CONNECTION_STRING`: generate audio → `Audio.filePath` is `audio/uuid.mp3` (local fallback works)
- [ ] Playing audio redirects correctly to blob URL

## Scope

Storage layer only. No auth changes, no schema changes (filePath column already accepts full URLs). Local filesystem fallback ensures development continues to work without Azure credentials.
