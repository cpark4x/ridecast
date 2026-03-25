# Navigation Shell

## Navigation Model
bottom-tabs

## Route Screens (chrome applies)
- Home / Daily Drive
- Library
- Empty State (New User) — variant of Home route when no episodes exist

## Exempt Screens (no chrome)
- Sign-In — auth gate, fullscreen
- Upload Modal (Input Stage) — slide-up sheet overlay
- Upload Modal (Preview + Duration) — slide-up sheet overlay (stage 2)
- Processing — fullscreen modal
- Expanded Player — slide-up sheet overlay
- Car Mode — fullscreen, maximum touch targets
- Settings — modal sheet overlay

## Persistent Elements

### Bottom Tab Bar
- **Position:** fixed bottom, full width, above home indicator safe area
- **Dimensions:** full-width × 56px
- **Items:** 2 tabs
  - Home (house icon, label "Home") — navigates to Daily Drive queue
  - Library (books/stack icon, label "Library") — navigates to full episode archive
- **Active State:** icon filled + label in deep orange #EA580C
- **Inactive State:** icon outline + label in gray #9CA3AF
- **Background:** #FFFFFF with subtle top border
- **Border:** 1px solid rgba(0,0,0,0.06) top edge

### Floating PlayerBar
- **Position:** floating above Bottom Tab Bar, 8px margin from edges and tab bar
- **Dimensions:** full-width minus 16px (8px margin each side) × 56px
- **Background:** dark #1C1C1E, rounded corners 14px
- **Content (left to right):**
  - Source thumbnail (40px square, 8px radius)
  - Episode title (white, 14px, weight 500, single line truncated)
  - Play/Pause button (white, right-aligned, 24px icon)
- **Progress indicator:** thin orange #EA580C bar at very bottom of the PlayerBar, showing playback progress
- **Visibility:** only appears when an episode has been played or is in progress — NOT visible on Empty State or before first playback
- **Shadow:** 0 4px 16px rgba(0,0,0,0.15)
