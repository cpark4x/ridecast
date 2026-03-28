# F-P5-UI-11: Discover Main + Discover Topic Screens

## 1. Overview

**Module:** `native/app/(tabs)/discover.tsx` (REPLACE scaffold) · `native/app/discover-topic.tsx` (CREATE)
**Phase:** 5 — Discover Flow — New Screens
**Priority:** P1
**Size:** L — 3pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `nav-shell-redesign` (F-P5-UI-02) · `discover-ftue` (F-P5-UI-10)

The current `discover.tsx` is a minimal placeholder scaffold (centered "Discover" text) from `nav-shell-redesign`. This spec replaces it with the full personalized discovery feed. A second new screen `discover-topic.tsx` provides the filtered topic view when a user taps a topic chip.

**Source material:** `ui-studio/blueprints/12-discover-main/component-spec.md` · `ui-studio/blueprints/12-discover-main/tokens.json` · `ui-studio/blueprints/12c-discover-topic/component-spec.md` · `ui-studio/blueprints/12c-discover-topic/tokens.json`

---

## 2. Requirements

### Interfaces

#### `native/app/(tabs)/discover.tsx`

```typescript
// Exported: default function DiscoverScreen(): JSX.Element

// Data types (local or from types.ts — define here for now):
interface DiscoveryArticle {
  id: string;
  title: string;
  sourceName: string;        // e.g. "MIT Technology Review"
  readMinutes: number;       // e.g. 8
  contextBadge: string;      // e.g. "Trending in Science"
  badgeCategory: 'science' | 'tech' | 'business' | 'psychology' | 'fiction' | 'news' | 'biography';
  imageUrl?: string;         // future: article photo URL
}

interface DiscoverySource {
  id: string;
  name: string;
  categoryLabel: string;     // e.g. "Science · 3 new articles"
  logoColor: string;         // bg color for logo block
  shortLabel: string;        // abbreviation for logo block
  isFollowed: boolean;
}

interface DiscoveryTopic {
  id: string;
  emoji: string;
  name: string;
  newCount: number;          // e.g. 24
  categoryColor: string;     // from colors.content*
}

// State:
const [searchQuery, setSearchQuery] = useState('');
const [followedSources, setFollowedSources] = useState<Set<string>>(new Set());

// On mount: load followedSources from AsyncStorage ('discover_ftue_followed_sources')
// On mount: check FTUE completion ('discover_ftue_completed') — if not done, redirect to topics FTUE
```

#### `native/app/discover-topic.tsx`

```typescript
// Route params:  topicId: string  topicName: string  emoji: string
// Exported: default function DiscoverTopicScreen(): JSX.Element

// Receives topic context via useLocalSearchParams<{ topicId: string; topicName: string; emoji: string }>()
// Renders filtered article list for the given topic
```

### Behavior

#### `DiscoverScreen` layout

```
SafeAreaView (bg: backgroundScreen, flex:1)
  HeaderSection (paddingHorizontal: 20, paddingTop: 8)
    "Discover" title  28px/700, textPrimary
    SearchBar
      bg: surfaceElevated (#242438), r:10, h:48
      SearchIcon (#9CA3AF) + TextInput placeholder "Search topics, sources, or paste a URL..."
        placeholderTextColor: textSecondary
        onSubmitEditing: navigate to upload modal if valid URL, else search
  ScrollView (showsVerticalScrollIndicator:false, contentContainerStyle:{paddingBottom:180})
    ForYouSection (marginTop:24)
      SectionHeader "For You" (22px/600, textPrimary)
      ArticleCardScroll (horizontal ScrollView, showsHorizontalScrollIndicator:false)
        paddingLeft: 20, gap: 12
        [each article] DiscoveryArticleCard (width:260, bg:surface #1A1A2E, r:10)
          ImagePlaceholder (full width, height:140, r:10 top only, bg:surfaceElevated)
            OR actual image if imageUrl set
          ContextBadge (position:absolute, top:8, left:8)
            pill: bg uses category color at 90% opacity, text:white, 11px/400, r:9999, px:8, py:4
          TitleText (18px/600, textPrimary, px:12, pt:8, numberOfLines:2)
          MetaText  (13px/400, textSecondary, px:12, pb:4)  "{sourceName} · {N} min read"
          AddButton (position:absolute, bottom:8, right:8)
            bg:surfaceElevated, r:9999, w:32, h:32, Ionicons "add" size:16, textSecondary
    YourTopicsSection (marginTop:32)
      SectionHeader "Your Topics" (22px/600, textPrimary)
      TopicsScrollRow (horizontal ScrollView, paddingLeft:20, gap:12)
        [each topic] TopicPill (bg:surface, r:10, padding:12×16, flexRow, gap:8)
          Emoji (16px text)
          Name (15px/600, textPrimary)
          Count ("N new", 13px/400, textSecondary)
          onPress: router.push({ pathname:'/discover-topic', params:{topicId,topicName,emoji} })
    RecommendedSection (marginTop:32)
      SectionHeaderRow (flexRow, justifyContent:'space-between', paddingHorizontal:20)
        "Recommended" (22px/600, textPrimary)
        SeeAllLink ("See all", 15px/400, accentPrimary + chevron-right icon)
      SourceList (paddingHorizontal:20, gap:12, marginTop:8)
        [each source] SourceRow (flexRow, alignItems:center, height:60, gap:12)
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
- Controlled by `searchQuery` state
- On submit: if input is a URL (starts with `http://` or `https://`) → navigate to `/(tabs)/index` and trigger upload modal (deep link or router param)
- Otherwise: filter the discovery feed content (client-side filtering of articles by title/source matching `searchQuery`)

