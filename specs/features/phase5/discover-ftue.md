# F-P5-UI-10: Discover FTUE Onboarding Flow

## 1. Overview

**Module:** `native/app/discover-ftue-topics.tsx` (CREATE) · `native/app/discover-ftue-sources.tsx` (CREATE)
**Phase:** 5 — Discover Flow — New Screens
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `nav-shell-redesign` (F-P5-UI-02)

Two new fullscreen onboarding screens shown once to new users before they reach the Discover main tab. They run sequentially: Topics picker (12a) → Sources suggestions (12b) → redirect to Discover main (`/(tabs)/discover`). Both are nav-shell exempt — no tab bar, no mini player. Selection state persists to AsyncStorage so the FTUE only runs once.

**Route placement:** These files live at `native/app/discover-ftue-topics.tsx` and `native/app/discover-ftue-sources.tsx` (top-level Stack routes, NOT inside `(tabs)/`). They are registered in `_layout.tsx` as fullscreen modal Stack screens. They must be added to `EXEMPT_SEGMENTS` in `_layout.tsx` to suppress the mini player.

**Source material:** `ui-studio/blueprints/12a-discover-ftue-topics/component-spec.md` · `ui-studio/blueprints/12a-discover-ftue-topics/tokens.json` · `ui-studio/blueprints/12b-discover-ftue-sources/component-spec.md` · `ui-studio/blueprints/12b-discover-ftue-sources/tokens.json`

---

## 2. Requirements

### Interfaces

#### `discover-ftue-topics.tsx`

```typescript
// No props — this is a route file.
// Exports default function DiscoverFTUETopicsScreen(): JSX.Element

// Topic chip data structure:
const TOPICS: { id: string; emoji: string; label: string }[] = [
  { id: 'science',     emoji: '🧬', label: 'Science'     },
  { id: 'ai-tech',    emoji: '🤖', label: 'AI & Tech'   },
  { id: 'business',   emoji: '💼', label: 'Business'    },
  { id: 'finance',    emoji: '💰', label: 'Finance'     },
  { id: 'psychology', emoji: '🧠', label: 'Psychology'  },
  { id: 'health',     emoji: '🏥', label: 'Health'      },
  { id: 'design',     emoji: '🎨', label: 'Design'      },
  { id: 'climate',    emoji: '🌍', label: 'Climate'     },
  { id: 'space',      emoji: '🚀', label: 'Space'       },
  { id: 'politics',   emoji: '📰', label: 'Politics'    },
  { id: 'history',    emoji: '📚', label: 'History'     },
  { id: 'culture',    emoji: '🎭', label: 'Culture'     },
  { id: 'sports',     emoji: '⚽', label: 'Sports'      },
  { id: 'cooking',    emoji: '🍳', label: 'Cooking'     },
  { id: 'parenting',  emoji: '👶', label: 'Parenting'   },
  { id: 'philosophy', emoji: '💡', label: 'Philosophy'  },
  { id: 'law',        emoji: '⚖️', label: 'Law'         },
  { id: 'realestate', emoji: '🏠', label: 'Real Estate' },
];

// State:
const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
// min 3 required to enable Continue button at full opacity
const canContinue = selectedTopics.size >= 3;
```

#### `discover-ftue-sources.tsx`

```typescript
// Route file, receives topics from navigation params.
// Exports default function DiscoverFTUESourcesScreen(): JSX.Element

const SUGGESTED_SOURCES: {
  id: string;
  shortLabel: string;
  name: string;
  category: string;
  logoColor: string;
}[] = [
  { id: 'mit',      shortLabel: 'MIT',  name: 'MIT Technology Review', category: 'Science & Technology', logoColor: '#0D9488' },
  { id: 'ars',      shortLabel: 'Ars',  name: 'Ars Technica',          category: 'Technology',           logoColor: '#2563EB' },
  { id: 'quanta',   shortLabel: 'QM',   name: 'Quanta Magazine',       category: 'Science & Math',       logoColor: '#7C3AED' },
  { id: 'nature',   shortLabel: 'Nat',  name: 'Nature',                category: 'Science',              logoColor: '#059669' },
  { id: 'gradient', shortLabel: 'TG',   name: 'The Gradient',          category: 'AI & Machine Learning', logoColor: '#EA580C' },
  { id: 'aeon',     shortLabel: 'Aeon', name: 'Aeon',                  category: 'Psychology & Philosophy', logoColor: '#DB2777' },
];

// State:
const [followedSources, setFollowedSources] = useState<Set<string>>(new Set());
```

#### `_layout.tsx` changes required by this spec

