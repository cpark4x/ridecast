# F-P5-UI-03: Sign-In Screen Redesign

## 1. Overview

**Module:** `native/app/sign-in.tsx`
**Phase:** 2 — Core Screens Refresh
**Priority:** P1
**Size:** S — 1pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

The current sign-in screen has a white background, centered layout with a small orange icon, and a black "Continue with Apple" button. The redesign replaces this with the dark atmospheric treatment from the blueprint: `#0F0F1A` base with layered radial glows (orange + teal), a large white wordmark in the upper center, and a white pill CTA pinned to the bottom with legal text beneath it.

**Source material:** `ui-studio/blueprints/01-sign-in/component-spec.md` · `ui-studio/blueprints/01-sign-in/tokens.json` · `ui-studio/moodboard/aesthetic-brief.md`

---

## 2. Requirements

### Interfaces

No new exported types. The file exports a single default component `SignInScreen`. Auth logic (`useOAuth`, `startOAuthFlow`) is unchanged.

```typescript
// Sign-in screen layout structure
// SignInScreen
//   SafeAreaView  bg: colors.backgroundScreen
//     View (AtmosphereLayer) position: absolute, fills screen, z:-1
//       OrangeGlowView   radial, 15% opacity
//       TealGlowView     radial, 12% opacity
//     View (BrandSection) flex:1 alignItems:center justifyContent:center paddingTop:150
//       Ionicons "headset" size:96 color:colors.textPrimary
//       Text "Ridecast"        44px/700/letterSpacing:-1.5
//       Text "Turn anything into a podcast"  18px/400/letterSpacing:0.5
//     View (AuthSection) position or flex pinned to bottom
//       TouchableOpacity (ContinueWithAppleButton)
//         Ionicons "logo-apple" black
//         Text "Continue with Apple" black
//       Text (LegalText)  12px tertiary centered
```

### Behavior

#### AtmosphereLayer
- `position: 'absolute'`, `top: 0`, `left: 0`, `right: 0`, `bottom: 0`
- In React Native there is no native radial gradient — use `expo-linear-gradient` or a nested `View` with `borderRadius` set to half the dimension to approximate the glow effect. The accepted implementation is an absolutely positioned `View` with `borderRadius: 90`, `width: 180`, `height: 180`, `backgroundColor: 'rgba(255,107,53,0.15)'`, centered above the logo; and a second `View` `borderRadius: 80`, `width: 160`, `height: 160`, `backgroundColor: 'rgba(13,148,136,0.12)'`, offset to lower-right. Both use `pointerEvents: 'none'`.
- Do NOT use `@shopify/react-native-skia` or any non-installed gradient package. Plain `View` with a circular borderRadius is sufficient to approximate the glow.

