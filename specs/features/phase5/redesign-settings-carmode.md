# F-P5-UI-09: Settings + Car Mode Redesign

## 1. Overview

**Module:** `native/app/settings.tsx` · `native/components/CarMode.tsx`
**Phase:** 4 — Player + Library + Settings Refresh
**Priority:** P1
**Size:** S — 1pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

**Settings:** Keep current settings rows and functionality. Apply dark theme tokens to the existing structure. The blueprint (11-settings) is used as a color reference only, not for row inventory. All existing settings rows — account info, playback speed, notifications, ElevenLabs API key, storage, about — are preserved exactly. Token swaps:
- Group card backgrounds: light → `#1A1A2E`
- Row label text: `text-gray-900` → `#FFFFFF`
- Row secondary text / values: `text-gray-500` → `#9CA3AF`
- Toggle track (active): iOS default green → `#FF6B35`
- Section group borders / dividers: `#E5E7EB` → `rgba(255,255,255,0.06)`

**Car Mode:** Already uses `bg-black` (`#000000`) for the screen background — keep it. Per the 09-car-mode blueprint, add `ArticleInfoSection` (episode title + source in the upper area) and a `ProgressBarSection` (thin progress bar), and update the three large transport buttons to blueprint sizes: skip buttons 80×80 with `#1A1A2E` fill, play/pause button 140×140 with `#FF6B35` fill.

**Source material:** `ui-studio/blueprints/11-settings/component-spec.md` · `ui-studio/blueprints/11-settings/tokens.json` · `ui-studio/blueprints/09-car-mode/component-spec.md` · `ui-studio/blueprints/09-car-mode/tokens.json`

---

## 2. Requirements

### Interfaces

No new exported types. All settings logic (`AppPrefs`, `getPrefs`, `setPrefs`, `signOut`, etc.) is unchanged. `CarMode` props (`visible`, `onDismiss`) are unchanged.

### Behavior

#### `native/app/settings.tsx` — dark theme pass on existing rows

**Keep current rows and functionality. These token swaps apply to the existing structure:**

