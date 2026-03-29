# F-P5-UI-03: Sign-In Screen Redesign

## 1. Overview

**Module:** `native/app/sign-in.tsx`
**Phase:** 2 — Core Screens Refresh
**Priority:** P1
**Size:** S — 1pt
**Depends on:** `dark-theme-foundation` (F-P5-UI-01)

The current sign-in screen has a white background, centered layout with a small orange icon, and a black "Continue with Apple" button. The redesign replaces this with the dark atmospheric treatment from the blueprint: `#0F0F1A` base with layered radial glows (orange + teal), the actual Ridecast logo wordmark (`ui-studio/components/ridecast-logo-clean.png`) in the upper center, and auth handled via Clerk's `<SignIn>` component with a styled wrapper. The app already uses Clerk for authentication; this spec wires up the Clerk component rather than building custom auth buttons.

**Source material:** `ui-studio/blueprints/01-sign-in/component-spec.md` · `ui-studio/blueprints/01-sign-in/tokens.json` · `ui-studio/blueprints/01-sign-in/assets.md` · `ui-studio/moodboard/aesthetic-brief.md`

---

## 2. Requirements

### Interfaces

No new exported types. The file exports a single default component `SignInScreen`. Auth logic is handled by Clerk's `<SignIn>` component — the custom `useOAuth` / `startOAuthFlow` pattern is replaced.

```typescript
// Sign-in screen layout structure
// SignInScreen
//   SafeAreaView  bg: colors.backgroundScreen  (flex:1)
//     AtmosphereLayer  (position: absolute, fills screen, pointerEvents: 'none', zIndex: -1)
//       OrangeGlowView   radial approximation, opacity 0.15
//       TealGlowView     radial approximation, opacity 0.12
//     BrandSection (flex:1, alignItems:center, paddingTop:120)
//       LogoImage  <Image source={require('../../ui-studio/components/ridecast-logo-clean.png')}
//                    style={{ width: 200, height: 56, resizeMode: 'contain' }} />
//       TaglineText  "Turn anything into a podcast"  18px/400/letterSpacing:0.5
//     AuthSection  (paddingHorizontal:20, paddingBottom:20)
//       ClerkSignInWrapper  (styles the Clerk <SignIn> component container)
//         <SignIn />  (Clerk handles Apple + Google auth buttons, input forms, etc.)
//       LegalText  12px textTertiary centered
```

### Behavior

#### AtmosphereLayer

The blueprint's `assets.md` specifies the following glow positions and values (adapted for React Native using circular `View` approximations — no gradient libraries):

- **OrangeGlow:** `position: 'absolute'`, `top: -60`, `left: '50%'`, `marginLeft: -100`, `width: 200`, `height: 200`, `borderRadius: 100`, `backgroundColor: 'rgba(255,107,53,0.15)'`, `pointerEvents: 'none'`. Centered above the logo area per blueprint radial-gradient: `radial-gradient(circle at 50% 20%, rgba(255,107,53,0.15), transparent 60%)`.
- **TealGlow:** `position: 'absolute'`, `bottom: 160`, `right: -40`, `width: 180`, `height: 180`, `borderRadius: 90`, `backgroundColor: 'rgba(13,148,136,0.12)'`, `pointerEvents: 'none'`. Lower-right quadrant per blueprint: `radial-gradient(circle at 80% 70%, rgba(13,148,136,0.12), transparent 55%)`.
- Both views: `pointerEvents: 'none'` — decorative only, do not intercept touches.
- Do NOT use `@shopify/react-native-skia`, `expo-linear-gradient`, or any non-installed gradient package. Plain `View` with circular `borderRadius` is the accepted implementation.

#### BrandSection

