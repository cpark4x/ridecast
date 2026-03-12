# Feature: Library Redesign

> Full library screen overhaul with time-sectioned grouping, dropdown source/topic filters, sort controls, and rich episode cards — matching the library-redesign-v2 mockup.

## Motivation

The library is Ridecast's primary content surface but currently looks like a flat list with minimal filter chips. As the library grows, users need: time sections ("Today", "This Week") for temporal orientation; richer filter options including per-source and per-topic filtering; and sort controls for power users. The mockup (`docs/mockups/library-redesign-v2.html`) shows a polished, iOS-native-feeling library that matches the quality of the home screen redesign.

**Depends on:** `episode-card-redesign`, `active-filter-default`.

## Changes

### 1. Time-sectioned list

Replace the flat `FlatList` with a sectioned list using `SectionList`. Sections are:

| Section | Criteria |
|---|---|
| **Today** | `createdAt` is today (same calendar day) |
| **This Week** | `createdAt` is within the last 7 days but not today |
| **Earlier** | Everything older |

```typescript
// native/lib/libraryHelpers.ts — new helper
export function groupByTimePeriod(items: LibraryItem[]): Array<{ title: string; data: LibraryItem[] }> {
  const today: LibraryItem[] = [];
  const thisWeek: LibraryItem[] = [];
  const earlier: LibraryItem[] = [];

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

  for (const item of items) {
    const t = new Date(item.createdAt).getTime();
    if (t >= startOfToday) {
      today.push(item);
    } else if (t >= sevenDaysAgo) {
      thisWeek.push(item);
    } else {
      earlier.push(item);
    }
  }

  const sections = [];
  if (today.length > 0)    sections.push({ title: "Today", data: today });
  if (thisWeek.length > 0) sections.push({ title: "This Week", data: thisWeek });
  if (earlier.length > 0)  sections.push({ title: "Earlier", data: earlier });
  return sections;
}
```

```typescript
// In library.tsx — replace FlatList with SectionList
import { SectionList } from "react-native";

const sections = groupByTimePeriod(filtered);

<SectionList
  sections={sections}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <EpisodeCard item={item} ... />
  )}
  renderSectionHeader={({ section: { title } }) => (
    <View className="px-4 pt-4 pb-1">
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</Text>
    </View>
  )}
  contentContainerStyle={{ paddingBottom: 120 }}
  stickySectionHeadersEnabled={false}
  refreshing={refreshing}
  onRefresh={handleRefresh}
/>
```

### 2. Upgraded filter chips row

The filter chips row gains two dropdown pickers alongside the tap-toggle chips.

**New FILTERS array** (after `active-filter-default` spec adds `"active"`):

```typescript
// Tap-toggle chips (left group)
const TOGGLE_FILTERS: { key: LibraryFilter; label: string }[] = [
  { key: "active",      label: "Active"      },
  { key: "all",         label: "All"         },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "generating",  label: "Generating"  },
];

// Dropdown pickers (right group) — rendered as chips with "▾" chevron
// These open ActionSheet/Modal pickers
```

**Layout:**
```
[Active] [All] [In Progress] [Completed] [Generating]  |  [Sources ▾] [Topics ▾]
```

All chips in a single horizontal `ScrollView`. The "Sources ▾" and "Topics ▾" chips open pickers when tapped.

### 3. Sources dropdown filter

When "Sources ▾" is tapped, show an `ActionSheetIOS` (iOS) or `Modal` picker (Android) listing all unique source domains/types in the library:

```typescript
const [sourceFilter, setSourceFilter] = useState<string | null>(null);

function handleSourceFilterPress() {
  // Build list from current episodes
  const sources = [...new Set(
    episodes
      .map(i => i.sourceUrl ? new URL(i.sourceUrl).hostname.replace(/^www\./, "") : i.sourceType.toUpperCase())
  )].sort();

  ActionSheetIOS.showActionSheetWithOptions(
    {
      options: ["All Sources", ...sources, "Cancel"],
      cancelButtonIndex: sources.length + 1,
      title: "Filter by Source",
    },
    (idx) => {
      if (idx === 0) setSourceFilter(null);
      else if (idx <= sources.length) setSourceFilter(sources[idx - 1]);
    }
  );
}
```

When `sourceFilter` is set, additionally filter `filtered` by matching source domain/type.

### 4. Topics dropdown filter

Same pattern for topics. Topics come from `version.themes` (the JSON array on each `AudioVersion`):

```typescript
const [topicFilter, setTopicFilter] = useState<string | null>(null);

// Build unique topics across all episodes
const allTopics = [...new Set(
  episodes.flatMap(i => i.versions.flatMap(v => v.themes ?? []))
)].sort();
```

If `topicFilter` is set, show only episodes where at least one version has that theme in its `themes` array.

### 5. Sort control in header

Add a sort icon button to the library header (right of "Library" title):

```typescript
type SortOrder = "date_desc" | "date_asc" | "title_asc" | "duration_asc" | "source_asc";
const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");

// Header:
<View className="flex-row items-center justify-between px-4 pt-2 pb-3">
  <Text className="text-2xl font-bold text-gray-900">Library</Text>
  <View className="flex-row gap-2 items-center">
    {/* Sort button */}
    <TouchableOpacity onPress={handleSortPress} className="p-2" hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="funnel-outline" size={20} color="#374151" />
    </TouchableOpacity>
    {/* Settings gear */}
    <TouchableOpacity onPress={() => router.push("/settings")} className="p-2 -mr-1">
      <Ionicons name="settings-outline" size={22} color="#374151" />
    </TouchableOpacity>
  </View>
</View>
```