**For You section data:** Static for now — use a hardcoded `FOR_YOU_ARTICLES` array. Future: API-driven.

**Your Topics section data:** Load from `AsyncStorage ('discover_ftue_selected_topics')`. Map topic IDs to `DiscoveryTopic` objects with hardcoded `newCount`. If not set (user skipped FTUE), show a default set of 3 topics.

**Recommended sources data:** Load from `AsyncStorage ('discover_ftue_followed_sources')`. Show 6 suggested sources with follow state from AsyncStorage. Toggling follow updates both state and AsyncStorage.

**Follow button interaction:** Toggle `followedSources` set. Update AsyncStorage. `Haptics.light()`.

---

#### `DiscoverTopicScreen` layout

```
SafeAreaView (bg: backgroundScreen, flex:1)
  BackNavBar (h:44, paddingHorizontal:20, flexRow, alignItems:center)
    BackButton (flexRow, gap:4, Ionicons "chevron-back" + "Discover" text, textSecondary)
    Spacer (flex:1)
    FilterIcon (Ionicons "options-outline" size:24, textSecondary) [future: opens filter sheet]
  TopicHeader (paddingHorizontal:20, paddingTop:16)
    TopicHeadingRow (flexRow, gap:8, alignItems:center)
      TopicEmoji (28px text)
      TopicTitle (28px/700, textPrimary)
    TopicStats (textSecondary, 13px/400, marginTop:4) "{N} articles · {M} sources"
    TopicAccentLine (NEW: 76px wide, 3px high, r:9999, bg: science/tech/etc color per topic, marginTop:8)
  FlatList (articles, paddingHorizontal:20, paddingTop:12, paddingBottom:180)
    [each article] ArticleCard (bg:surface #1A1A2E, r:10, padding:12, flexRow, gap:12, height:96, marginBottom:12)
      ArticleThumb (72×72, r:8, bg:surfaceElevated)
        OR Image if imageUrl
      ArticleCardBody (flex:1)
        ArticleTitle (15px/600, textPrimary, numberOfLines:2)
        ArticleMeta  (12px/400, textSecondary, marginTop:4) "{source} · {N} min read"
      AddButton (Ionicons "add" size:24, textSecondary, w:28, h:28, r:9999, bg:surfaceElevated)
        onPress: trigger upload modal / add to library via URL
```

**Article card height:** 96px — matches `spacing-discovery-card-height` from aesthetic-brief.md.