**Root `SafeAreaView`**
- Old `className="flex-1 bg-gray-50"` → `backgroundColor: colors.backgroundScreen` (#0F0F1A)

**Header bar**
- Old `borderBottomColor: "#E5E7EB"` (or `border-gray-100`) → `colors.borderDivider` (`rgba(255,255,255,0.06)`)
- Back chevron: old `color="#374151"` → `colors.textSecondary`
- "Settings" title: old `className="text-xl font-bold text-gray-900"` → `color: colors.textPrimary`, `fontSize: 22`, `fontWeight: '600'`

**`SettingsSection` component** (`native/components/settings/SettingsSection.tsx`)
- Section header text (uppercase title): → `color: colors.textSecondary`, `fontSize: 12`, uppercase
- Group card container: old light bg (`#fff`/`bg-white`/`bg-gray-50`) → `backgroundColor: colors.surface` (#1A1A2E), `borderRadius: borderRadius.card` (10px)
- No shadow, no border on the group card

**`SettingsDivider` component** (`native/components/settings/SettingsDivider.tsx`)
- Divider line: old `backgroundColor: "#E5E7EB"` → `colors.borderDivider` (`rgba(255,255,255,0.06)`)

**`SettingsRow` component** (`native/components/settings/SettingsRow.tsx`)
- Row container: `backgroundColor: colors.surface` (#1A1A2E)
- Label text: old `text-gray-900` → `color: colors.textPrimary` (#FFFFFF)
- Right label / value text: old `text-gray-500` → `color: colors.textSecondary` (#9CA3AF)
- Chevron icon: → `color: colors.textTertiary`
- Destructive label: → `color: colors.statusError`

**`SettingsToggleRow` component** (`native/components/settings/SettingsToggleRow.tsx`)
- Row container: `backgroundColor: colors.surface`
- Label text: old `text-gray-900` → `color: colors.textPrimary`
- Subtitle text: old `text-gray-500` → `color: colors.textSecondary`
- `Switch` toggle:
  - `trackColor={{ false: colors.surfaceElevated, true: colors.accentPrimary }}` (active track → `#FF6B35`, inactive track → `#242438`)
  - `thumbColor: '#FFFFFF'` (white thumb — both platforms)

**Account section**
- Avatar container: old `className="w-10 h-10 rounded-full bg-orange-100"` → `backgroundColor: 'rgba(255,107,53,0.15)'`
- Avatar icon: old `color="#EA580C"` → `colors.accentPrimary`
- Name: old `className="text-base font-semibold text-gray-900"` → `colors.textPrimary`
- Email: old `className="text-sm text-gray-500"` → `colors.textSecondary`

**ElevenLabs API key section**
- Label: old `text-gray-900` → `colors.textPrimary`
- Description: old `text-gray-500` → `colors.textSecondary`
- Input: old `className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"` →
  - `backgroundColor: colors.surfaceElevated` (#242438)
  - `borderColor: colors.borderInput` (`rgba(255,255,255,0.08)`)
  - `borderRadius: borderRadius.card` (10px)
  - `color: colors.textPrimary`
  - `placeholderTextColor: colors.textSecondary`
- Save button (active): old `className="bg-brand"` → `backgroundColor: colors.accentPrimary`
- Save button (inactive): old `className="bg-gray-200"` → `backgroundColor: colors.surfaceElevated`
- Save button text (active): `colors.textPrimary`
- Save button text (inactive): `colors.textTertiary`

**Storage section**
- "Downloaded Episodes" label: old `text-gray-900` → `colors.textPrimary`
- File count/size: old `text-gray-500` → `colors.textSecondary`

**Playback speed badge** (inline in SettingsRow)
- Old `className="bg-orange-100 px-3 py-1 rounded-full"` → `backgroundColor: 'rgba(255,107,53,0.15)'`
- Text: old `text-brand` → `color: colors.accentPrimary`

---

#### `native/components/CarMode.tsx`

Per the 09-car-mode blueprint, Car Mode is "pure `#000000` OLED black, 3 giant buttons, zero decoration." All content renders directly on the black background — no card containers, no surfaces.

**Background** — Already correct: keep `#000000` (`colors.backgroundOled`). Do NOT change to `#0F0F1A`.

**Close button** — keep existing absolute top-right positioning; icon `color="white"` — unchanged.

**NEW: ArticleInfoSection** (add to upper area of screen)
- Container: `position: 'absolute'`, `top: insets.top + 48`, `left: 24`, `right: 24`
- ArticleTitleText: `currentItem.title`, `fontSize: 28`, `fontWeight: '700'`, `color: '#FFFFFF'`, `lineHeight: 33.6`, `numberOfLines: 2`, `ellipsizeMode: 'tail'`
- SourceText: `currentItem.sourceDomain ?? currentItem.author ?? ''`, `fontSize: 16`, `fontWeight: '400'`, `color: '#9CA3AF'`, `marginTop: 8`, `numberOfLines: 1`

**NEW: ProgressBarSection** (add between article info and controls)
- Track `View`: `height: 6`, `backgroundColor: '#1A1A2E'`, `borderRadius: 3`, `marginHorizontal: 40`
- Fill `View`: `backgroundColor: colors.accentPrimary` (#FF6B35), `height: 6`, `borderRadius: 3`
- Fill width: computed from `position / Math.max(duration, 1)` — use `usePlayer()` `position` and `duration` values
- Protect against division by zero: `Math.min(position / Math.max(duration, 1), 1) * 100 + '%'`

**Main controls row** — existing 3-button layout updated per blueprint sizes:
- SkipBack/SkipForward buttons:
  - Old: border-only (`borderColor: "rgba(255,255,255,0.3)"`), no fill
  - New: `backgroundColor: '#1A1A2E'`, no border. Size **80×80** px.
  - Add duration label below icon: `{CAR_MODE_SKIP_SECS}s`, `fontSize: 11`, `color: 'rgba(255,255,255,0.7)'`
- PlayPause button:
  - Old: border-only (`borderColor: "white", borderWidth: 3`), no fill
  - New: `backgroundColor: colors.accentPrimary` (#FF6B35), no border. Size **140×140** px.
  - Play/pause icon: `color="white"` — unchanged

**Episode title at bottom** — REMOVE this element. Episode info is now shown in ArticleInfoSection at the top. Avoid showing episode title twice.

**Layout structure** (flex column instead of centered flex-row for controls only):
```
CarMode View (flex:1, bg:#000000, items:center)
  CloseButton (absolute, top-right)
  ArticleInfoSection (absolute, top: insets.top+48, left:24, right:24)
  ContentArea (flex:1, justifyContent:'center', width:'100%')
    ProgressBarSection (mx:40, mb:48)
    PlaybackControlsRow (flex-row, gap:10, justify:center)
      SkipBackButton (#1A1A2E fill, 80×80, borderRadius:40)
      PlayPauseButton (accentPrimary fill, 140×140, borderRadius:70)
      SkipForwardButton (#1A1A2E fill, 80×80, borderRadius:40)
```

---

## 3. Acceptance Criteria

**Settings:**

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Root background: `#0F0F1A` (was gray-50) | Visual |
| AC-2 | Header border: `rgba(255,255,255,0.06)` (was gray-100) | Code review |
| AC-3 | "Settings" title: white, 22px/600 (was gray-900) | Code review |
| AC-4 | Section group cards: `#1A1A2E` bg, 10px radius, no shadow (was white with shadow) | Visual + `rg 'shadowColor\|elevation' native/components/settings/SettingsSection.tsx` |
| AC-5 | All row labels: white (was gray-900) | Visual: all rows show white label text |
| AC-6 | All row secondary values: `#9CA3AF` (was gray-500) | Visual |
| AC-7 | Toggle tracks: `#FF6B35` when ON (was iOS default green), `#242438` when OFF | Visual: toggle a setting on and off |
| AC-8 | ElevenLabs input: `#242438` bg, input border, white text (was gray-50, gray-200 border) | Visual + code review |
| AC-9 | Save Key button active: `#FF6B35` bg (was `bg-brand` = `#EA580C`) | Visual |
| AC-10 | Playback speed badge: `rgba(255,107,53,0.15)` bg, `#FF6B35` text (was orange-100) | Visual |
| AC-11 | Account avatar bg: `rgba(255,107,53,0.15)` (was orange-100) | Visual |
| AC-12 | Current settings rows intact — account, playback, notifications, ElevenLabs, storage, about | Manual: verify all rows present and functional |

**Car Mode:**

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-13 | Screen background: `#000000` (unchanged, already correct) | Visual |
| AC-14 | ArticleInfoSection visible: episode title (white, 28/700, 2 lines) + source (`#9CA3AF`, 16/400) | Visual: open car mode with active episode |
| AC-15 | ProgressBarSection: 6px bar, `#1A1A2E` track, `#FF6B35` fill advancing with playback | Visual: observe fill moving during playback |
| AC-16 | SkipBack/SkipForward: `#1A1A2E` filled circles (80×80), no border (was border-only white) | Visual |
| AC-17 | PlayPause: `#FF6B35` filled circle (140×140), no border (was white border-only) | Visual |
| AC-18 | Episode title at bottom REMOVED (shown in ArticleInfoSection at top) | Code review: no bottom title element |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| `SettingsSection`/`SettingsRow` sub-components | These sub-components in `native/components/settings/` need dark theme updates. Listed explicitly in Files to Modify. They do not inherit dark styles automatically. |
| `Switch` on Android | `thumbColor` on Android sets the thumb for all states. Set `thumbColor='#FFFFFF'` (white) for both platforms. |
| Car mode `position` and `duration` from `usePlayer()` | `usePlayer()` exposes `position` and `duration`. Progress bar reads them. If `duration === 0`, `Math.max(duration, 1)` prevents division by zero — shows 0% fill. |
| Car mode article title overflow | `numberOfLines={2}` + `ellipsizeMode="tail"` on title. Source text `numberOfLines={1}`. |
| Settings scroll on small screens | `KeyboardAvoidingView` + `ScrollView` already handles this. Set `contentContainerStyle={{ backgroundColor: colors.backgroundScreen }}` if white scroll boundary appears. |
| Car mode `#000000` vs `#0F0F1A` | Car mode is the only screen using `colors.backgroundOled` (#000000). Do NOT change to `backgroundScreen` (#0F0F1A). The OLED black is intentional per design brief. |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/settings.tsx` | Root bg, header, account row, ElevenLabs input, storage, speed badge — theme pass only |
| `native/components/CarMode.tsx` | ArticleInfoSection (new), ProgressBarSection (new), button fill colors + blueprint sizes, remove bottom title |
| `native/components/settings/SettingsSection.tsx` | Dark group card bg (`#1A1A2E`), dark section header text |
| `native/components/settings/SettingsRow.tsx` | Dark label (`#FFFFFF`), value (`#9CA3AF`), chevron (`#6B7280`), destructive (`#EF4444`) |
| `native/components/settings/SettingsToggleRow.tsx` | Toggle `trackColor` → `accentPrimary`, dark label/subtitle |
| `native/components/settings/SettingsDivider.tsx` | `borderDivider` color (`rgba(255,255,255,0.06)`) |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card` |

---

## 7. Notes

- **Settings: keep current rows and functionality.** Every existing settings row (account info, playback speed, notifications, ElevenLabs API key, storage, about) is preserved. The blueprint (11-settings) is used for styling reference only. Do not add or remove rows.
- **Car mode uses `colors.backgroundOled` (#000000), not `colors.backgroundScreen`.** This is the one correct use of the OLED black token. Do NOT change the car mode background to `#0F0F1A`.
- **Anti-slop for Car Mode:** "Pure `#000000` OLED black, 3 giant buttons, zero decoration." The article info and progress bar render directly on `#000000` — no card containers, no surface-colored panels behind them.
- **Button sizes from 09-car-mode blueprint:** skip buttons 80×80 (`size-car-mode-skip-button: 80`), play/pause 140×140 (`size-car-mode-play-button: 140`). These exact values come from the blueprint tokens.
- **`borderRadius.card` = 10.** SettingsSection groups currently use `rounded-2xl` or similar — replace with explicit `borderRadius: 10`.
- **Settings sub-components in `native/components/settings/`.** There are 4 sub-component files that must each be updated. They do not automatically inherit colors from the parent screen.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
settings.tsx (layout unchanged, theme pass)
├── SafeAreaView (bg: backgroundScreen)
│   ├── Header (borderBottom: borderDivider)
│   │   ├── BackChevron (textSecondary)
│   │   └── Title (textPrimary, 22/600)
│   └── KeyboardAvoidingView
│       └── ScrollView
│           ├── AccountSection (SettingsSection)
│           │   ├── AvatarCircle (rgba orange tint, accentPrimary icon)
│           │   ├── Name (textPrimary)
│           │   └── Email (textSecondary)
│           ├── PlaybackSection → SettingsRow + SettingsToggleRow (accentPrimary toggle)
│           ├── NotificationsSection → SettingsToggleRow (accentPrimary toggle)
│           ├── ElevenLabsSection
│           │   └── APIKeyInput (surfaceElevated, borderInput, r:10)
│           ├── StorageSection (textPrimary label, textSecondary meta)
│           └── AboutSection

SettingsSection.tsx: groupCard → surface #1A1A2E, r:10; sectionTitle → textSecondary
SettingsRow.tsx: label → textPrimary; value → textSecondary; chevron → textTertiary
SettingsToggleRow.tsx: trackColor {true: accentPrimary, false: surfaceElevated}; thumbColor → white
SettingsDivider.tsx: → borderDivider rgba(255,255,255,0.06)

CarMode.tsx (new elements + button updates)
├── Modal (fullScreen, bg: #000000 = backgroundOled)
│   └── View (flex:1, bg:#000000)
│       ├── CloseButton (absolute, top-right, white icon)
│       ├── ArticleInfoSection (NEW, absolute, top:insets.top+48, px:24)
│       │   ├── TitleText (white, 28/700, 2 lines)
│       │   └── SourceText (#9CA3AF, 16/400)
│       └── ContentArea (flex:1, justifyContent:center)
│           ├── ProgressBarSection (NEW, mx:40, mb:48)
│           │   └── Track (#1A1A2E, h:6, r:3)
│           │       └── Fill (accentPrimary, computed width)
│           └── PlaybackControlsRow (flex-row, gap:10)
│               ├── SkipBackButton (#1A1A2E fill, 80×80, r:40)
│               ├── PlayPauseButton (accentPrimary fill, 140×140, r:70)
│               └── SkipForwardButton (#1A1A2E fill, 80×80, r:40)
```
