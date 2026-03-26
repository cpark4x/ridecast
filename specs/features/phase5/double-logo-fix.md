# Spec: Double-Logo Fix in SourceThumbnail

**Size:** S — 1 pt  
**Phase:** 5  
**Status:** Ready for implementation

---

## Overview

`native/components/SourceThumbnail.tsx` renders a gradient tile with a Clearbit/Google favicon centred inside it. A second `<Image>` block (lines 139–159) renders a **badge** in the bottom-right corner. The badge was intended to show a source-type indicator, but it accidentally uses the **same favicon URL**, so the same logo appears twice: once large (38 × 38 px) and once small (12 × 12 px inside an 18 × 18 white circle).

Fix approach: **Option B** — replace the `<Image>` inside the badge with an `<Ionicons>` glyph that communicates the content type (`url`, `pdf`, `epub`, `txt`, `docx`). This removes the duplicate while adding useful information.

Affected component: **`SourceThumbnail`** only. The bug is entirely self-contained. `EpisodeCard` (caller) and `EpisodeCarousel`/`HeroPlayerCard` do not need changes — they simply pass `sourceType` and `size` props.

---

## Requirements

### Interfaces

`SourceThumbnailProps` (unchanged):
```ts
interface SourceThumbnailProps {
  sourceType: string | null | undefined;
  sourceUrl: string | null | undefined;
  sourceName: string | null | undefined;
  size?: number;  // 56 for EpisodeCard, 36 for mini-player
}
```

No new props required.

### Behavior

#### Badge replacement logic

The badge is only shown when `showLogo && size >= 48` (the same condition as today — line 139). At `size < 48`, neither the old nor the new badge appears.

Map `sourceType` to Ionicons glyph:

| `sourceType` value | Ionicons name | Meaning |
|--------------------|---------------|---------|
| `"url"` | `"globe-outline"` | Web article |
| `"pdf"` | `"document-text-outline"` | PDF |
| `"epub"` | `"book-outline"` | eBook |
| `"txt"` | `"text-outline"` | Plain text |
| `"docx"` | `"document-outline"` | Word document |
| `"pocket"` | `"bookmark-outline"` | Pocket import |
| anything else / null | `"ellipsis-horizontal-outline"` | Unknown |

#### Icon sizing

- Badge container: `18 × 18` px, `borderRadius: 4`, `backgroundColor: '#fff'` — **unchanged**
- Glyph size: `11` (down from 12 to fit cleanly inside the 18 px container with 1 px visual padding each side)
- Glyph color: `'#6B7280'` (gray-500 — neutral, readable on white)

#### Condition: when `showLogo` is false

