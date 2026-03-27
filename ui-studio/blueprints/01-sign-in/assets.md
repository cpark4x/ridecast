# Asset Inventory — 01 Sign In

## Icons

| Name | Description | Library | Component | Size |
|------|-------------|---------|-----------|------|
| icon-apple-logo | Classic Apple logo silhouette — solid teardrop shape with bite notch right side, leaf stem top | Apple (standard auth button SVG) | AppleLogoIcon | 20px |

**Note on Apple logo:** Use the official Apple Sign In button SVG asset. Source from `@apple/sign-in-with-apple-js` or render using the `Sign in with Apple` JS kit. Do NOT use a custom-generated icon — Apple has strict branding guidelines. The icon is black (#000000) on white, positioned left of the button label text.

---

## Images

| Name | Compositing | Layered-over | Dimensions | Aspect Ratio | Content Description | File |
|------|-------------|--------------|------------|--------------|---------------------|------|
| logo-headphone | standalone | transparent | 200×180px | 10:9 | Stylized over-ear headphones — wide arc headband, two rounded rectangular earcups, 5 vertical sound-wave bars (center tallest, tapering outward) — solid white fill, vector-clean | assets/logo-headphone.png |

---

## Backgrounds

| Name | Type | Value | File |
|------|------|-------|------|
| screen-bg | solid | #0F0F1A | — |
| atmosphere-glow | css-gradient | `radial-gradient(circle at 50% 38%, rgba(255,107,53,0.15) 0%, transparent 55%), radial-gradient(circle at 70% 58%, rgba(13,148,136,0.12) 0%, transparent 48%)` | — |

**Atmosphere glow implementation note:**  
The `atmosphere-glow` is two overlapping CSS radial gradients applied as the `background` of `AtmosphereLayer`, layered above the `screen-bg` (#0F0F1A).  
- **Orange glow:** centered at ~50% horizontal, ~38% vertical; warm orange `#FF6B35` at 15% opacity fading to transparent at 55% radius
- **Teal glow:** centered at ~70% horizontal, ~58% vertical (lower-right); teal `#0D9488` at 12% opacity fading to transparent at 48% radius  
Both glows overlap and blend naturally via CSS. No PNG required — express as pure CSS background.

Full CSS:
```css
background:
  radial-gradient(circle at 50% 38%, rgba(255, 107, 53, 0.15) 0%, transparent 55%),
  radial-gradient(circle at 70% 58%, rgba(13, 148, 136, 0.12) 0%, transparent 48%);
```

---

## Generated Asset Files

| File | Dimensions | Status |
|------|------------|--------|
| `assets/logo-headphone.png` | 200×180px | ✓ Generated |
