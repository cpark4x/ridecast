// Keep this file lean — do NOT import from the main app bundle.
// Only use React Native core + expo-share-extension.
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ShareExtension from "expo-share-extension";
import { submitToRidecast, getAuthToken } from "./api";

const DURATION_OPTIONS = [5, 10, 15, 20, 30] as const;
type Duration = (typeof DURATION_OPTIONS)[number];

type Status = "idle" | "submitting" | "success" | "error";

interface SharedContent {
  url: string | null;
  text: string | null;
}

export default function ShareView() {
  const [content, setContent]   = useState<SharedContent>({ url: null, text: null });
  const [duration, setDuration] = useState<Duration>(10);
  const [status, setStatus]     = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null); // null = loading

  // ── Read shared content + check auth on mount ────────────────
  useEffect(() => {
    Promise.all([
      readSharedContent(),
      getAuthToken().then((t) => setIsAuthed(!!t)),
    ]).catch(() => setIsAuthed(false));
  }, []);

  async function readSharedContent() {
    try {
      const data = await ShareExtension.data();
      const url  = data.find((item) => item.type === "url")?.value  ?? null;
      const text = data.find((item) => item.type === "text")?.value ?? null;
      setContent({ url, text });
    } catch {
      // ShareExtension.data() can fail in Simulator — ignore
      setContent({ url: null, text: null });
    }
  }

  // ── Submit ──────────────────────────────────────────────────
  async function handleCreate() {
    const input = content.url ?? content.text;
    if (!input) {
      setErrorMsg("No content found. Please share a URL or text.");
      return;
    }

    // Reject text that's too short to be useful
    const isUrl = /^https?:\/\//i.test(input);
    if (!isUrl && input.split(/\s+/).filter(Boolean).length < 50) {
      setErrorMsg(
        "Selected text is too short to create an episode (< 50 words). Try sharing a full article URL instead.",
      );
      return;
    }

    setStatus("submitting");
    setErrorMsg(null);

    try {
      await submitToRidecast(input, duration);
      setStatus("success");
      // Auto-close after short delay
      setTimeout(() => ShareExtension.close(), 1600);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  // ── Display URL ────────────────────────────────────────────
  const displayText = (() => {
    if (content.url) {
      try {
        return new URL(content.url).hostname.replace(/^www\./, "");
      } catch {
        return content.url.slice(0, 60);
      }
    }
    if (content.text) return content.text.slice(0, 80);
    return null;
  })();

  // ── Auth loading ───────────────────────────────────────────
  if (isAuthed === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#EA580C" />
      </SafeAreaView>
    );
  }

  // ── Not signed in ─────────────────────────────────────────
  if (!isAuthed) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => ShareExtension.close()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add to Ridecast</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.body}>
          <Text style={styles.errorText}>
            Please open Ridecast and sign in before using the share extension.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => {
              ShareExtension.openURL("ridecast://sign-in").catch(() => {});
              ShareExtension.close();
            }}
          >
            <Text style={styles.createButtonText}>Open Ridecast</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main UI ────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => ShareExtension.close()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to Ridecast</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.body}>
        {/* Content preview */}
        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>Adding</Text>
          <Text style={styles.previewText} numberOfLines={3}>
            {displayText ?? "Unknown content"}
          </Text>
        </View>

        {/* Duration picker */}
        <Text style={styles.sectionLabel}>Episode Duration</Text>
        <View style={styles.durationRow}>
          {DURATION_OPTIONS.map((min) => (
            <TouchableOpacity
              key={min}
              onPress={() => setDuration(min)}
              style={[
                styles.durationButton,
                duration === min && styles.durationButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.durationButtonText,
                  duration === min && styles.durationButtonTextSelected,
                ]}
              >
                {min}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error message */}
        {status === "error" && errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : null}

        {/* Success message */}
        {status === "success" ? (
          <Text style={styles.successText}>✓ Episode added to your library</Text>
        ) : null}

        {/* Create button */}
        <TouchableOpacity
          onPress={handleCreate}
          disabled={status === "submitting" || status === "success"}
          style={[
            styles.createButton,
            (status === "submitting" || status === "success") &&
              styles.createButtonDisabled,
          ]}
        >
          {status === "submitting" ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.createButtonText}>Create Episode</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles (inline — no NativeWind in share extension) ───────
const styles = {
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  cancelText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "400" as const,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  previewCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 22,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#9CA3AF",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  durationRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 24,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center" as const,
    backgroundColor: "#F3F4F6",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  durationButtonSelected: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  durationButtonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#374151",
  },
  durationButtonTextSelected: {
    color: "#FFFFFF",
  },
  createButton: {
    backgroundColor: "#EA580C",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginTop: 4,
  },
  createButtonDisabled: {
    opacity: 0.65,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    textAlign: "center" as const,
    marginBottom: 16,
    lineHeight: 18,
  },
  successText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#16A34A",
    textAlign: "center" as const,
    marginBottom: 16,
  },
} as const;
