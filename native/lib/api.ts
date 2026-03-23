import { API_URL } from "./constants";
import type {
  UploadResponse,
  ProcessResponse,
  GenerateResponse,
  LibraryItem,
  PlaybackState,
} from "./types";

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!_getToken) throw new Error("Token provider not initialized — call setTokenProvider first");
  const token = await _getToken();
  if (!token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function fetchJSON<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = {
    ...((await authHeaders()) as Record<string, string>),
    ...(options.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    throw new Error(data.error ?? `Request failed: ${res.status}`);
  }

  return data as T;
}

// --- Upload ---

export async function uploadUrl(
  url: string,
  options?: Pick<RequestInit, "signal">,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("url", url);

  const auth = await authHeaders();
  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: auth,
    body: formData,
    signal: options?.signal,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    const err = new Error(data.error ?? "Upload failed");
    (err as Error & { statusCode: number }).statusCode = res.status;
    throw err;
  }
  return data as UploadResponse;
}

export async function uploadFile(
  fileUri: string,
  fileName: string,
  mimeType: string,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const auth = await authHeaders();
  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: auth,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    const err = new Error(data.error ?? "Upload failed");
    (err as Error & { statusCode: number }).statusCode = res.status;
    throw err;
  }
  return data as UploadResponse;
}

// --- Process ---

export async function processContent(
  contentId: string,
  targetMinutes: number,
): Promise<ProcessResponse> {
  return fetchJSON<ProcessResponse>("/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentId, targetMinutes }),
  });
}

// --- Generate Audio ---

export async function generateAudio(
  scriptId: string,
  elevenLabsKey?: string,
): Promise<GenerateResponse> {
  const extra: Record<string, string> = { "Content-Type": "application/json" };
  if (elevenLabsKey) extra["x-elevenlabs-key"] = elevenLabsKey;

  return fetchJSON<GenerateResponse>("/api/audio/generate", {
    method: "POST",
    headers: extra,
    body: JSON.stringify({ scriptId }),
  });
}

// --- Library ---

export async function fetchLibrary(): Promise<LibraryItem[]> {
  return fetchJSON<LibraryItem[]>("/api/library");
}

// --- Playback ---

export async function getPlaybackState(
  audioId: string,
): Promise<PlaybackState> {
  return fetchJSON<PlaybackState>(`/api/playback?audioId=${audioId}`);
}

export async function savePlaybackState(state: {
  audioId: string;
  position?: number;
  speed?: number;
  completed?: boolean;
}): Promise<PlaybackState> {
  return fetchJSON<PlaybackState>("/api/playback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

// --- Update Content ---

export async function updateContentTitle(
  contentId: string,
  title: string,
): Promise<void> {
  await fetchJSON<Record<string, unknown>>(`/api/content/${contentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

// --- Delete ---

export async function deleteEpisode(contentId: string): Promise<void> {
  await fetchJSON<{ ok: boolean }>(`/api/library/${contentId}`, {
    method: "DELETE",
  });
}
