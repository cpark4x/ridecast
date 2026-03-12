# Feature: Homepage Redesign

> Rebuild the home screen as a visual hybrid — hero "Now Playing" card, horizontal episode carousel, rich episode list, and a greeting header with stats — following Option B mockup.

## Motivation

The current home screen is a functional but visually sparse list of "Up Next" cards with a Play All button. Option B (visual hybrid) in `docs/mockups/option-b-visual-hybrid.html` adds a hero card when audio is playing, a horizontal carousel of recent/featured content, and a richer episode list with source icons and descriptions. This makes Ridecast feel like a media app, not a task manager.

**Depends on:** `episode-identity` (for `SourceIcon`), `episode-card-redesign` (for rich `EpisodeCard` component).

## Changes

### 1. Screen structure overview

```
SafeAreaView
├── ScrollView (entire screen)
│   ├── GreetingHeader          ← name, date, queue stats
│   ├── HeroPlayerCard?         ← only when something is playing
│   ├── HorizontalCarousel      ← recent episodes, scroll left-right
│   ├── SectionHeader "Up Next"
│   └── EpisodeCard (rich)      ← for each unlistened item
└── FAB (absolute)
```

Replace the current `FlatList` with a single `ScrollView` — the list is short enough (unlistened only) that virtual scrolling is not needed on this screen.

### 2. GreetingHeader component (`native/components/GreetingHeader.tsx` — new)

```typescript
interface GreetingHeaderProps {
  firstName: string | null;
  episodeCount: number;
  totalDurationSecs: number;
}

export default function GreetingHeader({ firstName, episodeCount, totalDurationSecs }: GreetingHeaderProps) {
  return (
    <View className="px-4 pt-3 pb-4 flex-row items-start justify-between">
      <View className="flex-1">
        <Text className="text-2xl font-bold text-gray-900">
          {getGreeting()}{firstName ? `, ${firstName}` : ""}
        </Text>
        {episodeCount > 0 ? (
          <Text className="text-sm text-gray-500 mt-0.5">
            {episodeCount} episode{episodeCount === 1 ? "" : "s"} · {formatDurationMinutes(totalDurationSecs)}
          </Text>
        ) : (
          <Text className="text-sm text-gray-500 mt-0.5">Your queue is clear</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => router.push("/settings")} className="p-2 -mr-1 mt-0.5">
        <Ionicons name="settings-outline" size={22} color="#374151" />
      </TouchableOpacity>
    </View>
  );
}
```

The greeting text and stats subtitle are carried over from the current implementation — this is a minor structural refactor.

### 3. HeroPlayerCard — upgraded currently playing

When audio is playing, the "Now Playing" section becomes a full-width hero card with a source-branded gradient background.

```typescript
// native/components/HeroPlayerCard.tsx — new
export default function HeroPlayerCard({ onExpand }: { onExpand: () => void }) {
  const { currentItem, isPlaying, togglePlay, position, duration } = usePlayer();
  if (!currentItem) return null;

  // Brand gradient colors per source type
  const GRADIENT: Record<string, [string, string]> = {
    pdf:    ["#FEF2F2", "#FEE2E2"],
    url:    ["#EFF6FF", "#DBEAFE"],
    epub:   ["#F5F3FF", "#EDE9FE"],
    txt:    ["#F9FAFB", "#F3F4F6"],
    pocket: ["#F0FDF4", "#D1FAE5"],
  };
  const [from, to] = GRADIENT[currentItem.sourceType?.toLowerCase() ?? ""] ?? ["#FFF7ED", "#FFEDD5"];
  const progressPercent = duration > 0 ? Math.min((position / duration) * 100, 100) : 0;

  return (
    <TouchableOpacity onPress={onExpand} activeOpacity={0.85} className="mx-4 mb-4 rounded-2xl overflow-hidden">
      <LinearGradient colors={[from, to]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="p-4">
        {/* "NOW PLAYING" label */}
        <Text className="text-xs font-bold text-brand uppercase tracking-widest mb-2">Now Playing</Text>

        {/* Source row */}
        <View className="flex-row items-center gap-2 mb-2">
          <SourceIcon sourceType={currentItem.sourceType ?? "url"} size="sm" />
          <Text className="text-xs text-gray-500">
            {sourceName(currentItem.sourceType ?? "", currentItem.sourceUrl, currentItem.author)}
          </Text>
        </View>

        {/* Title */}
        <Text className="text-base font-bold text-gray-900 mb-3" numberOfLines={2}>
          {currentItem.title}
        </Text>

        {/* Progress + time */}
        <View className="h-1 bg-white/50 rounded-full mb-1">
          <View className="h-1 bg-brand rounded-full" style={{ width: `${progressPercent}%` }} />
        </View>
        <View className="flex-row justify-between mt-1">
          <Text className="text-xs text-gray-500">{formatDuration(position)}</Text>
          <Text className="text-xs text-gray-500">{formatDuration(duration)}</Text>
        </View>

        {/* Controls row */}
        <View className="flex-row items-center justify-center mt-3 gap-6">
          <TouchableOpacity onPress={() => { /* skip back */ }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="play-skip-back" size={22} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void togglePlay()} className="w-12 h-12 bg-brand rounded-full items-center justify-center">
            <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { /* skip forward */ }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="play-skip-forward" size={22} color="#374151" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
```

### 4. HorizontalCarousel — recent episodes

A horizontally scrollable row of compact episode cards, showing the 8 most recently added episodes (regardless of listen status).

