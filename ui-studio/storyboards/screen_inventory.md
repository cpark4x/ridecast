# Ridecast — Screen Inventory (v1)

## Screens (10)

| # | Screen | Archetype | Chrome | Description |
|---|--------|-----------|--------|-------------|
| 1 | Sign-In | Onboarding / Splash | None | Auth gate. Headset icon, title, value prop, "Continue with Apple" button |
| 2 | Home / Daily Drive | Feed / Home | Tab bar + PlayerBar | Queue-first home. Greeting, episode count, "Play All", Up Next cards |
| 3 | Library | Search / Results | Tab bar + PlayerBar | Full episode archive. Search, filter chips, time-grouped sections, FAB |
| 4 | Upload Modal (Input) | Form / Input | None (sheet overlay) | Slide-up sheet. URL input + Fetch button, "or" divider, file dropzone |
| 5 | Upload Modal (Preview) | Form / Input | None (sheet overlay) | Sheet stage 2. Content preview card, duration preset chips, slider, CTA |
| 6 | Processing | Modal / Progress | None (fullscreen) | 4-stage progress list: Reading → Writing → Recording → Ready |
| 7 | Expanded Player | Detail / Article | None (sheet overlay) | Full player. Artwork, scrubber, play/skip controls, speed/sleep/car mode |
| 8 | Car Mode | Custom (fullscreen) | None (fullscreen black) | Black screen. 3 giant buttons (skip-back, play/pause, skip-forward) |
| 9 | Settings | Settings / Preferences | None (sheet overlay) | Grouped list: Account, Playback, Notifications, Voice, Storage, About |
| 10 | Empty State (New User) | Empty State | Tab bar (no PlayerBar) | Home variant for new users. Illustration, prompt, "Create First Episode" CTA |

## Transitions

```
Sign-In → Home (after auth)
Home → Upload Modal (Input): Tap FAB (+) or "Create Episode"
Upload Modal (Input) → Upload Modal (Preview): After URL fetched or file selected
Upload Modal (Preview) → Processing: Tap "Create Episode"
Processing → Home: Episode creation completes, auto-returns to queue
Home → Expanded Player: Tap PlayerBar or episode card
Expanded Player → Car Mode: Tap car icon in secondary controls
Car Mode → Expanded Player: Tap × close button
Home ↔ Library: Bottom tab bar navigation
Library → Upload Modal (Input): Tap FAB (+)
Home → Settings: Tap avatar/gear (from Home header area)
Library → Settings: Tap gear icon (from Library header)
Empty State → Upload Modal (Input): Tap "Create Your First Episode"
```

## Navigation Shell

- **Bottom Tab Bar:** 2 tabs — Home (house icon), Library (books icon)
- **Floating PlayerBar:** Dark #1C1C1E card above tab bar (only when audio has been played)
- **Tab bar present on:** Home (#2), Library (#3), Empty State (#10)
- **PlayerBar present on:** Home (#2), Library (#3) — NOT on Empty State (#10)
