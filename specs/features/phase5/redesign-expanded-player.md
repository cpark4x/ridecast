# F-P5-UI-07: Expanded Player Redesign

## 1. Overview

**Module:** `native/components/ExpandedPlayer.tsx`
**Phase:** 4 — Player + Library + Settings Refresh
**Priority:** P1
**Size:** M — 2pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

The expanded player currently uses a white background (`bg-white`), light-mode grays for icons and text, a simple light-colored artwork placeholder, and the wrong accent color (`#EA580C`). This spec converts it to the immersive dark player: `#0F0F1A` base with an artwork color-bleed atmospheric effect, `#FF6B35` scrubber fill with `#2C303E` track and white thumb, dark secondary controls, a `#1A1A2E` metadata card, and a dark sleep timer sheet.

**Chapters section is deferred to Phase 6 roadmap item #42 (Chapter Explorer). Do NOT add a chapters area, chapters placeholder, or any chapters-related UI in this spec.** The blueprint shows a `SectionsPreview` / `ChapterListContainer` — this is intentionally excluded.

**This is a theme pass on the existing control inventory.** Keep all existing controls: play/pause, skip back/forward, playback speed, sleep timer, queue button, car mode button. No controls are added or removed.

**Source material:** `ui-studio/blueprints/08-expanded-player/component-spec.md` · `ui-studio/blueprints/08-expanded-player/tokens.json`

---

## 2. Requirements

### Interfaces

No prop or hook changes. `ExpandedPlayer` props (`visible`, `onDismiss`) are unchanged. All `usePlayer()` destructured values are unchanged. No new state.

### Behavior

**Token swaps — exact old value → new value:**

