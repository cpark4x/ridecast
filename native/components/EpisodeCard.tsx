import React, { useEffect, useRef } from "react";
import {
  ActionSheetIOS,
  Alert,
  Animated,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { Ionicons } from "@expo/vector-icons";
import type { AudioVersion, LibraryItem, PlayableItem } from "../lib/types";
import { buildPlayableItem, smartTitle } from "../lib/libraryHelpers";
import { humanizeContentType, sourceName } from "../lib/utils";
import { Haptics } from "../lib/haptics";
import SourceThumbnail, { registeredDomain } from "./SourceThumbnail";
import { colors, borderRadius, spacing } from "../lib/theme";

// ---------------------------------------------------------------------------
// ShimmerPill — animated placeholder shown when isGenerating
// ---------------------------------------------------------------------------

function ShimmerPill() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 700, useNativeDriver: false }),
      ]),
    ).start();
  }, [shimmer]);

  const backgroundColor = shimmer.interpolate({
    inputRange:  [0, 1],
    outputRange: [colors.surface, colors.surfaceElevated],
  });

  return (
    <Animated.View style={{ width: 64, height: 22, borderRadius: 20, backgroundColor }} />
  );
}

// ---------------------------------------------------------------------------
// DurationPill — surfaceElevated bg, textSecondary text+icon
// ---------------------------------------------------------------------------

function DurationPill({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection:   "row",
        alignItems:      "center",
        gap:             4,
        backgroundColor: colors.surfaceElevated,
        borderRadius:    20,
        paddingVertical: 3,
        paddingHorizontal: 9,
      }}
    >
      {/* Clock icon */}
      <Ionicons name="time-outline" size={10} color={colors.textSecondary} style={{ opacity: 0.6 }} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textSecondary, letterSpacing: 0.1 }}>
        {label}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// VersionsBadge — orange-tinted pill shown when multiple versions exist
// ---------------------------------------------------------------------------

function VersionsBadge({ count }: { count: number }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(255,107,53,0.15)",
        borderRadius:    20,
        paddingVertical: 3,
        paddingHorizontal: 8,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.accentPrimary }}>
        {count} versions
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// contentTypeForSource — override AI label for known domains / source types
// ---------------------------------------------------------------------------