```typescript
// native/components/EpisodeCarousel.tsx — new
interface EpisodeCarouselProps {
  episodes: LibraryItem[];
  onPlay: (item: LibraryItem) => void;
  currentAudioId: string | null;
}

export default function EpisodeCarousel({ episodes, onPlay, currentAudioId }: EpisodeCarouselProps) {
  const recent = episodes.slice(0, 8);
  if (recent.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="px-4 text-lg font-bold text-gray-900 mb-3">Recent</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
      >
        {recent.map((item) => (
          <CarouselCard key={item.id} item={item} onPlay={onPlay} isActive={...} />
        ))}
      </ScrollView>
    </View>
  );
}
```

**CarouselCard** — compact 140×160 card:
```typescript
function CarouselCard({ item, onPlay, isActive }: ...) {
  const readyVersion = item.versions.find(v => v.status === "ready" && v.audioId);
  const duration = readyVersion?.durationSecs ?? (readyVersion?.targetDuration ?? 0) * 60;

  return (
    <TouchableOpacity
      onPress={() => onPlay(item)}
      className="w-36 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm"
      style={{ opacity: item.versions.every(v => v.completed) ? 0.55 : 1 }}
    >
      {/* Colored header strip with source icon */}
      <View className="h-20 items-center justify-center" style={{ backgroundColor: sourceColor(item.sourceType) }}>
        <SourceIcon sourceType={item.sourceType} size="lg" />
      </View>
      {/* Info */}
      <View className="p-2">
        <Text className="text-xs font-semibold text-gray-900" numberOfLines={2}>{item.title}</Text>
        <Text className="text-xs text-gray-400 mt-0.5">{formatDurationMinutes(duration)}</Text>
      </View>
      {isActive && (
        <View className="absolute top-2 right-2 w-5 h-5 bg-brand rounded-full items-center justify-center">
          <Ionicons name="musical-notes" size={10} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
}
```

### 5. Updated HomeScreen (`native/app/(tabs)/index.tsx`)

Replace the `FlatList` with a `ScrollView` + explicit section layout:

```typescript
export default function HomeScreen() {
  // ... same state/hooks as current ...

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#EA580C" />}
      >
        {isLoading && <SkeletonList count={4} />}

        {!isLoading && (
          <>
            <GreetingHeader firstName={firstName} episodeCount={episodeCount} totalDurationSecs={totalDurationSecs} />

            {/* Hero card — only when playing */}
            <HeroPlayerCard onExpand={() => player.setExpandedPlayerVisible(true)} />

            {/* Play All CTA */}
            {episodeCount > 0 && (
              <TouchableOpacity onPress={handlePlayAll} className="mx-4 mb-4 bg-brand py-4 rounded-2xl items-center">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="play" size={18} color="white" />
                  <Text className="text-base font-bold text-white">Play All · {formatDurationMinutes(totalDurationSecs)}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Horizontal carousel — all recent episodes */}
            <EpisodeCarousel episodes={episodes} onPlay={handleCarouselPlay} currentAudioId={player.currentItem?.id ?? null} />

            {/* Up Next list */}
            {upNextPairs.length > 0 && (
              <>
                <Text className="px-4 text-lg font-bold text-gray-900 mb-3">Up Next</Text>
                {upNextPairs.map(({ item }) => (
                  <EpisodeCard
                    key={item.id}
                    item={item}
                    onPress={handleCardPress}
                    onVersionPress={handleVersionPress}
                    currentAudioId={player.currentItem?.id ?? null}
                    onNewVersion={setNewVersionEpisode}
                  />
                ))}
              </>
            )}

            {/* Empty state */}
            {!isLoading && episodes.length === 0 && (
              <EmptyState ... />
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity ... />
      <UploadModal ... />
    </SafeAreaView>
  );
}
```

### 6. `handleCarouselPlay` — plays a carousel item

```typescript
function handleCarouselPlay(item: LibraryItem) {
  const playable = libraryItemToPlayable(item);
  if (playable) player.play(playable).catch(console.warn);
}
```

### 7. Dark mode consideration

The mockup uses a dark (#111827) background. For now, keep the current `bg-white` background — a dark mode toggle is a separate feature. The gradient-based `HeroPlayerCard` uses light tints that work on white.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/(tabs)/index.tsx` | Full restructure: ScrollView, GreetingHeader, HeroPlayerCard, EpisodeCarousel, EpisodeCard list |
| `native/components/HeroPlayerCard.tsx` | New — gradient Now Playing hero card with inline controls |
| `native/components/EpisodeCarousel.tsx` | New — horizontal ScrollView carousel with CarouselCard |
| `native/components/GreetingHeader.tsx` | New — extracted greeting + stats header |
| `native/components/SourceIcon.tsx` | Dependency from `player-bar-upgrade` |

## Tests

Manual verification:
- [ ] No audio playing: hero card absent, greeting + carousel + Up Next list visible
- [ ] Audio playing: hero card appears at top with correct gradient for source type
- [ ] Carousel shows up to 8 most recent episodes, scrollable
- [ ] Completed episodes in carousel show reduced opacity
- [ ] "Play All" button shows total duration
- [ ] Pull-to-refresh works on new ScrollView
- [ ] Empty state shows when no episodes exist
- [ ] Skeleton shows on cold launch, disappears after load

## Success Criteria

```bash
cd native && npx tsc --noEmit
```

- No TypeScript errors
- Home screen renders all sections correctly
- Hero card gradient matches source type
- No layout overflow or clipping

## Scope

- **No** dark background — mockup's dark theme is aspirational; keep white for now
- **No** AI-personalized recommendations — carousel is simply recent episodes sorted by `createdAt DESC`
- **No** "What's New" or editorial sections — pure user library content
- **No** artwork/album art — SourceIcon emoji only