**Accent line color:** Map `topicId` to content color:
- `science` → `colors.contentScience` (#0D9488)
- `ai-tech`, `design` → `colors.contentTech` (#2563EB)
- `business`, `finance` → `colors.contentBusiness` (#EA580C)
- `psychology`, `philosophy`, `culture` → `colors.contentFiction` (#7C3AED)
- `politics`, `history` → `colors.contentNews` (#DB2777)
- Default → `colors.accentPrimary`

**Article data:** Static hardcoded per topic for now. Future: API-driven.

---

## 3. Acceptance Criteria

**Discover main:**
- [ ] Screen shows `#0F0F1A` background (replaces scaffold)
- [ ] "Discover" title: white, 28px/700
- [ ] SearchBar: `#242438` bg, 48px height, 10px radius, secondary placeholder text
- [ ] "For You" section: horizontal card scroll with `#1A1A2E` cards, 260px wide, context badge overlaid
- [ ] "Your Topics" section: horizontal chip row, tapping a chip navigates to topic screen
- [ ] "Recommended" section: vertical source rows, follow/following buttons
- [ ] Follow button toggles: orange fill when following, outlined when not
- [ ] Tapping topic chip navigates to `discover-topic` with correct params
- [ ] FTUE gate: if `discover_ftue_completed` not in AsyncStorage, redirects to FTUE topics screen

**Discover topic:**
- [ ] Back nav "‹ Discover" in `#9CA3AF` (textSecondary)
- [ ] Topic emoji + title at 28px/700
- [ ] Accent underline line in topic's category color
- [ ] Article cards: `#1A1A2E` bg, 96px height, 72×72 thumb, title/meta text, add button
- [ ] `paddingBottom: 180` on list to clear mini player + tab bar

---

## 4. Edge Cases

- **No topics from FTUE (user skipped):** Default to showing `['science', 'ai-tech', 'psychology']` in the Your Topics row
- **FTUE gate re-entry:** If the user returns to the Discover tab and storage check fires again, use a `useRef` flag to only redirect once per mount cycle — avoid redirect loop
- **SearchBar URL detection:** A simple check `str.startsWith('http://') || str.startsWith('https://')` before calling router — not a full URL validation (validation happens in UploadModal)
- **Long article titles in card:** `ArticleTitle` with `numberOfLines={2}` and `ellipsizeMode="tail"`. Card height is 96px fixed — ensure content doesn't overflow. Use `flex:1` on card body with `overflow:'hidden'`.
- **Add button on discover card:** In this phase the add button opens the upload modal (same flow as manual URL entry). Pass the article's source URL as a pre-filled value. If no source URL available (static data), open blank upload modal.
- **FlatList vs ScrollView for topic screen:** Use `FlatList` for the article list in `discover-topic.tsx` to handle long lists efficiently. The top header is a `ListHeaderComponent`.

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/(tabs)/discover.tsx` | REPLACE scaffold with full Discover Main implementation |
| `native/app/discover-topic.tsx` | CREATE — Discover Topic screen |
| `native/lib/types.ts` | ADD `DiscoveryArticle`, `DiscoverySource`, `DiscoveryTopic` interfaces (or define locally in screens for now) |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.*`, `typography.*` |
| `nav-shell-redesign` | Tab bar + mini player shell already in place; Discover tab exists |
| `discover-ftue` | `discover_ftue_completed` and `discover_ftue_selected_topics` AsyncStorage keys consumed here |
| `@react-native-async-storage/async-storage` | Loading FTUE selections + follow state |
| `expo-router` | `useRouter`, `useLocalSearchParams` for topic screen |
| `native/lib/haptics` | Follow button taps |

---

## 7. Notes

- Discovery content (articles, sources) is static/hardcoded in this phase. The data shape is defined via TypeScript interfaces so it can be replaced with API calls later without structural refactoring.
- The "See all" link in Recommended section is a placeholder that navigates to `router.push('/source-detail')` in a future iteration. For now it can be a no-op or navigate to a TBD route.
- Article card height in the topic screen (96px) differs from the home/library episode cards (76px). Both card types coexist in the app. The 96px height accommodates the larger thumbnail (72×72) in the discovery flow.
- Anti-slop: The context badge uses category colors (`contentScience`, etc.) as background with white text — this is correct. These are categorical colors for label badges, not the interactive accent. Do NOT use `accentPrimary` (#FF6B35) for content-type badges.
- Anti-slop: No FAB. The "+" add action on discovery cards is a small inline button (28×28) per the blueprint — not a floating action button.
- The `DiscoverScreen` FTUE gate should only run once per mount using a `useRef` guard. The FTUE redirect happens in `useEffect([])`.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
discover.tsx
├── SafeAreaView (bg: backgroundScreen)
│   ├── HeaderSection (px:20)
│   │   ├── "Discover" (28/700, textPrimary)
│   │   └── SearchBar (surfaceElevated, h:48, r:10)
│   └── ScrollView (pb:180)
│       ├── ForYouSection
│       │   ├── SectionLabel (22/600, textPrimary)
│       │   └── HorizontalScroll
│       │       └── DiscoveryArticleCard × N (surface, w:260, r:10)
│       │           ├── ImageArea (h:140, surfaceElevated, r:10 top)
│       │           ├── ContextBadge (absolute, category color pill)
│       │           ├── Title (18/600)
│       │           ├── Meta (13/400, textSecondary)
│       │           └── AddButton (absolute bottom-right, surfaceElevated)
│       ├── YourTopicsSection
│       │   ├── SectionLabel (22/600, textPrimary)
│       │   └── HorizontalScroll
│       │       └── TopicPill × N (surface, r:10)
│       │           → onPress → navigate to discover-topic
│       └── RecommendedSection
│           ├── HeaderRow ("Recommended" + "See all →")
│           └── SourceRows × N
│               ├── LogoBlock (44×44, r:8, logoColor)
│               ├── SourceInfo (name + meta)
│               └── FollowButton (accentPrimary/outlined)

discover-topic.tsx
├── SafeAreaView (bg: backgroundScreen)
│   ├── BackNavBar (h:44, "‹ Discover" textSecondary + filter icon)
│   └── FlatList
│       ├── ListHeaderComponent
│       │   └── TopicHeader (emoji + title + stats + accent line)
│       └── ArticleCard × N (surface, h:96, r:10)
│           ├── Thumb (72×72, r:8, surfaceElevated)
│           ├── Body (flex:1)
│           │   ├── Title (15/600, 2 lines)
│           │   └── Meta (12/400, textSecondary)
│           └── AddButton (surfaceElevated, r:9999, 28×28)
```
