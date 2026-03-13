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
import { sourceName } from "../lib/utils";
import { Haptics } from "../lib/haptics";
import SourceIcon from "./SourceIcon";

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
    <Animated.View style={{ width: 48, height: 22, borderRadius: 6, backgroundColor }} />
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

  // State flags — mutually exclusive for the dominant indicator
  const isGenerating = versions.some((v) => v.status === "generating");
  const allCompleted = versions.length > 0 && versions.every((v) => v.completed);
  const isNew        = !allCompleted
    && !isGenerating
    && !!primaryVersion
    && primaryVersion.position === 0
    && !primaryVersion.completed;
  const hasProgress  = !!primaryVersion
    && primaryVersion.position > 0
    && !primaryVersion.completed;

  const progressPercent =
    hasProgress && primaryVersion.durationSecs && primaryVersion.durationSecs > 0
      ? Math.min((primaryVersion.position / primaryVersion.durationSecs) * 100, 100)
      : 0;

  // ---------------------------------------------------------------------------
  // delete-episodes: confirm + execute
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

  // Right-side swipe action
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
  // Render — three-column layout
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
        className="bg-white rounded-2xl shadow-sm mx-4 mb-3 overflow-hidden"
        // No opacity dimming — completed state shown via green checkmark
      >
        {/* — Progress bar: absolute at card bottom, only when in-progress — */}
        {hasProgress && (
          <View className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100">
            <View className="h-1 bg-brand" style={{ width: `${progressPercent}%` }} />
          </View>
        )}

        <View className="p-4 flex-row gap-3 items-start">

          {/* — LEFT column: SourceIcon + state indicator — */}
          <View className="items-center gap-1.5 pt-0.5">
            <SourceIcon
              sourceName={item.sourceName}
              sourceDomain={item.sourceDomain}
              sourceBrandColor={item.sourceBrandColor}
              size={36}
            />
            {isNew && (
              <View className="w-2 h-2 rounded-full bg-orange-500" />
            )}
            {allCompleted && (
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
            )}
          </View>

          {/* — CENTER column: title, source subtitle, summary, version pills — */}
          <View className="flex-1 min-w-0">

            {/* Title */}
            <Text className="text-sm font-bold text-gray-900" numberOfLines={2}>
              {displayTitle}
            </Text>

            {/* Source · contentType subtitle */}
            <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
              {sourceName(item.sourceType, item.sourceUrl, item.author)}
              {primaryVersion?.contentType ? ` · ${primaryVersion.contentType}` : ""}
            </Text>

            {/* Summary — only rendered when present, max 2 lines */}
            {primaryVersion?.summary ? (
              <Text className="text-xs text-gray-500 mt-1.5 leading-4" numberOfLines={2}>
                {primaryVersion.summary}
              </Text>
            ) : null}

            {/* Version pills + "+" pill */}
            <View className="flex-row items-center mt-2 gap-1.5 flex-wrap">
              {versions.map((v) => {
                const isActive = !!currentAudioId && currentAudioId === v.audioId;
                const label    = `${v.targetDuration} min`;

                if (v.status === "ready" && v.audioId && onVersionPress) {
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
                  return (
                    <TouchableOpacity
                      key={v.scriptId}
                      onPress={() => { void Haptics.light(); onVersionPress(item, v, playable); }}
                      className={`px-2 py-0.5 rounded-full ${isActive ? "bg-brand" : "bg-gray-100"}`}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-600"}`}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                }

                // Non-tappable (generating / processing)
                return (
                  <View
                    key={v.scriptId}
                    className={`px-2 py-0.5 rounded-full ${isActive ? "bg-brand" : "bg-gray-100"}`}
                  >
                    <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-600"}`}>
                      {label}
                    </Text>
                  </View>
                );
              })}

              {/* "+ Version" pill — labeled button, more discoverable than bare "+" */}
              {onNewVersion ? (
                <TouchableOpacity
                  onPress={() => {
                    void Haptics.light();
                    onNewVersion(item);
                  }}
                  className="flex-row items-center gap-0.5 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200"
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  accessibilityLabel="Create a new version"
                >
                  <Ionicons name="add" size={11} color="#6B7280" />
                  <Text className="text-xs font-medium text-gray-500">Version</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* — RIGHT column: duration pill or shimmer — */}
          {isGenerating ? (
            <ShimmerPill />
          ) : (
            <View className="bg-gray-100 px-2 py-1 rounded-lg self-start">
              <Text className="text-xs font-semibold text-gray-600">
                {primaryVersion ? `${primaryVersion.targetDuration} min` : "—"}
              </Text>
            </View>
          )}

        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}