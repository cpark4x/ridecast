import * as SecureStore from "expo-secure-store";

// The main app stores the Clerk session token under this key using the shared App Group.
// See: native/lib/auth.ts — tokenCache writes to App Group for this key.
const TOKEN_STORE_KEY = "clerk_session_token";
const APP_GROUP = "group.com.cpark4x.ridecast.shared";

const API_BASE =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? "https://ridecast.app";

export async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_STORE_KEY, {
      keychainAccessGroup: APP_GROUP,
    });
  } catch {
    return null;
  }
}

export interface SubmitResult {
  contentId: string;
  title: string;
}

/**
 * Upload URL or raw text, then kick off script generation.
 * Returns as soon as /api/process responds — audio generation is async.
 */
export async function submitToRidecast(
  urlOrText: string,
  durationMinutes: number,
): Promise<SubmitResult> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error(
      "Not signed in. Please open Ridecast and sign in first.",
    );
  }

  const isUrl = /^https?:\/\//i.test(urlOrText);
  const uploadBody = isUrl
    ? { url: urlOrText }
    : { rawText: urlOrText, sourceType: "text" };

  // Step 1: Upload content
  const uploadRes = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(uploadBody),
  });

  const uploadData = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok && uploadRes.status !== 409) {
    throw new Error(
      (uploadData as { error?: string }).error ?? `Upload failed (${uploadRes.status})`,
    );
  }

  // Step 2: Kick off script generation
  const processRes = await fetch(`${API_BASE}/api/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      contentId: (uploadData as { id?: string }).id,
      targetMinutes: durationMinutes,
    }),
  });

  if (!processRes.ok) {
    const d = await processRes.json().catch(() => ({}));
    throw new Error(
      (d as { error?: string }).error ?? `Processing failed (${processRes.status})`,
    );
  }

  return {
    contentId: (uploadData as { id: string }).id,
    title: (uploadData as { title?: string }).title ?? "New Episode",
  };
}
