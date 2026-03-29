# F-P5-UI-11: Discover Main + Discover Topic Screens

## 1. Overview

**Module:** `native/app/(tabs)/discover.tsx` (REPLACE scaffold) · `native/app/(tabs)/discover-topic.tsx` (CREATE)
**Phase:** 5 — Discover Flow — New Screens
**Priority:** P1
**Size:** L — 3pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `nav-shell-redesign` (F-P5-UI-02) · `discover-ftue` (F-P5-UI-10)

The current `discover.tsx` is a minimal placeholder scaffold (centered "Discover" text) from `nav-shell-redesign`. This spec replaces it with the full personalized discovery feed. A second new screen `discover-topic.tsx` provides the filtered topic view when a user taps a topic chip.

**Route placement:**
- `native/app/(tabs)/discover.tsx` — main Discover screen (tab screen, always visible in tab bar)
- `native/app/(tabs)/discover-topic.tsx` — drill-down topic screen (hidden tab, registered with `href: null`)

`discover-topic.tsx` lives inside `(tabs)/` so the tab bar and mini player remain visible when navigating into it. Register it as a hidden tab with `href: null` in `native/app/(tabs)/_layout.tsx`.

**Source material:** `ui-studio/blueprints/12-discover-main/component-spec.md` · `ui-studio/blueprints/12-discover-main/tokens.json` · `ui-studio/blueprints/12c-discover-topic/component-spec.md` · `ui-studio/blueprints/12c-discover-topic/tokens.json`

---

## 2. Requirements

### Interfaces

#### `native/app/(tabs)/discover.tsx`

```typescript
// Exported: default function DiscoverScreen(): JSX.Element

interface DiscoveryArticle {
  id: string;
  title: string;
  sourceName: string;        // e.g. "MIT Technology Review"
  readMinutes: number;       // e.g. 8
  contextBadge: string;      // e.g. "Trending in Science"
  badgeCategory: 'science' | 'tech' | 'business' | 'psychology' | 'fiction' | 'news' | 'biography';
  imageUrl?: string;
}

interface DiscoverySource {
  id: string;
  name: string;
  categoryLabel: string;     // e.g. "Science · 3 new articles"
  logoColor: string;
  shortLabel: string;
  isFollowed: boolean;
}

interface DiscoveryTopic {
  id: string;
  emoji: string;
  name: string;
  newCount: number;
  categoryColor: string;     // from colors.content*
}

// State:
const [searchQuery, setSearchQuery] = useState('');
// NOTE: followedSources state is visual-only for now — no AsyncStorage persistence.
// The FTUE spec saves followed sources to AsyncStorage; this screen may read that
// on mount but does not write back. Follow button toggles are local state only.
const [followedSourceIds, setFollowedSourceIds] = useState<Set<string>>(new Set());

// On mount: load followedSourceIds from AsyncStorage ('discover_ftue_followed_sources') — read-only
// On mount: check FTUE completion ('discover_ftue_completed') with useRef guard — redirect if needed
```

#### `native/app/(tabs)/discover-topic.tsx`

```typescript
// Route params: topicId: string  topicName: string  emoji: string
// Exported: default function DiscoverTopicScreen(): JSX.Element
// Receives topic context via useLocalSearchParams<{ topicId: string; topicName: string; emoji: string }>()
```

#### `native/app/(tabs)/_layout.tsx` changes required by this spec

```typescript
// Add hidden Tabs.Screen for discover-topic.
// "href: null" hides it from the tab bar while still registering the route in the tab shell.
<Tabs.Screen
  name="discover-topic"
  options={{ href: null, headerShown: false }}
/>
```

### Behavior

#### `DiscoverScreen` layout

