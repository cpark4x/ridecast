# F-P5-UI-09: Settings + Car Mode Redesign

## 1. Overview

**Module:** `native/app/settings.tsx` · `native/components/CarMode.tsx`
**Phase:** 4 — Player + Library + Settings Refresh
**Priority:** P1
**Size:** S — 1pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

**Settings:** Currently uses `bg-gray-50` root with `SettingsSection` components that wrap groups. This spec converts to `#0F0F1A` root, `#1A1A2E` grouped section cards, `#FF6B35` toggles, and correct dark text hierarchy.

**Car Mode:** Already uses `bg-black` (`#000000`) for the screen background — this is correct. The main changes are structural: add an `ArticleInfoSection` (title + source text in the upper area), add a thin `ProgressBarSection` with `#FF6B35` fill, and update the three control buttons to the blueprint layout (`#1A1A2E` skip buttons, `#FF6B35` play/pause button circle).

**Source material:** `ui-studio/blueprints/11-settings/component-spec.md` · `ui-studio/blueprints/11-settings/tokens.json` · `ui-studio/blueprints/09-car-mode/component-spec.md` · `ui-studio/blueprints/09-car-mode/tokens.json`

---

## 2. Requirements

### Interfaces

No new exported types. All settings logic (`AppPrefs`, `getPrefs`, `setPrefs`, `signOut`, etc.) is unchanged. `CarMode` props (`visible`, `onDismiss`) are unchanged.

### Behavior

#### `native/app/settings.tsx`

