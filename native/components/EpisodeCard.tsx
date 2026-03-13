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
import SourceIcon from "./SourceIcon";

// ---------------------------------------------------------------------------
// Source badge colours
// ---------------------------------------------------------------------------

const SOURCE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  pdf:    { bg: "bg-red-100",    text: "text-red-700",    label: "PDF"    },
  url:    { bg: "bg-blue-100",   text: "text-blue-700",   label: "URL"    },
  epub:   { bg: "bg-purple-100", text: "text-purple-700", label: "EPUB"   },
  txt:    { bg: "bg-gray-100",   text: "text-gray-700",   label: "TXT"    },
  pocket: { bg: "bg-green-100",  text: "text-green-700",  label: "Pocket" },
};

function defaultBadge(sourceType: string) {
  return { bg: "bg-gray-100", text: "text-gray-700", label: sourceType.toUpperCase() };
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

  const badge = SOURCE_BADGE[item.sourceType.toLowerCase()] ?? defaultBadge(item.sourceType);

  const isGenerating = versions.some((v) => v.status === "generating");
  const allCompleted = versions.length > 0 && versions.every((v) => v.completed);

  // Primary version: first ready version, or first overall
  const primaryVersion = versions.find((v) => v.status === "ready") ?? versions[0];

  const hasProgress =
    primaryVersion &&
    primaryVersion.position > 0 &&
    !primaryVersion.completed;

  const progressPercent =
    hasProgress && primaryVersion.durationSecs && primaryVersion.durationSecs > 0
      ? Math.min((primaryVersion.position / primaryVersion.durationSecs) * 100, 100)
      : 0;

  // ---------------------------------------------------------------------------
  // generating-feedback: pulse animation on the "Generating" badge
  // ---------------------------------------------------------------------------

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isGenerating) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue:         1.15,
            duration:        600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue:         1.0,
            duration:        600,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isGenerating, pulseAnim]);

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
        className="bg-white rounded-2xl shadow-sm mx-4 mb-3 overflow-hidden"
        style={{ opacity: allCompleted ? 0.5 : 1 }}
        activeOpacity={0.75}
      >
        {/* Progress bar */}
        {hasProgress && (
          <View className="h-1 bg-gray-100 w-full">
            <View className="h-1 bg-brand" style={{ width: `${progressPercent}%` }} />
          </View>
        )}

        <View className="p-4">
          {/* Title row */}
          <View className="flex-row items-start justify-between gap-2">
            <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={2}>
              {displayTitle}
            </Text>

            {/* generating-feedback: pulsing badge */}
            {isGenerating && (
              <Animated.View
                className="bg-amber-100 px-2 py-0.5 rounded-full self-start"
                style={{ transform: [{ scale: pulseAnim }] }}
              >
                <Text className="text-xs text-amber-700 font-medium">Generating</Text>
              </Animated.View>
            )}
          </View>

          {/* episode-identity: source icon + publisher name */}
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <SourceIcon
              sourceName={item.sourceName}
              sourceDomain={item.sourceDomain}
              sourceBrandColor={item.sourceBrandColor}
              size={14}
            />
            <Text className="text-sm text-gray-500 flex-1" numberOfLines={1}>
              {item.sourceName ?? item.author ?? item.sourceType.toUpperCase()}
            </Text>
          </View>

          {/* episode-identity: description snippet */}
          {item.description ? (
            <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Footer: source badge + version pills */}
          <View className="flex-row items-center mt-3 gap-2 flex-wrap">
            {/* Source badge */}
            <View className={`${badge.bg} px-2 py-0.5 rounded-full`}>
              <Text className={`text-xs font-medium ${badge.text}`}>{badge.label}</Text>
            </View>

            {/* Per-version duration pills */}
            {versions.map((v) => {
              const isActive = !!currentAudioId && currentAudioId === v.audioId;
              const label    = `${v.targetDuration} min`;

              if (v.status === "ready" && v.audioId && onVersionPress) {
                const playable: PlayableItem = {
                  id:             v.audioId,
                  title:          item.title,
                  duration:       v.durationSecs ?? v.targetDuration * 60,
                  format:         v.format,
                  audioUrl:       v.audioUrl ?? "",
                  author:         item.author,
                  sourceType:     item.sourceType,
                  sourceDomain:   item.sourceDomain,
                  contentType:    v.contentType,
                  themes:         v.themes,
                  summary:        v.summary,
                  targetDuration: v.targetDuration,
                  createdAt:      item.createdAt,
                };
                return (
                  <TouchableOpacity
                    key={v.scriptId}
                    onPress={() => onVersionPress(item, v, playable)}
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
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}
