# Component Spec — 01 Sign In

> Screen: Sign In (auth gate, fullscreen — no nav shell)
> Scope: exempt from nav-shell per nav-shell.md
> Coverage: 100% confirmed (12 components, self-judged)

---

## SignInScreen

- **Type:** container
- **Parent:** none (root)
- **Children:** AtmosphereLayer, BrandSection, AuthSection
- **Tokens:** color-background-screen
- **Content:** none
- **Scope:** local

---

## AtmosphereLayer

- **Type:** background
- **Parent:** SignInScreen
- **Children:** none
- **Tokens:** color-glow-orange, color-glow-teal, glow-orange-position, glow-orange-radius, glow-orange-opacity, glow-teal-position, glow-teal-radius, glow-teal-opacity
- **Content:** none
- **Asset:** atmosphere-glow (radial gradient composite — orange #FF6B35 at ~15% opacity centered top, teal #0D9488 at ~12% opacity lower-right; full-screen behind all content)
- **Notes:** Position absolute, fills entire SignInScreen, z-index behind BrandSection and AuthSection. Two overlapping radial gradients composited on the #0F0F1A base.

---

## BrandSection

- **Type:** container
- **Parent:** SignInScreen
- **Children:** LogoMark, WordmarkText, TaglineText
- **Tokens:** spacing-top-pad, spacing-logo-to-wordmark, spacing-wordmark-to-tagline, spacing-screen-margin
- **Content:** none
- **Notes:** Vertically stacked column, centered horizontally. Positioned in the upper-center of the screen with ~150px top padding. Flex column, align-items center.

---

## LogoMark

- **Type:** image
- **Parent:** BrandSection
- **Children:** none
- **Tokens:** color-logo-primary
- **Content:** none
- **Asset:** logo-headphone (headphone icon/logomark — white on transparent, monochrome)
- **Notes:** Brand logomark. White fill, no border radius needed. Estimated ~80–100px display size.

---

## WordmarkText

- **Type:** text
- **Parent:** BrandSection
- **Children:** none
- **Tokens:** color-text-primary, font-family-primary, font-size-wordmark, font-weight-wordmark, font-letter-spacing-wordmark, line-height-tight
- **Content:** "Ridecast"
- **Notes:** Bold display text. Tight letter spacing (-1.5px). Primary white on dark background.

---

## TaglineText

- **Type:** text
- **Parent:** BrandSection
- **Children:** none
- **Tokens:** color-text-secondary, font-family-primary, font-size-tagline, font-weight-tagline, font-letter-spacing-tagline, line-height-normal
- **Content:** "Turn anything into a podcast"
- **Notes:** Subdued secondary color (#9CA3AF). Sits below wordmark with 8px gap. Centered.

---

## AuthSection

- **Type:** container
- **Parent:** SignInScreen
- **Children:** ContinueWithAppleButton, LegalText
- **Tokens:** spacing-screen-margin, spacing-button-bottom-inset, spacing-sm
- **Content:** none
- **Notes:** Pinned to bottom of screen. Flex column, full-width minus horizontal margins. Bottom safe-area aware. The large gap between BrandSection and AuthSection is owned by SignInScreen's flex spacer.

---

## ContinueWithAppleButton

- **Type:** button
- **Parent:** AuthSection
- **Children:** AppleLogoIcon, ButtonLabel
- **Tokens:** color-button-background, radius-button-cta, spacing-button-height, spacing-button-icon-gap
- **Content:** none
- **Notes:** Full-width white pill button. Height 56px. Flex row, centered content. Apple sign-in CTA.

---

## AppleLogoIcon

- **Type:** icon
- **Parent:** ContinueWithAppleButton
- **Children:** none
- **Tokens:** color-apple-icon
- **Content:** none
- **Asset:** icon-apple-logo (Apple logo — black fill, ~20px, positioned left of text within button)
- **Notes:** Standard Apple sign-in logo. Black (#000000) on white button.

---

## ButtonLabel

- **Type:** text
- **Parent:** ContinueWithAppleButton
- **Children:** none
- **Tokens:** color-button-text, font-family-primary, font-size-button-label, font-weight-button-label, line-height-tight
- **Content:** "Continue with Apple"
- **Notes:** Black text on white button. Medium weight. Center-aligned with Apple icon to its left.

---

## LegalText

- **Type:** text
- **Parent:** AuthSection
- **Children:** none
- **Tokens:** color-text-legal, font-family-primary, font-size-legal, font-weight-legal, line-height-normal
- **Content:** "By continuing, you agree to our Terms and Privacy Policy" (single line; "Terms" and "Privacy Policy" are tappable links)
- **Notes:** Small caption-size text below the button. Muted tertiary color (#6B7280). Centered. Single line.