**1. Register FTUE screens as Stack routes with `presentation: "fullScreenModal"`:**
```typescript
// In the Stack navigator in native/app/_layout.tsx, add:
<Stack.Screen
  name="discover-ftue-topics"
  options={{ headerShown: false, presentation: 'fullScreenModal' }}
/>
<Stack.Screen
  name="discover-ftue-sources"
  options={{ headerShown: false, presentation: 'fullScreenModal' }}
/>
```

**2. Add FTUE route names to `EXEMPT_SEGMENTS`:**
```typescript
// EXEMPT_SEGMENTS is exported from _layout.tsx (per nav-shell-redesign spec).
// Extend the array to include FTUE routes:
export const EXEMPT_SEGMENTS = [
  'sign-in',
  'processing',
  'settings',
  'discover-ftue-topics',    // ← ADD: fullscreen FTUE, no mini player
  'discover-ftue-sources',   // ← ADD: fullscreen FTUE, no mini player
] as const;
```
These are fullscreen onboarding screens — the mini player must not appear over them.

### Behavior

#### FTUE Gate logic

Add a check in `native/app/(tabs)/discover.tsx`:

```typescript
// On first render of the Discover tab, check AsyncStorage for FTUE completion.
// Key: 'discover_ftue_completed'
// If not set: router.replace('/discover-ftue-topics')
// If set: render normal DiscoverScreen
// Use a useRef guard so the redirect only fires once per mount cycle.
```

#### `DiscoverFTUETopicsScreen` layout

```
SafeAreaView (bg: backgroundScreen #0F0F1A, flex:1)
  ScrollView (contentContainerStyle: { paddingHorizontal: 24, paddingBottom: 32 })
    HeaderSection (paddingTop: 40)
      ScreenTitle    "What are you into?"     32px/700, textPrimary
      ScreenSubtitle "Pick at least 3..."     17px/400, textSecondary, marginTop:16
    TopicGrid (marginTop: 32)
      FlatList (numColumns:3, columnWrapperStyle:{gap:12}, contentContainerStyle:{gap:16})
        [each chip] TopicChip
          [selected] bg: #FF6B35, text: #0F0F1A (dark text on orange — deliberate inversion)
          [unselected] bg: #1A1A2E, border: rgba(255,255,255,0.08), text: #FFFFFF
          borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, flex:1
          content: "{emoji} {label}"   fontSize: 16, fontWeight: '600'
    BottomActions (marginTop: 40, paddingBottom: 32)
      ContinueButton
        bg: #FF6B35, width: '100%', borderRadius: 16, paddingVertical: 18
        opacity: canContinue ? 1 : 0.4
        label: `Continue · ${selectedTopics.size} selected`   17px/600, white
      SkipLink (marginTop: 24, alignItems:'center')
        label: "Skip"   17px/400, textSecondary (#9CA3AF)
```

**Chip interaction:** Toggle. Tap → add to `selectedTopics`. Tap again → remove. `Haptics.light()` on each tap.

**Continue press:**
1. `await AsyncStorage.setItem('discover_ftue_selected_topics', JSON.stringify([...selectedTopics]))`
2. `router.push('/discover-ftue-sources')`

**Skip press:**
1. `await AsyncStorage.setItem('discover_ftue_completed', 'true')`
2. `router.replace('/(tabs)/discover')`

No back button on the topics screen.

---

#### `DiscoverFTUESourcesScreen` layout

```
SafeAreaView (bg: backgroundScreen #0F0F1A, flex:1)
  ScrollView (contentContainerStyle: { paddingHorizontal: 20, paddingBottom: 20 })
    HeaderSection (paddingTop: 48)
      BackButton (flexRow, gap:4, Ionicons "chevron-back" 24 textSecondary + "Topics" text 17px/400 textSecondary)
        onPress: router.back()
      PageTitle    "Sources you might like"   28px/700, textPrimary, marginTop:16
      PageSubtitle "We picked a few..."       16px/400, textSecondary, marginTop:8
    SourcesList (marginTop: 24, gap: 12)
      [each source] SourceCard (bg: #1A1A2E, r:10, padding:16, flexRow, alignItems:center, gap:12)
        SourceLogo (44×44, r:8, bg: logoColor)
          ShortLabel (13px/700, white, centered)
        SourceInfo (flex:1)
          SourceName     (15px/600, textPrimary)
          SourceCategory (12px/400, textTertiary, marginTop:4)
        FollowButton
          [following] bg: #FF6B35, text: white, "Following"   14px/500, r:9999, px:16, py:8
          [not following] bg: transparent, border: #3F3F4E, text: #6B7280, "Follow"   14px/500, r:9999, px:16, py:8
    CTASection (marginTop: 32, paddingBottom: 20)
      DoneButton (bg: #FF6B35, r:9999, paddingVertical:16, width:'100%', flexRow, gap:8, justifyContent:'center')
        Ionicons "checkmark" size:16, color:white  ← leading check icon per 12b blueprint
        Text `Done · Following ${followedSources.size} sources`  16px/700, white
```