When `showLogo === false` (no hostname, or favicon 404'd), the badge did not render before and must not render after this change. The `showLogo &&` guard stays.

When `showLogo === true` but `size < 48` (mini-player at size=36), the badge does not render — the gradient tile is too small for the badge to be legible. The `size >= 48` guard stays.

#### Import requirement

`Ionicons` is already imported at the top of `UploadModal.tsx` and other components. Check whether it is imported in `SourceThumbnail.tsx`. Currently it is **not** — it must be added:
```ts
import { Ionicons } from '@expo/vector-icons';
```

---

## Acceptance Criteria

| # | Scenario | Expected |
|---|----------|----------|
| AC-1 | `EpisodeCard` renders a URL-type item (size=56, valid URL) | One favicon in gradient tile; globe-outline icon badge bottom-right |
| AC-2 | `EpisodeCard` renders a PDF item (size=56, no URL) | No favicon (showLogo=false), no badge; only letter fallback on gradient |
| AC-3 | Mini-player renders any item (size=36) | No badge rendered (size < 48 guard) |
| AC-4 | URL item, favicon 404s → `logoError` state = true | `showLogo` becomes false; badge disappears |
| AC-5 | `sourceType = "epub"` | book-outline glyph in badge |
| AC-6 | `sourceType = "txt"` | text-outline glyph in badge |
| AC-7 | `sourceType = "docx"` | document-outline glyph in badge |
| AC-8 | `sourceType = null` | ellipsis-horizontal-outline glyph |
| AC-9 | No second `<Image>` with favicon URL exists anywhere in the render output | Only one `<Image>` tag referencing the Google favicon service |

---

## Edge Cases

- **`sourceType = "pocket"`**: A Pocket stub that has been hydrated becomes `'url'` in the DB. If an unhydrated Pocket stub somehow reaches the card, the `'pocket'` case in the icon map shows a bookmark. This is cosmetically fine.
- **`hostname` is null** (non-URL source types): `showLogo` is false → badge block never executes. The new `Ionicons` branch inside the badge is never reached. Safe.
- **Clearbit 404 / image load error** (`logoError = true`): `showLogo` becomes false → entire badge block (including the new glyph) disappears. This is correct — showing a glyph badge without the primary logo would look orphaned.
- **Future sourceTypes** (e.g. `'docx'` from Spec 4): Add `'docx': 'document-outline'` to the map. The default `'ellipsis-horizontal-outline'` is the safe fallback until explicitly added.

---

## Files to Create / Modify

### MODIFY `native/components/SourceThumbnail.tsx`

**Current file**: 162 lines

#### Change 1 — Add Ionicons import (top of file, after existing imports)

**Insert after line 3** (`import { LinearGradient } from "expo-linear-gradient";`):

```ts
import { Ionicons } from '@expo/vector-icons';
```

#### Change 2 — Add icon map (after the `registeredDomain` function, before the component)

**Insert after line 59** (after the closing `}` of `registeredDomain`), before the `// SourceThumbnail` comment block:

```ts
// ---------------------------------------------------------------------------
// Source type → Ionicons glyph map for badge
// ---------------------------------------------------------------------------

const SOURCE_TYPE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  url:    'globe-outline',
  pdf:    'document-text-outline',
  epub:   'book-outline',
  txt:    'text-outline',
  docx:   'document-outline',
  pocket: 'bookmark-outline',
};

function sourceTypeIcon(
  sourceType: string | null | undefined,
): React.ComponentProps<typeof Ionicons>['name'] {
  return SOURCE_TYPE_ICONS[(sourceType ?? '').toLowerCase()] ?? 'ellipsis-horizontal-outline';
}
```

#### Change 3 — Replace the badge `<Image>` with `<Ionicons>` (lines 139–159)

**Current code** (lines 138–159):
```tsx
      {/* Source badge — bottom-right corner, URL sources only */}
      {showLogo && size >= 48 && (
        <View
          style={{
            position:        'absolute',
            bottom:          3,
            right:           3,
            width:           18,
            height:          18,
            borderRadius:    4,
            backgroundColor: '#fff',
            alignItems:      'center',
            justifyContent:  'center',
            overflow:        'hidden',
          }}
        >
          <Image
            source={{ uri: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128` }}
            style={{ width: 12, height: 12 }}
          />
        </View>
      )}
```

**Replace with**:
```tsx
      {/* Source type badge — bottom-right corner, shows content-type glyph */}
      {showLogo && size >= 48 && (
        <View
          style={{
            position:        'absolute',
            bottom:          3,
            right:           3,
            width:           18,
            height:          18,
            borderRadius:    4,
            backgroundColor: '#fff',
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <Ionicons
            name={sourceTypeIcon(sourceType)}
            size={11}
            color="#6B7280"
          />
        </View>
      )}
```

**Note**: Remove the `overflow: 'hidden'` from the container View — it was only needed to clip the square `<Image>`, not an Ionicons glyph.

---

## Dependencies

- `@expo/vector-icons` — already a dependency (used in `UploadModal.tsx`, `EpisodeCard.tsx`, and others). No new packages required.
- `Ionicons` glyph names — all five (`globe-outline`, `document-text-outline`, `book-outline`, `text-outline`, `document-outline`) are present in the Ionicons 5 set bundled with `@expo/vector-icons`.

---

## Notes

- `EpisodeCard.tsx` line 321 passes `size={56}` to `SourceThumbnail` — no change needed.
- `EpisodeCarousel.tsx` and `HeroPlayerCard.tsx`: audit these for any direct `<Image>` usage of the Google favicon service. From the existing codebase they delegate fully to `SourceThumbnail` — no duplication found.
- The `overflow: 'hidden'` removal from the badge container is intentional: Ionicons renders SVG-backed glyphs that do not overflow, and removing the clip avoids edge cases where the glyph gets truncated on certain RN versions.

---

## Implementation Map

> _Filled in by the implementing agent during platform grounding._

| Step | File | Location | Action |
|------|------|----------|--------|
| 1 | `native/components/SourceThumbnail.tsx` | After line 3 | Add `Ionicons` import |
| 2 | `native/components/SourceThumbnail.tsx` | After line 59 (after `registeredDomain`) | Add `SOURCE_TYPE_ICONS` map + `sourceTypeIcon()` helper |
| 3 | `native/components/SourceThumbnail.tsx` | Lines 138–159 (badge block) | Replace `<Image>` with `<Ionicons>`, remove `overflow:'hidden'` |
| 4 | `native/components/__tests__/SourceThumbnail.test.tsx` | Create new file | Test: URL type renders globe icon; PDF no badge; size<48 no badge; logoError no badge |
