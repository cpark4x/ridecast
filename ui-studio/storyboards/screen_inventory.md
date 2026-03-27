# Ridecast — Screen Inventory (v2)

## Screens (11)

| # | Screen | Archetype | Chrome | Description |
|---|--------|-----------|--------|-------------|
| 1 | Sign In | Onboarding / Splash | None | Auth gate. Ridecast logo, tagline, "Continue with Apple" button |
| 2 | Home — Empty State | Empty State | Tab bar (no mini player) | New-user home. Headphones illustration, "Create Your First Episode" CTA |
| 3 | Upload Modal | Form / Input (bottom sheet) | None (sheet overlay) | Slide-up sheet. URL input + Fetch button, "or" divider, file drop zone |
| 4 | Duration Picker | Form / Input (bottom sheet) | None (sheet overlay) | Sheet stage 2. Article preview card, 5/10/15/20/30 min pill chips, "Create Episode" CTA |
| 5 | Processing | Modal / Progress | None (fullscreen) | 4-stage pipeline: Analyzing → Scripting → Generating Audio → Ready |
| 6 | Home — Daily Driver | Feed / Home | Tab bar + mini player | Greeting, episode count, "Play All" pill, Up Next queue with content-type colored artwork |
| 7 | Mini Player Bar | Detail (focused view) | Tab bar + mini player | Zoomed detail of persistent mini player: artwork, title, play/pause, progress bar |
| 8 | Expanded Player | Detail / Article | None (fullscreen slide-up) | Large artwork, scrubber, transport controls, speed/sleep/car mode, sections list, read-along |
| 9 | Car Mode | Custom (fullscreen) | None (fullscreen black) | Black screen. 3 giant buttons: −15, play/pause (orange), +30. Oversized touch targets |
| 10 | Library | Search / Results | Tab bar + mini player | Search bar, filter chips (All/Science/Business/Tech/Unplayed/Downloaded), time-grouped episodes, version badges, FAB "+" |
| 11 | Settings | Settings / Preferences | None (modal sheet) | Grouped list: Account, Playback, Voice (ElevenLabs BYOK), Storage, Sign Out |

## Primary Journey

```
Sign In → Home (Empty State) → tap "+" → Upload Modal → paste URL →
Duration Picker → pick 15 min → Processing (4-stage pipeline) →
Home (Daily Driver) → episode lands in Up Next → tap to play →
Mini Player Bar persists everywhere → expand for Expanded Player →
Car Mode for driving → Library for archive → Settings for config
```

## Transitions

```
Sign In → Home (Empty State): After Apple OAuth
Home (Empty State) → Upload Modal: Tap "Create Episode" CTA or FAB "+"
Upload Modal → Duration Picker: After URL fetched or file selected
Duration Picker → Processing: Tap "Create Episode"
Processing → Home (Daily Driver): Episode creation completes, auto-returns
Home (Daily Driver) → Expanded Player: Tap mini player bar or episode card
Expanded Player → Car Mode: Tap car icon in secondary controls
Car Mode → Expanded Player: Tap "×" close button
Home ↔ Library: Bottom tab bar navigation
Library → Upload Modal: Tap FAB "+"
Home → Settings: Tap avatar/gear icon in header
Library → Settings: Tap gear icon in header
```

## Navigation Shell

- **Bottom Tab Bar:** 2 tabs — Home (house icon), Library (books icon)
- **Mini Player Bar:** Dark #242438 floating card above tab bar (only when audio loaded)
- **Tab bar present on:** Home Empty (#2), Home Daily Driver (#6), Library (#10)
- **Mini player present on:** Home Daily Driver (#6), Library (#10)

## Content-Type Color System

| Category | Accent Color | Usage |
|----------|-------------|-------|
| Science | Teal #14B8A6 | Episode artwork gradient background |
| Business | Orange #FF6B35 | Episode artwork gradient background |
| Tech | Blue #3B82F6 | Episode artwork gradient background |

## Theme Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background | #0F0F1A | Screen fill |
| Surface | #1A1A2E | Cards, sheets |
| Elevated | #242438 | Mini player, modals |
| Text Primary | #F5F5F5 | Headings, titles |
| Text Secondary | #9CA3AF | Captions, metadata |
| Text Tertiary | #6B7280 | Placeholders, disabled |
| Accent | #FF6B35 | CTAs, active states, progress |
| Error / Destructive | #EF4444 | Sign Out, delete actions |
| Success | #22C55E | Connected badges |