function contentTypeForSource(
  sourceType: string | null | undefined,
  sourceUrl:  string | null | undefined,
  aiContentType: string | null | undefined,
): string {
  // PDF uploads always show "Document" regardless of AI inference
  if ((sourceType ?? "").toLowerCase() === "pdf") return "Document";

  if (sourceUrl) {
    const host = sourceUrl.toLowerCase();
    if (host.includes("substack"))   return "Newsletter";
    if (host.includes("github.com")) return "Repository";
    if (host.includes("arxiv"))      return "Paper";
    if (host.includes("medium.com")) return "Blog Post";
  }
  // Fall back to humanized AI content type
  return humanizeContentType(aiContentType);
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EpisodeCardProps {
  item: LibraryItem;
  onPress: (item: LibraryItem) => void;
  /** Called when user taps a specific version pill (plays that version) */
  onVersionPress?: (item: LibraryItem, version: AudioVersion, playable: PlayableItem) => void;
  /** audioId of the currently playing track — highlights active version pill */
  currentAudioId?: string | null;
  /** Called when "New Version" is chosen from long-press menu */
  onNewVersion?: (item: LibraryItem) => void;
  /** Called after user confirms deletion via swipe or long-press */
  onDelete?: (item: LibraryItem) => void;
  /** Called when "Rename" is chosen from long-press menu */
  onRename?: (item: LibraryItem) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EpisodeCard({
  item,
  onPress,
  onVersionPress,
  currentAudioId,
  onNewVersion,
  onDelete,
  onRename,
}: EpisodeCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const { versions } = item;

  // Detect anonymous / untitled items before running smartTitle
  const isAnonymous = !item.title?.trim() || item.title.trim() === "(anonymous)";

  // smart-titles: clean display title — anonymous items get a fixed fallback
  const displayTitle = isAnonymous
    ? "Untitled Upload"
    : smartTitle(item.title, item.sourceType, item.sourceDomain);

  // Primary version: first ready version, or first overall
  const primaryVersion = versions.find((v) => v.status === "ready") ?? versions[0];

  // State flags
  const isGenerating = versions.some((v) => v.status === "generating");

  // ---------------------------------------------------------------------------
  // Meta line: registered domain (or fallback) · contentType
  // Anonymous items skip the domain — just show the content type.
  // ---------------------------------------------------------------------------

  const metaDomain = isAnonymous
    ? null
    : item.sourceType === "url" && item.sourceUrl
      ? (registeredDomain(item.sourceUrl) ?? sourceName(item.sourceType, item.sourceUrl, item.author))
      : sourceName(item.sourceType, item.sourceUrl, item.author);

  const contentTypeLabel = primaryVersion
    ? contentTypeForSource(item.sourceType, item.sourceUrl, primaryVersion.contentType)
    : null;

  const metaLine = [metaDomain, contentTypeLabel || null]
    .filter(Boolean)
    .join(" · ");

  // ---------------------------------------------------------------------------
  // Duration label for the footer pill
  // ---------------------------------------------------------------------------

  // Only show the pill when a positive targetDuration exists
  const durationLabel =
    primaryVersion?.targetDuration != null && primaryVersion.targetDuration > 0
      ? `${primaryVersion.targetDuration} min`
      : null;

  // ---------------------------------------------------------------------------
  // Tappable version pills (kept for onVersionPress functionality)
  // ---------------------------------------------------------------------------

  // We still propagate version taps; UI simplified to one duration pill + badge
  function handleVersionTap(v: AudioVersion) {
    if (v.status !== "ready" || !v.audioId || !onVersionPress) return;
    void Haptics.light();
    onVersionPress(item, v, buildPlayableItem(item, v));
  }

  // ---------------------------------------------------------------------------
  // Delete helpers
  // ---------------------------------------------------------------------------

  function confirmDelete() {
    Alert.alert(
      "Delete Episode",
      "This will permanently delete this episode and all its audio versions.",
      [
        {
          text:    "Cancel",
          style:   "cancel",
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text:    "Delete",
          style:   "destructive",
          onPress: () => {
            swipeableRef.current?.close();
            onDelete?.(item);
          },
        },
      ],
    );
  }

  function renderRightActions() {
    return (
      <TouchableOpacity
        onPress={confirmDelete}
        style={{
          backgroundColor: colors.statusError,
          marginRight: 4,
          marginBottom: 12,
          borderRadius: borderRadius.card,
          paddingHorizontal: 20,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="trash-outline" size={22} color="white" />
        <Text style={{ color: "white", fontSize: 12, fontWeight: "600", marginTop: 4 }}>Delete</Text>
      </TouchableOpacity>
    );
  }

  // ---------------------------------------------------------------------------
  // Long-press action sheet
  // ---------------------------------------------------------------------------

  function handleLongPress() {
    void Haptics.medium();
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options:              ["Cancel", "Rename", "New Version", "Delete"],
          cancelButtonIndex:    0,
          destructiveButtonIndex: 3,
          title:                displayTitle,
        },
        (idx) => {
          if (idx === 1) onRename?.(item);
          if (idx === 2) onNewVersion?.(item);
          if (idx === 3) confirmDelete();
        },
      );
    } else {
      Alert.alert(displayTitle, "What would you like to do?", [
        { text: "Rename", onPress: () => onRename?.(item) },
        { text: "New Version", onPress: () => onNewVersion?.(item) },
        { text: "Delete", style: "destructive", onPress: () => confirmDelete() },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={onDelete ? renderRightActions : undefined}
      overshootRight={false}
      friction={2}
      rightThreshold={80}
    >
      <TouchableOpacity
        onPress={() => onPress(item)}
        onLongPress={handleLongPress}
        delayLongPress={400}
        activeOpacity={0.75}
        style={{
          backgroundColor:  colors.surface,
          borderRadius:     borderRadius.card,
          marginHorizontal: spacing.screenMargin,
          marginBottom:     spacing.cardGap,
          overflow:         "hidden",
        }}
      >
        <View
          style={{
            padding:        14,
            flexDirection:  "row",
            alignItems:     "flex-start",
            gap:            12,
          }}
        >
          {/* ── LEFT: thumbnail ── */}
          <TouchableOpacity
            activeOpacity={versions.length > 1 && !!onVersionPress ? 0.7 : 1}
            onPress={() => {
              // Tap thumbnail → play primary version if available
              if (primaryVersion && primaryVersion.status === "ready") {
                handleVersionTap(primaryVersion);
              }
            }}
            style={{ paddingTop: 2 }}
          >
            <SourceThumbnail
              sourceType={item.sourceType}
              sourceUrl={item.sourceUrl}
              sourceName={item.sourceName}
              size={56}
            />
          </TouchableOpacity>

          {/* ── CENTER: title, meta, footer ── */}
          <View style={{ flex: 1, minWidth: 0 }}>

            {/* Title — italic + muted when anonymous/untitled */}
            <Text
              style={{
                fontSize:      14,
                fontWeight:    "600",
                color:         isAnonymous ? colors.textTertiary : colors.textPrimary,
                fontStyle:     isAnonymous ? "italic" : "normal",
                lineHeight:    19,
                letterSpacing: -0.1,
                marginBottom:  4,
              }}
              numberOfLines={2}
            >
              {displayTitle}
            </Text>

            {/* Meta: domain · contentType */}
            {metaLine ? (
              <Text
                style={{
                  fontSize:  12,
                  color:     colors.textSecondary,
                  marginBottom: 7,
                }}
                numberOfLines={1}
              >
                {metaLine}
              </Text>
            ) : null}

            {/* Footer: duration pill + versions badge (or shimmer) */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {isGenerating ? (
                <ShimmerPill />
              ) : (
                <>
                  {durationLabel && (
                    <TouchableOpacity
                      activeOpacity={primaryVersion?.status === "ready" ? 0.7 : 1}
                      onPress={() => primaryVersion && handleVersionTap(primaryVersion)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <DurationPill label={durationLabel} />
                    </TouchableOpacity>
                  )}
                  {versions.length > 1 && (
                    <VersionsBadge count={versions.length} />
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}