**Follow interaction:** Toggle. Tap "Follow" → add to `followedSources`, button shows "Following" with orange fill. Tap "Following" → remove, reverts to outlined "Follow". `Haptics.light()` on tap.

**Done press:**
1. `await AsyncStorage.setItem('discover_ftue_followed_sources', JSON.stringify([...followedSources]))`
2. `await AsyncStorage.setItem('discover_ftue_completed', 'true')`
3. `router.replace('/(tabs)/discover')`

Done button is always tappable (user can complete with 0 sources followed).

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `discover-ftue-topics` registered in Stack in `_layout.tsx` with `presentation: 'fullScreenModal'` | Code review: Stack.Screen with correct name and options |
| AC-2 | `discover-ftue-sources` registered in Stack in `_layout.tsx` with `presentation: 'fullScreenModal'` | Code review |
| AC-3 | `EXEMPT_SEGMENTS` in `_layout.tsx` includes `'discover-ftue-topics'` and `'discover-ftue-sources'` | Code review: `rg 'discover-ftue' native/app/_layout.tsx` returns matches in EXEMPT_SEGMENTS |
| AC-4 | Topics screen background `#0F0F1A`, no tab bar, no mini player | Visual: navigate to FTUE — no tab bar, no mini player overlay |
| AC-5 | Title "What are you into?" 32px/700, white | Code review + visual |
| AC-6 | Subtitle "Pick at least 3 topics..." `#9CA3AF`, 17px | Code review |
| AC-7 | 18 topic chips rendered in 3-column grid | Visual: 6 rows × 3 columns |
| AC-8 | Unselected chip: `#1A1A2E` bg, `rgba(255,255,255,0.08)` border, white text, 16px radius | Visual |
| AC-9 | Selected chip: `#FF6B35` bg, no border, `#0F0F1A` (dark) text | Visual: tap a chip — orange bg with dark text |
| AC-10 | Continue button: `#FF6B35`, "Continue · N selected" updates dynamically | Manual: select chips and observe label |
| AC-11 | Continue button: 40% opacity when <3 selected, full opacity when ≥3 | Visual |
| AC-12 | Skip link: `#9CA3AF`, centered below Continue | Visual |
| AC-13 | Haptic on chip tap | Manual: feel haptic feedback when tapping chips |
| AC-14 | Sources screen background `#0F0F1A`, no tab bar | Visual |
| AC-15 | Back button "‹ Topics" in `#9CA3AF` on sources screen | Visual |
| AC-16 | Sources screen title "Sources you might like" 28px/700 | Code review |
| AC-17 | 6 source cards on `#1A1A2E` surface, 10px radius | Visual |
| AC-18 | Each card: colored logo block + name/category text + Follow button | Visual |
| AC-19 | Follow button: orange fill + "Following" when following; outlined + "Follow" when not | Visual: toggle follow |
| AC-20 | DoneButton has leading checkmark icon (Ionicons "checkmark") before label text | Code review + visual |
| AC-21 | "Done · Following N sources" updates dynamically as sources are followed/unfollowed | Manual: follow sources and observe label |
| AC-22 | Done button always tappable (0 sources followed is valid) | Manual: press Done without following any source |
| AC-23 | On Done: saves to AsyncStorage, navigates to `/(tabs)/discover` | Manual: complete FTUE, land on Discover main tab |
| AC-24 | FTUE check in Discover tab: redirects to topics screen if `discover_ftue_completed` not set | Manual: clear AsyncStorage, navigate to Discover tab — FTUE appears |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| AsyncStorage failure | Wrap all storage operations in try/catch. On error, continue navigation anyway — FTUE state is a UX nicety, not a security gate. |
| Back from sources to topics | `router.back()` → topics screen. Topics state may not be preserved on iOS if discarded. Starting fresh with 0 selected is acceptable (screen is only shown once in production). |
| Chip text overflow | Some labels ("Real Estate", "Philosophy") may be 2 words. `flex:1` in the FlatList column handles this. Test on iPhone SE. |
| 3-column grid on narrow screens | `FlatList numColumns={3}` with `columnWrapperStyle={{ gap: 12 }}` and `contentContainerStyle={{ gap: 16 }}`. Each chip uses `flex: 1` within its column. |
| Topics already selected on re-visit | Screen always starts with `selectedTopics = new Set()`. Previous selections not re-loaded — acceptable since screen is shown only once. |
| Mini player visible during FTUE | `EXEMPT_SEGMENTS` includes both FTUE route names — mini player is suppressed. If it still appears, verify `segments[0]` value matches the route name string. |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/discover-ftue-topics.tsx` | CREATE — topic chip grid FTUE screen |
| `native/app/discover-ftue-sources.tsx` | CREATE — source suggestion FTUE screen with DoneButton + checkmark icon |
| `native/app/(tabs)/discover.tsx` | Add FTUE gate: check AsyncStorage on mount with useRef guard, `router.replace('/discover-ftue-topics')` if not completed |
| `native/app/_layout.tsx` | Register both FTUE screens as Stack routes with `presentation: 'fullScreenModal'`; add both route names to `EXEMPT_SEGMENTS` |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius` |
| `nav-shell-redesign` | `EXEMPT_SEGMENTS` is exported from `_layout.tsx` — this spec extends it to include FTUE routes |
| `expo-router` | `useRouter()` for navigation, `router.push`, `router.replace`, `router.back()` |
| `@react-native-async-storage/async-storage` | FTUE state persistence |
| `native/lib/haptics` | `Haptics.light()` on chip taps |