```
SafeAreaView (bg: backgroundScreen #0F0F1A, flex:1)
  HeaderSection (paddingHorizontal: 20, paddingTop: 8)
    "Discover" title  28px/700, textPrimary
    SearchBar
      bg: surfaceElevated (#242438), borderRadius:10, height:48
      SearchIcon (#9CA3AF) + TextInput
        placeholder "Search topics or sources..."
        placeholderTextColor: textSecondary (#9CA3AF)
        value: searchQuery, onChangeText: setSearchQuery
        onSubmitEditing: filter discovery content client-side (NO URL-upload behavior)
  ScrollView (showsVerticalScrollIndicator:false, contentContainerStyle:{paddingBottom:180})
    ForYouSection (marginTop:24, paddingHorizontal:20)
      SectionHeader "For You" (22px/600, textPrimary, marginBottom:12)
      ArticleCardScroll (horizontal ScrollView, showsHorizontalScrollIndicator:false)
        paddingLeft: 20, gap: 12
        [each article] DiscoveryArticleCard (width:260, bg:surface #1A1A2E, r:10)
          ImagePlaceholder (full width, height:140, r:10 top only, bg:surfaceElevated)
            OR actual image if imageUrl set
          ContextBadge (position:absolute, top:8, left:8)
            pill: bg uses category color at 90% opacity, text:white, 11px/400, r:9999, px:8, py:4
          TitleText (18px/600, textPrimary, px:12, pt:8, numberOfLines:2)
          MetaText  (13px/400, textSecondary, px:12, pb:12) "{sourceName} · {N} min read"
          AddButton (position:absolute, bottom:8, right:8)
            bg:surfaceElevated, r:9999, w:32, h:32, Ionicons "add" size:16, textSecondary
    YourTopicsSection (marginTop:32, paddingHorizontal:20)
      SectionHeader "Your Topics" (22px/600, textPrimary, marginBottom:12)
      TopicsScrollRow (horizontal ScrollView, showsHorizontalScrollIndicator:false)
        paddingLeft: 0, gap:12
        [each topic] TopicPill (bg:surface #1A1A2E, r:10, padding:12×16, flexRow, gap:8)
          Emoji (16px text)
          Name (15px/600, textPrimary)
          Count ("N new", 13px/400, textSecondary)
          onPress: router.push({ pathname:'/(tabs)/discover-topic', params:{topicId,topicName,emoji} })
    RecommendedSection (marginTop:32)
      SectionHeaderRow (flexRow, justifyContent:'space-between', paddingHorizontal:20, mb:12)
        "Recommended" (22px/600, textPrimary)
        SeeAllLink ("See all", 15px/400, accentPrimary, + Ionicons "chevron-right" size:14)
      SourceList (paddingHorizontal:20, gap:12)
        [each source] SourceRow (flexRow, alignItems:center, minHeight:60, gap:12)
          LogoBlock (44×44, r:8, bg:source.logoColor)
            ShortLabel (13px/700, white)
          TextGroup (flex:1)
            SourceName  (15px/600, textPrimary)
            SourceMeta  (12px/400, textSecondary, marginTop:2)
          FollowButton
            [followed]     bg:accentPrimary, r:9999, px:16, py:6, "Following" 12px/600, textPrimary
            [not followed] bg:transparent, border:1px #3F3F4E, r:9999, px:16, py:6, "Follow" 12px/600, textTertiary
```

**SearchBar behavior:**
- Controlled input: `value={searchQuery}`, `onChangeText={setSearchQuery}`
- `onSubmitEditing`: filter the discovery feed content client-side by title/source matching `searchQuery`
- **Do NOT implement URL detection or upload modal trigger from this search bar.** URL upload belongs in the Library/Upload flow. The Discover search bar is for content discovery only.

**For You section data:** Static hardcoded `FOR_YOU_ARTICLES` array for this phase. Future: API-driven.

**Your Topics section data:** Load from `AsyncStorage ('discover_ftue_selected_topics')` on mount. Map topic IDs to `DiscoveryTopic` objects. If not set (user skipped FTUE), show default set: `['science', 'ai-tech', 'psychology']`.

**Recommended sources data:** Read `followedSourceIds` from AsyncStorage on mount (read-only). Show 6 suggested sources. Toggle follow updates `followedSourceIds` local state only — **no AsyncStorage write-back from this screen**. Follow state is visual-only.

**Follow button interaction:** Toggle `followedSourceIds` local Set. `Haptics.light()`. No AsyncStorage persistence from this screen.

---

#### `DiscoverTopicScreen` layout

```
SafeAreaView (bg: backgroundScreen #0F0F1A, flex:1)
  BackNavBar (height:44, paddingHorizontal:20, flexRow, alignItems:center)
    BackButton (flexRow, gap:4)
      Ionicons "chevron-back" size:24, textSecondary (#9CA3AF)
      Text "Discover"  17px/400, textSecondary  ← back label uses parent screen name
    Spacer (flex:1)
    FilterIcon (Ionicons "options-outline" size:24, textSecondary) [visual only — no action this phase]
  FlatList (paddingHorizontal:20, contentContainerStyle:{paddingBottom:180})
    ListHeaderComponent:
      TopicHeader (paddingTop:16, paddingBottom:12)
        TopicHeadingRow (flexRow, gap:8, alignItems:center)
          TopicEmoji (28px text)
          TopicTitle  (28px/700, textPrimary)
        TopicStats (textSecondary, 13px/400, marginTop:4) "{N} articles · {M} sources"
        TopicAccentLine (width:76, height:3, borderRadius:9999, bg: topic category color, marginTop:8)
    [each article] ArticleCard (bg:surface #1A1A2E, r:10, padding:12, flexRow, gap:12, minHeight:96, marginBottom:12)
      ArticleThumb (72×72, r:8, bg:surfaceElevated)
        OR Image if imageUrl
      ArticleCardBody (flex:1, overflow:'hidden')
        ArticleTitle (15px/600, textPrimary, numberOfLines:2)
        ArticleMeta  (12px/400, textSecondary, marginTop:4) "{source} · {N} min read"
      AddButton (Ionicons "add" size:20, textSecondary, w:28, h:28, r:9999, bg:surfaceElevated)
        onPress: open upload modal (no-op if no article URL available in static data)
```

