# Navigation Shell

## Navigation Model
bottom-tabs

## Route Screens (chrome applies)
- Home — Empty State (tabs only, NO mini player — no audio loaded yet)
- Home — Daily Driver (tabs + mini player)
- Library (tabs + mini player)

## Exempt Screens (no chrome)
- Sign In — auth gate, fullscreen
- Upload Modal — bottom sheet overlay
- Duration Picker — bottom sheet overlay (stage 2 of creation flow)
- Processing — fullscreen modal
- Expanded Player — fullscreen slide-up overlay
- Car Mode — fullscreen driving interface, black background
- Settings — modal sheet overlay

## Persistent Elements

### Bottom Tab Bar
- **Position:** fixed bottom, full width, above home indicator safe area
- **Dimensions:** full-width × 56px
- **Items:** 2 tabs
  - Home (house icon, label "Home") — navigates to queue/daily driver
  - Library (books/stack icon, label "Library") — navigates to full episode archive
- **Active State:** icon filled + label in orange #FF6B35
- **Inactive State:** icon outline + label in muted gray #6B7280
- **Background:** #1A1A2E (dark surface, slightly elevated from screen background)
- **Border:** 1px solid rgba(255,255,255,0.06) top edge

### Mini Player Bar
- **Position:** floating above Bottom Tab Bar, 8px margin from edges and tab bar
- **Dimensions:** full-width minus 16px (8px margin each side) × 56px
- **Background:** #242438 (elevated dark surface), rounded corners 14px
- **Content (left to right):**
  - Episode artwork thumbnail (40px square, 8px radius) with content-type color gradient border
  - Episode title (white #F5F5F5, 14px, weight 500, single line truncated)
  - Source/duration caption below title (#9CA3AF, 12px)
  - Play/Pause button (white, right-aligned, 24px icon)
- **Progress indicator:** thin orange #FF6B35 bar at bottom of the mini player bar
- **Visibility:** only appears when audio has been loaded — NOT visible on Empty State or before first playback
- **Shadow:** 0 4px 16px rgba(0,0,0,0.3)