#### Modal root
- Old `className="flex-1 bg-white"` → `backgroundColor: colors.backgroundScreen` (#0F0F1A)

#### Drag handle
- Old `className="w-10 h-1 rounded-full bg-gray-300"` → `backgroundColor: '#3A3A4E'` (blueprint `color-handle: #3A3A4E`)

#### "Now Playing" label
- Old `className="text-base font-semibold text-gray-700"` → `color: colors.textSecondary` (#9CA3AF), `fontSize: 15`, `fontWeight: '500'`

#### Collapse chevron icon
- Old `color="#374151"` → `color: colors.textSecondary` (#9CA3AF)

#### ArtworkSection — atmospheric background (replacing light-mode `artworkBg`)

The current implementation uses an `artworkBg(contentType, sourceType)` function returning light pastel background colors. Replace with a dark atmospheric approach:

- **Remove** the `ARTWORK_BG` record and `artworkBg` function entirely.
- Artwork container background: `backgroundColor: colors.backgroundScreen` (#0F0F1A) — flat dark, no light pastels.
- **Add** an atmospheric glow `View` (absolute, behind artwork): 200×200px, `borderRadius: 100`, centered behind artwork. Color derived from `currentItem.contentType`:
  - Map content type to `colors.content*` value, then append `'14'` hex alpha suffix (8% opacity)
  - Mapping: `tech`/`ai` → `colors.contentTech` (#2563EB), `business`/`finance` → `colors.contentBusiness` (#EA580C), `science` → `colors.contentScience` (#0D9488), `fiction`/`psychology`/`philosophy` → `colors.contentFiction` (#7C3AED), `news`/`politics` → `colors.contentNews` (#DB2777), `biography` → `colors.contentBiography` (#059669)
  - Fallback (no/unknown content type): `colors.accentPrimary` (#FF6B35) at 8% opacity
  - Implementation: `const atmosphereColor = contentTypeToColor(currentItem.contentType)` + `'14'` (hex alpha = 8%). Or use `rgba(r,g,b,0.08)`.
- **Anti-slop:** Do NOT add `box-shadow` or `elevation` to the artwork card. Depth comes from the atmospheric glow, not a shadow.

#### Artwork card
- Old size/style: `style={{ width: 280, height: 280, backgroundColor: bg }}` → `width: 280, height: 280, borderRadius: 16`, `backgroundColor: colors.surface` (#1A1A2E)
- Headset icon inside: old `color="#EA580C"` → `color: colors.accentPrimary` (#FF6B35). Size 96 — unchanged.

#### EpisodeTitle
- Old `className="text-xl font-bold text-gray-900"` → `color: colors.textPrimary`, `fontSize: 20`, `fontWeight: '600'`, `letterSpacing: 0.3`

#### Author text
- Old `className="text-base text-gray-500"` → `color: colors.textSecondary`

#### Scrubber (`Slider` component)
- Old `minimumTrackTintColor: "#EA580C"` → `colors.accentPrimary` (#FF6B35)
- Old `maximumTrackTintColor: "#E5E7EB"` → `'#2C303E'` (blueprint `color-scrubber-track`)
- Old `thumbTintColor: "#EA580C"` → `'#FFFFFF'` (white thumb — stands out clearly on dark `#2C303E` track)
- Elapsed/remaining timestamps: old `className="text-xs text-gray-500"` → `color: colors.textSecondary`, `fontSize: 13`

#### Main controls (transport) — keep existing inventory
- Skip back icon: old `color="#374151"` → `color: colors.textPrimary` (white — active transport icons are white)
- Skip forward icon: same
- Play/Pause button: old `className="w-16 h-16 rounded-full bg-brand"`, `style={{ elevation: 4 }}` →
  - `backgroundColor: colors.accentPrimary` (#FF6B35)
  - **Remove `elevation: 4`** — no shadows in this system
  - Keep `w-16 h-16 rounded-full` (64px circle)

#### Secondary controls (utility row) — keep existing inventory
- Speed button: old `className="bg-gray-100 px-3 py-1.5 rounded-full"` → `backgroundColor: colors.surfaceElevated` (#242438), `borderRadius: borderRadius.card` (10px)
- Speed text: old `className="text-sm font-bold text-gray-800"` → `color: colors.textPrimary`
- Sleep button (inactive): old `className="bg-gray-100 p-2 rounded-full"` → `backgroundColor: colors.surfaceElevated`, `borderRadius: borderRadius.card`
- Sleep button (active): old `className="bg-brand p-2 rounded-full"` → `backgroundColor: colors.accentPrimary`
- Sleep/Queue/Car icons (inactive): old `color="#374151"` → `color: colors.textSecondary`
- Active sleep icon: `color: colors.textPrimary` (white on orange background)
- Queue button: `backgroundColor: colors.surfaceElevated`, `borderRadius: borderRadius.card`, `textSecondary` icon
- Car mode button: same as inactive sleep

#### Metadata/Info section (summary card)
- Old `className="mx-5 bg-gray-50 rounded-2xl p-4"` → `backgroundColor: colors.surface` (#1A1A2E), `borderRadius: borderRadius.card` (10px), `marginHorizontal: 20`
- Summary text: old `className="text-sm text-gray-700 leading-5 mb-3"` → `color: colors.textSecondary`
- Format badge: old `className="bg-orange-100 px-2.5 py-1 rounded-full"` → `backgroundColor: 'rgba(255,107,53,0.15)'`; text old `text-orange-700` → `colors.accentPrimary`
- ContentType badge: old `className="bg-blue-100 px-2.5 py-1 rounded-full"` → `backgroundColor: 'rgba(37,99,235,0.15)'`; text old `text-blue-700` → `colors.contentTech`
- Theme badges: old `className="bg-gray-200 px-2.5 py-1 rounded-full"` → `backgroundColor: colors.surfaceElevated`; text old `text-gray-700` → `colors.textSecondary`

#### Sleep timer modal
- Outer `bg-white w-full mx-0 rounded-t-3xl overflow-hidden` → `backgroundColor: colors.surface`, `borderTopLeftRadius: 14`, `borderTopRightRadius: 14`
- Drag handle inside modal: old `bg-gray-300` → `backgroundColor: '#3A3A4E'`
- Modal title: old `text-gray-900` → `color: colors.textPrimary`
- Sleep rows: old `border-gray-100` (border-top divider) → `borderTopColor: colors.borderDivider`
- Active row: old `bg-orange-50` → `backgroundColor: 'rgba(255,107,53,0.10)'`
- Active row text: old `text-brand font-semibold` → `color: colors.accentPrimary`, `fontWeight: '600'`
- Inactive row text: old `text-gray-900` → `color: colors.textPrimary`
- Checkmark icon: old `color="#EA580C"` → `colors.accentPrimary`
- Background scrim: `bg-black/40` — keep (already dark)

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Player modal background is `#0F0F1A` (was white) | Visual |
| AC-2 | Drag handle is `#3A3A4E` (was gray-300) | Code review |
| AC-3 | "Now Playing" label is `#9CA3AF`, 15px/500 (was gray-700) | Code review |
| AC-4 | Artwork container is `#1A1A2E`, 16px radius (was light pastel background) | Visual + code review |
| AC-5 | Headset icon inside artwork is `#FF6B35` (was `#EA580C`) | Code review |
| AC-6 | Atmospheric glow behind artwork uses content-type color at 8% opacity (`14` hex alpha) | Code review: `contentTypeToColor` helper + glow View with computed color |
| AC-7 | `ARTWORK_BG` record and `artworkBg` function are removed | `rg 'ARTWORK_BG\|artworkBg' native/components/ExpandedPlayer.tsx` — returns nothing |
| AC-8 | Episode title is white, 20px/600/+0.3ls (was gray-900, text-xl font-bold) | Code review |
| AC-9 | Scrubber: `#FF6B35` minimum fill, `#2C303E` track, `#FFFFFF` thumb (was `#EA580C` / `#E5E7EB` / `#EA580C`) | Code review: `minimumTrackTintColor`, `maximumTrackTintColor`, `thumbTintColor` |
| AC-10 | Skip icons are white (was `#374151`) | Code review |
| AC-11 | Play/Pause button: `#FF6B35`, no `elevation` prop (was `bg-brand` with `elevation: 4`) | Code review: no `elevation` key in button styles |
| AC-12 | Speed/sleep/queue/car buttons: `#242438` bg (was gray-100) | Code review |
| AC-13 | Active speed text is white; active sleep button is `#FF6B35` bg | Visual: set speed ≠ 1.0x and active sleep timer |
| AC-14 | Metadata card: `#1A1A2E` bg, 10px radius (was gray-50, rounded-2xl) | Visual + code review |
| AC-15 | Sleep modal sheet: `#1A1A2E` bg, 14px top radius (was white, rounded-t-3xl) | Visual |
| AC-16 | Active sleep row: `rgba(255,107,53,0.10)` bg, `#FF6B35` text (was orange-50) | Visual |
| AC-17 | Checkmark in sleep modal: `#FF6B35` (was `#EA580C`) | Code review |
| AC-18 | No chapters area, chapters placeholder, or chapters-related components | Code review: `rg -i 'chapter' native/components/ExpandedPlayer.tsx` — returns nothing |
| AC-19 | Atmosphere glow has no `elevation` or `shadowColor` | Code review: glow View style has no shadow props |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Content type color mapping — null/unknown type | `contentTypeToColor` returns `colors.accentPrimary` (#FF6B35) as fallback. Glow renders orange tint. |
| No metadata available | `(currentItem.summary || currentItem.contentType || themes.length)` guard already handles null case for metadata card — no change needed |
| Long sleep modal on small screens | `View style={{ height: insets.bottom + 8 }}` spacer at the bottom of sleep options keeps safe area compliance — keep it |
| iOS scrubber thumb on dark track | White (`#FFFFFF`) thumb on `#2C303E` track has high contrast — correct per blueprint and §2 above |
| Artwork glow on OLED screens | Glow at 8% opacity on `#0F0F1A` is subtle but visible; acceptable — matches blueprint intent |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/components/ExpandedPlayer.tsx` | Full dark theme pass + atmospheric artwork effect. Remove `ARTWORK_BG`/`artworkBg`. Update all token values. No chapters. No new controls. |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card` |

---

## 7. Notes

- **Chapters section is deferred to Phase 6 roadmap item #42 (Chapter Explorer). Do NOT add a chapters area.** The blueprint shows `SectionsPreview` / `ChapterListContainer`. This is explicitly excluded from this spec. Any chapter UI — placeholder, comment, or stub — must not be added.
- **Keep existing control inventory.** Play/pause, skip back 15s, skip forward 30s, playback speed, sleep timer, queue, car mode button — all kept. No controls are added or removed.
- **Scrubber thumb is white (`#FFFFFF`), not orange.** On the dark `#2C303E` track, a white thumb provides significantly better contrast and visual clarity than an orange thumb. Blueprint's edge case analysis confirms: use `thumbTintColor: '#FFFFFF'`.
- **The `ARTWORK_BG` record and `artworkBg()` function are removed entirely.** They represent the old light-mode logic. The new atmospheric glow replaces the concept.
- **Anti-slop:** Do NOT add `box-shadow` or `elevation` to the artwork card or glow View. The depth effect comes from the atmospheric glow color, not a shadow.
- **`backgroundOled` is NOT used here.** The expanded player background is `backgroundScreen` (#0F0F1A). `backgroundOled` (#000000) is Car Mode only and the Expanded Player's atmospheric glow context — not the full player background.
- The carousel/scroll wrapper for the player body stays as a `ScrollView` — no structural change.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
ExpandedPlayer.tsx (layout unchanged, theme pass + atmospheric artwork)
├── Modal (pageSheet)
│   ├── View (bg: backgroundScreen #0F0F1A)
│   │   ├── DragHandle (#3A3A4E)
│   │   ├── TopBar (row: collapse chevron textSecondary + "Now Playing" 15/500 textSecondary + spacer)
│   │   └── ScrollView
│   │       ├── ArtworkSection
│   │       │   ├── AtmosphereGlow (absolute, 200×200, r:100, contentTypeColor at 8% opacity, no shadow)
│   │       │   └── ArtworkCard (surface #1A1A2E, r:16, 280×280, no shadow)
│   │       │       └── HeadsetIcon (accentPrimary #FF6B35, 96)
│   │       ├── MetadataRow (title textPrimary 20/600/+0.3ls, author textSecondary)
│   │       ├── Scrubber (accentPrimary min, #2C303E track, white thumb)
│   │       │   └── Timestamps (textSecondary, 13)
│   │       ├── TransportControls (keep existing)
│   │       │   ├── SkipBack (textPrimary icon)
│   │       │   ├── PlayPause (accentPrimary circle, no elevation)
│   │       │   └── SkipForward (textPrimary icon)
│   │       ├── UtilityRow (keep existing buttons)
│   │       │   ├── SpeedButton (surfaceElevated, r:10, textPrimary text)
│   │       │   ├── SleepButton (surfaceElevated/accentPrimary when active)
│   │       │   ├── QueueButton (surfaceElevated, textSecondary icon)
│   │       │   └── CarModeButton (surfaceElevated, textSecondary icon)
│   │       └── [metadata] MetadataCard (surface #1A1A2E, r:10, mx:20)
│   ├── SleepModal (transparent)
│   │   └── SheetContainer (surface #1A1A2E, r:14 top)
│   │       └── SleepRows (borderDivider dividers, accentPrimary active row)
│   └── CarMode overlay (unchanged)

contentTypeToColor helper:
  'tech' | 'ai' → colors.contentTech
  'business' | 'finance' → colors.contentBusiness
  'science' → colors.contentScience
  'fiction' | 'psychology' | 'philosophy' → colors.contentFiction
  'news' | 'politics' → colors.contentNews
  'biography' → colors.contentBiography
  null | unknown → colors.accentPrimary
```
