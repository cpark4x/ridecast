# Ridecast Design System — Extracted from Approved Frames

## Colors
- Background: #0F0F1A (primary dark), #000000 (car mode only)
- Surfaces: #1A1A2E (cards, sheets, tab bar), #242438 (elevated: inputs, mini player)
- Accent: #FF6B35 (orange — CTAs, active states, progress, toggles)
- Content-type colors: Teal #0D9488 (science), Orange #EA580C (business), Blue #2563EB (tech), Purple #7C3AED (fiction/culture), Pink #DB2777 (news), Green #059669 (biography)
- Text: White #FFFFFF (primary), #9CA3AF (secondary), #6B7280 (tertiary/placeholder)
- Status: #16A34A (success/played), #EF4444 (destructive/red), #FF6B35 (new/in-progress)
- Borders: rgba(255,255,255,0.06) dividers, rgba(255,255,255,0.08) input borders, rgba(255,255,255,0.12) dashed borders

## Typography
- Font: Geist sans-serif
- Display: 28px bold (screen titles, greetings)
- H1: 22-24px semibold (section titles, source names)
- H2: 18px semibold (section headers like "For You", "Up Next")
- Body: 14-15px regular/semibold (card titles, row labels)
- Caption: 12-13px regular (metadata, timestamps, source info)
- Micro: 11px (badges like "New", "Played ✓", topic pills)

## Spacing (8pt grid)
- Screen margins: 20px
- Card padding: 12-16px
- Between cards: 12px
- Between sections: 24-32px
- Tab bar height: 56px
- Mini player height: 60px
- Button height: 48-52px
- Card heights: 72-76px (list cards), 96px (discovery cards with larger thumbnails)

## Border Radius
- Cards/groups: 10px
- Buttons: 10px
- Inputs: 10px
- Chips/pills: 10px (same as cards) or full pill (9999px for small tags)
- Thumbnails: 6-8px
- Mini player: 14px
- Bottom sheet top corners: 14px

## Components
- Bottom tab bar: 2 or 3 tabs, #1A1A2E background, active = orange fill + label, inactive = #6B7280
- Mini player: floating above tabs, #242438, 14px radius, thumbnail + title + play/pause + progress bar
- Cards: #1A1A2E on #0F0F1A, consistent height, thumbnail left + text middle + action right
- Bottom sheets: #1A1A2E, drag handle #3A3A4E, 14px top radius
- Segmented control: #242438 active segment, transparent inactive
- Chips: orange fill selected, #242438 + border unselected
- iOS toggles: orange when ON
- "+" button: in header (not FAB), #9CA3AF icon

## Navigation
- 3 tabs: Home | Discover | Library
- "+" in header permanently (not floating FAB)
- Mini player appears only during playback, directly above tab bar
- Back navigation: "‹ [Parent]" pattern

## Atmospheric Effects
- Sign In: layered orange + teal glow behind logo
- Expanded Player: color extraction — dominant color from artwork bleeds into background at ~8-10% opacity
- Car Mode: pure #000000 black, no effects