Sort options via ActionSheet:
```typescript
function handleSortPress() {
  ActionSheetIOS.showActionSheetWithOptions(
    {
      options: ["Cancel", "Newest First", "Oldest First", "Title A→Z", "Shortest First", "By Source"],
      cancelButtonIndex: 0,
      title: "Sort By",
    },
    (idx) => {
      const orders: (SortOrder | null)[] = [null, "date_desc", "date_asc", "title_asc", "duration_asc", "source_asc"];
      if (orders[idx]) setSortOrder(orders[idx]!);
    }
  );
}
```

### 6. Sort application helper

```typescript
// native/lib/libraryHelpers.ts
export function sortEpisodes(items: LibraryItem[], order: SortOrder): LibraryItem[] {
  const sorted = [...items];
  switch (order) {
    case "date_desc": return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "date_asc":  return sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "title_asc": return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "source_asc": return sorted.sort((a, b) => a.sourceType.localeCompare(b.sourceType));
    case "duration_asc":
      return sorted.sort((a, b) => {
        const aDur = a.versions[0]?.targetDuration ?? Infinity;
        const bDur = b.versions[0]?.targetDuration ?? Infinity;
        return aDur - bDur;
      });
    default: return sorted;
  }
}
```

### 7. Combined filter pipeline

Apply filters in order: base filter → source filter → topic filter → sort:

```typescript
const filtered = useMemo(() => {
  let result = filterEpisodes(episodes, filter);           // active/all/in_progress/etc.
  if (sourceFilter) {
    result = result.filter(i => {
      const domain = i.sourceUrl ? new URL(i.sourceUrl).hostname.replace(/^www\./, "") : i.sourceType.toUpperCase();
      return domain === sourceFilter;
    });
  }
  if (topicFilter) {
    result = result.filter(i => i.versions.some(v => v.themes?.includes(topicFilter)));
  }
  return sortEpisodes(result, sortOrder);
}, [episodes, filter, sourceFilter, topicFilter, sortOrder]);

const sections = groupByTimePeriod(filtered);
```

### 8. Active filter chip indicator

When `sourceFilter` or `topicFilter` is active, show the chip with a brand-colored background and a small clear button:

```typescript
<TouchableOpacity
  onPress={handleSourceFilterPress}
  className={`flex-row items-center gap-1 px-3 py-1.5 rounded-full ${sourceFilter ? "bg-brand" : "bg-gray-100"}`}
>
  <Text className={`text-sm font-medium ${sourceFilter ? "text-white" : "text-gray-700"}`}>
    {sourceFilter ?? "Sources"}
  </Text>
  <Ionicons name={sourceFilter ? "close-circle" : "chevron-down"} size={14} color={sourceFilter ? "white" : "#9CA3AF"} />
</TouchableOpacity>
```

If user taps a chip with an active filter, the chip clears the filter directly (no picker shown).

### 9. Swipe-to-delete (basic)

Add a basic swipe-to-delete using React Native's built-in gesture approach. For now, only mark as a placeholder — the actual delete API call will be added when deletion is implemented.

This is optional in this spec. The `EpisodeCard` long-press "Delete" option already exists and can be the primary path. Swipe gesture is a stretch goal.

## Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/(tabs)/library.tsx` | Full restructure: SectionList, expanded filters, sort control, source/topic dropdowns |
| `native/lib/libraryHelpers.ts` | Add `groupByTimePeriod()`, `sortEpisodes()`, `SortOrder` type |
| `native/lib/types.ts` | Add `SortOrder` type (or keep in libraryHelpers) |

## Tests

**`native/lib/libraryHelpers.test.ts`**:

```typescript
describe("groupByTimePeriod", () => {
  it("puts today's items in Today section", () => { ... });
  it("puts last-7-days items in This Week section", () => { ... });
  it("puts older items in Earlier section", () => { ... });
  it("omits empty sections", () => { ... });
});

describe("sortEpisodes", () => {
  it("sorts date_desc correctly", () => { ... });
  it("sorts title_asc alphabetically", () => { ... });
});
```

## Success Criteria

```bash
cd native && npx tsc --noEmit
```

- [ ] Library sections: Today / This Week / Earlier appear with correct section headers
- [ ] "Sources ▾" chip opens ActionSheet with real domains from the library
- [ ] Selecting a source filters the list; chip turns orange with clear button
- [ ] "Topics ▾" chip opens ActionSheet with themes from episodes
- [ ] Sort icon in header opens sort picker; list re-orders
- [ ] Default filter is "Active" (from `active-filter-default` spec)
- [ ] Search still works alongside all filters (query overrides section grouping)

## Scope

- **No** swipe-to-delete in this spec (long-press Delete is sufficient for now)
- **No** saved/pinned filters
- **No** custom theme management — topics come from AI-generated `themes` array only
- Section headers don't stick (non-sticky) — cleaner visual than iOS default sticky headers
- **No** count badges on filter chips (stretch goal for later)
