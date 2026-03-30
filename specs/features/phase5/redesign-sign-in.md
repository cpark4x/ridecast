# F-P5-UI-03: Sign-In Screen Redesign

## 1. Overview

**Module:** `native/app/sign-in.tsx`
**Phase:** 2 — Core Screens Refresh
**Priority:** P1
**Size:** S — 1pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

Dark theme visual refresh of the sign-in screen. The current screen has a white background, a generic Ionicons `headset` icon, and a black Apple sign-in button. The redesign applies the dark atmospheric treatment from the blueprint: `#0F0F1A` base with layered radial glows (orange + teal), the actual Ridecast logo asset, and restyled auth button.

**IMPORTANT:** Keep the current `useOAuth` + `startOAuthFlow` auth pattern. Clerk's `<SignIn />` component does NOT work in React Native — it throws "not supported in native environments." The custom Apple auth button is the correct native approach. This spec only changes visuals, not auth logic.

**Source material:** `ui-studio/blueprints/01-sign-in/component-spec.md` · `ui-studio/blueprints/01-sign-in/tokens.json` · `ui-studio/blueprints/01-sign-in/assets.md` · `ui-studio/moodboard/aesthetic-brief.md`

---

## 2. Requirements

### Interfaces

No new exported types. The file exports a single default component `SignInScreen`. Auth logic stays exactly as-is (`useOAuth` from `@clerk/clerk-expo`).

```typescript
// Sign-in screen layout structure (visual changes only)
// SignInScreen
//   SafeAreaView  bg: colors.backgroundScreen (#0F0F1A), flex:1
//     AtmosphereLayer  (position: absolute, fills screen, pointerEvents: 'none')
//       OrangeGlowView   circular View, rgba(255,107,53,0.15)
//       TealGlowView     circular View, rgba(13,148,136,0.12)
//     BrandSection (flex:1, alignItems:center, justifyContent:center)
//       LogoImage  <Image source={require('../../ui-studio/components/ridecast-logo-clean.png')}
//                   style={{ width: 200, height: 56, resizeMode: 'contain' }} />
//       AppName    "Ridecast"  28px/Bold/textPrimary
//       TaglineText  "Turn anything into a podcast"  15px/400/textSecondary
//       SubtaglineText  "Upload. Listen. Learn."  13px/400/textTertiary
//     AuthSection  (paddingHorizontal:20, paddingBottom:40)
//       AppleSignInButton  (KEEP existing useOAuth logic, restyle only)
//         bg: #FFFFFF (white pill on dark bg)
//         icon: logo-apple, color: #000000
//         text: "Continue with Apple", color: #000000, 16px/600
//         borderRadius: 9999 (full pill)
//         height: 52
//       ErrorText  (existing error state, restyle to colors.statusError)
//       LegalText  12px textTertiary centered
```

### Behavior

#### AtmosphereLayer

Decorative radial glows using plain circular `View` elements (no gradient libraries):

- **OrangeGlow:** `position: 'absolute'`, `top: -60`, `alignSelf: 'center'`, `width: 200`, `height: 200`, `borderRadius: 100`, `backgroundColor: 'rgba(255,107,53,0.15)'`
- **TealGlow:** `position: 'absolute'`, `bottom: 160`, `right: -40`, `width: 180`, `height: 180`, `borderRadius: 90`, `backgroundColor: 'rgba(13,148,136,0.12)'`
- Both: `pointerEvents: 'none'` — decorative only, do not intercept touches
- Do NOT use `expo-linear-gradient`, `@shopify/react-native-skia`, or any gradient package. Plain `View` with circular `borderRadius` only.

#### BrandSection