---

## 7. Notes

- **These are top-level Stack routes**, not `(tabs)/` routes. Created at `native/app/discover-ftue-topics.tsx` and `native/app/discover-ftue-sources.tsx`. They are fullscreen onboarding — they intentionally have no tab bar.
- **EXEMPT_SEGMENTS must include both FTUE route names.** The mini player is rendered in `AppShell` which wraps all screens. Without the exemption, the mini player would float over the FTUE screens.
- **Register in Stack with `presentation: 'fullScreenModal'`.** This gives the fullscreen swipe-up presentation on iOS without a navigation bar chrome.
- **DoneButton has a leading checkmark icon.** Per the 12b blueprint: `Ionicons "checkmark"` (size 16, white) appears before the label text "Done · Following N sources". This is NOT the same as a checkmark `accessoryView` — it is inline in the button's flexRow.
- **The `selectedTopics` set is NOT used for any API calls in this phase.** It is saved to AsyncStorage and will be consumed by a future "personalized feed" implementation. Similarly, `followedSources` does not create actual follow relationships — that backend work is out of scope.
- **Selected chip text color is `#0F0F1A` (dark), not white.** On the `#FF6B35` orange background, dark text provides better legibility. Blueprint token `color-chip-selected-text: #0F0F1A` confirms this deliberate inversion.
- **expo-router file-based routing:** Creating `native/app/discover-ftue-topics.tsx` automatically registers the route as `/discover-ftue-topics`. The Stack.Screen registration in `_layout.tsx` is still needed to set `presentation: 'fullScreenModal'`.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
_layout.tsx changes:
├── EXEMPT_SEGMENTS: add 'discover-ftue-topics', 'discover-ftue-sources'
└── Stack navigator: add two Screen entries with presentation:'fullScreenModal'

discover-ftue-topics.tsx
├── SafeAreaView (bg: backgroundScreen)
│   └── ScrollView (px:24, pb:32)
│       ├── HeaderSection (pt:40)
│       │   ├── Title (32/700, textPrimary) "What are you into?"
│       │   └── Subtitle (17/400, textSecondary, mt:16)
│       ├── TopicGrid (mt:32)
│       │   └── FlatList (numColumns:3, gap:12/16)
│       │       └── TopicChip × 18
│       │           ├── [selected] bg:#FF6B35, text:#0F0F1A, r:16
│       │           └── [unselected] bg:surface, border:borderInput, text:textPrimary, r:16
│       └── BottomActions (mt:40)
│           ├── ContinueButton (#FF6B35, opacity:canContinue?1:0.4, r:16)
│           └── SkipLink (textSecondary, centered, mt:24)

discover-ftue-sources.tsx
├── SafeAreaView (bg: backgroundScreen)
│   └── ScrollView (px:20, pb:20)
│       ├── BackButton (chevron + "Topics", textSecondary)
│       ├── HeaderSection (pt:48)
│       │   ├── Title (28/700, textPrimary) "Sources you might like"
│       │   └── Subtitle (16/400, textSecondary, mt:8)
│       ├── SourcesList (mt:24, gap:12)
│       │   └── SourceCard × 6 (surface #1A1A2E, r:10, p:16)
│       │       ├── LogoBlock (44×44, r:8, logoColor bg)
│       │       │   └── ShortLabel (13/700, white)
│       │       ├── SourceInfo (flex:1)
│       │       │   ├── Name (15/600, textPrimary)
│       │       │   └── Category (12/400, textTertiary, mt:4)
│       │       └── FollowButton (accentPrimary fill / outlined)
│       └── CTASection (mt:32)
│           └── DoneButton (#FF6B35, r:9999, py:16, flexRow, gap:8)
│               ├── CheckIcon (Ionicons "checkmark", 16, white) ← leading icon
│               └── Label "Done · Following N sources" (16/700, white)
```
