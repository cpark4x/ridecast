# F-P5-UI-10: Discover FTUE Onboarding Flow

## 1. Overview

**Module:** `native/app/discover-ftue-topics.tsx` (CREATE) · `native/app/discover-ftue-sources.tsx` (CREATE)
**Phase:** 5 — Discover Flow — New Screens
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01) · `nav-shell-redesign` (F-P5-UI-02)

Two new fullscreen onboarding screens shown once to new users before they reach the Discover main tab. They run sequentially: Topics picker (12a) → Sources suggestions (12b) → redirect to Discover main (`/(tabs)/discover`). Both are nav-shell exempt (no tab bar, no mini player). Selection state persists to AsyncStorage so the FTUE only runs once.

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
// min 3 required to enable Continue button
const canContinue = selectedTopics.size >= 3;
```

#### `discover-ftue-sources.tsx`

```typescript
// Route file, receives topics from navigation params.
// Exports default function DiscoverFTUESourcesScreen(): JSX.Element

// Source card data structure:
const SUGGESTED_SOURCES: {
  id: string;
  shortLabel: string;
  name: string;
  category: string;
  logoColor: string;  // background color for logo block
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

### Behavior

#### FTUE Gate logic

Add a check in `native/app/(tabs)/discover.tsx` (or via a route guard in `_layout.tsx`):

```typescript
// On first render of the Discover tab, check AsyncStorage for ftue completion.
// Key: 'discover_ftue_completed'
// If not set: router.replace('/discover-ftue-topics')
// If set: render normal DiscoverScreen
```

The FTUE check uses `expo-router` navigation — `router.replace('/discover-ftue-topics')` from within the Discover tab screen `useEffect`. Route files must be registered in the router (file-based routing handles this automatically).

#### `DiscoverFTUETopicsScreen` layout

```
SafeAreaView (bg: backgroundScreen, flex:1)
  ScrollView (contentContainerStyle: { paddingHorizontal: 24, paddingBottom: 32 })
    HeaderSection (paddingTop: 40)
      ScreenTitle    "What are you into?"     32px/700, textPrimary
      ScreenSubtitle "Pick at least 3..."     17px/400, textSecondary, marginTop:16
    TopicGrid (marginTop: 32)
      [3-column FlatList or View grid with flexWrap:'wrap']
      [each chip] TopicChip
        [selected] bg: #FF6B35, text: #0F0F1A (dark text on orange)
        [unselected] bg: #1A1A2E, border: rgba(255,255,255,0.08), text: #FFFFFF
        borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16
        content: "{emoji} {label}"   fontSize: 16, fontWeight: '600'
    BottomActions (marginTop: 40, paddingBottom: 32)
      ContinueButton
        [canContinue]  bg: #FF6B35, text: white,    opacity: 1
        [!canContinue] bg: #FF6B35, text: white,    opacity: 0.4 (disabled look)
        borderRadius: 16, paddingVertical: 18, width: '100%'
        label: `Continue · ${selectedTopics.size} selected`   17px/600
      SkipLink (marginTop: 24, centered)
        label: "Skip"   17px/400, textSecondary
```

**Chip interaction:** Toggle. Tap → add to `selectedTopics`. Tap again → remove from `selectedTopics`. `Haptics.light()` on each tap.

**Continue press:**
1. `await AsyncStorage.setItem('discover_ftue_selected_topics', JSON.stringify([...selectedTopics]))`
2. `router.push('/discover-ftue-sources')`

**Skip press:**
1. `await AsyncStorage.setItem('discover_ftue_completed', 'true')`
2. `router.replace('/(tabs)/discover')`

---

#### `DiscoverFTUESourcesScreen` layout

```
SafeAreaView (bg: backgroundScreen, flex:1)
  ScrollView (contentContainerStyle: { paddingHorizontal: 20, paddingBottom: 20 })
    HeaderSection (paddingTop: 48)
      PageTitle    "Sources you might like"   28px/700, textPrimary
      PageSubtitle "We picked a few..."       16px/400, textSecondary, marginTop:8
    SourcesList (marginTop: 24, gap: 12)
      [each source] SourceCard (bg: #1A1A2E, r:10, padding:16, flexRow, alignItems:center)
        SourceLogo (colored block, 44×44, r:8, bg: logoColor)
          ShortLabel (13px/700, white, centered)
        SourceInfo (flex:1, marginLeft: 12)
          SourceName     (15px/600, textPrimary)
          SourceCategory (12px/400, textTertiary, marginTop:4)
        FollowButton
          [following] bg: #FF6B35, text: white,     "Following"   14px/500, r:9999, px:16, py:8
          [not following] bg: transparent, border: #3F3F4E, text: #6B7280, "Follow"  14px/500, r:9999, px:16, py:8
    CTASection (marginTop: 32, paddingBottom: 20)
      DoneButton (bg: #FF6B35, r:9999, paddingVertical:16, width:'100%')
        ✓ icon (Ionicons "checkmark", 16, white)
        label: `Done · Following ${followedSources.size} sources`  16px/700, textPrimary
```

**Follow interaction:** Toggle. Tap "Follow" → add to `followedSources`, button shows "Following" with orange fill. Tap "Following" → remove, reverts to outlined "Follow". `Haptics.light()` on tap.

**Done press:**
1. `await AsyncStorage.setItem('discover_ftue_followed_sources', JSON.stringify([...followedSources]))`
2. `await AsyncStorage.setItem('discover_ftue_completed', 'true')`
3. `router.replace('/(tabs)/discover')`

---

#### Back navigation guard

Neither screen should allow dismissal to an undefined state. The topics screen has no back button. The sources screen has a back button (chevron) that goes to `router.back()` (back to topics). Do NOT add a back button on the topics screen.

---

## 3. Acceptance Criteria

**Topics screen:**
- [ ] Screen background `#0F0F1A`, no tab bar, no mini player
- [ ] Title "What are you into?" 32px/700, white
- [ ] Subtitle "Pick at least 3 topics..." `#9CA3AF`, 17px
- [ ] 18 topic chips in 3-column grid
- [ ] Unselected chip: `#1A1A2E` bg, `rgba(255,255,255,0.08)` border, white text, 16px radius
- [ ] Selected chip: `#FF6B35` bg, no border, `#0F0F1A` (dark) text
- [ ] Continue button: `#FF6B35`, "Continue · N selected" where N updates dynamically
- [ ] Continue button: 40% opacity when <3 selected, full opacity when ≥3
- [ ] Skip link: `#9CA3AF`, centered below Continue
- [ ] Haptic on chip tap

**Sources screen:**
- [ ] Screen background `#0F0F1A`, no tab bar
- [ ] Title "Sources you might like" 28px/700
- [ ] 6 source cards on `#1A1A2E` surface, 10px radius
- [ ] Each card: colored logo block + name/category text + Follow button
- [ ] Follow button: orange fill when following, outlined when not
- [ ] "Done · Following N sources" CTA — N updates dynamically
- [ ] Done button always tappable (user can complete with 0 sources followed)
- [ ] On Done: saves to AsyncStorage, navigates to `/(tabs)/discover`
- [ ] FTUE check in Discover tab: redirects to topics screen if `discover_ftue_completed` not set

---

## 4. Edge Cases

- **AsyncStorage failure:** Wrap storage operations in try/catch. On error, continue navigation anyway — FTUE state is a UX nicety, not a security gate.
- **Back from sources to topics:** User taps back → `router.back()` → topics screen. Topics state is preserved via React state (not re-mounted since it's in the stack, unless iOS discards it). If state is lost, starting fresh with 0 selected is acceptable (user can re-select).
- **Chip text overflow:** Some labels ("Real Estate", "Philosophy") may be 2 words. Use `numberOfLines={1}` or let the chip height grow — flexWrap handles this naturally. Test on iPhone SE.
- **3-column grid on narrow screens:** Use `FlatList numColumns={3}` with `columnWrapperStyle={{ gap: 12 }}` and `contentContainerStyle={{ gap: 16 }}`. Each chip uses `flex: 1` within its column.
- **Topics already selected on re-visit:** The screen always starts with `selectedTopics = new Set()`. Previous selections are not re-loaded — this screen is only shown once in production, so this edge case is acceptable.

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/discover-ftue-topics.tsx` | CREATE — topic chip grid FTUE screen |
| `native/app/discover-ftue-sources.tsx` | CREATE — source suggestion FTUE screen |
| `native/app/(tabs)/discover.tsx` | Add FTUE gate: check AsyncStorage on mount, redirect if needed |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius` |
| `nav-shell-redesign` | These screens are nav-shell exempt — the nav shell handles the exempt-screen detection. These routes must not appear in `_layout.tsx` tabs. They are top-level routes in `native/app/`, not inside `(tabs)/`. |
| `expo-router` | `useRouter()` for navigation |
| `@react-native-async-storage/async-storage` | FTUE state persistence |
| `native/lib/haptics` | `Haptics.light()` on chip taps |

---

## 7. Notes

- These are file-based routes in `native/app/` (not inside `(tabs)/`) so they do NOT appear in the tab bar. They are accessed via `router.replace('/discover-ftue-topics')` from within the Discover tab's `useEffect`.
- The `selectedTopics` set on the topics screen is currently NOT used for any API calls in this phase. It is saved to AsyncStorage and will be consumed by a future "personalized feed" implementation. The sources screen similarly saves `followedSources` but does not create actual follow relationships yet — that backend work is out of scope for the FTUE spec.
- The topic chip selected text color is `#0F0F1A` (dark, not white) on the `#FF6B35` orange background. This is a deliberate inversion for legibility. The blueprint tokens confirm: `color-chip-selected-text: #0F0F1A`.
- `expo-router` uses file-based routing. Creating `native/app/discover-ftue-topics.tsx` automatically registers the route as `/discover-ftue-topics`. No router config changes needed.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
discover-ftue-topics.tsx
├── SafeAreaView (bg: backgroundScreen)
│   └── ScrollView
│       ├── HeaderSection (pt:40)
│       │   ├── Title (32/700, textPrimary) "What are you into?"
│       │   └── Subtitle (17/400, textSecondary)
│       ├── TopicGrid (mt:32)
│       │   └── FlatList (numColumns:3, gap:12/16)
│       │       └── TopicChip × 18
│       │           ├── [selected] bg:#FF6B35, text:#0F0F1A
│       │           └── [unselected] bg:surface, border:borderInput, text:textPrimary
│       └── BottomActions (mt:40)
│           ├── ContinueButton (#FF6B35, opacity based on canContinue)
│           └── SkipLink (textSecondary)

discover-ftue-sources.tsx
├── SafeAreaView (bg: backgroundScreen)
│   └── ScrollView
│       ├── HeaderSection (pt:48)
│       │   ├── Title (28/700, textPrimary) "Sources you might like"
│       │   └── Subtitle (16/400, textSecondary)
│       ├── SourcesList (mt:24, gap:12)
│       │   └── SourceCard × 6 (surface, r:10)
│       │       ├── LogoBlock (44×44, r:8, logoColor bg)
│       │       ├── SourceInfo (flex:1)
│       │       │   ├── Name (15/600, textPrimary)
│       │       │   └── Category (12/400, textTertiary)
│       │       └── FollowButton (accentPrimary fill / outlined)
│       └── CTASection (mt:32)
│           └── DoneButton (#FF6B35, r:9999)
│               ├── CheckIcon
│               └── Label "Done · Following N sources"
```