- `flex: 1`, `alignItems: 'center'`, `paddingTop: 120`
- **Logo image:** Use the actual Ridecast logo asset at `ui-studio/components/ridecast-logo-clean.png`. Render as `<Image source={require('../../ui-studio/components/ridecast-logo-clean.png')} style={{ width: 200, height: 56, resizeMode: 'contain' }} />`. Do NOT substitute a generic icon (`Ionicons "headset"` or similar). This is the real app wordmark.
- **TaglineText:** `"Turn anything into a podcast"`, `fontSize: 18`, `fontWeight: '400'`, `letterSpacing: 0.5`, `color: colors.textSecondary` (#9CA3AF), `marginTop: 16`, `textAlign: 'center'`.

#### AuthSection

The auth UI is handled entirely by Clerk's `<SignIn>` component. The current codebase already has Clerk configured (via `@clerk/clerk-expo`). This spec replaces the custom `useOAuth` Apple-only button with the Clerk-managed component that supports both Apple and Google.

- **ClerkSignInWrapper:** A `View` that wraps `<SignIn />` to apply container styling consistent with the dark theme. The wrapper uses `borderRadius: borderRadius.card` (10px), `overflow: 'hidden'`. Do not apply a background — Clerk renders its own themed UI inside.
- **Clerk theming:** Apply the Clerk dark theme by passing `appearance` props to `<SignIn />`. Use the Clerk `dark` base theme and override tokens: `colorBackground: colors.surface` (#1A1A2E), `colorInputBackground: colors.surfaceElevated` (#242438), `colorText: colors.textPrimary` (#FFFFFF), `colorTextSecondary: colors.textSecondary` (#9CA3AF), `colorPrimary: colors.accentPrimary` (#FF6B35). Reference Clerk's appearance customization docs.
- **LegalText (NEW):** `"By continuing, you agree to our Terms and Privacy Policy"`, `fontSize: 12`, `color: colors.textTertiary`, `textAlign: 'center'`, `marginTop: 12`.
- `paddingHorizontal: 20`, `paddingBottom: 20`, safe-area aware via `SafeAreaView`.

---

## 3. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Screen background is `#0F0F1A` | Visual: no white/light background visible |
| AC-2 | Two atmospheric glow `View`s are absolutely positioned (orange top-center, teal lower-right) | Code review: two `View` elements with `position: 'absolute'`, circular `borderRadius`, correct `backgroundColor` rgba values |
| AC-3 | Logo renders `ridecast-logo-clean.png` at 200×56 with `resizeMode: 'contain'` | Code review + visual: `Image` source references `ui-studio/components/ridecast-logo-clean.png`, NOT a generic Ionicons icon |
| AC-4 | Tagline is `#9CA3AF`, 18px, single text node below logo | Visual + code review: `fontSize: 18`, `color: colors.textSecondary` |
| AC-5 | Auth UI is rendered via Clerk's `<SignIn />` component, not a custom `useOAuth` button | Code review: `<SignIn />` from `@clerk/clerk-expo` present; no custom `TouchableOpacity` for auth buttons |
| AC-6 | Clerk `<SignIn />` receives dark `appearance` override (background `#1A1A2E`, input `#242438`, primary `#FF6B35`) | Code review: `appearance` prop passed to `<SignIn />` with `colorBackground`, `colorInputBackground`, `colorPrimary` |
| AC-7 | Atmosphere glow views use `pointerEvents: 'none'` | Code review: both glow `View`s have `pointerEvents='none'` |
| AC-8 | Legal text appears below Clerk component in `#6B7280` | Visual + code review: `color: colors.textTertiary`, `fontSize: 12`, `textAlign: 'center'` |
| AC-9 | No hardcoded light-mode colors remain in the file | `rg '#fff|#ffffff|bg-white|white.*bg|bg.*gray' native/app/sign-in.tsx` — returns nothing |
| AC-10 | No glass effects, blur, or gradient libraries imported | `rg 'BlurView|LinearGradient|Skia' native/app/sign-in.tsx` — returns nothing |

---

## 4. Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| `ridecast-logo-clean.png` asset not found | Build error — fix by confirming asset path before implementing. The path is `ui-studio/components/ridecast-logo-clean.png` relative to the project root; require path from `native/app/` is `../../ui-studio/components/ridecast-logo-clean.png`. |
| Clerk `<SignIn />` light mode default | Without the `appearance` override, Clerk renders a white UI on the dark background. The `appearance` prop is required — not optional. |
| No safe area insets on older devices | `SafeAreaView` handles this — no change needed |
| Atmosphere views on small screens | The glow views are decorative and positioned absolutely — they clip naturally at screen edges without affecting layout |
| Clerk `appearance` API version mismatch | Check `@clerk/clerk-expo` version in `package.json`. Use appearance customization matching the installed major version. |

---

## 5. Files to Create/Modify

| File | Change |
|------|--------|
| `native/app/sign-in.tsx` | Full visual overhaul per spec. Replace custom `useOAuth` auth button with Clerk `<SignIn />` component + dark appearance. Add logo image, atmospheric glows, legal text. |

---

## 6. Dependencies

| Dependency | Why |
|-----------|-----|
| `dark-theme-foundation` | Provides `colors.backgroundScreen`, `colors.textPrimary`, `colors.textSecondary`, `colors.textTertiary`, `colors.surface`, `colors.surfaceElevated`, `colors.accentPrimary` |
| `@clerk/clerk-expo` | Already installed — provides `<SignIn />` component for Apple + Google auth |
| `ui-studio/components/ridecast-logo-clean.png` | Actual app logo — must exist at this path; confirm before implementing |

No new packages. `expo-linear-gradient` is NOT required — circular `View` approximation is acceptable and keeps zero new dependencies.

---

## 7. Notes

- **Use the real logo asset.** `ui-studio/components/ridecast-logo-clean.png` is the actual Ridecast wordmark. Do NOT substitute a generic Ionicons icon (`headset`, `mic`, etc.). The logo image is the brand mark.
- **Clerk handles auth buttons.** The `<SignIn />` component from `@clerk/clerk-expo` manages Apple Sign In, Google Sign In, input forms, error states, and loading states. Do NOT build custom `TouchableOpacity` auth buttons. Style the Clerk component via its `appearance` prop system.
- **Atmospheric glows are purely decorative.** The `pointerEvents: 'none'` prop ensures they don't interfere with Clerk's touch targets. Position the glows below the Clerk component in z-order (absolute positioned with `zIndex: -1` on the container, or render them first in the tree before content).
- **`SafeAreaView` stays as the root** — its `flex: 1` + `backgroundColor: colors.backgroundScreen` ensures the system status bar area is also dark.
- **Status bar style** is set globally by `dark-theme-foundation`. No `StatusBar` changes needed here.
- **Anti-slop:** Do NOT use `ImageBackground`, gradient packages, or blur. Plain circular Views with rgba backgrounds only for the atmospheric effect.

---

## 8. Implementation Map

_To be filled by implementing agent._

```
sign-in.tsx
├── SafeAreaView (backgroundColor: colors.backgroundScreen, flex:1)
│   ├── AtmosphereLayer (absolute, pointerEvents:'none', zIndex:-1)
│   │   ├── OrangeGlow (View, 200×200, borderRadius:100, rgba(255,107,53,0.15), top:-60, centered)
│   │   └── TealGlow   (View, 180×180, borderRadius:90, rgba(13,148,136,0.12), bottom:160, right:-40)
│   ├── BrandSection (flex:1, alignItems:center, paddingTop:120)
│   │   ├── LogoImage (Image, 200×56, resizeMode:contain, source: ridecast-logo-clean.png)
│   │   └── TaglineText (18/400/+0.5ls, textSecondary, mt:16)
│   └── AuthSection (paddingH:20, paddingB:20)
│       ├── ClerkSignInWrapper (View, borderRadius:10, overflow:hidden)
│       │   └── <SignIn appearance={darkAppearance} />
│       └── LegalText (textTertiary, 12px, centered, mt:12)
```
