# Asset Inventory — 12a Discover FTUE Topics

---

## Icons

**None.** This screen contains no standalone SVG icon assets.

Navigation icons, action icons, and system icons are absent from this FTUE screen by design (no header back button, no tab bar, no mini player).

---

## Emoji in Chip Labels

The 18 topic chips each render an emoji character as inline text (UTF-8, not a separate asset). These are **text content**, not icon assets. No SVG or image files are needed.

| Chip Component | Emoji | Character |
|---|---|---|
| TopicChip_Science | 🧬 | U+1F9EC |
| TopicChip_AITech | 🤖 | U+1F916 |
| TopicChip_Business | 💼 | U+1F4BC |
| TopicChip_Finance | 💰 | U+1F4B0 |
| TopicChip_Psychology | 🧠 | U+1F9E0 |
| TopicChip_Health | 🏥 | U+1F3E5 |
| TopicChip_Design | 🎨 | U+1F3A8 |
| TopicChip_Climate | 🌍 | U+1F30D |
| TopicChip_Space | 🚀 | U+1F680 |
| TopicChip_Politics | 📰 | U+1F4F0 |
| TopicChip_History | 📚 | U+1F4DA |
| TopicChip_Culture | 🎭 | U+1F3AD |
| TopicChip_Sports | ⚽ | U+26BD |
| TopicChip_Cooking | 🍳 | U+1F373 |
| TopicChip_Parenting | 👶 | U+1F476 |
| TopicChip_Philosophy | 💡 | U+1F4A1 |
| TopicChip_Law | ⚖️ | U+2696 |
| TopicChip_RealEstate | 🏠 | U+1F3E0 |

> Implementation note: Render as a single string — e.g., `"🧬 Science"` — inside the chip's text element. No emoji-to-icon substitution needed.

---

## Images

**None.** No photos, illustrations, or raster images are present on this screen.

---

## Backgrounds

| Name | Type | Value | File |
|---|---|---|---|
| screen-bg | solid color | `#0F0F1A` | — |
| chip-selected-fill | solid color | `#FF6B35` | — |
| chip-unselected-fill | solid color | `#1A1A2E` | — |
| cta-button-fill | solid color | `#FF6B35` | — |

All backgrounds are flat solid colors expressible as CSS. **No image file generation required for this screen.**

---

## Summary

| Category | Count | Generation Needed |
|---|---|---|
| Standalone icons | 0 | No |
| Image assets | 0 | No |
| Background images | 0 | No |
| CSS color backgrounds | 4 | No (CSS only) |
| Emoji (inline text) | 18 | No (UTF-8 text) |

**Total generated files: 0** — This screen is fully expressible in code with no asset files.