**Accent line color — map `topicId` to content color:**
- `science` → `colors.contentScience` (#0D9488)
- `ai-tech`, `design` → `colors.contentTech` (#2563EB)
- `business`, `finance` → `colors.contentBusiness` (#EA580C)
- `psychology`, `philosophy`, `culture` → `colors.contentFiction` (#7C3AED)
- `politics`, `history` → `colors.contentNews` (#DB2777)
- Default → `colors.accentPrimary`

**Article data:** Static hardcoded per topic. Future: API-driven.

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `discover-topic.tsx` located at `native/app/(tabs)/discover-topic.tsx` (NOT top-level) | File path verification |
| AC-2 | `(tabs)/_layout.tsx` has `<Tabs.Screen name="discover-topic" options={{ href: null }} />` | Code review: `rg 'discover-topic' native/app/(tabs)/_layout.tsx` |
| AC-3 | Tab bar and mini player remain visible when navigating to discover-topic screen | Manual: navigate to a topic — tab bar and mini player are still shown |
| AC-4 | Discover main shows `#0F0F1A` background (replaces scaffold) | Visual |
| AC-5 | "Discover" title: white, 28px/700 | Code review |
| AC-6 | SearchBar: `#242438` bg, 48px height, 10px radius, secondary placeholder text | Visual + code review |
| AC-7 | SearchBar does NOT detect URLs or trigger upload modal | Code review: no URL detection logic (`startsWith('http')`) in search handler |
| AC-8 | "For You" section: horizontal card scroll with `#1A1A2E` cards, 260px wide, context badge overlaid | Visual |
| AC-9 | "Your Topics" section: horizontal chip row, tapping navigates to `discover-topic` with correct params | Manual: tap a topic chip |
| AC-10 | "Recommended" section: vertical source rows, follow/following buttons | Visual |
| AC-11 | Follow button toggles visually: orange fill when following, outlined when not | Manual: tap Follow on a source |
| AC-12 | Follow button state is local (visual-only) — no AsyncStorage write from Discover main | Code review: no `AsyncStorage.setItem` calls triggered by follow toggle in `discover.tsx` |
| AC-13 | FTUE gate: if `discover_ftue_completed` not in AsyncStorage, redirects to FTUE topics screen | Manual: clear storage, navigate to Discover |
| AC-14 | Back nav "‹ Discover" in `#9CA3AF` on topic screen | Visual |
| AC-15 | Topic emoji + title at 28px/700 on topic screen | Visual |
| AC-16 | Accent underline line (76px wide, 3px high) in topic's category color | Visual: different colors per topic |
| AC-17 | Article cards: `#1A1A2E` bg, 72×72 thumb, title (2 lines) + meta, add button | Visual |
| AC-18 | `paddingBottom: 180` on article list to clear mini player + tab bar | Code review |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| No topics from FTUE (user skipped) | Default to `['science', 'ai-tech', 'psychology']` in Your Topics row |
| FTUE gate re-entry | `useRef` flag prevents redirect loop — only redirects once per mount cycle |
| SearchBar text entered | Client-side filter of articles/topics matching text — no URL detection, no upload modal |
| Long article titles | `numberOfLines={2}` + `ellipsizeMode="tail"`. `ArticleCardBody` uses `flex:1` + `overflow:'hidden'`. |
| Add button on discover card | Opens upload modal (stub/no-op in this phase if no source URL in static data). No new state needed. |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/(tabs)/discover.tsx` | REPLACE scaffold with full Discover Main implementation |
| `native/app/(tabs)/discover-topic.tsx` | CREATE — Discover Topic screen (inside tabs/) |
| `native/app/(tabs)/_layout.tsx` | ADD `<Tabs.Screen name="discover-topic" options={{ href: null, headerShown: false }} />` |
| `native/lib/types.ts` | ADD `DiscoveryArticle`, `DiscoverySource`, `DiscoveryTopic` interfaces (or define locally in screens) |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.*`, `typography.*` |
| `nav-shell-redesign` | Tab bar + mini player shell already in place; Discover tab exists |
| `discover-ftue` | `discover_ftue_completed` and `discover_ftue_selected_topics` AsyncStorage keys consumed here |
| `@react-native-async-storage/async-storage` | Loading FTUE selections + initial follow state |
| `expo-router` | `useRouter`, `useLocalSearchParams` for topic screen |
| `native/lib/haptics` | Follow button taps |

---

## 7. Notes

- **`discover-topic.tsx` belongs in `(tabs)/`, not top-level.** This keeps the tab bar and mini player visible when navigating to a topic — the correct UX for a drill-down screen. Register it with `href: null` in the tab layout to hide it from the tab bar while keeping it in the tab shell.
- **Search bar does NOT detect URLs or trigger upload modal.** That was scope creep. The Discover search bar is for content discovery (filtering articles and sources). URL-based content addition belongs in the Upload Modal, accessible via the "+" button in the Home or Library header.
- **Follow buttons are visual-only — no AsyncStorage persistence.** The FTUE spec is the source of truth for initial follow state. This screen reads from AsyncStorage on mount but writes back nothing. Follow toggles update local state only, resetting on navigation.
- **Anti-slop — No FAB.** The "+" add action on discovery cards is a small inline button (28×28 per blueprint) — not a floating action button.
- **Context badge uses category colors** (`contentScience`, etc.) as background with white text — categorical colors for label badges, NOT the interactive accent `accentPrimary` (#FF6B35).
- **The "See all" link** in Recommended is a visual-only placeholder in this phase. Can be a no-op or stub.
- **Discovery content is static/hardcoded in this phase.** TypeScript interfaces are defined so data can be replaced with API calls later without structural refactoring.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
(tabs)/_layout.tsx change:
  Add <Tabs.Screen name="discover-topic" options={{ href: null, headerShown: false }} />

discover.tsx (replaces scaffold)
├── SafeAreaView (bg: backgroundScreen)
│   ├── HeaderSection (px:20, pt:8)
│   │   ├── "Discover" (28/700, textPrimary)
│   │   └── SearchBar (surfaceElevated #242438, h:48, r:10) — content-search only, no URL upload
│   └── ScrollView (pb:180)
│       ├── ForYouSection (mt:24, px:20)
│       │   ├── SectionLabel (22/600, textPrimary)
│       │   └── HorizontalScroll (pl:20, gap:12)
│       │       └── DiscoveryArticleCard × N (surface #1A1A2E, w:260, r:10)
│       │           ├── ImageArea (h:140, surfaceElevated, r:10 top)
│       │           ├── ContextBadge (absolute top-left, category color pill)
│       │           ├── Title (18/600, textPrimary, 2 lines)
│       │           ├── Meta (13/400, textSecondary)
│       │           └── AddButton (absolute bottom-right, surfaceElevated, 32×32)
│       ├── YourTopicsSection (mt:32, px:20)
│       │   ├── SectionLabel (22/600, textPrimary)
│       │   └── HorizontalScroll (gap:12)
│       │       └── TopicPill × N (surface #1A1A2E, r:10, px:16, py:12)
│       │           → onPress → navigate to /(tabs)/discover-topic
│       └── RecommendedSection (mt:32)
│           ├── HeaderRow (px:20) "Recommended" + "See all ›" (accentPrimary)
│           └── SourceRows (px:20, gap:12)
│               ├── LogoBlock (44×44, r:8, logoColor)
│               ├── SourceInfo (name + meta, flex:1)
│               └── FollowButton (visual toggle, local state only)

discover-topic.tsx (inside (tabs)/)
├── SafeAreaView (bg: backgroundScreen)
│   └── FlatList (px:20, pb:180)
│       ├── BackNavBar (h:44, "‹ Discover" textSecondary + filter icon)
│       ├── ListHeaderComponent
│       │   └── TopicHeader (pt:16)
│       │       ├── HeadingRow (emoji + title 28/700, textPrimary)
│       │       ├── Stats (textSecondary, 13/400)
│       │       └── AccentLine (76px, h:3, r:9999, topic category color)
│       └── ArticleCard × N (surface, r:10, p:12, flexRow, minH:96, mb:12)
│           ├── Thumb (72×72, r:8, surfaceElevated)
│           ├── Body (flex:1, overflow:hidden)
│           │   ├── Title (15/600, 2 lines)
│           │   └── Meta (12/400, textSecondary)
│           └── AddButton (surfaceElevated, r:9999, 28×28)
```
