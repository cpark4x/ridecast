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
import { smartTitle } from "../lib/libraryHelpers";
import { humanizeContentType, sourceName } from "../lib/utils";
import { Haptics } from "../lib/haptics";
import SourceThumbnail, { registeredDomain } from "./SourceThumbnail";

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
    outputRange: ["#F3F4F6", "#E5E7EB"],
  });

  return (
    <Animated.View style={{ width: 64, height: 22, borderRadius: 20, backgroundColor }} />
  );
}

// ---------------------------------------------------------------------------
// DurationPill — #f2f2f7 bg, #3c3c43 text, clock icon
// ---------------------------------------------------------------------------

function DurationPill({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection:   "row",
        alignItems:      "center",
        gap:             4,
        backgroundColor: "#f2f2f7",
        borderRadius:    20,
        paddingVertical: 3,
        paddingHorizontal: 9,
      }}
    >
      {/* Clock icon */}
      <Ionicons name="time-outline" size={10} color="#3c3c43" style={{ opacity: 0.6 }} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#3c3c43", letterSpacing: 0.1 }}>
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
        backgroundColor: "rgba(234,88,12,0.1)",
        borderRadius:    20,
        paddingVertical: 3,
        paddingHorizontal: 8,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#EA580C" }}>
        {count} versions
      </Text>
    </View>
  );
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
}: EpisodeCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const { versions } = item;

  // smart-titles: clean display title
  const displayTitle = smartTitle(item.title, item.sourceType, item.sourceDomain);

  // Primary version: first ready version, or first overall
  const primaryVersion = versions.find((v) => v.status === "ready") ?? versions[0];

  // State flags
  const isGenerating = versions.some((v) => v.status === "generating");

  // ---------------------------------------------------------------------------
  // Meta line: registered domain (or fallback) · contentType
  // ---------------------------------------------------------------------------

  const metaDomain =
    item.sourceType === "url" && item.sourceUrl
      ? (registeredDomain(item.sourceUrl) ?? sourceName(item.sourceType, item.sourceUrl, item.author))
      : sourceName(item.sourceType, item.sourceUrl, item.author);

  const metaLine = [
    metaDomain,
    primaryVersion?.contentType ? humanizeContentType(primaryVersion.contentType) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // ---------------------------------------------------------------------------
  // Duration label for the footer pill
  // ---------------------------------------------------------------------------

  const durationLabel = primaryVersion
    ? `${primaryVersion.targetDuration} min`
    : null;

  // ---------------------------------------------------------------------------
  // Tappable version pills (kept for onVersionPress functionality)
  // ---------------------------------------------------------------------------

  // We still propagate version taps; UI simplified to one duration pill + badge
  function handleVersionTap(v: AudioVersion) {
    if (v.status !== "ready" || !v.audioId || !onVersionPress) return;
    void Haptics.light();
    const playable: PlayableItem = {
      id:              v.audioId,
      title:           item.title,
      duration:        v.durationSecs ?? v.targetDuration * 60,
      format:          v.format,
      audioUrl:        v.audioUrl ?? "",
      author:          item.author,
      sourceType:      item.sourceType,
      sourceUrl:       item.sourceUrl,
      sourceDomain:    item.sourceDomain,
      sourceName:      item.sourceName,
      sourceBrandColor: item.sourceBrandColor,
      contentType:     v.contentType,
      themes:          v.themes,
      summary:         v.summary,
      targetDuration:  v.targetDuration,
      createdAt:       item.createdAt,
    };
    onVersionPress(item, v, playable);
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
        className="bg-red-500 mr-4 mb-3 rounded-2xl px-5 justify-center items-center"
      >
        <Ionicons name="trash-outline" size={22} color="white" />
        <Text className="text-white text-xs font-semibold mt-1">Delete</Text>
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
          options:              ["Cancel", "New Version", "Delete"],
          cancelButtonIndex:    0,
          destructiveButtonIndex: 2,
          title:                displayTitle,
        },
        (idx) => {
          if (idx === 1) onNewVersion?.(item);
          if (idx === 2) confirmDelete();
        },
      );
    } else {
      Alert.alert(displayTitle, "What would you like to do?", [
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
          backgroundColor: "#fff",
          borderRadius:    16,
          marginHorizontal: 16,
          marginBottom:    8,
          overflow:        "hidden",
          shadowColor:     "#000",
          shadowOffset:    { width: 0, height: 1 },
          shadowOpacity:   0.06,
          shadowRadius:    3,
          elevation:       1,
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

            {/* Title */}
            <Text
              style={{
                fontSize:      14,
                fontWeight:    "600",
                color:         "#000",
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
                  color:     "#8e8e93",
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