- `flex: 1`, `alignItems: 'center'`, `justifyContent: 'center'`
- **Logo image:** Use the actual Ridecast logo at `ui-studio/components/ridecast-logo-clean.png`. Render as `<Image source={require('../../ui-studio/components/ridecast-logo-clean.png')} style={{ width: 200, height: 56, resizeMode: 'contain' }} />`. Do NOT use a generic Ionicons icon.
- **App name:** `"Ridecast"`, `fontSize: 28`, `fontWeight: '700'`, `color: colors.textPrimary` (#FFFFFF), `marginTop: 16`
- **Tagline:** `"Turn any article, PDF, or link into a podcast episode you can listen to on your commute."`, `fontSize: 15`, `fontWeight: '400'`, `color: colors.textSecondary` (#9CA3AF), `marginTop: 8`, `textAlign: 'center'`, `paddingHorizontal: 40`
- **Subtagline:** `"Upload. Listen. Learn."`, `fontSize: 13`, `fontWeight: '400'`, `color: colors.textTertiary` (#6B7280), `marginTop: 4`, `textAlign: 'center'`

#### AuthSection — Visual Changes Only

**KEEP the existing `useOAuth` + `startOAuthFlow` auth logic exactly as-is.** Only change the visual styling of the button and surrounding container.

Token swaps on the Apple Sign In button:
- `className="w-full flex-row items-center justify-center bg-black rounded-2xl py-4 px-6"` → inline styles:
  - `backgroundColor: '#FFFFFF'` (white pill on dark background — inverted from current)
  - `borderRadius: 9999` (full pill shape)
  - `height: 52`
  - `paddingHorizontal: 24`
  - `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'center'`
- Apple icon: `color="#000000"` (black on white button)
- Button text: `color: '#000000'`, `fontSize: 16`, `fontWeight: '600'`
- Loading spinner: `<ActivityIndicator color="#000000" />` (black on white)

Error text: `color: colors.statusError` (#EF4444) — keeps current behavior, just uses theme token.

**LegalText (NEW):** `"By continuing, you agree to our Terms and Privacy Policy"`, `fontSize: 12`, `color: colors.textTertiary`, `textAlign: 'center'`, `marginTop: 16`.

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Screen background is `#0F0F1A` | Visual: no white/light background visible |
| AC-2 | Two atmospheric glow Views with correct rgba values and positions | Code review: two `View` elements with `position: 'absolute'`, circular `borderRadius`, correct colors |
| AC-3 | Logo renders `ridecast-logo-clean.png`, NOT a generic icon | Code: `require('../../ui-studio/components/ridecast-logo-clean.png')` present; no `Ionicons name="headset"` |
| AC-4 | Auth still works — `useOAuth` + `startOAuthFlow` pattern preserved | Code: `useOAuth` import + `startOAuthFlow` call still present; no `<SignIn />` component |
| AC-5 | Apple button is white pill on dark background | Code: `backgroundColor: '#FFFFFF'`, `borderRadius: 9999` |
| AC-6 | Apple icon and text are black on white button | Code: icon `color="#000000"`, text `color: '#000000'` |
| AC-7 | Glow views use `pointerEvents: 'none'` | Code review: both glow Views |
| AC-8 | Legal text appears below auth button in `#6B7280` | Code: `colors.textTertiary`, `fontSize: 12`, `textAlign: 'center'` |
| AC-9 | No hardcoded light-mode colors remain | `grep -i 'bg-white\|#fff[^6]\|gray-900\|gray-500\|gray-400' native/app/sign-in.tsx` returns nothing |
| AC-10 | No gradient/blur libraries imported | `grep -i 'LinearGradient\|BlurView\|Skia' native/app/sign-in.tsx` returns nothing |
| AC-11 | No `<SignIn />` component from Clerk | `grep '<SignIn' native/app/sign-in.tsx` returns nothing |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| `ridecast-logo-clean.png` not found at require path | Build error — confirm asset exists at `ui-studio/components/ridecast-logo-clean.png` before implementing |
| OAuth flow fails | Existing error handling preserved — error text now uses `colors.statusError` (#EF4444) |
| Loading state during OAuth | Existing `ActivityIndicator` preserved — color changes to `#000000` on white button |
| Small screen devices | Atmosphere glows clip at edges (decorative, no layout impact). Brand section uses `justifyContent: 'center'` so content stays vertically centered. |
| Dark mode system setting | Screen is always dark — no system theme dependency |

---

## 5. Files to Create/Modify

| File | Action | Contents |
|------|--------|----------|
| `native/app/sign-in.tsx` | Modify | Full visual overhaul: dark bg, atmospheric glows, real logo, white pill auth button, legal text. Auth logic untouched. |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | Provides `colors.backgroundScreen`, `colors.textPrimary`, `colors.textSecondary`, `colors.textTertiary`, `colors.statusError` |
| `@clerk/clerk-expo` | Already installed — provides `useOAuth` hook (existing, unchanged) |
| `ui-studio/components/ridecast-logo-clean.png` | Actual app logo — must exist at this path |

No new packages.

---

## 7. Notes

- **DO NOT replace `useOAuth` with `<SignIn />`.** Clerk's `<SignIn />` component does not work in React Native — it throws "not supported in native environments" when wrapped with `WrapComponent()`. The existing `useOAuth` + custom button pattern is the correct native approach. This was confirmed as a blocker in session 22.
- **Use the real logo asset.** `ui-studio/components/ridecast-logo-clean.png` is the actual Ridecast wordmark. Do NOT substitute a generic Ionicons icon.
- **White button on dark background** is the inverse of the current pattern (black button on white background). This follows the blueprint's sign-in treatment and provides strong visual contrast.
- **Atmospheric glows are purely decorative.** `pointerEvents: 'none'` ensures they don't interfere with the auth button's touch target.
- **Anti-slop:** No `ImageBackground`, no gradient packages, no blur. Plain circular Views with rgba backgrounds only.

---

## 8. Implementation Map

_To be filled by implementing agent._

| Requirement | Implementation File + Function | Types/APIs Used | Notes |
|-------------|-------------------------------|-----------------|-------|
| Dark background | `sign-in.tsx` SafeAreaView style | `colors.backgroundScreen` from `theme.ts` | Replace `bg-white` className |
| Atmospheric glows | `sign-in.tsx` two View elements | Plain `View` with `position: 'absolute'` | No gradient libraries |
| Logo image | `sign-in.tsx` Image element | `require('../../ui-studio/components/ridecast-logo-clean.png')` | Replace Ionicons headset |
| Auth button restyle | `sign-in.tsx` TouchableOpacity | Existing `handleAppleSignIn` unchanged | White pill, black text/icon |
| Legal text | `sign-in.tsx` new Text element | `colors.textTertiary` | Below auth button |
