# F-P5-UI-07: Expanded Player Redesign

## 1. Overview

**Module:** `native/components/ExpandedPlayer.tsx`
**Phase:** 4 — Player + Library + Settings Refresh
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

The expanded player currently uses a white background (`bg-white`), light-mode grays for icons and text, a simple light-colored artwork placeholder, and the wrong accent color (`#EA580C`). This spec converts it to the immersive dark player from the blueprint: `#0F0F1A` base with an artwork color-bleed atmospheric effect, `#FF6B35` scrubber, dark secondary controls, a `#1A1A2E` sections/chapters area, and a dark sleep timer sheet.

**Source material:** `ui-studio/blueprints/08-expanded-player/component-spec.md` · `ui-studio/blueprints/08-expanded-player/tokens.json`

---

## 2. Requirements

### Interfaces

No prop or hook changes. `ExpandedPlayer` props (`visible`, `onDismiss`) are unchanged. All `usePlayer()` destructured values are unchanged.

### Behavior

#### Modal root
- `className="flex-1 bg-white"` → `backgroundColor: colors.backgroundScreen` (#0F0F1A)

#### Drag handle
- `className="w-10 h-1 rounded-full bg-gray-300"` → `backgroundColor: '#3A3A4E'` (blueprint `color-handle: #3A3A4E`)

#### "Now Playing" label
- `className="text-base font-semibold text-gray-700"` → `color: colors.textSecondary` (#9CA3AF), `fontSize: 15`, `fontWeight: '500'`

#### Collapse chevron icon
- `color="#374151"` → `color: colors.textSecondary` (#9CA3AF)

#### ArtworkSection — atmospheric background (NEW)
The blueprint calls for "dominant color extracted from artwork bleed at 8–10% opacity." The current implementation uses a simple `artworkBg(contentType, sourceType)` function returning a light background color.

Replace the `artworkBg` function approach with a dark atmospheric approach:
- Remove `ARTWORK_BG` record and `artworkBg` function entirely
- Artwork container background: `backgroundColor: colors.backgroundScreen` (flat dark, no light pastels)
- Add an atmospheric glow `View` (absolute, behind artwork): use the content-type color from `colors.contentTech/contentScience/contentBusiness/etc.` at 8% opacity, 200px × 200px, `borderRadius: 100`, centered behind artwork. Map `currentItem.contentType` to a content color.
  - Fallback (no content type): `colors.accentPrimary` at 8% opacity
  - Implementation: `const atmosphereColor = contentTypeToColor(currentItem.contentType) + '14'` (14 = 8% in hex alpha). Or use rgba string.

#### Artwork card
- `className="w-70 h-70 rounded-3xl"`, `style={{ width: 280, height: 280, backgroundColor: bg }}` → `width: 280, height: 280, borderRadius: 16`, `backgroundColor: colors.surface` (#1A1A2E)
- Headset icon inside: `color="#EA580C"` → `color: colors.accentPrimary` (#FF6B35). Size stays 96.

#### EpisodeTitle
- `className="text-xl font-bold text-gray-900"` → `color: colors.textPrimary`, `fontSize: 20`, `fontWeight: '600'`, `letterSpacing: 0.3`

#### Author text
- `className="text-base text-gray-500"` → `color: colors.textSecondary`

#### Scrubber (`Slider` component)
- `minimumTrackTintColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- `maximumTrackTintColor: "#E5E7EB"` → `'#2C303E'` (blueprint `color-scrubber-track`)
- `thumbTintColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- Elapsed/remaining timestamps: `className="text-xs text-gray-500"` → `color: colors.textSecondary`, `fontSize: 13`

#### Main controls (transport)
- Skip back icon: `color="#374151"` → `color: colors.textPrimary` (active transport icon should be white, not gray)
- Skip forward icon: same
- Play/Pause button: `className="w-16 h-16 rounded-full bg-brand"`, `style={{ elevation: 4 }}` →
  - `backgroundColor: colors.accentPrimary` (#FF6B35)
  - Remove `elevation: 4` (no shadows in this system)
  - Keep `w-16 h-16 rounded-full` (64px circle)

#### Secondary controls (utility row)
- Speed button: `className="bg-gray-100 px-3 py-1.5 rounded-full"` → `backgroundColor: colors.surfaceElevated`, `borderRadius: borderRadius.card` (10px)
- Speed text: `className="text-sm font-bold text-gray-800"` → `color: colors.textPrimary`
- Sleep button (inactive): `className="bg-gray-100 p-2 rounded-full"` → `backgroundColor: colors.surfaceElevated`, `borderRadius: borderRadius.card`
- Sleep button (active): `className="bg-brand p-2 rounded-full"` → `backgroundColor: colors.accentPrimary`
- Sleep/Queue/Car icons: `color="#374151"` → `color: colors.textSecondary` (inactive), `color: colors.textPrimary` (active/active sleep)
- Queue button: same as sleep inactive: `surfaceElevated` bg, `textSecondary` icon
- Car mode button: same as inactive

#### Metadata/Info section (summary card)
- `className="mx-5 bg-gray-50 rounded-2xl p-4"` → `backgroundColor: colors.surface` (#1A1A2E), `borderRadius: borderRadius.card` (10px), `marginHorizontal: 20`
- Summary text: `className="text-sm text-gray-700 leading-5 mb-3"` → `color: colors.textSecondary`
- Format badge: `className="bg-orange-100 px-2.5 py-1 rounded-full"` → `backgroundColor: 'rgba(255,107,53,0.15)'`; text `text-orange-700` → `colors.accentPrimary`
- ContentType badge: `className="bg-blue-100 px-2.5 py-1 rounded-full"` → `backgroundColor: 'rgba(37,99,235,0.15)'`; text `text-blue-700` → `colors.contentTech`
- Theme badges: `className="bg-gray-200 px-2.5 py-1 rounded-full"` → `backgroundColor: colors.surfaceElevated`; text `text-gray-700` → `colors.textSecondary`

#### Sleep timer modal
- Outer `bg-white w-full mx-0 rounded-t-3xl overflow-hidden` → `backgroundColor: colors.surface`, `borderTopLeftRadius: 14`, `borderTopRightRadius: 14`
- Drag handle inside modal: `bg-gray-300` → `backgroundColor: '#3A3A4E'`
- Modal title: `text-gray-900` → `color: colors.textPrimary`
- Sleep rows: `border-gray-100` (border-top divider) → `borderTopColor: colors.borderDivider`
- Active row: `bg-orange-50` → `backgroundColor: 'rgba(255,107,53,0.10)'`
- Active row text: `text-brand font-semibold` → `color: colors.accentPrimary`, `fontWeight: '600'`
- Inactive row text: `text-gray-900` → `color: colors.textPrimary`
- Checkmark icon: `color="#EA580C"` → `colors.accentPrimary`
- Background scrim: `bg-black/40` — keep (already dark)

---

## 3. Acceptance Criteria

- [ ] Player modal background is `#0F0F1A` (was white)
- [ ] Drag handle is `#3A3A4E` (was gray-300)
- [ ] "Now Playing" label is `#9CA3AF`, 15px (was gray-700)
- [ ] Artwork container is `#1A1A2E`, 16px radius (was light pastel, rounded-3xl)
- [ ] Headset icon inside artwork is `#FF6B35` (was `#EA580C`)
- [ ] Atmospheric glow behind artwork uses content-type color at 8% opacity
- [ ] Episode title is white, 20px/600/+0.3ls (was gray-900, text-xl font-bold)
- [ ] Scrubber: `#FF6B35` fill, `#2C303E` track, `#FF6B35` thumb (was `#EA580C` / `#E5E7EB`)
- [ ] Skip icons are white (was `#374151`)
- [ ] Play/Pause button: `#FF6B35`, no elevation (was `bg-brand` with elevation:4)
- [ ] Speed/sleep/queue/car buttons: `#242438` bg (was gray-100)
- [ ] Active speed/sleep: text and icon in `#FF6B35`
- [ ] Metadata card: `#1A1A2E` bg, 10px radius (was gray-50, rounded-2xl)
- [ ] Sleep modal sheet: `#1A1A2E` bg, 14px top radius (was white, rounded-t-3xl)
- [ ] Active sleep row: `rgba(255,107,53,0.10)` bg (was orange-50)
- [ ] Checkmark in sleep modal: `#FF6B35` (was `#EA580C`)

---

## 4. Edge Cases

- **Content type color mapping:** `currentItem.contentType` may be null or an arbitrary string. Implement a safe `contentTypeToAtmosphereColor(ct: string | null | undefined): string` helper that maps known types to `colors.content*` values, defaulting to `colors.accentPrimary` for unknown/null. Use `rgba(hex, 0.08)` format.
- **No metadata available:** The `(currentItem.summary || currentItem.contentType || themes.length)` guard already handles the null case for the metadata card — no change needed in the conditional
- **Long sleep modal on small screens:** The `View style={{ height: insets.bottom + 8 }}` spacer at the bottom of the sleep options is important for safe area compliance — keep it
- **iOS scrubber `thumbTintColor` on dark bg:** The blueprint specifies a white `#FFFFFF` thumb. Consider changing `thumbTintColor` to `#FFFFFF` rather than `accentPrimary` — it stands out better on the dark track. Use white thumb: `thumbTintColor: '#FFFFFF'`

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/ExpandedPlayer.tsx` | Full dark theme pass + atmospheric artwork effect + chapter section |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card` |

---

## 7. Notes

- The blueprint shows a `SectionsPreview` / `ChapterListContainer` at the bottom of the screen (chapters list partially visible). The current implementation does not have chapters. This spec does NOT add chapter functionality — it only converts existing elements to dark tokens. The chapter area is a future feature.
- The `ARTWORK_BG` record and `artworkBg()` function should be removed entirely. They represent the old light-mode logic. The new atmospheric glow replaces the concept.
- Anti-slop: Do NOT add `box-shadow` or `elevation` to the artwork card. The depth effect comes from the atmospheric glow behind it, not a shadow.
- The carousel/scroll wrapper for the player body stays as a `ScrollView` — no structural change.
- `borderRadius.miniPlayer` = 14 in theme. The `presentationStyle="pageSheet"` Modal on iOS uses system corner radius, not the app's — corner radius tokens are for the sheet handle area only.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
ExpandedPlayer.tsx
├── Modal (pageSheet)
│   ├── View (bg: backgroundScreen)
│   │   ├── DragHandle (#3A3A4E)
│   │   ├── TopBar (row: collapse chevron + "Now Playing" + spacer)
│   │   └── ScrollView
│   │       ├── ArtworkSection
│   │       │   ├── AtmosphereGlow (absolute, content-type color, 8% opacity)
│   │       │   └── ArtworkCard (surface, r:16, 280×280)
│   │       │       └── HeadsetIcon (accentPrimary, 96)
│   │       ├── MetadataRow (title textPrimary 20/600, author textSecondary)
│   │       ├── Scrubber (accentPrimary fill, #2C303E track, white thumb)
│   │       │   └── Timestamps (textSecondary, 13)
│   │       ├── TransportControls
│   │       │   ├── SkipBack (textPrimary icon)
│   │       │   ├── PlayPause (accentPrimary circle, no elevation)
│   │       │   └── SkipForward (textPrimary icon)
│   │       ├── UtilityRow
│   │       │   ├── SpeedButton (surfaceElevated, r:10)
│   │       │   ├── SleepButton (surfaceElevated/accentPrimary when active)
│   │       │   ├── QueueButton (surfaceElevated)
│   │       │   └── CarModeButton (surfaceElevated)
│   │       └── [metadata] MetadataCard (surface, r:10)
│   ├── SleepModal (transparent)
│   │   └── SheetContainer (surface, r:14 top)
│   │       └── SleepRows (borderDivider dividers, accentPrimary active)
│   └── CarMode overlay (unchanged)
```
