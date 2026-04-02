import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// ---------------------------------------------------------------------------
// Gradient palette — deterministic per source type / URL keyword
// ---------------------------------------------------------------------------

export function getSourceGradient(
  sourceType: string | null | undefined,
  sourceUrl: string | null | undefined,
): [string, string] {
  const type = (sourceType ?? "").toLowerCase();
  if (type === "url" && sourceUrl) {
    const u = sourceUrl.toLowerCase();
    if (u.includes("substack")) return ["#EA580C", "#f97316"];
    if (u.includes("github"))   return ["#24292e", "#3d4451"];
    return ["#0d9488", "#14b8a6"];
  }
  if (type === "pdf")  return ["#DC2626", "#ef4444"];
  if (type === "epub") return ["#7c3aed", "#a78bfa"];
  if (type === "txt")  return ["#4b5563", "#6b7280"];
  return ["#2563eb", "#3b82f6"];
}

// ---------------------------------------------------------------------------
// Extract hostname suitable for Clearbit API calls
// ---------------------------------------------------------------------------

export function clearbitHostname(
  sourceType: string | null | undefined,
  sourceUrl: string | null | undefined,
): string | null {
  if ((sourceType ?? "").toLowerCase() !== "url" || !sourceUrl) return null;
  try {
    const hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
    // Use registered domain (last 2 parts) — Google favicons 404 on subdomains
    const parts = hostname.split(".");
    return parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Registered domain (last two labels, e.g. "substack.com" from long subdomain)
// ---------------------------------------------------------------------------

export function registeredDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    if (parts.length >= 2) return parts.slice(-2).join(".");
    return hostname;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source type → Ionicons glyph map for badge
// ---------------------------------------------------------------------------

const SOURCE_TYPE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  url:    "globe-outline",
  pdf:    "document-text-outline",
  epub:   "book-outline",
  txt:    "text-outline",
  docx:   "document-outline",
  pocket: "bookmark-outline",
};

function sourceTypeIcon(
  sourceType: string | null | undefined,
): React.ComponentProps<typeof Ionicons>["name"] {
  return SOURCE_TYPE_ICONS[(sourceType ?? "").toLowerCase()] ?? "ellipsis-horizontal-outline";
}

// ---------------------------------------------------------------------------
// SourceThumbnail — gradient tile with Clearbit logo + source badge
// ---------------------------------------------------------------------------

interface SourceThumbnailProps {
  sourceType: string | null | undefined;
  sourceUrl: string | null | undefined;
  /** Display name — first letter used as fallback */
  sourceName: string | null | undefined;
  /** 56 for cards, 36 for mini-player */
  size?: number;
}

export default function SourceThumbnail({
  sourceType,
  sourceUrl,
  sourceName: sName,
  size = 56,
}: SourceThumbnailProps) {
  const [logoError, setLogoError] = useState(false);

  const [gradStart, gradEnd] = getSourceGradient(sourceType, sourceUrl);
  const hostname = clearbitHostname(sourceType, sourceUrl);

  // Letter fallback: first char of sourceName, else sourceType initial
  const type = (sourceType ?? "").toLowerCase();
  const letter =
    sName
      ? sName.charAt(0).toUpperCase()
      : type
        ? type.charAt(0).toUpperCase()
        : "?";

  // Logo tile: 68% of container (38px at size=56, ~24px at size=36)
  const logoSize = Math.round(size * 0.68);
  const showLogo = !!hostname && !logoError;

  // For plain-text uploads (no URL to derive a favicon from), show a
  // document icon on a neutral surface background instead of a letter "?".
  const showTextIcon = type === "txt" && !showLogo;

  return (
    <LinearGradient
      colors={[gradStart, gradEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width:           size,
        height:          size,
        borderRadius:    8,
        alignItems:      "center",
        justifyContent:  "center",
        overflow:        "hidden",
      }}
    >
      {/* Document icon for plain-text (pasted) content — replaces letter fallback */}
      {showTextIcon ? (
        <Ionicons
          name="document-text-outline"
          size={Math.round(size * 0.46)}
          color="rgba(255,255,255,0.80)"
        />
      ) : (
        /* Letter fallback — always rendered behind logo */
        <Text
          style={{
            position:   "absolute",
            color:      "rgba(255,255,255,0.55)",
            fontSize:   size * 0.39,
            fontWeight: "700",
          }}
        >
          {letter}
        </Text>
      )}

      {/* Clearbit logo tile */}
      {showLogo && (
        <Image
          source={{ uri: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128` }}
          style={{
            width:           logoSize,
            height:          logoSize,
            borderRadius:    7,
            backgroundColor: "#fff",
          }}
          onError={() => setLogoError(true)}
        />
      )}

      {/* Source type badge — bottom-right corner, shows content-type glyph */}
      {/* Only shown when no Clearbit logo is available — avoids double-logo when favicon loads */}
      {!showLogo && size >= 48 && (
        <View
          style={{
            position:        "absolute",
            bottom:          3,
            right:           3,
            width:           18,
            height:          18,
            borderRadius:    4,
            backgroundColor: "rgba(255,255,255,0.15)",
            alignItems:      "center",
            justifyContent:  "center",
          }}
        >
          <Ionicons
            name={sourceTypeIcon(sourceType)}
            size={11}
            color="rgba(255,255,255,0.75)"
          />
        </View>
      )}
    </LinearGradient>
  );
}
