# Asset Inventory — 03 Upload Modal

---

## Icons

| Name | Description | Library | Component | Size |
|------|-------------|---------|-----------|------|
| icon-upload-cloud | Cloud shape (flat base, puffy top) with an upward-pointing arrow centered inside it | lucide: `cloud-upload` | DropZoneUploadIcon | 32px |
| icon-tab-home | Filled solid house silhouette — peaked roof with small triangular gable, rectangular body with door cutout | lucide: `house` | TabHomeIcon | 24px |
| icon-tab-library | Three vertical rectangular book spines of varying heights standing side-by-side (tallest on left, shortest center-right) | lucide: `library` | TabLibraryIcon | 24px |

**Icon styling notes:**
- `icon-tab-home` renders in `#FF6B35` (active) or `#6B7280` (inactive) via `stroke="currentColor"` (outline) or `fill="currentColor"` (filled) — match fill state to active
- `icon-tab-library` renders in `#6B7280` inactive, `#FF6B35` when active
- `icon-upload-cloud` renders in `#9CA3AF` (color-text-secondary) — always non-interactive display

---

## Images

| Name | Compositing | Layered-over | Dimensions | Aspect Ratio | Content Description | File |
|------|-------------|--------------|------------|--------------|---------------------|------|
| headphones-illustration | overlay | #0F0F1A | 400x320 | 5:4 | Stylized over-ear headphones graphic, medium gray/white tones, with an orange sound waveform oscillating between the two earcups. Centered composition, no background. | assets/headphones-illustration.png |

---

## Backgrounds

| Name | Type | Value | Component | File |
|------|------|-------|-----------|------|
| screen-bg | solid | #0F0F1A | UploadModalScreen | — |
| scrim-overlay | solid + opacity | rgba(0,0,0,0.6) | ScrimOverlay | — |
| sheet-bg | solid | #1A1A2E | UploadModalSheet | — |
| input-bg | solid | #242438 | UrlInputRow | — |
| tab-bar-bg | solid | #1A1A2E | AppShellTabBar | — |
| background-glow | radial-gradient | radial-gradient(ellipse 200px 160px at center, rgba(255,107,53,0.15) 0%, transparent 70%) | BackgroundHomeContent | — |

**Background notes:**
- `background-glow` is the warm orange radial glow emanating from behind the headphones illustration. Pure CSS — no asset file needed. Apply as a `background` on the `BackgroundHomeContent` container, positioned centered behind the headphones illustration.
- All solid backgrounds are CSS `background-color` values — no asset files needed.
