# Feature: Episode Card Redesign

> Redesign EpisodeCard with a three-column layout: source icon left, content center, duration pill right — with clear state indicators for new, in-progress, completed, and generating.

## Motivation

The current `EpisodeCard` is a functional but visually flat list item. The source badge is small and text-only, there's no description/summary shown, and completed-item dimming is heavy-handed. The redesigned card treats source identity as a visual anchor on the left, puts rich content in the center, and uses a duration pill on the right as a quick-scan affordance. State (new/in-progress/completed/generating) is shown through color and icon — not just opacity.

**Depends on:** `player-bar-upgrade` spec (for `SourceIcon` component).

## Changes

### 1. New card layout

Replace the current single-column layout with a three-column row:

```
┌─────────────────────────────────────────────────┐
│ [SourceIcon] │ Title                  │ [12 min] │
│              │ espn.com · Sports      │          │
│              │ Description preview…   │          │
│  [●new dot]  │                        │          │
└─────────────────────────────────────────────────┘
│████████████░░░░░░░░░░░░░░░░░░│  ← progress bar  │
└─────────────────────────────────────────────────┘
```

```typescript
// EpisodeCard.tsx — new layout sketch
<TouchableOpacity className="bg-white rounded-2xl shadow-sm mx-4 mb-3 overflow-hidden">
  {/* Progress bar at BOTTOM of card (moved from top) */}
  {hasProgress && (
    <View className="h-1 bg-gray-100 w-full absolute bottom-0">
      <View className="h-1 bg-brand" style={{ width: `${progressPercent}%` }} />
    </View>
  )}

  <View className="p-4 flex-row gap-3 items-start">
    {/* Left: Source icon + state dot */}
    <View className="items-center gap-1 pt-0.5">
      <SourceIcon sourceType={item.sourceType} size="md" />
      {isNew && <View className="w-2 h-2 rounded-full bg-orange-500" />}
      {allCompleted && <Ionicons name="checkmark-circle" size={14} color="#22C55E" />}
    </View>

    {/* Center: content */}
    <View className="flex-1">
      <Text className="text-sm font-bold text-gray-900" numberOfLines={2}>
        {item.title}
      </Text>
      <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>
        {sourceName(item.sourceType, item.sourceUrl, item.author)}
        {primaryVersion?.contentType ? ` · ${primaryVersion.contentType}` : ""}
      </Text>
      {primaryVersion?.summary ? (
        <Text className="text-xs text-gray-500 mt-1.5 leading-4" numberOfLines={2}>
          {primaryVersion.summary}
        </Text>
      ) : null}
      {/* Version pills */}
      <View className="flex-row items-center mt-2 gap-1.5 flex-wrap">
        {versions.map(v => <VersionPill key={v.scriptId} version={v} ... />)}
      </View>
    </View>

    {/* Right: Duration pill */}
    <View className="bg-gray-100 px-2 py-1 rounded-lg self-start">
      <Text className="text-xs font-semibold text-gray-600">
        {primaryVersion ? `${primaryVersion.targetDuration} min` : "—"}
      </Text>
    </View>
  </View>
</TouchableOpacity>
```

### 2. State indicators

Replace the opacity-based "completed" dimming with explicit state icons:

| State | Indicator | Visual |
|---|---|---|
| **New** (unlistened, position === 0, not completed) | Orange dot below SourceIcon | `w-2 h-2 bg-orange-500 rounded-full` |
| **In-progress** (position > 0, not completed) | Progress bar at card bottom | `h-1 bg-brand` at bottom |
| **Completed** | Green checkmark below SourceIcon | `Ionicons checkmark-circle color=#22C55E` |
| **Generating** | Shimmer badge replaces duration pill | Animated `ShimmerCard`-style gradient on the pill |

Remove the `style={{ opacity: allCompleted ? 0.5 : 1 }}` — use the green check instead.

### 3. Generating state shimmer on duration pill

When `isGenerating`, replace the duration pill with a shimmer:

```typescript
{isGenerating ? (
  <ShimmerPill />  // small 40×20 shimmer pill, same component as skeleton-loading
) : (
  <View className="bg-gray-100 px-2 py-1 rounded-lg">
    <Text className="text-xs font-semibold text-gray-600">
      {primaryVersion ? `${primaryVersion.targetDuration} min` : "—"}
    </Text>
  </View>
)}
```

### 4. VersionPill sub-component (extracted)

Extract the version pill rendering into a small local `VersionPill` component for clarity:

```typescript
function VersionPill({ version, isActive, onPress }: VersionPillProps) {
  const isReady = version.status === "ready";
  const label = `${version.targetDuration} min`;

  const content = (
    <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-gray-600"}`}>
      {label}
    </Text>
  );

  if (isReady && onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        className={`px-2 py-0.5 rounded-full ${isActive ? "bg-brand" : "bg-gray-100"}`}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return (
    <View className={`px-2 py-0.5 rounded-full ${isActive ? "bg-brand" : "bg-gray-100"}`}>
      {content}
    </View>
  );
}
```

### 5. `sourceName` helper

Use the same `sourceName()` utility introduced in `player-bar-upgrade`:

```typescript
import { sourceName } from "../lib/utils";
// sourceName(item.sourceType, item.sourceUrl, item.author)
// → "espn.com" / "John Smith" / "PDF"
```

### 6. Summary text

`primaryVersion.summary` is already available in `AudioVersion`. Show the first 2 lines. If null, omit the summary row entirely (no empty space).

### 7. Long-press menu — unchanged

`handleLongPress()` logic is preserved exactly as-is. No changes to action sheet.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/EpisodeCard.tsx` | Full layout redesign — 3-column, state indicators, summary text |
| `native/components/SourceIcon.tsx` | Dependency — must exist (from `player-bar-upgrade` spec) |
| `native/lib/utils.ts` | Dependency — `sourceName()` helper (from `player-bar-upgrade` spec) |

## Tests

Visual regression — manual verification:

- [ ] New episode: orange dot visible below source icon
- [ ] In-progress episode: progress bar at bottom, no dot
- [ ] Completed episode: green checkmark below source icon, no opacity dimming
- [ ] Generating episode: shimmer pill on right instead of duration number
- [ ] Summary text shows 2 lines for episodes with summaries
- [ ] Summary row absent when summary is null
- [ ] Three-column layout doesn't overflow on narrow screens (iPhone SE)
- [ ] Version pills still tappable (correct hitSlop)
- [ ] Long-press still shows action sheet

## Success Criteria

```bash
cd native && npx tsc --noEmit   # no type errors
```

- Cards in library screen use the new layout
- Cards in home screen (UpNextCard) can optionally adopt this card — that's the `homepage-redesign` spec
- No layout clipping on iPhone SE (375pt wide)

## Scope

- **No** artwork or thumbnail images (not in current data model)
- **No** swipe-to-delete gesture (that's `library-redesign` spec)
- **No** changes to `ExpandedPlayer` or `PlayerBar`
- **No** backend changes — all fields (`summary`, `contentType`, `themes`) already exist in `AudioVersion`