**Root `SafeAreaView`**
- `className="flex-1 bg-gray-50"` → `backgroundColor: colors.backgroundScreen` (#0F0F1A)

**Header bar**
- `className="flex-row items-center px-4 py-3 border-b border-gray-100"` →
  - `borderBottomColor: colors.borderDivider`
  - `borderBottomWidth: 1`
- Back chevron: `color="#374151"` → `colors.textSecondary`
- "Settings" title: `className="text-xl font-bold text-gray-900"` → `color: colors.textPrimary`, `fontSize: 22`, `fontWeight: '600'`

**`SettingsSection` component** (`native/components/settings/SettingsSection.tsx`)
The section wrapper is a separate sub-component. It needs dark theme:
- Section header text (uppercase section title): `color: colors.textSecondary`, `fontSize: 12`, uppercase — was light-mode gray
- Group card container: `backgroundColor: colors.surface` (#1A1A2E), `borderRadius: borderRadius.card` (10px)
- No shadow, no border (elevation is color-only per design system)

**`SettingsDivider` component** (`native/components/settings/SettingsDivider.tsx`)
- Divider line: `backgroundColor: colors.borderDivider` (was likely `#E5E7EB` or similar light color)

**`SettingsRow` component** (`native/components/settings/SettingsRow.tsx`)
- Row container: `backgroundColor: colors.surface` (#1A1A2E)
- Label text: `color: colors.textPrimary`
- Right label / value text: `color: colors.textSecondary`
- Chevron icon: `color: colors.textTertiary`
- Destructive label: `color: colors.statusError`

**`SettingsToggleRow` component** (`native/components/settings/SettingsToggleRow.tsx`)
- Row container: `backgroundColor: colors.surface`
- Label text: `color: colors.textPrimary`
- Subtitle text: `color: colors.textSecondary`
- `Switch` component: `trackColor={{ false: colors.surfaceElevated, true: colors.accentPrimary }}`, `thumbColor: '#FFFFFF'` (the toggle track/thumb — was iOS default green)

**Account section**
- Avatar: `className="w-10 h-10 rounded-full bg-orange-100"` → `backgroundColor: 'rgba(255,107,53,0.15)'` (dark tint)
- Avatar icon: `color="#EA580C"` → `colors.accentPrimary`
- Name: `className="text-base font-semibold text-gray-900"` → `colors.textPrimary`
- Email: `className="text-sm text-gray-500"` → `colors.textSecondary`

**ElevenLabs API key section**
- Label: `className="text-base font-medium text-gray-900 mb-1"` → `colors.textPrimary`
- Description: `className="text-xs text-gray-500 mb-3"` → `colors.textSecondary`
- Input: `className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 bg-gray-50"` →
  - `backgroundColor: colors.surfaceElevated`
  - `borderColor: colors.borderInput`
  - `borderRadius: borderRadius.card`
  - `color: colors.textPrimary`
  - `placeholderTextColor: colors.textSecondary`
- Save button (active): `className="bg-brand"` → `backgroundColor: colors.accentPrimary`
- Save button (inactive): `className="bg-gray-200"` → `backgroundColor: colors.surfaceElevated`
- Save button text (active): `text-white` → `colors.textPrimary`
- Save button text (inactive): `text-gray-400` → `colors.textTertiary`

**Storage section**
- "Downloaded Episodes" label: `text-gray-900` → `colors.textPrimary`
- File count/size: `text-gray-500` → `colors.textSecondary`

**Playback speed badge** (inline in SettingsRow)
- `className="bg-orange-100 px-3 py-1 rounded-full"` → `backgroundColor: 'rgba(255,107,53,0.15)'`
- Text: `text-sm font-bold text-brand` → `color: colors.accentPrimary`

---

#### `native/components/CarMode.tsx`

**Background** — Already correct: `className="flex-1 bg-black"` → keep `#000000` (blueprint `color-background-screen: #000000`, OLED black)

**Close button** — existing `absolute top-0 right-4 p-3`
- Keep positioning
- Icon: `color="white"` — unchanged

**NEW: ArticleInfoSection** (add above controls)
Insert a `View` in the upper area showing current episode info:
- Container: `position: 'absolute'`, `top: insets.top + 48`, `left: 24`, `right: 24`
- ArticleTitleText: `currentItem.title`, `fontSize: 28`, `fontWeight: '700'`, `color: '#FFFFFF'`, `lineHeight: 33.6`, `numberOfLines: 2`
- SourceText: `currentItem.sourceDomain ?? currentItem.author ?? ''`, `fontSize: 16`, `fontWeight: '400'`, `color: '#9CA3AF'`, `marginTop: 8`

**NEW: ProgressBarSection** (add between article info and controls)
Insert a thin progress bar between the article info and the playback controls:
- Track: `height: 6`, `backgroundColor: '#1A1A2E'`, `borderRadius: 3`, `marginHorizontal: 40`, absolute or within flex column
- Fill: computed from `position / duration * 100 + '%'` — use `usePlayer()` exposed `position` and `duration` values
- Fill: `backgroundColor: colors.accentPrimary`, same height/radius
- Position: between ArticleInfoSection and PlaybackControlsRow. Use flex column layout rather than absolute positioning for the body section.

**Main controls row** — existing layout preserved (3 buttons: skip back, play/pause, skip forward)
- SkipBack/SkipForward buttons: change `borderColor: "rgba(255,255,255,0.3)"` → `backgroundColor: '#1A1A2E'` (fill the button). Remove border. Size stays 80×80.
- SkipBack/SkipForward: add duration label text below icon: `{CAR_MODE_SKIP_SECS}s`, `fontSize: 11`, `color: 'rgba(255,255,255,0.7)'`
- PlayPause button: change `borderColor: "white", borderWidth: 3` (outline only) → `backgroundColor: colors.accentPrimary`, remove border. Size stays 140×140.
- PlayPause icon color: `color="white"` — unchanged

**Episode title at bottom** — REMOVE this element now that `ArticleInfoSection` is shown at top. The episode title is no longer shown twice.

**Layout restructure**
The current layout uses a centered `flex-row` for controls. Add flex column structure:
```
CarMode View (flex:1, bg:#000000, items:center)
  CloseButton (absolute, top-right)
  ContentArea (flex:1, justifyContent:'center', width:'100%')
    ArticleInfoSection (px:24, mb:40)
    ProgressBarSection (mx:40, mb:48)
    PlaybackControlsRow (flex-row, gap:10, justify:center)
      SkipBackButton (#1A1A2E fill, 80×80)
      PlayPauseButton (accentPrimary fill, 140×140)
      SkipForwardButton (#1A1A2E fill, 80×80)
```

---

## 3. Acceptance Criteria

**Settings:**
- [ ] Root background: `#0F0F1A` (was gray-50)
- [ ] Header border: `rgba(255,255,255,0.06)` (was gray-100)
- [ ] "Settings" title: white, 22px/600 (was gray-900)
- [ ] Section group cards: `#1A1A2E` bg, 10px radius, no shadow (was white with shadow)
- [ ] All row labels: white (was gray-900)
- [ ] All row secondary values: `#9CA3AF` (was gray-500)
- [ ] Toggle tracks: `#FF6B35` when ON (was iOS green)
- [ ] ElevenLabs input: `#242438` bg, input border, white text (was gray-50, gray-200 border)
- [ ] Save Key button active: `#FF6B35` bg (was `bg-brand` = `#EA580C`)
- [ ] Playback speed badge: `rgba(255,107,53,0.15)` bg, `#FF6B35` text (was orange-100)
- [ ] Account avatar bg: `rgba(255,107,53,0.15)` (was orange-100)

**Car Mode:**
- [ ] Screen background: `#000000` (unchanged, already correct)
- [ ] ArticleInfoSection visible: episode title (white, 28/700) + source (gray, 16/400)
- [ ] ProgressBarSection: 6px bar, `#1A1A2E` track, `#FF6B35` fill (fill advances with playback)
- [ ] SkipBack/SkipForward: `#1A1A2E` filled circles, no border (was border-only white)
- [ ] PlayPause: `#FF6B35` filled circle (was white border-only)
- [ ] Episode title at bottom REMOVED (moved to ArticleInfoSection at top)

---

## 4. Edge Cases

- **SettingsSection/SettingsRow sub-components:** These sub-components in `native/components/settings/` need dark theme updates. List them explicitly in Files to Modify. Do not assume they inherit dark styles automatically.
- **`Switch` component on Android:** `Switch` on Android uses `trackColor` and `thumbColor` differently. The `thumbColor` prop on Android sets the thumb for all states. Set `thumbColor={colors.textPrimary}` (white) for both platforms.
- **Car mode `position` and `duration` from `usePlayer()`:** `usePlayer()` already exposes `position` and `duration`. The progress bar just reads them. If `duration === 0`, show 0% fill (protect against division by zero: `Math.min(position / Math.max(duration, 1), 1)`).
- **Car mode article info overflow:** Title `numberOfLines={2}` with `ellipsizeMode="tail"` to prevent overflow. Source text `numberOfLines={1}`.
- **Settings scroll on small screens:** The `KeyboardAvoidingView` + `ScrollView` already handles this. Background is now dark — ensure no flash of white at scroll boundaries by setting `contentContainerStyle={{ backgroundColor: colors.backgroundScreen }}` if needed.

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/settings.tsx` | Root bg, header, account row, ElevenLabs input, storage, speed badge |
| `native/components/CarMode.tsx` | ArticleInfoSection (new), ProgressBarSection (new), button fill colors, remove bottom title |
| `native/components/settings/SettingsSection.tsx` | Dark group card, section header text |
| `native/components/settings/SettingsRow.tsx` | Dark label, value, chevron, destructive colors |
| `native/components/settings/SettingsToggleRow.tsx` | Toggle `trackColor` → `accentPrimary`, dark label/subtitle |
| `native/components/settings/SettingsDivider.tsx` | `borderDivider` color |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | `colors.*`, `borderRadius.card` |

---

## 7. Notes

- Car mode `#000000` background is already correct and is the one case where `colors.backgroundOled` (not `colors.backgroundScreen`) is used. Do not change it to `#0F0F1A`.
- The blueprint (09-car-mode) shows `PlayPauseButton` with `color-accent-primary` fill (`#FF6B35`) and skip buttons with `color-surface-button-secondary` fill (`#1A1A2E`). This is a significant change from the current all-outline buttons.
- Anti-slop: Car mode is "pure `#000000` OLED black, 3 giant buttons, zero decoration." Do NOT add any `#1A1A2E` card surfaces behind the content area. The article info and progress bar render directly on `#000000`.
- The `SettingsSection` wrapper currently renders section title as a prop. Look for the `title` prop rendering and update its color there.
- `borderRadius.card` = 10. SettingsSection groups currently use `rounded-2xl` or similar — replace with explicit 10px.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
settings.tsx
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
│           ├── PlaybackSection → group using SettingsRow + SettingsToggleRow
│           ├── NotificationsSection → SettingsToggleRow (accentPrimary toggle)
│           ├── ElevenLabsSection
│           │   └── APIKeyInput (surfaceElevated, borderInput)
│           ├── StorageSection
│           └── AboutSection

CarMode.tsx
├── Modal (fullScreen, bg: #000000)
│   └── View (flex:1, bg:#000000)
│       ├── CloseButton (absolute, top-right)
│       └── ContentArea (flex:1, justifyContent:center)
│           ├── ArticleInfoSection (NEW, px:24)
│           │   ├── TitleText (white, 28/700, 2 lines)
│           │   └── SourceText (#9CA3AF, 16/400)
│           ├── ProgressBarSection (NEW, mx:40, mb:48)
│           │   └── Track (#1A1A2E, h:6, r:3)
│           │       └── Fill (accentPrimary, computed width)
│           └── PlaybackControlsRow (flex-row, gap:10)
│               ├── SkipBackButton (#1A1A2E fill, 80×80)
│               ├── PlayPauseButton (accentPrimary fill, 140×140)
│               └── SkipForwardButton (#1A1A2E fill, 80×80)
```