#### BrandSection
- `flex: 1`, `alignItems: 'center'`, `justifyContent: 'center'`, `paddingTop: 150`
- LogoMark: `<Ionicons name="headset" size={96} color={colors.textPrimary} />` — current size is 40px, old color was `"white"` (unchanged in value but now references theme token)
- WordmarkText: `fontSize: 44`, `fontWeight: '700'`, `letterSpacing: -1.5`, `color: colors.textPrimary` — old: `text-3xl font-bold text-gray-900` (30px/700/#111827)
- TaglineText: `fontSize: 18`, `fontWeight: '400'`, `letterSpacing: 0.5`, `color: colors.textSecondary`, `marginTop: 8` — old: two separate `Text` components (`text-base text-gray-500` + `text-sm text-gray-400`)

#### AuthSection
- `paddingHorizontal: 20`, `paddingBottom: 20`, safe-area aware bottom inset
- ContinueWithAppleButton: full-width, `height: 56`, `borderRadius: 14`, `backgroundColor: '#FFFFFF'` (white), `flexDirection: 'row'`, centered content, 8px gap between icon and text — old: `bg-black rounded-2xl py-4 px-6`
- AppleLogoIcon: `color="#000000"` (black on white button) — old: `color="white"` (white on black button)
- ButtonLabel: `color: '#000000'`, `fontSize: 18`, `fontWeight: '500'` — old: `color="white"` 16px/600
- LegalText (NEW): `"By continuing, you agree to our Terms and Privacy Policy"`, `fontSize: 12`, `color: colors.textTertiary`, `textAlign: 'center'`, `marginTop: 12` — old: not present
- Loading state: `<ActivityIndicator color="#000000" />` inside white button — old: `color="white"`
- Error text: `color: colors.statusError` (#EF4444) — old: `text-red-500` (same value)

---

## 3. Acceptance Criteria

- [ ] Screen background is `#0F0F1A` (was white)
- [ ] Two atmospheric glow views visible behind content (orange top-center, teal lower-right)
- [ ] Logo is white headset icon, 96px (was orange 40px)
- [ ] Wordmark "Ridecast" is white, 44px, bold, letterSpacing -1.5 (was gray-900, 30px)
- [ ] Tagline is `#9CA3AF`, 18px, single text node below wordmark
- [ ] "Continue with Apple" button is white pill, 56px height, 14px radius
- [ ] Apple icon and button label are black (#000000) on white background
- [ ] Legal text appears below button in `#6B7280`
- [ ] Loading spinner inside button is black (not white)
- [ ] Error message still renders in red (#EF4444) when auth fails
- [ ] OAuth flow logic unchanged — same `useOAuth({ strategy: "oauth_apple" })` hook, same `handleAppleSignIn` function

---

## 4. Edge Cases

- **No safe area insets on older devices:** `SafeAreaView` handles this — no change needed
- **Long error message:** Error text is already `text-center`; ensure `flexWrap: 'wrap'` or `numberOfLines` not set so it wraps naturally
- **Loading state width:** Button must remain full-width during loading — `ActivityIndicator` centered inside, no layout shift
- **Atmosphere views on small screens:** The glow views are decorative and positioned absolutely — they clip naturally at screen edges without affecting layout

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/sign-in.tsx` | Full visual overhaul per spec. Auth logic unchanged. |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | Provides `colors.backgroundScreen`, `colors.textPrimary`, `colors.textSecondary`, `colors.textTertiary`, `colors.statusError` |

No new packages. `expo-linear-gradient` is NOT required — circular `View` approximation is acceptable and keeps zero new dependencies.

---

## 7. Notes

- `SafeAreaView` stays as the root — its `flex: 1` + `backgroundColor: colors.backgroundScreen` ensures the system status bar area is also dark
- The current screen does NOT have `StatusBar` component inline — status bar style is set globally by `dark-theme-foundation`. No changes to status bar needed here.
- The atmospheric glows must use `pointerEvents: 'none'` so they don't intercept touches
- Anti-slop: do NOT use `ImageBackground`, gradient packages, or blur. Plain circular Views with rgba backgrounds only.
- The `BrandSection` layout uses `flex: 1` + `justifyContent: 'center'` which naturally centers vertically. The `paddingTop: 150` pushes the center point up, giving the visual impression of the brand sitting in the upper half while auth controls anchor at the bottom.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
sign-in.tsx
├── SafeAreaView (backgroundColor: colors.backgroundScreen)
│   ├── AtmosphereLayer (absolute, z: -1)
│   │   ├── OrangeGlow (View, 180×180, borderRadius:90, rgba(255,107,53,0.15))
│   │   └── TealGlow   (View, 160×160, borderRadius:80, rgba(13,148,136,0.12))
│   ├── BrandSection (flex:1, alignItems:center, justifyContent:center)
│   │   ├── LogoMark (Ionicons headset, 96, textPrimary)
│   │   ├── WordmarkText (44/700/-1.5ls, textPrimary)
│   │   └── TaglineText (18/400/+0.5ls, textSecondary)
│   └── AuthSection (paddingH:20, paddingB:20+safeArea)
│       ├── ContinueWithAppleButton (white pill, h:56, r:14)
│       │   ├── AppleLogoIcon (black)
│       │   └── ButtonLabel (black, 18/500)
│       ├── ErrorText (statusError, conditional)
│       └── LegalText (textTertiary, 12px)
```
